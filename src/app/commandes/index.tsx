import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Grid, Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyView, ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useSettings } from '../../hooks/api/account';
import { useOrders } from '../../hooks/api/client';
import { queryKeys } from '../../hooks/api/queryKeys';
import { useT } from '../../i18n';
import { confirmAction, notify, toast } from '../../lib/confirm';
import { formatFcfa, formatShortDate, orderNumber } from '../../lib/format';
import { fontSize, makeStyles, radius, spacing, useLayout, useTheme } from '../../theme';

/** Historique des commandes du client ; les commandes terminées peuvent être retirées (mêmes règles que Mes achats et paiements) */
export default function OrdersScreen() {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const { listColumns } = useLayout();
  const orders = useOrders();
  const dateFormat = useSettings().data?.date_format;
  const qc = useQueryClient();
  const hide = (target: { order_id: string } | { all: true }) =>
    api
      .salesHide({ ...target, side: 'buyer' })
      .then(({ hidden }) => {
        qc.invalidateQueries({ queryKey: queryKeys.orders });
        qc.invalidateQueries({ queryKey: ['sales'] });
        if ('all' in target) toast(t('sales.cleared', { n: hidden }), 'info');
      })
      .catch((e) => notify(t('sales.clear'), errorMessage(e), 'error'));
  // Bouton toujours visible : sans commande terminée, il explique pourquoi rien ne peut être vidé
  const clearAll = () =>
    orders.data?.orders.some((o) => o.hideable)
      ? confirmAction(t('sales.clearConfirm'), t('orders.clearText'), () => hide({ all: true }), { destructive: true, confirmLabel: t('sales.clearNow') })
      : notify(t('sales.clear'), t('sales.nothingToClear'), 'info');
  const hideOne = (orderId: string) => confirmAction(t('sales.removeConfirm'), t('sales.removeText'), () => hide({ order_id: orderId }), { destructive: true, confirmLabel: t('sales.remove') });
  return (
    <>
      <ScreenHeader title={t('orders.title')} />
      {orders.isPending ? (
        <LoadingView />
      ) : orders.isError ? (
        <ErrorView error={orders.error} onRetry={() => orders.refetch()} />
      ) : !orders.data.orders.length ? (
        <EmptyView icon="package" title={t('orders.empty')} action={{ label: t('cart.browse'), onPress: () => router.replace('/allees') }} />
      ) : (
        <Screen refreshing={orders.isRefetching} onRefresh={() => orders.refetch()}>
          <Button label={t('sales.clear')} icon="trash-2" variant="ghost" size="sm" onPress={clearAll} style={{ alignSelf: 'flex-start' }} />
          <Grid columns={listColumns}>
            {orders.data.orders.map((o) => (
              <Pressable key={o.id} onPress={() => router.push(`/commande/${o.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} accessibilityRole="button">
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.title}>{t('orders.order', { id: orderNumber(o.id) })}</Text>
                  <Text style={styles.muted} numberOfLines={1}>{o.stalls.map((s) => s.name).join(', ')}</Text>
                  <Text style={styles.status}>{o.status_label}</Text>
                  <Text style={styles.muted}>{formatShortDate(o.created_at, dateFormat, true)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.amount}>{formatFcfa(o.total)}</Text>
                  {o.hideable ? (
                    <Pressable onPress={() => hideOne(o.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('sales.remove')}>
                      <Icon name="x" size={18} color={colors.textMuted} />
                    </Pressable>
                  ) : (
                    <Icon name="chevron-right" size={18} color={colors.textMuted} />
                  )}
                </View>
              </Pressable>
            ))}
          </Grid>
        </Screen>
      )}
    </>
  );
}

const useStyles = makeStyles((c) => ({
  card: { flex: 1, flexDirection: 'row', gap: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg },
  title: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  status: { fontSize: fontSize.small, color: c.brandDark, fontWeight: '600' },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  amount: { fontSize: fontSize.title, fontWeight: '800', color: c.text },
}));
