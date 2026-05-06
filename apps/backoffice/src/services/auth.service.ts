import { apiClient, saveTokens, clearTokens } from '@/src/lib/api-client';
import type { UserProfile } from '@/src/types/api.types';

// Le backend retourne des clés snake_case
interface LoginResponse {
  requires_2fa: boolean;
  access_token: string;
  refresh_token: string;
  user: UserProfile;
}

/**
 * Connecte un utilisateur avec email/mot de passe.
 * Sauvegarde les tokens en localStorage ET en cookie.
 */
export async function login(email: string, password: string): Promise<UserProfile> {
  const data = await apiClient<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (data.requires_2fa) {
    throw new Error('La double authentification (2FA) est activée. Veuillez contacter votre administrateur.');
  }

  saveTokens(data.access_token, data.refresh_token);
  return data.user;
}

/**
 * Déconnecte l'utilisateur (côté serveur + vide les tokens locaux).
 */
export async function logout(): Promise<void> {
  try {
    await apiClient('/auth/logout', { method: 'POST' });
  } finally {
    clearTokens();
  }
}

/**
 * Récupère le profil de l'utilisateur connecté (/users/me).
 */
export async function getMe(): Promise<UserProfile> {
  return apiClient<UserProfile>('/users/me');
}
