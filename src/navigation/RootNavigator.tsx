import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CartScreen } from '../screens/client/CartScreen';
import { HomeScreen } from '../screens/client/HomeScreen';
import { StallScreen } from '../screens/client/StallScreen';
import { MyClientsScreen } from '../screens/merchant/MyClientsScreen';
import { MyDayScreen } from '../screens/merchant/MyDayScreen';
import { MyMoneyScreen } from '../screens/merchant/MyMoneyScreen';
import { useSessionStore } from '../store/sessionStore';
import { colors } from '../theme';
import type { ClientStackParamList, ClientTabParamList, MerchantTabParamList } from './types';

const ClientStack = createNativeStackNavigator<ClientStackParamList>();
const ClientTab = createBottomTabNavigator<ClientTabParamList>();
const MerchantTab = createBottomTabNavigator<MerchantTabParamList>();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colors.brand, background: colors.background },
};

const tabOptions = {
  tabBarActiveTintColor: colors.brand,
  tabBarInactiveTintColor: colors.textMuted,
};

function ClientTabs() {
  return (
    <ClientTab.Navigator screenOptions={tabOptions}>
      <ClientTab.Screen name="Home" component={HomeScreen} options={{ title: 'Accueil' }} />
      <ClientTab.Screen name="Cart" component={CartScreen} options={{ title: 'Panier' }} />
    </ClientTab.Navigator>
  );
}

function ClientNavigator() {
  return (
    <ClientStack.Navigator>
      <ClientStack.Screen name="ClientTabs" component={ClientTabs} options={{ headerShown: false }} />
      <ClientStack.Screen name="Stall" component={StallScreen} options={{ title: '' }} />
    </ClientStack.Navigator>
  );
}

function MerchantNavigator() {
  return (
    <MerchantTab.Navigator screenOptions={tabOptions}>
      <MerchantTab.Screen name="MyDay" component={MyDayScreen} options={{ title: 'Ma journée' }} />
      <MerchantTab.Screen name="MyClients" component={MyClientsScreen} options={{ title: 'Mes clients' }} />
      <MerchantTab.Screen name="MyMoney" component={MyMoneyScreen} options={{ title: 'Mon argent' }} />
    </MerchantTab.Navigator>
  );
}

export function RootNavigator() {
  const role = useSessionStore((s) => s.role);
  return (
    <NavigationContainer theme={theme}>
      {role === 'merchant' ? <MerchantNavigator /> : <ClientNavigator />}
    </NavigationContainer>
  );
}
