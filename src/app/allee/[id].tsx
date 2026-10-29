import { useLocalSearchParams } from 'expo-router';

import { StallCard } from '../../components/client/StallCard';
import { Grid, Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyView, ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useAisle } from '../../hooks/api/client';
import { useT } from '../../i18n';
import { useLayout } from '../../theme';

export default function AisleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const { listColumns } = useLayout();
  const aisle = useAisle(id);
  const data = aisle.data;
  return (
    <>
      <ScreenHeader title={data?.aisle.name ?? ''} subtitle={data ? t('aisle.stalls', { n: data.aisle.stall_count }) : undefined} />
      {aisle.isPending ? (
        <LoadingView />
      ) : !data ? (
        <ErrorView error={aisle.error} onRetry={() => aisle.refetch()} />
      ) : !data.stalls.length ? (
        <EmptyView icon="grid" title={t('aisle.empty')} />
      ) : (
        <Screen refreshing={aisle.isRefetching} onRefresh={() => aisle.refetch()}>
          <Grid columns={listColumns}>{data.stalls.map((s) => <StallCard key={s.id} stall={s} />)}</Grid>
        </Screen>
      )}
    </>
  );
}
