import { Redirect, Stack, usePathname } from 'expo-router';

import { LoadingView } from '../../components/ui/StateViews';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';

/** Espace commerçant : compte commerçant connecté ; sans étal, création de l'étal d'abord. */
export default function MerchantLayout() {
  const { status, user } = useAuthStore();
  const pathname = usePathname();
  const { colors } = useTheme();

  if (status === 'loading') return <LoadingView />;
  if (status !== 'signedIn') return <Redirect href="/bienvenue" />;
  if (user && user.role !== 'merchant') return <Redirect href="/" />;
  if (user?.merchant && !user.merchant.has_stall && !pathname.endsWith('/creer-etal')) return <Redirect href="/commercant/creer-etal" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="creer-etal" options={{ gestureEnabled: false }} />
      <Stack.Screen name="produit/nouveau" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
