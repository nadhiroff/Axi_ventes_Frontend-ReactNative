import { router, usePathname } from 'expo-router';
import { useCallback } from 'react';

import { useAuthStore } from '../store/authStore';

/**
 * Visite libre ; la connexion n'est demandée que quand elle sert (payer, suivre un étal, favori,
 * message vocal, espace personnel). Sans compte, on ouvre la connexion, puis on revient à cet écran.
 */
export function useRequireAuth() {
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const setPendingRedirect = useAuthStore((s) => s.setPendingRedirect);
  const pathname = usePathname();
  return useCallback(
    (action: () => void, reason: string) => {
      if (signedIn) {
        action();
        return;
      }
      setPendingRedirect(pathname);
      router.push({ pathname: '/auth/connexion', params: { reason } });
    },
    [signedIn, setPendingRedirect, pathname],
  );
}
