import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Text, TextInput, View } from 'react-native';

import { errorMessage } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { SwitchRow } from '../../../components/ui/Field';
import { Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../../components/ui/StateViews';
import { Tag } from '../../../components/ui/Tag';
import { useSettings } from '../../../hooks/api/account';
import { useMerchantActions, useMerchantMoney } from '../../../hooks/api/merchant';
import { useLangStore, useT } from '../../../i18n';
import { confirmAction, notify } from '../../../lib/confirm';
import { formatDate, formatFcfa, formatShortDate } from '../../../lib/format';
import { fontSize, makeStyles, radius, spacing, useLayout, useTheme } from '../../../theme';

/** « Mon argent » : séquestre, versements, abonnement, offre fournisseur, crédit, partage avec l'IMF. */
export default function MoneyScreen() {
  const styles = useStyles();
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const { colors } = useTheme();
  const { tablet } = useLayout();
  const money = useMerchantMoney();
  const actions = useMerchantActions();
  const dateFormat = useSettings().data?.date_format;
  const [creditAmount, setCreditAmount] = useState('');
  const m = money.data;

  if (money.isPending) return <LoadingView />;
  if (!m) return <ErrorView error={money.error} onRetry={() => money.refetch()} />;

  const toggleSharing = (enabled: boolean) =>
    confirmAction(
      enabled ? t('merchant.dataSharingConfirmOn') : t('merchant.dataSharingConfirmOff'),
      enabled ? m.data_sharing.text : t('merchant.dataSharingOffText', { partner: m.data_sharing.partner_name }),
      () => actions.dataSharing.mutate(enabled, { onError: (e) => notify(t('merchant.dataSharing', { partner: m.data_sharing.partner_name }), errorMessage(e), 'error') }),
      { destructive: !enabled },
    );

  return (
    <>
      <ScreenHeader title={t('nav.money')} showBack={false} right={<Button label={t('merchant.sales')} icon="bar-chart-2" size="sm" variant="ghost" onPress={() => router.push('/ventes')} />} />
      <Screen refreshing={money.isRefetching} onRefresh={() => money.refetch()}>
        <View style={{ flexDirection: tablet ? 'row' : 'column', gap: spacing.md }}>
          <Card tone="trustSoft" style={{ flex: 1 }}>
            <Text style={[styles.kpiLabel, { color: colors.trustText }]}>{t('merchant.pending')}</Text>
            <Text style={[styles.kpi, { color: colors.trustText }]}>{formatFcfa(m.pending_amount)}</Text>
            <Text style={[styles.small, { color: colors.trustText }]}>{t('merchant.pendingHint')}</Text>
          </Card>
          <View style={{ flex: 1, flexDirection: 'row', gap: spacing.md }}>
            <Card style={{ flex: 1 }}>
              <Text style={styles.kpiLabel}>{t('merchant.released')}</Text>
              <Text style={styles.kpiSmall}>{formatFcfa(m.released_amount)}</Text>
              <Text style={styles.small}>{t('merchant.releasedHint')}</Text>
            </Card>
            <Card style={{ flex: 1 }}>
              <Text style={styles.kpiLabel}>{t('merchant.paidOut')}</Text>
              <Text style={styles.kpiSmall}>{formatFcfa(m.paid_out_amount)}</Text>
            </Card>
          </View>
        </View>
        <Text style={styles.small}>{t('merchant.commission', { pct: m.commission_rate_pct })}</Text>
        {/* Comment le commerçant reçoit son argent */}
        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.title}>{t('money.howTitle')}</Text>
          {(['money.how1', 'money.how2', 'money.how3', 'money.how4'] as const).map((k, i) => (
            <Text key={k} style={styles.text}>{`${i + 1}. ${t(k, { pct: m.commission_rate_pct })}`}</Text>
          ))}
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <View style={styles.row}>
            <Text style={[styles.title, { flex: 1 }]}>{t('merchant.subscription')}</Text>
            <Tag label={m.subscription.status_label} tone={m.subscription.status === 'active' ? 'trust' : 'danger'} />
          </View>
          <Text style={styles.text}>{m.subscription.plan_label}</Text>
          {m.subscription.ends_on ? <Text style={styles.small}>{t('merchant.subscriptionUntil', { date: formatDate(m.subscription.ends_on, lang) })}</Text> : null}
          {m.subscription.note ? <Text style={styles.small}>{m.subscription.note}</Text> : null}
          {m.subscription.limits.text ? <Text style={styles.small}>{m.subscription.limits.text}</Text> : null}
          <Button label={m.subscription.status === 'active' ? t('subscription.manage') : t('subscription.cta', { amount: formatFcfa(m.subscription.prices.month) })} icon="star" variant={m.subscription.status === 'active' ? 'ghost' : 'primary'} onPress={() => router.push('/commercant/abonnement')} />
        </Card>

        {m.supplier_offer ? (
          <Card tone="brandOutline" style={{ gap: spacing.sm }}>
            <Tag label={m.supplier_offer.label} tone="outline" />
            <Text style={styles.title}>{m.supplier_offer.title}</Text>
            <Text style={styles.text}>{m.supplier_offer.text}</Text>
            {m.supplier_offer.url ? <Button label={t('merchant.offer')} variant="ghost" onPress={() => Linking.openURL(m.supplier_offer!.url!)} /> : null}
          </Card>
        ) : null}

        <Card tone="dark" style={{ gap: spacing.sm }}>
          <Text style={styles.darkTitle}>{m.credit.title}</Text>
          <Text style={styles.darkText}>{m.credit.text}</Text>
          {m.credit.request_pending ? (
            <Tag label={t('merchant.creditPending')} tone="brand" size="md" />
          ) : m.credit.can_request ? (
            <>
              <TextInput value={creditAmount} onChangeText={(v) => setCreditAmount(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder={t('merchant.creditAmount')} placeholderTextColor="#A8A29E" style={styles.darkInput} accessibilityLabel={t('merchant.creditAmount')} />
              <Button
                label={t('merchant.credit')}
                variant="accent"
                loading={actions.requestCredit.isPending}
                onPress={() =>
                  confirmAction(t('merchant.creditConfirm'), m.credit.text, () =>
                    actions.requestCredit.mutate(creditAmount ? Number(creditAmount) : undefined, {
                      onSuccess: (r) => notify(t('merchant.credit'), r.message),
                      onError: (e) => notify(t('merchant.credit'), errorMessage(e), 'error'),
                    }),
                  )
                }
              />
            </>
          ) : null}
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <SwitchRow label={t('merchant.dataSharing', { partner: m.data_sharing.partner_name })} hint={m.data_sharing.text} value={m.data_sharing.enabled} onChange={toggleSharing} />
          {m.data_sharing.enabled && m.data_sharing.granted_at ? <Text style={styles.small}>{t('merchant.dataSharingOn', { date: formatShortDate(m.data_sharing.granted_at, dateFormat), scope: m.data_sharing.scope })}</Text> : null}
        </Card>

        <Text style={styles.section}>{t('merchant.payouts')}</Text>
        {!m.payouts.length ? <Text style={styles.small}>—</Text> : null}
        {m.payouts.map((p) => (
          <Card key={p.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.text}>{formatShortDate(p.created_at, dateFormat)}</Text>
              <Text style={styles.small}>{p.status_label}</Text>
            </View>
            <Text style={styles.title}>{formatFcfa(p.amount)}</Text>
          </Card>
        ))}
      </Screen>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  kpiLabel: { fontSize: fontSize.small, fontWeight: '600', color: c.textMuted },
  kpi: { fontSize: 30, fontWeight: '800' },
  kpiSmall: { fontSize: fontSize.heading, fontWeight: '800', color: c.text },
  small: { fontSize: fontSize.small, color: c.textMuted },
  text: { fontSize: fontSize.body, color: c.text },
  title: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  darkTitle: { fontSize: fontSize.title, fontWeight: '700', color: '#FFFFFF' },
  darkText: { fontSize: fontSize.body, color: '#D6D3D1' },
  darkInput: { borderWidth: 1, borderColor: '#57534E', borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 46, color: '#FFFFFF', fontSize: fontSize.body },
  section: { fontSize: fontSize.heading - 2, fontWeight: '700', color: c.text, marginTop: spacing.md },
}));
