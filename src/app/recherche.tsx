import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductTile } from '../components/client/ProductTile';
import { SearchBar } from '../components/client/SearchBar';
import { StallCard } from '../components/client/StallCard';
import { VoiceSearch } from '../components/client/VoiceSearch';
import { BackButton } from '../components/ui/ScreenHeader';
import { SectionHeader } from '../components/ui/SectionHeader';
import { EmptyView, ErrorView, LoadingView } from '../components/ui/StateViews';
import { useSearch } from '../hooks/api/client';
import { colors, spacing } from '../theme';

/** Résultats de recherche texte ou vocale : étals puis produits. */
export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState(params.q ?? '');
  const [query, setQuery] = useState(params.q ?? '');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const search = useSearch(query);

  // Une nouvelle recherche vocale arrive par les paramètres de la route.
  const [routeQuery, setRouteQuery] = useState(params.q);
  if (params.q && params.q !== routeQuery) {
    setRouteQuery(params.q);
    setInput(params.q);
    setQuery(params.q);
  }

  const data = search.data;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <BackButton />
        <View style={{ flex: 1 }}>
          <SearchBar
            value={input}
            onChangeText={setInput}
            onSubmit={() => setQuery(input.trim())}
            onVoice={() => setVoiceOpen(true)}
            autoFocus={!params.q}
          />
        </View>
      </View>

      {query.trim().length < 2 ? (
        <EmptyView icon="search" title="Cherchez un produit, un étal ou une allée" text="Ou touchez le micro pour chercher à la voix." />
      ) : search.isPending ? (
        <LoadingView />
      ) : search.isError && !data ? (
        <ErrorView error={search.error} onRetry={() => search.refetch()} />
      ) : data && data.stalls.length === 0 && data.products.length === 0 ? (
        <EmptyView icon="search" title={`Rien trouvé pour « ${data.query} »`} text="Essayez un autre mot, ou entrez par une allée." />
      ) : data ? (
        <ScrollView contentContainerStyle={styles.content}>
          {data.stalls.length > 0 ? (
            <>
              <SectionHeader title="Étals" />
              <View style={styles.list}>
                {data.stalls.map((s) => (
                  <StallCard key={s.id} stall={s} />
                ))}
              </View>
            </>
          ) : null}
          {data.products.length > 0 ? (
            <>
              <SectionHeader title="Produits" />
              <View style={styles.list}>
                {pairs(data.products).map((row) => (
                  <View key={row[0].id} style={styles.row}>
                    {row.map((p) => (
                      <ProductTile
                        key={p.id}
                        product={p}
                        selected={false}
                        subtitle={p.stall.name}
                        onPress={() => router.push(`/etal/${p.stall.id}`)}
                      />
                    ))}
                    {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
      ) : null}

      <VoiceSearch visible={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </View>
  );
}

function pairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  list: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
});
