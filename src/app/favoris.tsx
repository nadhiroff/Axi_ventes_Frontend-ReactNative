import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '../api/client';
import { api } from '../api/endpoints';
import type { Product } from '../api/types';
import { ProductTile } from '../components/client/ProductTile';
import { Chip } from '../components/ui/Chip';
import { Grid, Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { EmptyView, LoadingView } from '../components/ui/StateViews';
import { useFavorites, useRecentlyViewed } from '../hooks/api/client';
import { queryKeys } from '../hooks/api/queryKeys';
import { useT } from '../i18n';
import { notify, toast } from '../lib/confirm';
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
  const qc = useQueryClient();
  const refresh = (productId: string) => {
    qc.invalidateQueries({ queryKey: queryKeys.favorites });
    qc.invalidateQueries({ queryKey: queryKeys.product(productId) });
  };
  // Retrait immédiat de l'écran, avec « Annuler » dans le message (pas de question à chaque cœur)
  const removeFavorite = (product: Product) => {
    qc.setQueryData<typeof favorites.data>(queryKeys.favorites, (old) => (old ? { ...old, products: old.products.filter((x) => x.id !== product.id) } : old));
    api
      .setFavorite(product.id, false)
      .then(() => {
        refresh(product.id);
        toast(t('favorites.removed'), 'info', {
          label: t('common.cancel'),
          onPress: () => {
            api.setFavorite(product.id, true).then(() => refresh(product.id)).catch((e) => notify(t('favorites.title'), errorMessage(e), 'error'));
          },
        });
      })
      .catch((e) => {
        refresh(product.id);
        notify(t('favorites.title'), errorMessage(e), 'error');
      });
  };
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
          <Grid columns={productColumns}>{products.map((p) => <ProductTile key={p.id} product={p} subtitle={p.stall.name} onRemoveFavorite={tab === 'fav' ? () => removeFavorite(p) : undefined} />)}</Grid>
        )}
      </Screen>
    </>
  );
}
