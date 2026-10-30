import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import type { SubscriptionPeriod } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { OptionTile } from '../../components/ui/Chip';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { Tag } from '../../components/ui/Tag';
import { useMerchantMoney } from '../../hooks/api/merchant';
import { useLangStore, useT } from '../../i18n';
import { confirmAction, notify } from '../../lib/confirm';
import { formatDate, formatFcfa, formatPayment } from '../../lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '../../theme';

/**
 * Abonnement du commerçant : au mois, ou à l'année avec réduction. Ce qui est limité sans abonnement
 * et ce que l'abonnement débloque sont annoncés clairement. Paiement Mobile Money via la passerelle.
 */
export default function SubscriptionScreen() {
  const styles = useStyles();
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const { colors } = useTheme();
  const money = useMerchantMoney();
  const [period, setPeriod] = useState<SubscriptionPeriod>('year');
  const [paying, setPaying] = useState(false);
  const sub = money.data?.subscription;

  if (money.isPending) return <LoadingView />;
  if (!sub) return <ErrorView error={money.error} onRetry={() => money.refetch()} />;

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
    <>
      <ScreenHeader title={t('merchant.subscription')} subtitle={`${sub.plan_label}`} />
      <Screen refreshing={money.isRefetching} onRefresh={() => money.refetch()}>
        <View style={styles.column}>
          <Card style={{ gap: spacing.sm }}>
            <View style={styles.row}>
              <Text style={[styles.title, { flex: 1 }]}>{t('subscription.status')}</Text>
              <Tag label={sub.status_label} tone={active ? 'trust' : 'danger'} />
            </View>
            {active && sub.ends_on ? <Text style={styles.text}>{t('subscription.until', { date: formatDate(sub.ends_on, lang), n: sub.days_left })}</Text> : null}
            {sub.note ? <Text style={styles.muted}>{sub.note}</Text> : null}
            {!active && sub.limits.text ? (
              <View style={styles.limit}>
                <Icon name="lock" size={16} color={colors.brandDark} />
                <Text style={[styles.text, { flex: 1, color: colors.brandDark }]}>{sub.limits.text}</Text>
              </View>
            ) : null}
            {!active ? <Text style={styles.muted}>{t('subscription.products', { n: sub.limits.active_products, max: sub.limits.product_limit ?? 0 })}</Text> : null}
          </Card>

          <Card style={{ gap: spacing.sm }}>
            <Text style={styles.title}>{t('subscription.benefitsTitle')}</Text>
            {sub.benefits.map((b) => (
              <View key={b} style={styles.benefit}>
                <Icon name="check-circle" size={18} color={colors.trustText} />
                <Text style={[styles.text, { flex: 1 }]}>{b}</Text>
              </View>
            ))}
          </Card>

          {sub.can_pay ? (
            <Card style={{ gap: spacing.md }}>
              <Text style={styles.title}>{active ? t('subscription.extend') : t('subscription.choose')}</Text>
              <View style={styles.row}>
                <OptionTile label={t('subscription.monthly')} hint={formatFcfa(sub.prices.month)} selected={period === 'month'} onPress={() => setPeriod('month')} />
                <OptionTile
                  label={t('subscription.yearly', { pct: sub.prices.year_discount_pct })}
                  hint={formatFcfa(sub.prices.year)}
                  selected={period === 'year'}
                  onPress={() => setPeriod('year')}
                />
              </View>
              {period === 'year' && sub.prices.year_saving > 0 ? (
                <Text style={[styles.text, { color: colors.trustText, fontWeight: '700' }]}>{t('subscription.saving', { amount: formatFcfa(sub.prices.year_saving) })}</Text>
              ) : null}
              <Button label={t('subscription.payButton', { amount: formatPayment(amount) })} icon="smartphone" size="lg" onPress={pay} loading={paying} />
              <Text style={styles.muted}>{t('subscription.payNote')}</Text>
            </Card>
          ) : null}
        </View>
      </Screen>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  column: { gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  title: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  text: { fontSize: fontSize.body, color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  limit: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: c.brandSoft, borderRadius: 10, padding: spacing.md },
  benefit: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
}));
