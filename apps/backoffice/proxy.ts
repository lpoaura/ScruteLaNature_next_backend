import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy Next.js 16 (anciennement "middleware") — Protection des routes privées.
 *
 * Logique :
 *  - Si l'utilisateur accède à /dashboard/* sans accessToken → redirect /login
 *  - Si l'utilisateur accède à /login avec un accessToken → redirect /dashboard
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;

  const isProtected = pathname.startsWith('/dashboard');
  const isAuthPage = pathname === '/login';

  // Route protégée sans token → login
  if (isProtected && !accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Page de login avec token → dashboard
  if (isAuthPage && accessToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
