import { AisleTile } from '../../components/client/AisleTile';
import { Grid, Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useHome } from '../../hooks/api/client';
import { useT } from '../../i18n';
import { useLayout } from '../../theme';

/** Toutes les allées (sous-marchés gérés en base) */
export default function AislesScreen() {
  const t = useT();
  const home = useHome();
  const { aisleColumns } = useLayout();
  return (
    <>
      <ScreenHeader title={t('aisle.all')} showBack={false} />
      {home.isPending ? (
        <LoadingView />
      ) : home.isError && !home.data ? (
        <ErrorView error={home.error} onRetry={() => home.refetch()} />
      ) : (
        <Screen refreshing={home.isRefetching} onRefresh={() => home.refetch()}>
          <Grid columns={aisleColumns}>{(home.data?.aisles ?? []).map((aisle, i) => <AisleTile key={aisle.id} aisle={aisle} index={i} />)}</Grid>
        </Screen>
      )}
    </>
  );
}
