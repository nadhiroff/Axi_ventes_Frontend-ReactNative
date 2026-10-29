import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useOrder } from '../../hooks/api/client';
import { formatFcfa } from '../../lib/format';
import { colors, fontSize, spacing } from '../../theme';

/** Suivi du paiement Mobile Money puis de la commande, étal par étal. */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useOrder(id);
  const insets = useSafeAreaInsets();

  if (order.isPending) return <LoadingView />;
  if (order.isError && !order.data) return <ErrorView error={order.error} onRetry={() => order.refetch()} />;

  const o = order.data!;
  const waiting = o.status === 'awaiting_payment';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
    >
      <View style={[styles.badge, waiting ? styles.badgeWaiting : styles.badgeDone]}>
        <Icon name={waiting ? 'smartphone' : 'check'} size={36} color={waiting ? colors.brand : colors.trust} />
      </View>
      <Text style={styles.title}>{waiting ? 'Validez sur votre téléphone' : 'Paiement reçu'}</Text>
      <Text style={styles.amount}>{formatFcfa(o.total)}</Text>
      <Text style={styles.status}>{o.status_label}</Text>

      {o.payment_instructions ? (
        <Card tone="brandSoft">
          <Text style={styles.instructions}>{o.payment_instructions}</Text>
        </Card>
      ) : null}

      <Card style={styles.stalls}>
        {o.stalls.map((s) => (
          <View key={s.id} style={styles.stallRow}>
            <Text style={styles.stallName}>{s.name}</Text>
            <Text style={styles.stallStatus}>{s.status_label}</Text>
          </View>
        ))}
      </Card>

      <Card tone="trustSoft">
        <Text style={styles.escrow}>
          Axi garde votre argent jusqu’à la réception. Chaque commerçant est payé quand vous avez reçu votre colis.
        </Text>
      </Card>

      <Button label="Retour à l’accueil" variant={waiting ? 'ghost' : 'primary'} size="lg" onPress={() => router.replace('/')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  badge: { alignSelf: 'center', width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  badgeWaiting: { backgroundColor: colors.brandSoft },
  badgeDone: { backgroundColor: colors.trustSoft },
  title: { fontSize: fontSize.display, fontWeight: '700', color: colors.text, textAlign: 'center' },
  amount: { fontSize: fontSize.heading, fontWeight: '700', color: colors.brand, textAlign: 'center' },
  status: { fontSize: fontSize.body, color: colors.textMuted, textAlign: 'center' },
  instructions: { fontSize: fontSize.body, color: colors.brandDark },
  stalls: { gap: spacing.md },
  stallRow: { gap: 2 },
  stallName: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  stallStatus: { fontSize: fontSize.small, color: colors.textMuted },
  escrow: { fontSize: fontSize.small, color: colors.trust },
});
