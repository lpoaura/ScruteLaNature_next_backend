/**
 * Client HTTP centralisé pour communiquer avec le Backend NestJS (port 3000).
 * Gère automatiquement :
 *  - L'injection du Bearer token dans chaque requête
 *  - Le rafraîchissement du token (refresh) si le access token est expiré (401)
 *  - La sérialisation/désérialisation JSON
 *
 * Stratégie de stockage :
 *  - localStorage : pour l'accès côté client (requêtes fetch)
 *  - cookie (non-httpOnly) : pour que le proxy Next.js (server-side) puisse
 *    vérifier si l'utilisateur est connecté et protéger les routes
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000/api';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

// ── Helpers cookie ────────────────────────────────────────────────────────────

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Strict`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

// ── Helpers token ─────────────────────────────────────────────────────────────

export async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    // Côté serveur : on lit le cookie
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    return cookieStore.get('accessToken')?.value ?? null;
  }
  // Côté client : on lit le localStorage
  return localStorage.getItem('accessToken');
}

async function getRefreshToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    return cookieStore.get('refreshToken')?.value ?? null;
  }
  return localStorage.getItem('refreshToken');
}

/**
 * Sauvegarde les tokens en localStorage ET en cookie.
 * Le cookie est lu par le proxy Next.js pour protéger les routes côté serveur.
 */
export function saveTokens(accessToken: string, refreshToken: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setCookie('accessToken', accessToken);
    setCookie('refreshToken', refreshToken);
  }
}

/**
 * Supprime les tokens partout (déconnexion).
 */
export function clearTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    deleteCookie('accessToken');
    deleteCookie('refreshToken');
  }
}

// ── Refresh ───────────────────────────────────────────────────────────────────

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data = await response.json();
    // Le backend retourne access_token / refresh_token (snake_case)
    const newAccess = data.access_token ?? data.accessToken;
    const newRefresh = data.refresh_token ?? data.refreshToken;
    if (newAccess) saveTokens(newAccess, newRefresh);
    return newAccess ?? null;
  } catch {
    clearTokens();
    return null;
  }
}

// ── Client principal ──────────────────────────────────────────────────────────

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const makeRequest = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token && !endpoint.includes('/auth/login')) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(`${BACKEND_URL}${endpoint}`, { ...options, headers });
  };

  let token = await getAccessToken();
  let response = await makeRequest(token);

  // 401 → tenter un refresh automatique (uniquement côté client, le proxy gère le serveur)
  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    if (typeof window !== 'undefined') {
      const newToken = await tryRefreshToken();
      if (newToken) {
        token = newToken;
        response = await makeRequest(token);
      } else {
        window.location.href = '/login';
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
    } else {
      // Côté serveur : le proxy était censé le gérer. Si ça fail, on throw.
      throw new Error('Non autorisé.');
    }
  }

  if (!response.ok) {
    let errorBody;
    const text = await response.text();
    try {
      errorBody = JSON.parse(text);
    } catch {
      errorBody = { message: text || `Erreur ${response.status}` };
    }
    
    throw new Error(
      Array.isArray(errorBody.message)
        ? errorBody.message.join(', ')
        : errorBody.message ?? `Erreur ${response.status}`,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
