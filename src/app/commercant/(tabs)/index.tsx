import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { errorMessage } from '../../../api/client';
import { showBroadcastResult } from '../../../components/merchant/broadcast';
import { Button, IconButton } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Icon } from '../../../components/ui/Icon';
import { Grid, Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../../components/ui/StateViews';
import { Tag } from '../../../components/ui/Tag';
import { ArrivalSheet } from '../../../components/merchant/ArrivalSheet';
import { useBadges } from '../../../hooks/api/chat';
import { useMerchantActions, useMerchantMoney, useMerchantToday } from '../../../hooks/api/merchant';
import { SubscriptionBanner } from '../../../components/merchant/SubscriptionBanner';
import { confirmAction, notify } from '../../../lib/confirm';
import { formatDate, formatFcfa } from '../../../lib/format';
import { useLangStore, useT } from '../../../i18n';
import { fontSize, makeStyles, spacing, useLayout, useTheme } from '../../../theme';
import { callPhone } from '../../../lib/contact';

/** « Ma journée » : ventes, commandes à préparer, connexion, nouvelle adresse, ajouts rapides. */
export default function TodayScreen() {
  const styles = useStyles();
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const { colors } = useTheme();
  const { listColumns, tablet } = useLayout();
  const today = useMerchantToday();
  const actions = useMerchantActions();
  const [arrivalOpen, setArrivalOpen] = useState(false);
  const money = useMerchantMoney().data;
  const d = today.data;

  if (today.isPending) return <LoadingView />;
  if (!d) return <ErrorView error={today.error} onRetry={() => today.refetch()} />;

  return (
    <>
      <ScreenHeader title={t('merchant.hello', { name: d.greeting_name })} showBack={false} right={<MessagesButton />} />
      <Screen refreshing={today.isRefetching} onRefresh={() => today.refetch()}>
        <Tag label={d.stall_open ? t('stall.open') : t('stall.closed')} tone={d.stall_open ? 'trust' : 'outline'} size="md" />
        <SubscriptionBanner />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Card tone="trustSoft" style={{ flex: 1 }}>
            <Text style={[styles.kpiLabel, { color: colors.trustText }]}>{t('merchant.salesToday')}</Text>
            <Text style={[styles.kpi, { color: colors.trustText }]}>{formatFcfa(d.sales_today)}</Text>
          </Card>
          <Card tone="brandSoft" style={{ flex: 1 }}>
            <Text style={[styles.kpiLabel, { color: colors.brandDark }]}>{t('merchant.toPrepare')}</Text>
            <Text style={[styles.kpi, { color: colors.brandDark }]}>{d.orders_to_prepare}</Text>
          </Card>
        </View>

        <Card style={styles.connection}>
          <Icon name={d.connection.active ? 'wifi' : 'wifi-off'} size={20} color={d.connection.active ? colors.trustText : colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: d.connection.active ? colors.trustText : colors.danger }]}>{d.connection.active ? t('merchant.connectionActive') : t('merchant.connectionOff')}</Text>
            {d.connection.active && d.connection.included_until ? <Text style={styles.muted}>{t('merchant.connectionUntil', { date: formatDate(d.connection.included_until, lang) })}</Text> : null}
          </View>
          {!d.connection.active ? <Button label={t('nav.money')} size="sm" onPress={() => router.push('/commercant/argent')} /> : null}
        </Card>

        {d.relocation ? (
          <Card tone="dark" style={{ gap: spacing.sm }}>
            <Text style={styles.darkTitle}>{d.relocation.title}</Text>
            <Text style={styles.darkText}>{d.relocation.text}</Text>
            {d.relocation.already_sent ? (
              <Tag label={t('merchant.relocationSent')} tone="trustSolid" icon="check" size="md" />
            ) : (
              <Button
                label={t('merchant.relocationSend')}
                variant="accent"
                icon="send"
                loading={actions.relocation.isPending}
                onPress={() =>
                  confirmAction(t('merchant.relocationSend'), t('merchant.relocationConfirm', { n: d.relocation!.client_count }), () =>
                    actions.relocation.mutate(undefined, { onSuccess: (r) => showBroadcastResult(t('merchant.relocationSend'), r), onError: (e) => notify(t('merchant.relocationSend'), errorMessage(e), 'error') }),
                  )
                }
              />
            )}
          </Card>
        ) : null}

        <View style={[styles.quick, { flexDirection: tablet ? 'row' : 'column' }]}>
          <Button label={t('merchant.addProduct')} icon="plus" onPress={() => router.push('/commercant/produit/nouveau')} style={{ flex: 1 }} />
          <Button label={t('merchant.arrival')} icon="package" variant="ghost" onPress={() => setArrivalOpen(true)} style={{ flex: 1 }} />
        </View>

        <Text style={styles.section}>{t('merchant.ordersToday')}</Text>
        {!d.orders.length ? <Text style={styles.muted}>{t('merchant.noOrders')}</Text> : null}
        <Grid columns={listColumns}>
          {d.orders.map((o) => (
            <Card key={o.id} style={{ flex: 1, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{o.customer_name}</Text>
                  <Text style={styles.muted}>{o.summary}</Text>
                </View>
                <Tag label={o.status_label} tone={o.status === 'to_prepare' ? 'brand' : 'trust'} />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {o.status === 'to_prepare' ? (
                  <Button
                    label={t('merchant.ready')}
                    variant="dark"
                    style={{ flex: 1 }}
                    loading={actions.ready.isPending && actions.ready.variables === o.id}
                    onPress={() => confirmAction(t('merchant.readyConfirm'), o.summary, () => actions.ready.mutate(o.id, { onError: (e) => notify(t('merchant.ready'), errorMessage(e), 'error') }))}
                  />
                ) : null}
                {o.customer_phone ? <IconButton icon="phone" label={t('common.call')} onPress={() => callPhone(o.customer_phone)} /> : null}
              </View>
            </Card>
          ))}
        </Grid>
      </Screen>
      <ArrivalSheet
        key={arrivalOpen ? 'open' : 'closed'}
        visible={arrivalOpen}
        subscribed={money?.subscription.status === 'active'}
        sending={actions.arrival.isPending}
        onClose={() => setArrivalOpen(false)}
        onSend={(text, photo) =>
          actions.arrival.mutate({ text, photo }, {
            onSuccess: (r) => {
              setArrivalOpen(false);
              showBroadcastResult(t('merchant.arrivalTitle'), r);
            },
            onError: (e) => notify(t('merchant.arrivalTitle'), errorMessage(e), 'error'),
          })
        }
      />
    </>
  );
}

const useStyles = makeStyles((c) => ({
  kpiLabel: { fontSize: fontSize.small, fontWeight: '600' },
  kpi: { fontSize: 28, fontWeight: '800' },
  connection: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  darkTitle: { fontSize: fontSize.title, fontWeight: '700', color: '#FFFFFF' },
  darkText: { fontSize: fontSize.body, color: '#D6D3D1' },
  quick: { gap: spacing.sm },
  section: { fontSize: fontSize.heading - 2, fontWeight: '700', color: c.text, marginTop: spacing.md },
}));

/** En haut de « Ma journée » : notifications et messages, chacun avec son nombre de non-lus */
function MessagesButton() {
  const t = useT();
  const badges = useBadges().data;
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      <HeaderIcon icon="bell" label={t('notifications.title')} count={badges?.unread_notifications ?? 0} onPress={() => router.push('/notifications')} />
      <HeaderIcon icon="message-circle" label={t('chat.title')} count={badges?.unread_messages ?? 0} onPress={() => router.push('/messages')} />
    </View>
  );
}

function HeaderIcon({ icon, label, count, onPress }: { icon: 'bell' | 'message-circle'; label: string; count: number; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={count > 0 ? `${label}, ${count}` : label} hitSlop={6} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={20} color={colors.text} />
      {count > 0 ? (
        <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
