import { Redirect, router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { EmptyView, LoadingView } from '../../components/ui/StateViews';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing } from '../../theme';

/** Espace commerçant : réservé aux comptes dont l'étal a été vérifié par un agent. */
export default function MerchantLayout() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  if (status === 'loading') return <LoadingView />;
  if (status === 'signedOut') {
    return (
      <Redirect
        href={{ pathname: '/connexion', params: { redirect: '/commercant', reason: 'Connectez-vous pour ouvrir votre espace commerçant.' } }}
      />
    );
  }
  if (user && user.role !== 'merchant') {
    return (
      <View style={styles.denied}>
        <EmptyView
          icon="shield"
          title="Espace réservé aux commerçants vérifiés"
          text="Un agent Axi vient vérifier votre étal sur place, puis active votre espace. Faites la demande depuis l’onglet Compte."
        />
        <Button label="Aller à mon compte" onPress={() => router.replace('/compte')} style={styles.button} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="nouveau-produit" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  denied: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  button: { marginBottom: spacing.xxl },
});
