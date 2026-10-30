import { Redirect, Stack } from 'expo-router';

import { LoadingView } from '../../components/ui/StateViews';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';

/** Espace commerçant : compte commerçant validé par un agent Axi (son étal est créé à la validation). */
export default function MerchantLayout() {
  const { status, user } = useAuthStore();
  const { colors } = useTheme();

  if (status === 'loading') return <LoadingView />;
  if (status !== 'signedIn') return <Redirect href="/bienvenue" />;
  if (user && user.role !== 'merchant') return <Redirect href="/" />;
  if (user?.merchant && !user.merchant.has_stall) return <Redirect href="/parametres/devenir-commercant" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      {/* Plein écran, sans les bandes noires de la présentation « modal » d'iOS */}
      <Stack.Screen name="produit/nouveau" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}
