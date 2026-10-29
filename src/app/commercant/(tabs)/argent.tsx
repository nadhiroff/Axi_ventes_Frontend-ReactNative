import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError, errorMessage } from '../../../api/client';
import type { MerchantMoney } from '../../../api/types';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Icon } from '../../../components/ui/Icon';
import { ErrorView, LoadingView } from '../../../components/ui/StateViews';
import { Tag } from '../../../components/ui/Tag';
import { useMerchantMoney, useRequestCredit, useSetDataSharing } from '../../../hooks/api/merchant';
import { formatFcfa } from '../../../lib/format';
import { colors, fontSize, radius, spacing } from '../../../theme';

/** Mon argent : argent à recevoir, abonnement, offre fournisseur, crédit, partage d'historique. */
export default function MyMoneyScreen() {
  const money = useMerchantMoney();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      {money.isPending ? (
        <LoadingView />
      ) : money.isError && !money.data ? (
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <ErrorView error={money.error} onRetry={() => money.refetch()} />
        </View>
      ) : (
        <MyMoney data={money.data!} refreshing={money.isRefetching} onRefresh={() => money.refetch()} />
      )}
    </View>
  );
}

function MyMoney({ data, refreshing, onRefresh }: { data: MerchantMoney; refreshing: boolean; onRefresh: () => void }) {
  const insets = useSafeAreaInsets();
  const requestCredit = useRequestCredit();
  const setSharing = useSetDataSharing();

  const askCredit = () => {
    const send = () =>
      requestCredit.mutate(undefined, {
        onSuccess: (r) => Alert.alert('Demande envoyée', r.message),
        onError: (e) => {
          if (e instanceof ApiError && e.code === 'DATA_SHARING_REQUIRED') {
            Alert.alert('Accord nécessaire', e.message, [
              { text: 'Plus tard', style: 'cancel' },
              { text: 'Partager et demander', onPress: () => setSharing.mutate(true, { onSuccess: send }) },
            ]);
          } else {
            Alert.alert('Demande impossible', errorMessage(e));
          }
        },
      });
    Alert.alert('Demander un crédit', `Votre demande sera transmise à ${data.data_sharing.partner_name}.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: send },
    ]);
  };

  const toggleSharing = () => {
    const next = !data.data_sharing.enabled;
    if (next) {
      Alert.alert(
        `Partager avec ${data.data_sharing.partner_name} ?`,
        'Vos ventes enregistrées sur Axi seront visibles par cette institution pour étudier un crédit. Vous pouvez arrêter à tout moment.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Partager', onPress: () => setSharing.mutate(true) },
        ],
      );
    } else {
      setSharing.mutate(false);
    }
  };

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.title} accessibilityRole="header">
          Mon argent
        </Text>
        <View style={styles.pending}>
          <Text style={styles.pendingLabel}>À recevoir, libéré à la réception des colis</Text>
          <Text style={styles.pendingAmount}>{formatFcfa(data.pending_amount)}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Card style={styles.gap}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>Mon abonnement</Text>
            <Tag label={data.subscription.status_label} tone={data.subscription.status === 'active' ? 'trust' : 'brand'} size="md" />
          </View>
          <Text style={styles.cardText}>{data.subscription.plan_label}</Text>
          {data.subscription.note ? <Text style={styles.cardNote}>{data.subscription.note}</Text> : null}
        </Card>

        {data.supplier_offer ? (
          <Card style={[styles.gap, styles.bordered]}>
            <View style={styles.cardTop}>
              <Text style={styles.cardKicker}>Offre fournisseur</Text>
              <Tag label={data.supplier_offer.label} tone="outline" />
            </View>
            <Text style={styles.cardTitle}>{data.supplier_offer.title}</Text>
            <Text style={styles.cardText}>{data.supplier_offer.text}</Text>
            <Button
              label="Voir l’offre"
              variant="outline"
              onPress={() =>
                data.supplier_offer!.url
                  ? Linking.openURL(data.supplier_offer!.url)
                  : Alert.alert(data.supplier_offer!.title, data.supplier_offer!.text)
              }
            />
          </Card>
        ) : null}

        <Card tone="dark" style={styles.gap}>
          <Text style={styles.creditTitle}>{data.credit.title}</Text>
          <Text style={styles.creditText}>{data.credit.text}</Text>
          {data.credit.request_pending ? (
            <Tag label="Demande en cours d’étude" tone="trust" icon="clock" size="md" />
          ) : (
            <Button
              label="Demander un crédit"
              variant="accent"
              onPress={askCredit}
              disabled={!data.credit.can_request}
              loading={requestCredit.isPending}
            />
          )}
        </Card>

        <Pressable
          onPress={toggleSharing}
          disabled={setSharing.isPending}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: data.data_sharing.enabled }}
          style={styles.sharing}
        >
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={styles.cardTitle}>Partager mon historique avec {data.data_sharing.partner_name}</Text>
            <Text style={styles.cardText}>{data.data_sharing.text}</Text>
          </View>
          <View style={[styles.checkbox, data.data_sharing.enabled && styles.checkboxOn]}>
            {data.data_sharing.enabled ? <Icon name="check" size={18} color={colors.textOnDark} /> : null}
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.surface, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg },
  title: { fontSize: fontSize.display, fontWeight: '700', color: colors.text },
  pending: { backgroundColor: colors.trustSoft, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  pendingLabel: { fontSize: fontSize.body, color: colors.trust },
  pendingAmount: { fontSize: 30, fontWeight: '700', color: colors.trust },
  body: { padding: spacing.xl, gap: spacing.lg },
  gap: { gap: spacing.sm },
  bordered: { borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  cardKicker: { fontSize: fontSize.small, color: colors.textMuted, fontWeight: '600' },
  cardTitle: { fontSize: fontSize.title, fontWeight: '700', color: colors.text, flexShrink: 1 },
  cardText: { fontSize: fontSize.body, color: colors.textMuted },
  cardNote: { fontSize: fontSize.small, color: colors.textMuted },
  creditTitle: { fontSize: fontSize.title, fontWeight: '700', color: colors.textOnDark },
  creditText: { fontSize: fontSize.body, color: colors.textOnDarkMuted, marginBottom: spacing.sm },
  sharing: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.trust, borderColor: colors.trust },
});
