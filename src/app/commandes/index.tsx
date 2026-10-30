import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '../../components/ui/Icon';
import { Grid, Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyView, ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useSettings } from '../../hooks/api/account';
import { useOrders } from '../../hooks/api/client';
import { useT } from '../../i18n';
import { formatFcfa, formatShortDate, orderNumber } from '../../lib/format';
import { fontSize, makeStyles, radius, spacing, useLayout, useTheme } from '../../theme';

/** Historique des commandes du client */
export default function OrdersScreen() {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const { listColumns } = useLayout();
  const orders = useOrders();
  const dateFormat = useSettings().data?.date_format;
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
                  <Icon name="chevron-right" size={18} color={colors.textMuted} />
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
