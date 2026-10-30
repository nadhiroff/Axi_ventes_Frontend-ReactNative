import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';

import { LoadingView } from '../../components/ui/StateViews';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';

/** Espace commerçant : compte commerçant validé par un agent Axi (son étal est créé à la validation). */
export default function MerchantLayout() {
  const { status, user, setMode } = useAuthStore();
  const { colors } = useTheme();
  const merchant = status === 'signedIn' && user?.role === 'merchant';

  // Arrivé ici par n'importe quel chemin (demande acceptée, alerte touchée) : le mode suit l'écran
  useEffect(() => {
    if (merchant) setMode('merchant');
  }, [merchant, setMode]);

  if (status === 'loading') return <LoadingView />;
  if (status !== 'signedIn') return <Redirect href="/bienvenue" />;
  if (user && user.role !== 'merchant') return <Redirect href="/" />;
  if (user?.merchant && !user.merchant.has_stall) return <Redirect href="/parametres/devenir-commercant" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      {/* Monte du bas sans présentation modale native : sur iOS, elle cacherait les fenêtres de DialogHost (question « Annuler ? »), le retour semblerait bloqué */}
      <Stack.Screen name="produit/nouveau" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
