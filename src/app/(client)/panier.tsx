import { router, useCanGoBack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '../../api/client';
import type { QuoteRequest, ReceptionMode } from '../../api/types';
import { PaymentSheet } from '../../components/client/PaymentSheet';
import { Button } from '../../components/ui/Button';
import { OptionTile } from '../../components/ui/Chip';
import { Icon } from '../../components/ui/Icon';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyView } from '../../components/ui/StateViews';
import { VerifiedIcon } from '../../components/ui/VerifiedIcon';
import { useCreateOrder, useQuote } from '../../hooks/api/client';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { formatFcfa } from '../../lib/format';
import { groupByStall, useCartStore, type CartItem } from '../../store/cartStore';
import { colors, fontSize, radius, spacing } from '../../theme';

const receptionModes: { id: ReceptionMode; label: string; detailLabel: string; placeholder: string }[] = [
  { id: 'delivery', label: 'Livraison Cotonou', detailLabel: 'Quartier et repère', placeholder: 'Ex. Akpakpa, près de la pharmacie Sainte-Rita' },
  { id: 'bus', label: 'Expédition car', detailLabel: 'Ville de destination', placeholder: 'Ex. Parakou' },
  { id: 'axi_point', label: 'Point Axi', detailLabel: 'Point de retrait', placeholder: '' },
];

/** Panier multi-étals : articles groupés par étal, mode de réception, un seul paiement. */
export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const canGoBack = useCanGoBack();
  const { items, receptionMode, receptionDetail, setQuantity, setReception, setReceptionDetail, clear } = useCartStore();
  const groups = useMemo(() => groupByStall(items), [items]);
  const [paying, setPaying] = useState(false);

  const request: QuoteRequest = useMemo(
    () => ({
      lines: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      reception: { mode: receptionMode, detail: receptionDetail.trim() },
    }),
    [items, receptionMode, receptionDetail],
  );
  const quote = useQuote(request);
  const createOrder = useCreateOrder();
  const requireAuth = useRequireAuth();

  if (items.length === 0) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Mon panier" showBack={canGoBack} />
        <EmptyView
          icon="shopping-bag"
          title="Votre panier est vide"
          text="Choisissez des produits chez plusieurs étals : vous payez une seule fois et recevez un seul colis."
        />
      </View>
    );
  }

  const mode = receptionModes.find((m) => m.id === receptionMode)!;
  const detailMissing = request.reception.detail.length === 0;

  const pay = (operator: 'mtn' | 'moov' | 'celtiis', phone: string) => {
    createOrder.mutate(
      { ...request, payment: { operator, phone } },
      {
        onSuccess: (order) => {
          setPaying(false);
          clear();
          router.push(`/commande/${order.id}`);
        },
        onError: (e) => Alert.alert('Paiement', errorMessage(e)),
      },
    );
  };

  const startPayment = () => {
    if (detailMissing) {
      Alert.alert('Réception', receptionMode === 'axi_point' ? 'Choisissez un point Axi.' : `Indiquez : ${mode.detailLabel.toLowerCase()}.`);
      return;
    }
    if (quote.data?.unavailable_product_ids.length) {
      Alert.alert('Panier', 'Certains produits ne sont plus disponibles. Retirez-les pour continuer.');
      return;
    }
    requireAuth(() => setPaying(true), 'Connectez-vous pour payer et suivre votre commande.');
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Mon panier"
        subtitle={`${groups.length} étal${groups.length > 1 ? 's' : ''}, un seul paiement, un seul colis`}
        showBack={canGoBack}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {groups.map((group) => (
          <View key={group.stall_id} style={styles.card}>
            <View style={styles.stallRow}>
              <Text style={styles.stallName} numberOfLines={1}>
                {group.stall_name} · {group.stall_site}
              </Text>
              {group.stall_verified ? <VerifiedIcon /> : null}
            </View>
            {group.items.map((item) => (
              <CartLine
                key={item.product_id}
                item={item}
                unavailable={!!quote.data?.unavailable_product_ids.includes(item.product_id)}
                onChange={(q) => setQuantity(item.product_id, q)}
              />
            ))}
          </View>
        ))}

        <Text style={styles.section}>Réception</Text>
        <View style={styles.modes}>
          {receptionModes.map((m) => (
            <OptionTile key={m.id} label={m.label} selected={receptionMode === m.id} onPress={() => setReception(m.id)} />
          ))}
        </View>

        {receptionMode === 'axi_point' ? (
          <View style={styles.points}>
            {(quote.data?.axi_points ?? []).map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setReceptionDetail(p.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: receptionDetail === p.id }}
                style={[styles.point, receptionDetail === p.id && styles.pointSelected]}
              >
                <Icon name={receptionDetail === p.id ? 'check-circle' : 'circle'} size={18} color={colors.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pointName}>{p.name}</Text>
                  <Text style={styles.pointAddress}>{p.address}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <TextInput
            value={receptionDetail}
            onChangeText={setReceptionDetail}
            placeholder={mode.placeholder}
            placeholderTextColor={colors.textMuted}
            style={styles.detailInput}
            accessibilityLabel={mode.detailLabel}
          />
        )}

        <View style={[styles.card, styles.summary]}>
          {quote.data ? (
            <>
              <SummaryRow label="Articles" value={formatFcfa(quote.data.items_total)} />
              {quote.data.grouping_fee > 0 ? (
                <SummaryRow label={`Regroupement de ${quote.data.stall_count} étals`} value={formatFcfa(quote.data.grouping_fee)} />
              ) : null}
              <SummaryRow label={quote.data.reception_fee_label} value={formatFcfa(quote.data.reception_fee)} />
              <View style={styles.divider} />
              <SummaryRow label="Total" value={formatFcfa(quote.data.total)} strong />
              {quote.isFetching ? <ActivityIndicator style={styles.refreshing} color={colors.brand} /> : null}
            </>
          ) : quote.isError ? (
            <Text style={styles.error}>{errorMessage(quote.error)}</Text>
          ) : (
            <ActivityIndicator color={colors.brand} />
          )}
        </View>

        <View style={styles.escrow}>
          <Icon name="circle" size={12} color={colors.trustText} />
          <Text style={styles.escrowText}>
            Axi garde votre argent jusqu’à la réception. Chaque commerçant est payé quand vous avez reçu votre colis.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label="Payer une fois en Mobile Money" size="lg" onPress={startPayment} disabled={!quote.data} />
      </View>

      <PaymentSheet
        visible={paying}
        total={quote.data?.total ?? 0}
        paying={createOrder.isPending}
        onPay={pay}
        onClose={() => setPaying(false)}
      />
    </View>
  );
}

function CartLine({ item, unavailable, onChange }: { item: CartItem; unavailable: boolean; onChange: (q: number) => void }) {
  return (
    <View style={styles.line}>
      <View style={styles.stepper}>
        <Pressable onPress={() => onChange(item.quantity - 1)} hitSlop={8} accessibilityLabel={`Retirer un ${item.name}`}>
          <Icon name={item.quantity === 1 ? 'x' : 'minus'} size={16} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.qty}>{item.quantity} ×</Text>
        <Pressable onPress={() => onChange(item.quantity + 1)} hitSlop={8} accessibilityLabel={`Ajouter un ${item.name}`}>
          <Icon name="plus" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
      <Text style={[styles.lineName, unavailable && styles.unavailable]} numberOfLines={2}>
        {item.name}
        {unavailable ? ' (plus disponible)' : ''}
      </Text>
      <Text style={styles.linePrice}>{formatFcfa(item.unit_price * item.quantity)}</Text>
    </View>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong && styles.summaryStrong]}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  stallRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stallName: { fontSize: fontSize.title, fontWeight: '700', color: colors.text, flexShrink: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qty: { fontSize: fontSize.body, color: colors.textMuted, minWidth: 28, textAlign: 'center' },
  lineName: { flex: 1, fontSize: fontSize.body, color: colors.textMuted },
  unavailable: { color: colors.danger },
  linePrice: { fontSize: fontSize.body, color: colors.textMuted },
  section: { fontSize: fontSize.heading, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  modes: { flexDirection: 'row', gap: spacing.sm },
  points: { gap: spacing.sm },
  point: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pointSelected: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  pointName: { fontSize: fontSize.body, fontWeight: '600', color: colors.text },
  pointAddress: { fontSize: fontSize.small, color: colors.textMuted },
  detailInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    color: colors.text,
  },
  summary: { marginTop: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: fontSize.body, color: colors.textMuted },
  summaryValue: { fontSize: fontSize.body, color: colors.text },
  summaryStrong: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  refreshing: { position: 'absolute', top: spacing.md, right: spacing.md },
  error: { fontSize: fontSize.body, color: colors.danger },
  escrow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingHorizontal: spacing.xs },
  escrowText: { flex: 1, fontSize: fontSize.small, color: colors.trustText },
  bottomBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
