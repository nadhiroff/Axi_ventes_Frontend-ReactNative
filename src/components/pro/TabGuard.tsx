import type { ReactNode } from 'react';

import { useAuthStore } from '../../store/authStore';
import { EmptyView } from '../ui/StateViews';
import { allowedTabs, type ProTab } from './access';

/** Un partenaire qui tape l'adresse d'un onglet qui ne le concerne pas voit un refus clair. */
export function TabGuard({ tab, children }: { tab: ProTab; children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!allowedTabs(user).includes(tab)) {
    return <EmptyView icon="lock" title="Cet onglet ne fait pas partie de votre accès" text="Contactez l’équipe Axi si vous en avez besoin." />;
  }
  return <>{children}</>;
}
