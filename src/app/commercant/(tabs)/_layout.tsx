import { Tabs } from 'expo-router/js-tabs';

import { tabIcon } from '../../../components/ui/Icon';
import { colors } from '../../../theme';

/** Onglets commerçant : Ma journée, Mon étal, Mes clients, Mon argent. */
export default function MerchantTabsLayout() {
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
      <Tabs.Screen name="index" options={{ title: 'Ma journée', tabBarIcon: tabIcon('sun') }} />
      <Tabs.Screen name="etal" options={{ title: 'Mon étal', tabBarIcon: tabIcon('box') }} />
      <Tabs.Screen name="clients" options={{ title: 'Mes clients', tabBarIcon: tabIcon('users') }} />
      <Tabs.Screen name="argent" options={{ title: 'Mon argent', tabBarIcon: tabIcon('credit-card') }} />
    </Tabs>
  );
}
