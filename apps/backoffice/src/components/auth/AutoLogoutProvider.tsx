'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/src/services/auth.service';

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

    // Écouteurs d'événements pour réinitialiser le chrono
    const events = ['mousemove', 'keydown', 'wheel', 'DOMMouseScroll', 'mouseWheel', 'mousedown', 'touchstart', 'touchmove', 'MSPointerDown', 'MSPointerMove', 'visibilitychange'];

    const onEvent = () => {
      // Pour visibilitychange, on ne reset le timer que si l'onglet redevient visible
      if (document.visibilityState === 'visible') {
        resetTimer();
      }
    };

    events.forEach(event => document.addEventListener(event, onEvent, { passive: true }));

    // Lancement initial
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, onEvent));
    };
  }, [handleIdle]);

  return <>{children}</>;
}
