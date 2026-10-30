import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Text, TextInput, View } from 'react-native';

import { errorMessage } from '../../api/client';
import type { Order } from '../../api/types';
import { Button, IconButton } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { Tag } from '../../components/ui/Tag';
import { useOrder, useOrderAction } from '../../hooks/api/client';
import { useSettings } from '../../hooks/api/account';
import { useT } from '../../i18n';
import { confirmAction, notify } from '../../lib/confirm';
import { formatFcfa, formatShortDate, orderNumber } from '../../lib/format';
import { useCartStore } from '../../store/cartStore';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { callPhone, openWhatsapp } from '../../lib/contact';

/** Suivi d'une commande : paiement, préparation par étal, réception, litige. */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const order = useOrder(id);
  const actions = useOrderAction(id);
  const dateFormat = useSettings().data?.date_format;
  const { paymentKey, clear } = useCartStore();
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState('');
  const o = order.data;

  // Panier vidé une fois la commande payée (la clé de paiement correspondait à ce panier)
  useEffect(() => {
    if (o && o.status !== 'awaiting_payment' && o.status !== 'cancelled' && paymentKey) clear();
  }, [o, paymentKey, clear]);

  if (order.isPending) return <LoadingView />;
  if (!o) return <ErrorView error={order.error} onRetry={() => order.refetch()} />;

  const run = (mutation: { mutate: (v?: never, opts?: { onError: (e: unknown) => void; onSuccess?: () => void }) => void }, success?: string) =>
    mutation.mutate(undefined, { onError: (e) => notify(t('orders.title'), errorMessage(e), 'error'), onSuccess: success ? () => notify(success) : undefined });

  const tone = o.status === 'delivered' ? 'trust' : o.status === 'disputed' || o.status === 'cancelled' ? 'danger' : o.status === 'refunded' ? 'outline' : 'brand';

  return (
    <>
      <ScreenHeader title={t('orders.order', { id: orderNumber(o.id) })} subtitle={formatShortDate(o.created_at, dateFormat, true)} />
      <Screen refreshing={order.isRefetching} onRefresh={() => order.refetch()}>
        <Card style={{ gap: spacing.sm }}>
          <Tag label={o.status_label} tone={tone} size="md" />
          <Text style={styles.total}>{formatFcfa(o.total)}</Text>
          {o.payment_instructions ? <Text style={styles.muted}>{o.payment_instructions}</Text> : null}
          {o.payment && o.payment.refunded_amount > 0 ? <Text style={styles.muted}>{t('orders.refunded', { amount: formatFcfa(o.payment.refunded_amount) })}</Text> : null}
          {o.dispute ? <Text style={[styles.muted, { color: colors.danger }]}>{t('orders.dispute_status', { label: o.dispute.status_label })}{o.dispute.resolution ? ` · ${o.dispute.resolution}` : ''}</Text> : null}
          {o.status === 'awaiting_payment' ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {o.payment?.payment_url ? (
                <Button
                  label={t('orders.openPayment')}
                  icon="smartphone"
                  onPress={() => router.push({ pathname: '/paiement', params: { orderId: o.id, url: o.payment!.payment_url!, returnPrefix: o.payment!.return_url_prefix } })}
                />
              ) : null}
              <Button label={o.payment?.payment_url ? t('orders.checkPayment') : t('orders.retryPayment')} variant="ghost" loading={actions.verify.isPending} onPress={() => actions.verify.mutate(undefined, { onError: (e) => notify(t('orders.title'), errorMessage(e), 'error') })} />
              {o.can_cancel ? (
                <Button label={t('orders.cancel')} variant="danger" onPress={() => confirmAction(t('orders.cancelConfirm'), t('orders.cancelText'), () => run(actions.cancel), { destructive: true })} />
              ) : null}
            </View>
          ) : null}
        </Card>

        {o.can_confirm_receipt ? (
          <Card tone="trustSoft" style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Icon name="shield" size={18} color={colors.trustText} />
              <Text style={[styles.muted, { color: colors.trustText, flex: 1 }]}>{t('orders.escrow')}</Text>
            </View>
            <Button label={t('orders.received')} variant="trust" icon="check-circle" loading={actions.receive.isPending} onPress={() => confirmAction(t('orders.receivedConfirm'), t('orders.receivedText'), () => run(actions.receive))} />
            {o.can_dispute ? <Button label={t('orders.dispute')} variant="danger" icon="alert-triangle" onPress={() => setDisputeOpen(true)} /> : null}
          </Card>
        ) : null}

        <Text style={styles.section}>{t('orders.stalls')}</Text>
        {o.stalls.map((s) => (
          <StallBlock key={s.id} stall={s} />
        ))}

        <Card style={{ gap: spacing.sm }}>
          <Line label={t('cart.items')} value={formatFcfa(o.items_total)} />
          {o.grouping_fee > 0 ? <Line label={t('cart.grouping', { n: o.stalls.length })} value={formatFcfa(o.grouping_fee)} /> : null}
          <Line label={`${o.reception.label} · ${o.reception.detail}`} value={formatFcfa(o.reception_fee)} />
          {o.service_fee > 0 ? <Line label={t('cart.serviceFee')} value={formatFcfa(o.service_fee)} /> : null}
          <Line label={o.payment_mode === 'on_site' ? t('cart.paidOnline') : t('orders.total')} value={formatFcfa(o.total)} strong />
          {o.payment_mode === 'on_site' ? <Line label={t('cart.payCash')} value={formatFcfa(o.cash_total)} /> : null}
          {o.payment ? <Text style={styles.ref}>{`${o.payment.provider.toUpperCase()} · ${o.payment.reference}${o.payment.provider_ref ? ` · ${o.payment.provider_ref}` : ''}`}</Text> : null}
        </Card>
      </Screen>

      <Modal visible={disputeOpen} transparent animationType="slide" onRequestClose={() => setDisputeOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('orders.disputeTitle')}</Text>
            <Text style={styles.muted}>{t('orders.disputeHint')}</Text>
            <TextInput value={reason} onChangeText={setReason} multiline placeholder={t('orders.disputeReason')} placeholderTextColor={colors.textMuted} style={styles.textarea} accessibilityLabel={t('orders.disputeReason')} />
            <Button
              label={t('orders.disputeSend')}
              variant="danger"
              disabled={reason.trim().length < 5}
              loading={actions.dispute.isPending}
              onPress={() =>
                confirmAction(t('orders.disputeConfirm'), t('orders.disputeConfirmText'), () =>
                  actions.dispute.mutate(
                    { reason: reason.trim() },
                    { onSuccess: () => setDisputeOpen(false), onError: (e) => notify(t('orders.disputeTitle'), errorMessage(e), 'error') },
                  ),
                )
              }
            />
            <Button label={t('common.cancel')} variant="ghost" onPress={() => setDisputeOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

function StallBlock({ stall }: { stall: Order['stalls'][number] }) {
  const styles = useStyles();
  const t = useT();
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.stallHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stallName}>{stall.name}</Text>
          <Text style={styles.muted}>{stall.status_label}</Text>
        </View>
        {stall.whatsapp ? <IconButton icon="whatsapp" label={t('common.whatsapp')} onPress={() => openWhatsapp(stall.whatsapp!)} /> : null}
        {stall.phone ? <IconButton icon="phone" label={t('common.call')} onPress={() => callPhone(stall.phone)} /> : null}
      </View>
      {stall.items.map((i, k) => (
        <Line key={k} label={`${i.quantity} × ${i.name}`} value={formatFcfa(i.line_total)} />
      ))}
    </Card>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const styles = useStyles();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
      <Text style={[styles.lineLabel, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.lineValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  total: { fontSize: 30, fontWeight: '800', color: c.text },
  muted: { fontSize: fontSize.body, color: c.textMuted },
  section: { fontSize: fontSize.heading - 2, fontWeight: '700', color: c.text, marginTop: spacing.md },
  stallHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stallName: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  lineLabel: { fontSize: fontSize.body, color: c.textMuted, flex: 1 },
  lineValue: { fontSize: fontSize.body, color: c.text, fontWeight: '600' },
  strong: { color: c.text, fontWeight: '800', fontSize: fontSize.title },
  ref: { fontSize: fontSize.caption, color: c.textMuted, marginTop: spacing.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 560, backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  sheetTitle: { fontSize: fontSize.heading, fontWeight: '700', color: c.text },
  textarea: { minHeight: 110, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.body, color: c.text, textAlignVertical: 'top', backgroundColor: c.surface },
}));
