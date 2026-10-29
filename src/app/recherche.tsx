import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductTile } from '../components/client/ProductTile';
import { SearchBar } from '../components/client/SearchBar';
import { StallCard } from '../components/client/StallCard';
import { Grid, Screen } from '../components/ui/Screen';
import { BackButton } from '../components/ui/ScreenHeader';
import { SectionHeader } from '../components/ui/SectionHeader';
import { EmptyView, LoadingView } from '../components/ui/StateViews';
import { useSearch } from '../hooks/api/client';
import { useT } from '../i18n';
import { fontSize, spacing, useLayout, useTheme } from '../theme';

/** Recherche d'étals et de produits (au moins 2 caractères) */
export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { contentWidth, gutter, productColumns, listColumns } = useLayout();
  const [text, setText] = useState(params.q ?? '');
  const [query, setQuery] = useState(params.q ?? '');
  const search = useSearch(query);

  // Recherche lancée automatiquement après une courte pause de frappe
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 400);
    return () => clearTimeout(timer);
  }, [text]);

  const data = search.data;
  return (
    <View style={{ flex: 1 }}>
      <View style={{ backgroundColor: colors.surface, paddingTop: insets.top + spacing.md, paddingBottom: spacing.lg, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: contentWidth, paddingHorizontal: gutter, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <SearchBar value={text} onChangeText={setText} onSubmit={() => setQuery(text.trim())} autoFocus={!params.q} />
          </View>
        </View>
      </View>
      {query.length < 2 ? (
        <EmptyView icon="search" title={t('search.minChars')} />
      ) : search.isPending ? (
        <LoadingView />
      ) : !data || (!data.stalls.length && !data.products.length) ? (
        <EmptyView icon="search" title={t('search.empty', { q: query })} />
      ) : (
        <Screen>
          {data.stalls.length ? (
            <>
              <SectionHeader title={t('search.stalls')} />
              <Grid columns={listColumns}>{data.stalls.map((s) => <StallCard key={s.id} stall={s} />)}</Grid>
            </>
          ) : null}
          {data.products.length ? (
            <>
              <SectionHeader title={t('search.products')} />
              <Grid columns={productColumns}>{data.products.map((p) => <ProductTile key={p.id} product={p} subtitle={p.stall.name} />)}</Grid>
            </>
          ) : null}
          <Text style={{ color: colors.textMuted, fontSize: fontSize.small }}> </Text>
        </Screen>
      )}
    </View>
  );
}
