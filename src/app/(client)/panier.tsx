import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { ApiError, errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import type { ReceptionMode } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { OptionTile } from '../../components/ui/Chip';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyView } from '../../components/ui/StateViews';
import { VerifiedIcon } from '../../components/ui/VerifiedIcon';
import { useSettings } from '../../hooks/api/account';
import { useQuote } from '../../hooks/api/client';
import { useT } from '../../i18n';
import { confirmAction, notify } from '../../lib/confirm';
import { formatFcfa, newIdempotencyKey } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { groupByStall, useCartStore } from '../../store/cartStore';
import { fontSize, makeStyles, radius, spacing, useLayout, useTheme } from '../../theme';

/** Panier multi-étals : un seul paiement Mobile Money, gardé par Axi jusqu'à la réception. */
export default function CartScreen() {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const { tablet } = useLayout();
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const { items, receptionMode, receptionDetail, setQuantity, setReception, setReceptionDetail, clear, paymentKey, setPaymentKey } = useCartStore();
  const settings = useSettings().data;
  const [paying, setPaying] = useState(false);

  // Infos mémorisées : adresse et point de retrait préférés, pour ne rien ressaisir
  useEffect(() => {
    if (!settings || receptionDetail) return;
    if (receptionMode === 'delivery' && settings.default_address) setReceptionDetail(settings.default_address);
    if (receptionMode === 'axi_point' && settings.preferred_point_id) setReceptionDetail(settings.preferred_point_id);
  }, [settings, receptionMode, receptionDetail, setReceptionDetail]);

  const body = useMemo(
    () => ({ lines: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })), reception: { mode: receptionMode, detail: receptionDetail } }),
    [items, receptionMode, receptionDetail],
  );
  const quote = useQuote(body, items.length > 0);
  const q = quote.data;
  const groups = groupByStall(items);

  if (!signedIn) {
    return (
      <>
        <ScreenHeader title={t('cart.title')} showBack={false} />
        <EmptyView icon="shopping-bag" title={t('cart.empty')} text={t('auth.reasonCart')} action={{ label: t('auth.signIn'), onPress: () => router.push('/auth/connexion') }} />
      </>
    );
  }
  if (items.length === 0) {
    return (
      <>
        <ScreenHeader title={t('cart.title')} showBack={false} />
        <EmptyView icon="shopping-bag" title={t('cart.empty')} text={t('cart.emptyText')} action={{ label: t('cart.browse'), onPress: () => router.push('/allees') }} />
      </>
    );
  }

  const unavailable = new Set(q?.unavailable_product_ids ?? []);
  const needsDetail = receptionDetail.trim() === '';

  const pay = () => {
    if (needsDetail) {
      notify(t('cart.detailRequired'));
      return;
    }
    if (!q) return;
    confirmAction(t('cart.payConfirmTitle', { amount: formatFcfa(q.total) }), t('cart.payConfirmText'), async () => {
      setPaying(true);
      // Même clé tant que le panier ne change pas : un nouvel essai ne crée jamais un second débit
      const key = paymentKey ?? newIdempotencyKey();
      setPaymentKey(key);
      try {
        const order = await api.createOrder({ ...body, payment: { operator: null, phone: '' } }, key);
        router.push({ pathname: '/paiement', params: { orderId: order.id, url: order.payment?.payment_url ?? '', returnPrefix: order.payment?.return_url_prefix ?? '' } });
      } catch (e) {
        if (e instanceof ApiError && e.code === 'IDEMPOTENCY_KEY_REUSED') setPaymentKey(null);
        if (e instanceof ApiError && e.code === 'PRODUCT_UNAVAILABLE') quote.refetch();
        notify(t('cart.title'), errorMessage(e));
      } finally {
        setPaying(false);
      }
    });
  };

  const modes: { mode: ReceptionMode; label: string }[] = [
    { mode: 'delivery', label: t('cart.delivery') },
    { mode: 'bus', label: t('cart.bus') },
    { mode: 'axi_point', label: t('cart.point') },
  ];

  const summary = (
    <Card style={{ gap: spacing.sm }}>
      <Row label={t('cart.items')} value={formatFcfa(q?.items_total ?? 0)} />
      {q && q.grouping_fee > 0 ? <Row label={t('cart.grouping', { n: q.stall_count })} value={formatFcfa(q.grouping_fee)} /> : null}
      {q ? <Row label={q.reception_fee_label} value={formatFcfa(q.reception_fee)} /> : null}
      <View style={styles.divider} />
      <Row label={t('cart.total')} value={formatFcfa(q?.total ?? 0)} strong />
      <View style={styles.escrow}>
        <Icon name="shield" size={16} color={colors.trustText} />
        <Text style={styles.escrowText}>{t('cart.payHint')}</Text>
      </View>
    </Card>
  );

  return (
    <>
      <ScreenHeader
        title={t('cart.title')}
        subtitle={t('cart.stalls', { n: groups.length })}
        showBack={false}
        right={<Button label={t('cart.clear')} variant="ghost" size="sm" onPress={() => confirmAction(t('cart.clearConfirm'), t('cart.clearText'), clear, { destructive: true })} />}
      />
      <Screen
        footer={<Button label={`${t('cart.pay')} · ${formatFcfa(q?.total ?? 0)}`} size="lg" icon="smartphone" onPress={pay} loading={paying} disabled={!q || unavailable.size > 0 || quote.isFetching} />}
      >
        <View style={{ flexDirection: tablet ? 'row' : 'column', gap: spacing.lg, alignItems: 'flex-start' }}>
          <View style={{ flex: tablet ? 3 : undefined, width: tablet ? undefined : '100%', gap: spacing.md }}>
            {groups.map((g) => (
              <Card key={g.stall_id} style={{ gap: spacing.md }}>
                <Pressable onPress={() => router.push(`/etal/${g.stall_id}`)} style={styles.stallRow}>
                  <Text style={styles.stallName}>{g.stall_name}</Text>
                  {g.stall_verified ? <VerifiedIcon /> : null}
                  <Text style={styles.site}>{g.stall_site}</Text>
                </Pressable>
                {g.items.map((item) => (
                  <View key={item.product_id} style={styles.item}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, unavailable.has(item.product_id) && styles.strike]}>{item.name}</Text>
                      <Text style={unavailable.has(item.product_id) ? styles.unavailable : styles.itemPrice}>
                        {unavailable.has(item.product_id) ? t('cart.unavailable') : formatFcfa(item.unit_price * item.quantity)}
                      </Text>
                    </View>
                    <View style={styles.qty}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('cart.remove')}
                        onPress={() => (item.quantity === 1 ? confirmAction(t('cart.removeConfirm'), item.name, () => setQuantity(item.product_id, 0)) : setQuantity(item.product_id, item.quantity - 1))}
                        style={styles.qtyBtn}
                      >
                        <Icon name={item.quantity === 1 ? 'trash-2' : 'minus'} size={16} />
                      </Pressable>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <Pressable accessibilityRole="button" accessibilityLabel={t('common.add')} onPress={() => setQuantity(item.product_id, item.quantity + 1)} style={styles.qtyBtn}>
                        <Icon name="plus" size={16} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </Card>
            ))}
            <Text style={styles.section}>{t('cart.reception')}</Text>
            <View style={styles.modes}>
              {modes.map((m) => (
                <OptionTile key={m.mode} label={m.label} selected={receptionMode === m.mode} onPress={() => setReception(m.mode, m.mode === 'delivery' ? settings?.default_address ?? '' : m.mode === 'axi_point' ? settings?.preferred_point_id ?? '' : '')} />
              ))}
            </View>
            {receptionMode === 'axi_point' ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.label}>{t('cart.choosePoint')}</Text>
                {(q?.axi_points ?? []).map((p) => (
                  <OptionTile key={p.id} label={p.name} hint={p.address} selected={receptionDetail === p.id} onPress={() => setReceptionDetail(p.id)} />
                ))}
              </View>
            ) : (
              <TextInput
                value={receptionDetail}
                onChangeText={setReceptionDetail}
                placeholder={receptionMode === 'bus' ? t('cart.detailBus') : t('cart.detailDelivery')}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                accessibilityLabel={receptionMode === 'bus' ? t('cart.detailBus') : t('cart.detailDelivery')}
              />
            )}
          </View>
          <View style={{ flex: tablet ? 2 : undefined, width: tablet ? undefined : '100%' }}>{summary}</View>
        </View>
      </Screen>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={strong ? styles.totalLabel : styles.rowLabel}>{label}</Text>
      <Text style={strong ? styles.totalValue : styles.rowValue}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  stallRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  stallName: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  site: { fontSize: fontSize.small, color: c.textMuted, width: '100%' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemName: { fontSize: fontSize.body, color: c.text, fontWeight: '500' },
  itemPrice: { fontSize: fontSize.body, color: c.brand, fontWeight: '700' },
  unavailable: { fontSize: fontSize.small, color: c.danger, fontWeight: '600' },
  strike: { textDecorationLine: 'line-through', color: c.textMuted },
  qty: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  qtyText: { minWidth: 22, textAlign: 'center', fontSize: fontSize.title, fontWeight: '700', color: c.text },
  section: { fontSize: fontSize.heading - 2, fontWeight: '700', color: c.text, marginTop: spacing.md },
  label: { fontSize: fontSize.small, fontWeight: '600', color: c.text },
  modes: { flexDirection: 'row', gap: spacing.sm },
  input: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 50, fontSize: fontSize.title, color: c.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { fontSize: fontSize.body, color: c.textMuted, flexShrink: 1 },
  rowValue: { fontSize: fontSize.body, color: c.text, fontWeight: '600' },
  totalLabel: { fontSize: fontSize.title, color: c.text, fontWeight: '700' },
  totalValue: { fontSize: fontSize.title, color: c.brand, fontWeight: '800' },
  divider: { height: 1, backgroundColor: c.border, marginVertical: spacing.xs },
  escrow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: c.trustSoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  escrowText: { flex: 1, fontSize: fontSize.small, color: c.trustText, fontWeight: '600' },
}));
