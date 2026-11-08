import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import type { SubscriptionInfo, SubscriptionPeriod } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { OptionTile } from '../../components/ui/Chip';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { Tag } from '../../components/ui/Tag';
import { useSettings } from '../../hooks/api/account';
import { useMerchantActions, useMerchantMoney } from '../../hooks/api/merchant';
import { useLangStore, useT } from '../../i18n';
import { confirmAction, notify, toast } from '../../lib/confirm';
import { openLink } from '../../lib/contact';
import { formatDate, formatFcfa, formatPayment, formatShortDate } from '../../lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';

/**
 * Abonnement du commerçant.
 * - Pas abonné (ou expiré) : ce que l'abonnement débloque, choix mois / année, paiement Mobile Money.
 * - Abonné : gestion — période en cours, jours restants, reçus de chaque paiement, prolonger, résilier
 *   (l'abonnement reste actif jusqu'à la fin de la période payée) ou annuler la résiliation.
 */
export default function SubscriptionScreen() {
  const t = useT();
  const money = useMerchantMoney();
  const sub = money.data?.subscription;

  if (money.isPending) return <LoadingView />;
  if (!sub) return <ErrorView error={money.error} onRetry={() => money.refetch()} />;

  const active = sub.status === 'active';
  return (
    <>
      <ScreenHeader title={active ? t('subscriptionManage.title') : t('merchant.subscription')} subtitle={sub.plan_label} />
      <Screen>{active ? <ManageView sub={sub} /> : <SubscribeView sub={sub} />}</Screen>
    </>
  );
}

/** Abonné : la page de gestion */
function ManageView({ sub }: { sub: SubscriptionInfo }) {
  const t = useT();
  const styles = useStyles();
  const lang = useLangStore((s) => s.lang);
  const { colors } = useTheme();
  const dateFormat = useSettings().data?.date_format;
  const actions = useMerchantActions();
  const [extend, setExtend] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  const endsOn = sub.ends_on ?? '';
  const total = sub.starts_on && sub.ends_on ? Math.max(1, (Date.parse(sub.ends_on) - Date.parse(sub.starts_on)) / 86_400_000 + 1) : 1;
  const elapsed = Math.min(1, Math.max(0, 1 - sub.days_left / total));

  const openReceipt = async (id: string) => {
    setOpening(id);
    try {
      const { url } = await api.subscriptionReceipt(id);
      openLink(url);
    } catch (e) {
      notify(t('subscriptionManage.receipt'), errorMessage(e), 'error');
    } finally {
      setOpening(null);
    }
  };

  const cancel = () =>
    confirmAction(
      t('subscriptionManage.cancelConfirm'),
      t('subscriptionManage.cancelText', { date: formatDate(endsOn, lang) }),
      () => actions.cancelSubscription.mutate(undefined, { onSuccess: () => toast(t('subscriptionManage.cancelDone', { date: formatDate(endsOn, lang) }), 'info'), onError: (e) => notify(t('subscriptionManage.cancel'), errorMessage(e), 'error') }),
      { destructive: true, confirmLabel: t('subscriptionManage.cancel') },
    );
  const resume = () =>
    actions.resumeSubscription.mutate(undefined, { onSuccess: () => toast(t('subscriptionManage.resumeDone')), onError: (e) => notify(t('subscriptionManage.resume'), errorMessage(e), 'error') });

  return (
    <View style={styles.column}>
      {/* Période en cours */}
      <Card style={{ gap: spacing.md }}>
        <View style={styles.row}>
          <Text style={[styles.title, { flex: 1 }]}>{t('subscriptionManage.current')}</Text>
          <Tag label={sub.cancelled ? t('subscriptionManage.cancelledTag') : sub.status_label} tone={sub.cancelled ? 'brand' : 'trust'} icon={sub.cancelled ? 'clock' : 'check'} />
        </View>
        <Text style={styles.big}>{t('subscriptionManage.daysLeft', { n: sub.days_left })}</Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${Math.round(elapsed * 100)}%`, backgroundColor: sub.cancelled ? colors.brand : colors.trust }]} />
        </View>
        <View style={styles.row}>
          {sub.starts_on ? <Text style={[styles.muted, { flex: 1 }]}>{t('subscriptionManage.since', { date: formatDate(sub.starts_on, lang) })}</Text> : <View style={{ flex: 1 }} />}
          <Text style={styles.muted}>{t('subscriptionManage.until', { date: formatDate(endsOn, lang) })}</Text>
        </View>
        {sub.note ? <Text style={styles.muted}>{sub.note}</Text> : null}
        {sub.cancelled ? (
          <View style={styles.notice}>
            <Icon name="info" size={16} color={colors.brandDark} />
            <Text style={[styles.text, { flex: 1, color: colors.brandDark }]}>{t('subscriptionManage.cancelledNote', { date: formatDate(endsOn, lang) })}</Text>
          </View>
        ) : null}
      </Card>

      <Benefits sub={sub} />

      {/* Paiements et reçus */}
      {sub.history?.length ? (
        <Card style={{ gap: spacing.md }}>
          <Text style={styles.title}>{t('subscriptionManage.receipts')}</Text>
          {sub.history.map((h) => (
            <View key={h.id} style={styles.receipt}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.strong}>{`${formatFcfa(h.amount)} · ${h.period_label}`}</Text>
                <Text style={styles.muted}>{`${formatShortDate(h.starts_on, dateFormat)} → ${formatShortDate(h.ends_on, dateFormat)}`}</Text>
                {h.paid_by !== 'merchant' ? <Text style={styles.muted}>{t('subscriptionManage.included')}</Text> : null}
              </View>
              {h.receipt ? <Button label={t('subscriptionManage.receipt')} icon="download" size="sm" variant="ghost" loading={opening === h.id} onPress={() => openReceipt(h.id)} /> : null}
            </View>
          ))}
        </Card>
      ) : null}

      {/* Prolonger : le choix de durée n'apparaît qu'à la demande */}
      {sub.can_pay ? extend ? <PayCard sub={sub} /> : <Button label={t('subscriptionManage.extend')} icon="plus" variant="outline" onPress={() => setExtend(true)} /> : null}

      {sub.can_cancel ? (
        sub.cancelled ? (
          <Button label={t('subscriptionManage.resume')} icon="rotate-ccw" variant="trust" loading={actions.resumeSubscription.isPending} onPress={resume} />
        ) : (
          <Button label={t('subscriptionManage.cancel')} variant="danger" loading={actions.cancelSubscription.isPending} onPress={cancel} />
        )
      ) : null}
      <Button label={t('subscriptionManage.help')} icon="help-circle" variant="ghost" size="sm" onPress={() => router.push('/parametres/aide')} />
    </View>
  );
}

/** Pas abonné : avantages et paiement */
function SubscribeView({ sub }: { sub: SubscriptionInfo }) {
  const t = useT();
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.column}>
      <Card style={{ gap: spacing.sm }}>
        <View style={styles.row}>
          <Text style={[styles.title, { flex: 1 }]}>{t('subscription.status')}</Text>
          <Tag label={sub.status_label} tone="danger" />
        </View>
        {sub.note ? <Text style={styles.muted}>{sub.note}</Text> : null}
        {sub.limits.text ? (
          <View style={styles.notice}>
            <Icon name="lock" size={16} color={colors.brandDark} />
            <Text style={[styles.text, { flex: 1, color: colors.brandDark }]}>{sub.limits.text}</Text>
          </View>
        ) : null}
        <Text style={styles.muted}>{t('subscription.products', { n: sub.limits.active_products, max: sub.limits.product_limit ?? 0 })}</Text>
      </Card>
      <Benefits sub={sub} />
      {sub.can_pay ? <PayCard sub={sub} /> : null}
    </View>
  );
}

function Benefits({ sub }: { sub: SubscriptionInfo }) {
  const t = useT();
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Card style={{ gap: spacing.sm }}>
      <Text style={styles.title}>{t('subscription.benefitsTitle')}</Text>
      {sub.benefits.map((b) => (
        <View key={b} style={styles.row}>
          <Icon name="check-circle" size={18} color={colors.trustText} />
          <Text style={[styles.text, { flex: 1 }]}>{b}</Text>
        </View>
      ))}
    </Card>
  );
}

/** Choix mois / année et paiement Mobile Money (s'abonner ou prolonger) */
function PayCard({ sub }: { sub: SubscriptionInfo }) {
  const t = useT();
  const styles = useStyles();
  const { colors } = useTheme();
  const [period, setPeriod] = useState<SubscriptionPeriod>('year');
  const [paying, setPaying] = useState(false);
  const active = sub.status === 'active';
  const amount = period === 'year' ? sub.prices.year : sub.prices.month;

  const pay = () =>
    confirmAction(
      t('subscription.payConfirm', { amount: formatPayment(amount), period: period === 'year' ? t('subscription.oneYear') : t('subscription.oneMonth') }),
      active ? t('subscription.extendText') : t('payment.closeText'),
      async () => {
        setPaying(true);
        try {
          const p = await api.paySubscription(period);
          router.push({ pathname: '/paiement', params: { subRef: p.reference, url: p.payment_url ?? '', returnPrefix: p.return_url_prefix } });
        } catch (e) {
          notify(t('merchant.subscription'), errorMessage(e), 'error');
        } finally {
          setPaying(false);
        }
      },
      { confirmLabel: t('subscription.pay') },
    );

  return (
    <Card style={{ gap: spacing.md }}>
      <Text style={styles.title}>{active ? t('subscription.extend') : t('subscription.choose')}</Text>
      {active ? <Text style={styles.muted}>{t('subscription.extendText')}</Text> : null}
      <View style={styles.row}>
        <OptionTile label={t('subscription.monthly')} hint={formatFcfa(sub.prices.month)} selected={period === 'month'} onPress={() => setPeriod('month')} />
        <OptionTile label={t('subscription.yearly', { pct: sub.prices.year_discount_pct })} hint={formatFcfa(sub.prices.year)} selected={period === 'year'} onPress={() => setPeriod('year')} />
      </View>
      {period === 'year' && sub.prices.year_saving > 0 ? (
        <Text style={[styles.text, { color: colors.trustText, fontWeight: '700' }]}>{t('subscription.saving', { amount: formatFcfa(sub.prices.year_saving) })}</Text>
      ) : null}
      <Button label={t('subscription.payButton', { amount: formatPayment(amount) })} icon="smartphone" size="lg" onPress={pay} loading={paying} />
      <Text style={styles.muted}>{t('subscription.payNote')}</Text>
    </Card>
  );
}

const useStyles = makeStyles((c) => ({
  column: { gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  title: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  strong: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  text: { fontSize: fontSize.body, color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  big: { fontSize: 26, fontWeight: '800', color: c.text },
  bar: { height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  notice: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: c.brandSoft, borderRadius: radius.md, padding: spacing.md },
  receipt: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: c.border },
}));
