import { auth } from '@/lib/auth/server';

export default auth.middleware({
  loginUrl: '/auth/sign-in',
});

export const config = {
  matcher: [
    '/account/:path*',
    '/activity/:path*',
    '/exchange/:path*',
    '/send/:path*',
    '/wallet/:path*',
    '/api/transfers/:path*',
  ],
};
