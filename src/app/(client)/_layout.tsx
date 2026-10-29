import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { tabIcon } from '../../components/ui/Icon';
import { cartCount, useCartStore } from '../../store/cartStore';
import { useSessionStore } from '../../store/sessionStore';
import { colors } from '../../theme';

/** Onglets client : Accueil, Allées, Panier, Compte. */
export default function ClientTabsLayout() {
  const role = useSessionStore((s) => s.role);
  const count = useCartStore((s) => cartCount(s.items));

  if (role === 'merchant') return <Redirect href="/commercant" />;

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
