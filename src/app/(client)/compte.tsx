import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useAuthStore } from '../../store/authStore';
import { colors, fontSize, spacing } from '../../theme';

/** Compte : connexion, profil, accès à l'espace commerçant, demande de visite d'un agent. */
export default function AccountScreen() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const setMode = useAuthStore((s) => s.setMode);
  const signOut = useAuthStore((s) => s.signOut);
  const agentVisit = useMutation({ mutationFn: api.requestAgentVisit });

  const openMerchantSpace = () => {
    setMode('merchant');
    router.replace('/commercant');
  };

  const askAgentVisit = () => {
    if (status !== 'signedIn') {
      router.push({ pathname: '/connexion', params: { reason: 'Connectez-vous pour demander la visite d’un agent.' } });
      return;
    }
    agentVisit.mutate(undefined, {
      onSuccess: (r) => Alert.alert('Demande envoyée', r.message),
      onError: (e) => Alert.alert('Demande impossible', errorMessage(e)),
    });
  };

  const confirmSignOut = () =>
    Alert.alert('Se déconnecter ?', 'Vous pourrez vous reconnecter avec un nouveau code.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Compte" showBack={false} />
      <ScrollView contentContainerStyle={styles.content}>
        {status === 'signedIn' && user ? (
          <Card style={styles.profile}>
            <Avatar name={user.name || user.phone} size={56} variant="soft" />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user.name || 'Mon compte'}</Text>
              <Text style={styles.phone}>{user.phone}</Text>
            </View>
          </Card>
        ) : (
          <Card style={styles.gap}>
            <Text style={styles.cardTitle}>Connectez-vous</Text>
            <Text style={styles.cardText}>Pour payer, suivre vos étals et retrouver vos commandes. Un code suffit, sans mot de passe.</Text>
            <Button label="Se connecter" onPress={() => router.push('/connexion')} />
          </Card>
        )}

        <Card tone="trustSoft" style={styles.row}>
          <Icon name="shield" size={22} color={colors.trust} />
          <Text style={styles.trustText}>
            Chaque étal marqué « Vérifié » a été visité par un agent Axi. Votre argent n’est versé au commerçant qu’après réception.
          </Text>
        </Card>

        {user?.role === 'merchant' ? (
          <Card tone="dark" style={styles.gap}>
            <Text style={styles.darkTitle}>Votre espace commerçant</Text>
            <Text style={styles.darkText}>Ventes du jour, commandes, clients et argent à recevoir.</Text>
            <Button label="Ouvrir mon espace commerçant" variant="accent" onPress={openMerchantSpace} />
          </Card>
        ) : (
          <Card tone="dark" style={styles.gap}>
            <Text style={styles.darkTitle}>Vous tenez un étal ?</Text>
            <Text style={styles.darkText}>
              Un agent Axi vient vérifier votre étal sur place et active votre espace commerçant : étal en ligne, clients, ventes. La
              connexion est incluse dans l’abonnement.
            </Text>
            <Button label="Demander la visite d’un agent" variant="accent" onPress={askAgentVisit} loading={agentVisit.isPending} />
          </Card>
        )}

        {status === 'signedIn' ? <Button label="Se déconnecter" variant="ghost" onPress={confirmSignOut} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  phone: { fontSize: fontSize.body, color: colors.textMuted, marginTop: 2 },
  gap: { gap: spacing.md },
  cardTitle: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  cardText: { fontSize: fontSize.body, color: colors.textMuted },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  trustText: { flex: 1, fontSize: fontSize.body, color: colors.trust },
  darkTitle: { fontSize: fontSize.title, fontWeight: '700', color: colors.textOnDark },
  darkText: { fontSize: fontSize.body, color: colors.textOnDarkMuted },
});
