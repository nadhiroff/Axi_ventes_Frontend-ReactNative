import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { tabIcon } from '../../components/ui/Icon';
import { LoadingView } from '../../components/ui/StateViews';
import { useAuthStore } from '../../store/authStore';
import { cartCount, useCartStore } from '../../store/cartStore';
import { colors } from '../../theme';

/** Onglets client : Accueil, Allées, Panier, Compte. */
export default function ClientTabsLayout() {
  const status = useAuthStore((s) => s.status);
  const mode = useAuthStore((s) => s.mode);
  const count = useCartStore((s) => cartCount(s.items));

  if (status === 'loading') return <LoadingView />;
  // Un commerçant connecté arrive directement dans son espace.
  if (mode === 'merchant') return <Redirect href="/commercant" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '500' },
        tabBarStyle: { minHeight: 64, paddingTop: 6 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="allees" options={{ title: 'Allées', tabBarIcon: tabIcon('grid') }} />
      <Tabs.Screen
        name="panier"
        options={{
          title: 'Panier',
          tabBarIcon: tabIcon('shopping-bag'),
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.brand },
        }}
      />
      <Tabs.Screen name="compte" options={{ title: 'Compte', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
