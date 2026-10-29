import type { User } from '../../api/types';

export type ProTab = 'tendances' | 'campagnes' | 'recensement' | 'financement';

export const proTabs: { id: ProTab; label: string; href: string }[] = [
  { id: 'tendances', label: 'Tendances du marché', href: '/pro' },
  { id: 'campagnes', label: 'Campagnes', href: '/pro/campagnes' },
  { id: 'recensement', label: 'Recensement des étals', href: '/pro/recensement' },
  { id: 'financement', label: 'Financement', href: '/pro/financement' },
];

/**
 * Chaque partenaire ne voit que ce qui le concerne. Le serveur applique la même
 * règle sur les routes /v1/pro/… : ce filtre n'est qu'un confort d'affichage.
 */
export function allowedTabs(user: User | null): ProTab[] {
  if (!user) return [];
  if (user.role === 'admin') return ['tendances', 'campagnes', 'recensement', 'financement'];
  if (user.role !== 'pro' || !user.organization) return [];
  switch (user.organization.type) {
    case 'anagem':
      return ['tendances', 'recensement'];
    case 'advertiser':
      return ['tendances', 'campagnes'];
    case 'mfi':
      return ['tendances', 'financement'];
    case 'research':
      return ['tendances'];
  }
}
