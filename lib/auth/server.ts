import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  createAuthServer,
  extractNeonAuthCookies,
  handleAuthProxyRequest,
  processAuthMiddleware,
  DEFAULT_AUTH_SKIP_ROUTES,
  resolveNeonAuthLogging,
  validateCookieConfig,
} from '@neondatabase/auth/server';

export type NeonAuthConfig = {
  baseUrl: string;
  cookies: {
    secret: string;
    sessionDataTtl?: number;
    domain?: string;
    sameSite?: 'lax' | 'strict' | 'none';
  };
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
};

/**
 * Safe RequestContext for Next.js App Router.
 * Next.js restricts cookie modification in Server Components (they are read-only during rendering).
 * In Server Actions and Route Handlers, cookieStore.set() succeeds as expected.
 * In Server Components, attempting to set a cookie throws an error in Next.js — we catch and ignore it
 * so that getSession() never crashes during page rendering.
 */
async function createSafeNextRequestContext() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return {
    getCookies() {
      return extractNeonAuthCookies(headerStore);
    },
    setCookie(name: string, value: string, options: any) {
      try {
        cookieStore.set(name, value, options);
      } catch {
        // Next.js Server Components have read-only cookies during render streaming.
        // Cookie mutations are only committed in Server Actions or Route Handlers.
      }
    },
    getHeader(name: string) {
      return headerStore.get(name) ?? null;
    },
    getOrigin() {
      return (
        headerStore.get('origin') ||
        headerStore.get('referer')?.split('/').slice(0, 3).join('/') ||
        ''
      );
    },
    getFramework() {
      return 'nextjs';
    },
  };
}

export function createNeonAuth(config: NeonAuthConfig) {
  const { baseUrl, cookies: cookiesConfig } = config;
  validateCookieConfig(cookiesConfig);
  const log = resolveNeonAuthLogging(config);

  const server: any = createAuthServer({
    baseUrl,
    context: createSafeNextRequestContext,
    cookieSecret: cookiesConfig.secret,
    sessionDataTtl: cookiesConfig.sessionDataTtl,
    domain: cookiesConfig.domain,
    sameSite: cookiesConfig.sameSite,
    log,
  });

  server.handler = () => {
    const handler = async (
      request: NextRequest,
      { params }: { params: Promise<{ path: string[] }> }
    ) => {
      return handleAuthProxyRequest({
        request,
        path: (await params).path.join('/'),
        baseUrl,
        cookieSecret: cookiesConfig.secret,
        sessionDataTtl: cookiesConfig.sessionDataTtl,
        domain: cookiesConfig.domain,
        sameSite: cookiesConfig.sameSite,
        log,
      });
    };
    return {
      GET: handler,
      POST: handler,
      PUT: handler,
      DELETE: handler,
      PATCH: handler,
    };
  };

  server.middleware = (middlewareConfig?: {
    loginUrl?: string;
    logger?: any;
    logLevel?: any;
  }) => {
    const { loginUrl = '/auth/sign-in', logger, logLevel } = middlewareConfig || {};
    return async (request: NextRequest) => {
      const pathname = request.nextUrl.pathname;
      const result = await processAuthMiddleware({
        request,
        pathname,
        skipRoutes: DEFAULT_AUTH_SKIP_ROUTES,
        loginUrl,
        baseUrl,
        cookieSecret: cookiesConfig.secret,
        sessionDataTtl: cookiesConfig.sessionDataTtl,
        domain: cookiesConfig.domain,
        sameSite: cookiesConfig.sameSite,
        log,
        logger,
        logLevel,
      });
      switch (result.action) {
        case 'allow': {
          const nextHeaders = new Headers(request.headers);
          if (result.headers) {
            for (const [key, value] of Object.entries(result.headers)) {
              nextHeaders.set(key, value as string);
            }
          }
          const response = NextResponse.next({ request: { headers: nextHeaders } });
          if (result.cookies) {
            for (const cookie of result.cookies) {
              response.headers.append('Set-Cookie', cookie);
            }
          }
          return response;
        }
        case 'redirect_oauth': {
          const oauthHeaders = new Headers();
          for (const cookie of result.cookies) {
            oauthHeaders.append('Set-Cookie', cookie);
          }
          return NextResponse.redirect(result.redirectUrl, { headers: oauthHeaders });
        }
        case 'redirect_login':
          if (result.cookies && result.cookies.length > 0) {
            const loginHeaders = new Headers();
            for (const cookie of result.cookies) {
              loginHeaders.append('Set-Cookie', cookie);
            }
            return NextResponse.redirect(result.redirectUrl, { headers: loginHeaders });
          }
          return NextResponse.redirect(result.redirectUrl);
      }
    };
  };

  return server;
}

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
