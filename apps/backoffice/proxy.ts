import { NextRequest, NextResponse } from 'next/server';

/**
 * Décode la partie payload d'un JWT pour lire l'expiration sans clé secrète.
 */
function isTokenExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true;
    
    // Remplacement des caractères base64url en base64 standard
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload);
    // On ajoute une marge de 10 secondes pour éviter les problèmes de latence
    return payload.exp * 1000 < Date.now() + 10000;
  } catch (e) {
    return true; // En cas de doute, on considère expiré
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  const isProtected = pathname.startsWith('/dashboard');
  const isAuthPage = pathname === '/login';

  let response = NextResponse.next();

  // Si on est sur une route protégée et que le token est expiré mais on a un refresh token
  if (isProtected && accessToken && refreshToken && isTokenExpired(accessToken)) {
    try {
      const refreshReq = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000/api'}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (refreshReq.ok) {
        const data = await refreshReq.json();
        const newAccess = data.access_token ?? data.accessToken;
        const newRefresh = data.refresh_token ?? data.refreshToken;
        
        if (newAccess) {
          accessToken = newAccess;
          // Créer une nouvelle réponse avec les cookies mis à jour
          response = NextResponse.next();
          response.cookies.set('accessToken', newAccess, { path: '/', maxAge: 60 * 60 * 24 * 7, sameSite: 'strict' });
          if (newRefresh) {
            response.cookies.set('refreshToken', newRefresh, { path: '/', maxAge: 60 * 60 * 24 * 7, sameSite: 'strict' });
          }
        } else {
          accessToken = undefined; // Force login
        }
      } else {
        accessToken = undefined; // Échec du refresh -> force login
      }
    } catch {
      accessToken = undefined;
    }
  }

  // Route protégée sans token valide -> redirect vers login
  if (isProtected && !accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    // Nettoyer les cookies expirés
    redirectResponse.cookies.delete('accessToken');
    redirectResponse.cookies.delete('refreshToken');
    return redirectResponse;
  }

  // Page de login avec token valide -> redirect vers dashboard
  if (isAuthPage && accessToken && !isTokenExpired(accessToken)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
