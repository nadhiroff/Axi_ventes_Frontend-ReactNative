import { useState } from 'react';
import { View } from 'react-native';

import { ProductTile } from '../components/client/ProductTile';
import { Chip } from '../components/ui/Chip';
import { Grid, Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { EmptyView, LoadingView } from '../components/ui/StateViews';
import { useFavorites, useRecentlyViewed } from '../hooks/api/client';
import { useT } from '../i18n';
import { spacing, useLayout } from '../theme';

/** Favoris et produits récemment vus */
export default function FavoritesScreen() {
  const t = useT();
  const { productColumns } = useLayout();
  const [tab, setTab] = useState<'fav' | 'recent'>('fav');
  const favorites = useFavorites();
  const recent = useRecentlyViewed();
  const query = tab === 'fav' ? favorites : recent;
  const products = query.data?.products ?? [];
  return (
    <>
      <ScreenHeader title={t('favorites.title')} />
      <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Chip label={t('favorites.title')} selected={tab === 'fav'} onPress={() => setTab('fav')} />
          <Chip label={t('favorites.recent')} selected={tab === 'recent'} onPress={() => setTab('recent')} />
        </View>
        {query.isPending ? (
          <LoadingView />
        ) : !products.length ? (
          <EmptyView icon={tab === 'fav' ? 'heart' : 'eye'} title={tab === 'fav' ? t('favorites.empty') : t('favorites.recentEmpty')} />
        ) : (
          <Grid columns={productColumns}>{products.map((p) => <ProductTile key={p.id} product={p} subtitle={p.stall.name} />)}</Grid>
        )}
      </Screen>
    </>
  );
}
