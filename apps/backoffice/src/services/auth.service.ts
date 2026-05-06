import { apiClient, saveTokens, clearTokens } from '@/src/lib/api-client';
import type { AuthTokens, UserProfile } from '@/src/types/api.types';

/**
 * Connecte un utilisateur avec email/mot de passe.
 * Sauvegarde les tokens en localStorage.
 */
export async function login(email: string, password: string): Promise<UserProfile> {
  const data = await apiClient<AuthTokens & { user: UserProfile }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  saveTokens(data.accessToken, data.refreshToken);
  return data.user;
}

/**
 * Déconnecte l'utilisateur (invalide le refresh token côté serveur + vide le localStorage).
 */
export async function logout(): Promise<void> {
  try {
    await apiClient('/auth/logout', { method: 'POST' });
  } finally {
    clearTokens();
  }
}

/**
 * Récupère le profil de l'utilisateur connecté.
 */
export async function getMe(): Promise<UserProfile> {
  return apiClient<UserProfile>('/users/me');
}
