import { router } from 'expo-router';
import { useCallback } from 'react';

import { useAuthStore } from '../store/authStore';

/**
 * Visite libre, connexion seulement quand elle sert : payer, suivre un étal,
 * envoyer un message vocal. Sans compte, on ouvre la connexion puis on revient ici.
 */
export function useRequireAuth() {
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  return useCallback(
    (action: () => void, reason: string) => {
      if (signedIn) action();
      else router.push({ pathname: '/connexion', params: { reason } });
    },
    [signedIn],
  );
}
