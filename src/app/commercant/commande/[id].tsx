import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { errorMessage } from '../../../api/client';
import { api } from '../../../api/endpoints';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { CachedImage } from '../../../components/ui/CachedImage';
import { Card } from '../../../components/ui/Card';
import { Icon } from '../../../components/ui/Icon';
import { Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../../components/ui/StateViews';
import { Tag } from '../../../components/ui/Tag';
import { useSettings } from '../../../hooks/api/account';
import { useMerchantActions, useMerchantOrder } from '../../../hooks/api/merchant';
import { useT } from '../../../i18n';
import { confirmAction, notify } from '../../../lib/confirm';
import { callPhone } from '../../../lib/contact';
import { formatFcfa, formatShortDate, orderNumber } from '../../../lib/format';
import { fit, fontSize, makeStyles, radius, spacing, useLayout, useTheme } from '../../../theme';

/**
 * Détail d'une commande reçue : quoi préparer, pour qui, comment elle part, combien le commerçant touche
 * et où en est son argent. Les étapes se mettent à jour seules (prête, coursier, reçue, versée).
 */
export default function MerchantOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const styles = useStyles();
  const { colors } = useTheme();
  const { tablet } = useLayout();
  const dateFormat = useSettings().data?.date_format;
  const order = useMerchantOrder(id);
  const actions = useMerchantActions();
  const o = order.data;

  if (order.isPending) return <LoadingView />;
  if (!o) return <ErrorView error={order.error} onRetry={() => order.refetch()} />;

  const when = (iso: string | null) => (iso ? formatShortDate(iso, dateFormat, true) : null);
  const statusTone = o.status === 'to_prepare' ? 'brand' : o.status === 'cancelled' ? 'danger' : o.status === 'delivered' ? 'neutral' : 'trust';
  const moneyCard = { brand: 'brandSoft', trust: 'trustSoft', danger: 'dangerSoft', neutral: 'surface' } as const;
  const cash = o.money.state === 'cash';

  const markReady = () =>
    confirmAction(t('merchant.readyConfirm'), o.summary, () =>
      actions.ready.mutate(o.id, { onSuccess: () => order.refetch(), onError: (e) => notify(t('merchant.ready'), errorMessage(e), 'error') }),
    );
  const write = () =>
    o.customer.client_id &&
    api
      .openClientConversation(o.customer.client_id)
      .then(({ conversation }) => router.push(`/messages/${conversation.id}`))
      .catch((e) => notify(t('chat.title'), errorMessage(e), 'error'));

  const amountRow = (label: string, value: string, strong = false) => (
    <View style={styles.line}>
      <Text style={[strong ? styles.title : styles.text, { flex: 1 }]}>{label}</Text>
      <Text style={strong ? styles.total : styles.text}>{value}</Text>
    </View>
  );

  return (
    <>
      <ScreenHeader title={t('merchantOrders.detailTitle', { n: orderNumber(o.id) })} subtitle={when(o.created_at) ?? undefined} />
      <Screen>
        {/* Statut et action principale */}
        <Card style={{ gap: spacing.md }}>
          <View style={styles.line}>
            <Tag label={o.status_label} tone={statusTone} size="md" />
            <Text style={[styles.muted, { flex: 1, textAlign: 'right' }]}>{t('merchantOrders.items', { n: o.items_count })}</Text>
          </View>
          <Text style={styles.big}>{formatFcfa(o.amount)}</Text>
          {o.can_mark_ready ? <Button label={t('merchant.ready')} icon="check" variant="dark" size="lg" loading={actions.ready.isPending} onPress={markReady} /> : null}
        </Card>

        <View style={{ flexDirection: tablet ? 'row' : 'column', gap: spacing.sm }}>
          {/* Client */}
          <Card style={{ flex: 1, gap: spacing.md }}>
            <Text style={styles.label}>{t('merchantOrders.customer')}</Text>
            <View style={styles.line}>
              <Avatar name={o.customer.name} size={44} variant="soft" />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{o.customer.name}</Text>
                {o.customer.orders_count ? <Text style={styles.muted}>{t('merchantOrders.customerOrders', { n: o.customer.orders_count })}</Text> : null}
                {o.customer.phone ? <Text style={styles.muted}>{o.customer.phone}</Text> : null}
              </View>
            </View>
            <View style={styles.actions}>
              {o.customer.phone ? <Button label={t('merchantOrders.call')} icon="phone" size="sm" variant="ghost" onPress={() => callPhone(o.customer.phone)} style={{ flex: 1 }} /> : null}
              {o.customer.can_message ? <Button label={t('merchantOrders.message')} icon="message-circle" size="sm" variant="ghost" onPress={write} style={{ flex: 1 }} /> : null}
              {o.customer.client_id ? <Button label={t('merchantOrders.clientFile')} icon="user" size="sm" variant="ghost" onPress={() => router.push(`/commercant/client/${o.customer.client_id}`)} style={{ flex: 1 }} /> : null}
            </View>
          </Card>

          {/* Réception et paiement */}
          <Card style={{ flex: 1, gap: spacing.md }}>
            <View style={{ gap: 2 }}>
              <Text style={styles.label}>{t('merchantOrders.reception')}</Text>
              <Text style={styles.title}>{o.reception.label}</Text>
              {o.reception.detail ? <Text style={styles.muted}>{o.reception.detail}</Text> : null}
            </View>
            <View style={{ gap: 2 }}>
              <Text style={styles.label}>{t('merchantOrders.payment')}</Text>
              <Text style={styles.title}>{o.payment.label}</Text>
              {o.payment.paid_at ? <Text style={styles.muted}>{when(o.payment.paid_at)}</Text> : null}
            </View>
          </Card>
        </View>

        {/* Articles à préparer */}
        <Card style={{ gap: spacing.md }}>
          <Text style={styles.label}>{t('merchantOrders.articles')}</Text>
          {o.lines.map((l, i) => (
            <View key={`${l.product_id}-${i}`} style={styles.line}>
              <CachedImage image={l.image} fallback style={styles.thumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={2}>{l.name}</Text>
                <Text style={styles.muted}>{`${l.quantity} × ${formatFcfa(l.unit_price)}`}</Text>
              </View>
              <Text style={styles.title}>{formatFcfa(l.total)}</Text>
            </View>
          ))}
        </Card>

        {/* Montants */}
        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.label}>{t('merchantOrders.amounts')}</Text>
          {amountRow(t('merchantOrders.itemsTotal'), formatFcfa(o.amounts.items_total))}
          {!cash && o.amounts.commission > 0 ? amountRow(t('merchantOrders.commission', { pct: o.amounts.commission_pct }), `− ${formatFcfa(o.amounts.commission)}`) : null}
          {o.amounts.refunded > 0 ? amountRow(t('merchantOrders.refunded'), `− ${formatFcfa(o.amounts.refunded)}`) : null}
          <View style={styles.divider} />
          {amountRow(cash ? t('merchantOrders.netCash') : t('merchantOrders.net'), formatFcfa(o.amounts.net), true)}
        </Card>

        {/* Où en est l'argent */}
        <Card tone={moneyCard[o.money.tone]} style={[{ gap: 4 }, o.money.tone === 'neutral' && { borderWidth: 1, borderColor: colors.border }]}>
          <Text style={styles.label}>{t('merchantOrders.money')}</Text>
          <Text style={styles.text}>{o.money.label}</Text>
        </Card>

        {/* Suivi */}
        <Card style={{ gap: 0 }}>
          <Text style={[styles.label, { marginBottom: spacing.sm }]}>{t('merchantOrders.steps')}</Text>
          {o.steps.map((s, i) => (
            <View key={s.key} style={styles.step}>
              <View style={{ alignItems: 'center', width: 22 }}>
                <View style={[styles.dot, { backgroundColor: s.done ? colors.trust : colors.surface, borderColor: s.done ? colors.trust : colors.border }]}>
                  {s.done ? <Icon name="check" size={12} color="#FFFFFF" /> : null}
                </View>
                {i < o.steps.length - 1 ? <View style={[styles.rail, { backgroundColor: s.done && o.steps[i + 1]?.done ? colors.trust : colors.border }]} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: spacing.md }}>
                <Text style={[styles.text, { fontWeight: s.done ? '700' : '400', color: s.done ? colors.text : colors.textMuted }]}>{s.label}</Text>
                {s.at ? <Text style={styles.muted}>{when(s.at)}</Text> : null}
              </View>
            </View>
          ))}
        </Card>
      </Screen>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  label: { fontSize: fontSize.small, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  text: { fontSize: fontSize.body, color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  big: { fontSize: fit(30), fontWeight: '800', color: c.text },
  total: { fontSize: fontSize.title, fontWeight: '800', color: c.trustText },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  thumb: { width: 52, height: 52, borderRadius: radius.md },
  divider: { height: 1, backgroundColor: c.border, marginVertical: 4 },
  step: { flexDirection: 'row', gap: spacing.md },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rail: { width: 2, flex: 1, minHeight: 14 },
}));
