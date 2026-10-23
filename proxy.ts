import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * proxy.ts — Auth-aware routing for SwiftChain
 *
 * Routing rules:
 *   - Unauthenticated visitors:
 *       • "/"                   → Public landing page
 *       • "/landing"            → Canonical redirect to "/"
 *       • "/auth/sign-in", etc. → Auth forms
 *       • "/app", "/send", etc. → Redirect to "/"
 *
 *   - Authenticated users:
 *       • "/" or "/landing"     → Redirect to "/app" (dashboard)
 *       • "/auth/*"             → Redirect to "/app"
 *       • "/app"                → Authenticated overview dashboard
 *       • "/send", "/wallet" …  → Redirect to "/app?tab=<name>"
 */

const SESSION_COOKIE_PATTERNS = [
  'session_token',
  'session_data',
  'neon-auth',
  'better-auth',
];

const LEGACY_TAB_ROUTES: Record<string, string> = {
  '/send': 'send',
  '/wallet': 'wallet',
  '/account': 'account',
  '/activity': 'activity',
  '/exchange': 'exchange',
};

/**
 * Fast, edge-safe session detector that inspects cookies for active Neon/Better Auth tokens.
 * Cryptographic/backend session validation occurs inside Server Components (/app/page.tsx).
 */
function hasValidSession(request: NextRequest): boolean {
  for (const cookie of request.cookies.getAll()) {
    if (
      SESSION_COOKIE_PATTERNS.some((pattern) => cookie.name.includes(pattern)) &&
      cookie.value &&
      cookie.value.trim().length > 0
    ) {
      return true;
    }
  }

  const rawCookie = request.headers.get('cookie') || '';
  if (rawCookie) {
    const pairs = rawCookie.split(';');
    for (const pair of pairs) {
      const [rawKey, rawVal] = pair.split('=');
      const key = rawKey?.trim() || '';
      const val = rawVal?.trim() || '';
      if (
        key &&
        SESSION_COOKIE_PATTERNS.some((pattern) => key.includes(pattern)) &&
        val.length > 0
      ) {
        return true;
      }
    }
  }

  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always pass through Next.js internals, API routes, and public files
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const isAuthenticated = hasValidSession(request);

  const isLanding =
    pathname === '/' || pathname === '/landing' || pathname.startsWith('/landing/');
  const isAuth = pathname.startsWith('/auth/');
  const isLegacyRoute = Object.prototype.hasOwnProperty.call(LEGACY_TAB_ROUTES, pathname);
  const isAppRoute = pathname === '/app' || pathname.startsWith('/app/');

  // 1. Authenticated users visiting "/" or "/landing" or "/auth/*" → redirect to "/app"
  if (isAuthenticated && (isLanding || isAuth)) {
    const url = request.nextUrl.clone();
    url.pathname = '/app';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // 2. Unauthenticated user visiting "/landing" → canonical redirect to "/"
  if (!isAuthenticated && isLanding && pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // 3. Unauthenticated user attempting to access protected app routes → redirect to sign-in
  if (!isAuthenticated && (isAppRoute || isLegacyRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // 4. Authenticated user accessing legacy route → redirect to "/app?tab=<name>"
  if (isAuthenticated && isLegacyRoute) {
    const tab = LEGACY_TAB_ROUTES[pathname];
    const url = request.nextUrl.clone();
    url.pathname = '/app';
    url.search = `?tab=${tab}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT Next.js internals and static/public files.
     * The negative lookahead keeps CSS, JS chunks, images, and favicon out.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)',
  ],
};
