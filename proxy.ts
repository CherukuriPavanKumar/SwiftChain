import { auth } from '@/lib/auth/server';

export default auth.middleware({
  loginUrl: '/auth/sign-in',
});

export const config = {
  matcher: [
    /*
     * Protect all application routes except:
     * - _next/static, _next/image, favicon.ico
     * - static files (*.svg, *.png, *.jpg, *.ico, etc.)
     * - api/auth (auth proxy endpoints)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
