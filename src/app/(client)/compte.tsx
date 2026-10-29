import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useSessionStore } from '../../store/sessionStore';
import { colors, fontSize, spacing } from '../../theme';

/** Compte client. La connexion par numéro de téléphone viendra avec l'API d'authentification. */
export default function AccountScreen() {
  const setRole = useSessionStore((s) => s.setRole);

  const openMerchantSpace = () => {
    setRole('merchant');
    router.replace('/commercant');
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Compte" showBack={false} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card tone="trustSoft" style={styles.row}>
          <Icon name="shield" size={22} color={colors.trust} />
          <Text style={styles.trustText}>
            Chaque étal marqué « Vérifié » a été visité par un agent Axi. Votre argent n’est versé au commerçant qu’après réception.
          </Text>
        </Card>

        <Card tone="dark" style={styles.merchant}>
          <Text style={styles.merchantTitle}>Vous tenez un étal ?</Text>
          <Text style={styles.merchantText}>
            Votre étal en ligne, vos clients et vos ventes dans une seule application. La connexion est incluse dans l’abonnement.
          </Text>
          <Button label="Ouvrir mon espace commerçant" variant="accent" onPress={openMerchantSpace} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  trustText: { flex: 1, fontSize: fontSize.body, color: colors.trust },
  merchant: { gap: spacing.md },
  merchantTitle: { fontSize: fontSize.title, fontWeight: '700', color: colors.textOnDark },
  merchantText: { fontSize: fontSize.body, color: colors.textOnDarkMuted },
});
