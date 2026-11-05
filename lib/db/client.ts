import { neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

/**
 * IPv4-only fetch shim for Neon's HTTP driver.
 *
 * Problem: Node.js uses happy-eyeballs (RFC 6555) — it tries IPv6 before IPv4.
 * The Neon API gateway (api.c-*.aws.neon.tech) resolves to both IPv4 and IPv6,
 * but IPv6 routes are unreachable in this environment, so every query fails with
 * "Error connecting to database: TypeError: fetch failed / AggregateError".
 *
 * Fix: Pre-resolve the hostname to an IPv4 address via dns.lookup(family:4), then
 * make the HTTPS request to the IPv4 IP while setting `servername` (SNI) to the
 * original hostname so TLS certificate validation still passes. Finally, wrap the
 * Node.js https response in a standards-compliant Response object so the Neon
 * driver receives the same shape as native fetch.
 *
 * This module is only ever imported on the server — never in Edge middleware.
 */

// Lazily cache IPv4 resolution results to avoid a DNS lookup on every query
const ipv4Cache = new Map<string, string>();

async function resolveIPv4(hostname: string): Promise<string> {
  if (ipv4Cache.has(hostname)) return ipv4Cache.get(hostname)!;
  // Dynamic import so this module stays importable in Edge environments
  // (it will never actually run there, but the import must not throw at parse time)
  const { lookup } = await import('dns');
  const address = await new Promise<string>((resolve, reject) => {
    lookup(hostname, { family: 4 }, (err, addr) => {
      if (err) reject(err);
      else resolve(addr);
    });
  });
  ipv4Cache.set(hostname, address);
  return address;
}

async function ipv4NeonFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const inputStr = typeof input === 'string' ? input : input.toString();

  // Only intercept Neon API gateway calls
  let url: URL;
  try {
    url = new URL(inputStr);
  } catch {
    return fetch(input, init);
  }

  if (!url.hostname.endsWith('.neon.tech')) {
    return fetch(input, init);
  }

  // Resolve to IPv4 and make the request using Node's https module with SNI
  const ipv4 = await resolveIPv4(url.hostname);
  const { request: httpsRequest } = await import('https');

  const incomingHeaders = (init?.headers ?? {}) as Record<string, string>;
  const bodyStr = typeof init?.body === 'string' ? init.body : JSON.stringify(init?.body ?? '');

  return new Promise<Response>((resolve, reject) => {
    const req = httpsRequest(
      {
        host: ipv4,               // Connect to IPv4 address directly
        port: 443,
        path: url.pathname + url.search,
        method: init?.method ?? 'GET',
        servername: url.hostname, // SNI — tells TLS which cert to expect
        headers: {
          ...incomingHeaders,
          Host: url.hostname,
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          // Build a standards-compliant Response with the correct headers
          const headers = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (value === undefined) continue;
            const values = Array.isArray(value) ? value : [value];
            for (const v of values) headers.append(key, v);
          }
          resolve(new Response(body, { status: res.statusCode ?? 200, headers }));
        });
        res.on('error', reject);
      }
    );

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// Install the IPv4 shim globally — drizzle('neon-http') reads neonConfig.fetchFunction
// when it internally creates its neon() client from the connection string.
neonConfig.fetchFunction = ipv4NeonFetch;

export const db = drizzle(connectionString);
