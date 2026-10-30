import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { tabIcon } from '../../components/ui/Icon';
import { LoadingView } from '../../components/ui/StateViews';
import { useT } from '../../i18n';
import { useAuthStore } from '../../store/authStore';
import { cartCount, useCartStore } from '../../store/cartStore';
import { useBadges } from '../../hooks/api/chat';
import { useLayout, useTheme } from '../../theme';

/** Onglets client : Accueil, Allées, Messages, Panier, Compte. */
export default function ClientTabsLayout() {
  const status = useAuthStore((s) => s.status);
  const mode = useAuthStore((s) => s.mode);
  const count = useCartStore((s) => cartCount(s.items));
  const unread = useBadges().data?.unread_as_client ?? 0;
  const { colors } = useTheme();
  const { tablet } = useLayout();
  const t = useT();

  if (status === 'loading') return <LoadingView />;
  // Premier lancement : Créer un compte / Se connecter / Continuer en visiteur
  if (status === 'welcome') return <Redirect href="/bienvenue" />;
  // Un commerçant connecté arrive directement dans son espace (il peut revenir faire ses achats).
  if (status === 'signedIn' && mode === 'merchant') return <Redirect href="/commercant" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '500' },
        tabBarStyle: { minHeight: tablet ? 70 : 64, paddingTop: 6, backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelPosition: tablet ? 'beside-icon' : 'below-icon',
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('nav.home'), tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="allees" options={{ title: t('nav.aisles'), tabBarIcon: tabIcon('grid') }} />
      <Tabs.Screen
        name="messages"
        options={{ title: t('chat.tab'), tabBarIcon: tabIcon('message-circle'), tabBarBadge: unread > 0 ? unread : undefined, tabBarBadgeStyle: { backgroundColor: colors.brand } }}
      />
      <Tabs.Screen
        name="panier"
        options={{ title: t('nav.cart'), tabBarIcon: tabIcon('shopping-bag'), tabBarBadge: count > 0 ? count : undefined, tabBarBadgeStyle: { backgroundColor: colors.brand } }}
      />
      <Tabs.Screen name="compte" options={{ title: t('nav.account'), tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
