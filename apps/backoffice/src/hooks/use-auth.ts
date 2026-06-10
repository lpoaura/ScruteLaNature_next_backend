'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMe } from '@/src/services/auth.service';
import { clearTokens } from '@/src/lib/api-client';
import type { UserProfile } from '@/src/types/api.types';

interface UseAuthReturn {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetch: () => Promise<void>;
  logout: () => void;
}

/**
 * Hook pour récupérer et mettre à jour le profil de l'utilisateur connecté.
 * Gère le chargement et la déconnexion.
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    // Pas de token = pas la peine d'appeler l'API
    if (typeof window !== 'undefined' && !localStorage.getItem('accessToken')) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await getMe();
      setUser(profile);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch: fetchUser,
    logout,
  };
}
