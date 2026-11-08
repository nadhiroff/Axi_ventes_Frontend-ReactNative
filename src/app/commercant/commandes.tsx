import { useIsFocused, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';

import type { MerchantOrderTab } from '../../api/types';
import { OrderCard } from '../../components/merchant/OrderCard';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Grid, Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyView, ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useMerchantOrders } from '../../hooks/api/merchant';
import { useT } from '../../i18n';
import { fontSize, makeStyles, spacing, useLayout } from '../../theme';

const TABS: MerchantOrderTab[] = ['todo', 'shipping', 'done'];

/**
 * « Mes commandes » : les commandes REÇUES par l'étal (pas les achats du commerçant), en trois onglets.
 * À traiter (à préparer puis prêtes, les plus anciennes d'abord) → En livraison → Terminées (les plus récentes d'abord).
 */
export default function MerchantOrdersScreen() {
  const t = useT();
  const styles = useStyles();
  const { listColumns } = useLayout();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<MerchantOrderTab>(TABS.includes(params.tab as MerchantOrderTab) ? (params.tab as MerchantOrderTab) : 'todo');
  const orders = useMerchantOrders(tab, useIsFocused());
  const pages = orders.data?.pages;
  const counts = pages?.[0]?.counts;
  const rows = pages?.flatMap((p) => p.orders) ?? [];
  const empty = { todo: t('merchantOrders.emptyTodo'), shipping: t('merchantOrders.emptyShipping'), done: t('merchantOrders.emptyDone') }[tab];

  return (
    <>
      <ScreenHeader title={t('merchantOrders.title')} subtitle={t('merchantOrders.updatedAuto')} />
      <Screen>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}>
          {TABS.map((k) => (
            <Chip key={k} label={`${t(`merchantOrders.tabs.${k}`)}${counts ? ` · ${counts[k]}` : ''}`} selected={tab === k} onPress={() => setTab(k)} />
          ))}
        </ScrollView>
        <Text style={styles.muted}>{t('merchantOrders.rule')}</Text>

        {orders.isPending ? (
          <LoadingView />
        ) : orders.isError && !rows.length ? (
          <ErrorView error={orders.error} onRetry={() => orders.refetch()} />
        ) : !rows.length ? (
          <EmptyView icon="package" title={empty} />
        ) : (
          <>
            <Grid columns={listColumns}>
              {rows.map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </Grid>
            {orders.hasNextPage ? (
              <Button label={t('merchantOrders.loadMore')} variant="ghost" loading={orders.isFetchingNextPage} onPress={() => orders.fetchNextPage()} />
            ) : null}
          </>
        )}
      </Screen>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  muted: { fontSize: fontSize.small, color: c.textMuted },
}));
