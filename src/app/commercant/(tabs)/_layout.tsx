import { Tabs } from 'expo-router/js-tabs';

import { tabIcon } from '../../../components/ui/Icon';
import { useT } from '../../../i18n';
import { useLayout, useTheme } from '../../../theme';

/** Onglets commerçant : Ma journée, Mon étal, Mes clients, Mon argent, Compte. */
export default function MerchantTabsLayout() {
  const { colors } = useTheme();
  const { tablet } = useLayout();
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        tabBarStyle: { minHeight: tablet ? 70 : 64, paddingTop: 6, backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelPosition: tablet ? 'beside-icon' : 'below-icon',
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('nav.today'), tabBarIcon: tabIcon('sun') }} />
      <Tabs.Screen name="etal" options={{ title: t('nav.stall'), tabBarIcon: tabIcon('box') }} />
      <Tabs.Screen name="clients" options={{ title: t('nav.clients'), tabBarIcon: tabIcon('users') }} />
      <Tabs.Screen name="argent" options={{ title: t('nav.money'), tabBarIcon: tabIcon('credit-card') }} />
      <Tabs.Screen name="compte" options={{ title: t('nav.account'), tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
