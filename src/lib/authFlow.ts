import { router } from 'expo-router';

import type { Session } from '../api/types';
import { useAuthStore } from '../store/authStore';

/** Fin d'un parcours de connexion : enregistre la session puis reprend l'action interrompue */
export async function finishAuth(session: Session) {
  const store = useAuthStore.getState();
  const next = store.pendingRedirect;
  await store.signIn(session.token, session.user);
  store.setPendingRedirect(null);
  if (router.canDismiss()) router.dismissAll();
  if (next && next !== '/bienvenue') router.replace(next as never);
  else router.replace(session.user.role === 'merchant' ? '/commercant' : '/');
}

/** Validation simple côté téléphone, avant l'envoi (le serveur revérifie tout) */
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
