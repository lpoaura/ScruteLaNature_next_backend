'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/src/services/auth.service';
import { getAccessToken, clearTokens, refreshTokenSilently } from '@/src/lib/api-client';

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes

export default function AutoLogoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleIdle = useCallback(async () => {
    // Si la page est cachée ou qu'il y a inactivité
    try {
      await logout();
    } catch {
      // Ignorer l'erreur réseau si le token était déjà invalide
    }
    router.push('/login?reason=inactivity');
    router.refresh();
  }, [router]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleIdle, INACTIVITY_LIMIT_MS);
    };

    // Quand l'onglet redevient visible, tenter un refresh silencieux
    const onVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        resetTimer();
        // Refresh silencieux au retour d'onglet
        const token = await getAccessToken();
        if (token) {
          await refreshTokenSilently();
        }
      }
    };

    // Écouteurs d'événements pour réinitialiser le chrono
    const interactionEvents = ['mousemove', 'keydown', 'wheel', 'DOMMouseScroll', 'mouseWheel', 'mousedown', 'touchstart', 'touchmove', 'MSPointerDown', 'MSPointerMove'];

    const onInteraction = () => {
      resetTimer();
    };

    interactionEvents.forEach(event => document.addEventListener(event, onInteraction, { passive: true }));
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Lancement initial
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      interactionEvents.forEach(event => document.removeEventListener(event, onInteraction));
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [handleIdle]);

  return <>{children}</>;
}
