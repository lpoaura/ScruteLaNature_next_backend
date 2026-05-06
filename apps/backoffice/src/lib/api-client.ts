/**
 * Client HTTP centralisé pour communiquer avec le Backend NestJS (port 3000).
 * Gère automatiquement :
 *  - L'injection du Bearer token dans chaque requête
 *  - Le rafraîchissement du token (refresh) si le access token est expiré (401)
 *  - La sérialisation/désérialisation JSON
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';

/**
 * Récupère l'accessToken depuis le localStorage (côté client uniquement).
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

/**
 * Récupère le refreshToken depuis le localStorage.
 */
function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

/**
 * Sauvegarde les tokens dans le localStorage.
 */
export function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

/**
 * Supprime les tokens (déconnexion).
 */
export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

/**
 * Tente de renouveler l'accessToken via le refreshToken.
 * Retourne le nouvel accessToken, ou null si le refresh échoue.
 */
async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data = await response.json();
    saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

/**
 * Fonction principale de requête — wrappeur autour de fetch.
 * Usage : apiClient('/admin/zonages') ou apiClient('/auth/login', { method: 'POST', body: ... })
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const makeRequest = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers,
    });
  };

  let token = getAccessToken();
  let response = await makeRequest(token);

  // Si 401 → tenter un refresh automatique
  if (response.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      token = newToken;
      response = await makeRequest(token);
    } else {
      // Refresh aussi échoué → rediriger vers le login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Erreur réseau' }));
    throw new Error(
      Array.isArray(errorBody.message)
        ? errorBody.message.join(', ')
        : errorBody.message ?? `Erreur ${response.status}`,
    );
  }

  // 204 No Content → pas de body JSON
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
