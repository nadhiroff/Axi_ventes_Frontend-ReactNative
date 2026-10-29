import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { HomePayload } from '../../api/types';
import { AisleTile } from '../../components/client/AisleTile';
import { SearchBar } from '../../components/client/SearchBar';
import { StallCard } from '../../components/client/StallCard';
import { VoiceSearch } from '../../components/client/VoiceSearch';
import { AxiLogo } from '../../components/ui/AxiLogo';
import { CachedImage } from '../../components/ui/CachedImage';
import { Icon } from '../../components/ui/Icon';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { Tag } from '../../components/ui/Tag';
import { useHome } from '../../hooks/api/client';
import { colors, fontSize, radius, spacing } from '../../theme';

/** Accueil client : recherche, bannière marché, promotion, allées, étals suivis. */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const home = useHome();
  const [query, setQuery] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);

  const submitSearch = () => {
    if (query.trim().length >= 2) router.push({ pathname: '/recherche', params: { q: query.trim() } });
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.brandRow}>
          <View>
            <AxiLogo />
            <Text style={styles.tagline}>Le marché qui vient à vous</Text>
          </View>
          <View style={styles.city} accessibilityLabel={`Ville : ${home.data?.city.name ?? 'Cotonou'}`}>
            <Icon name="map-pin" size={16} />
            <Text style={styles.cityText}>{home.data?.city.name ?? 'Cotonou'}</Text>
          </View>
        </View>
        <SearchBar value={query} onChangeText={setQuery} onSubmit={submitSearch} onVoice={() => setVoiceOpen(true)} />
      </View>

      {home.isPending ? (
        <LoadingView />
      ) : home.isError && !home.data ? (
        <ErrorView error={home.error} onRetry={() => home.refetch()} />
      ) : (
        <HomeContent data={home.data!} refreshing={home.isRefetching} onRefresh={() => home.refetch()} />
      )}

      <VoiceSearch visible={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </View>
  );
}

function HomeContent({ data, refreshing, onRefresh }: { data: HomePayload; refreshing: boolean; onRefresh: () => void }) {
  const sponsored = data.sponsored;
  const openSponsored = () => {
    if (!sponsored) return;
    router.push(sponsored.target.type === 'stall' ? `/etal/${sponsored.target.id}` : `/allee/${sponsored.target.id}`);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Tout Dantokpa, au même endroit</Text>
        <Text style={styles.bannerText}>Vos commerçants, où qu’ils soient installés.</Text>
        {data.market_notice ? (
          <Text style={styles.bannerNote}>
            {data.market_notice.text}
            {data.market_notice.partner ? ` · ${data.market_notice.partner}` : ''}
          </Text>
        ) : null}
      </View>

      {sponsored ? (
        <Pressable onPress={openSponsored} style={styles.sponsored} accessibilityRole="button">
          {sponsored.image ? (
            <CachedImage image={sponsored.image} style={styles.sponsoredMedia} />
          ) : (
            <View style={[styles.sponsoredMedia, { backgroundColor: '#FCE7F3' }]} />
          )}
          <View style={styles.sponsoredBody}>
            <Text style={styles.sponsoredTitle}>{sponsored.title}</Text>
            <Text style={styles.sponsoredText}>{sponsored.text}</Text>
          </View>
          <Tag label={sponsored.label} tone="outline" />
        </Pressable>
      ) : null}

      <SectionHeader title="Les allées" actionLabel="Tout voir" onAction={() => router.push('/allees')} />
      <View style={styles.grid}>
        {chunk(data.aisles.slice(0, 6), 3).map((row, r) => (
          <View key={r} style={styles.gridRow}>
            {row.map((aisle, i) => (
              <AisleTile key={aisle.id} aisle={aisle} index={r * 3 + i} />
            ))}
            {Array.from({ length: 3 - row.length }, (_, i) => (
              <View key={`pad-${i}`} style={styles.gridPad} />
            ))}
          </View>
        ))}
      </View>

      <SectionHeader title="Vos étals" />
      {data.followed_stalls.length === 0 ? (
        <Text style={styles.empty}>
          Suivez les étals de vos commerçants pour les retrouver ici, même après un déménagement.
        </Text>
      ) : (
        <View style={styles.list}>
          {data.followed_stalls.map((stall) => (
            <StallCard key={stall.id} stall={stall} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tagline: { fontSize: fontSize.body, color: colors.textMuted, marginTop: -2 },
  city: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  cityText: { fontSize: fontSize.body, color: colors.text, fontWeight: '500' },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  banner: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: spacing.xl, gap: 6 },
  bannerTitle: { color: colors.textOnDark, fontSize: fontSize.heading, fontWeight: '700' },
  bannerText: { color: colors.textOnDarkMuted, fontSize: fontSize.body },
  bannerNote: { color: colors.textOnDarkMuted, fontSize: fontSize.small, marginTop: spacing.xs },
  sponsored: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  sponsoredMedia: { width: 48, height: 48, borderRadius: radius.sm },
  sponsoredBody: { flex: 1 },
  sponsoredTitle: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  sponsoredText: { fontSize: fontSize.small, color: colors.textMuted, marginTop: 2 },
  grid: { gap: spacing.md },
  gridRow: { flexDirection: 'row', gap: spacing.md },
  gridPad: { flex: 1 },
  list: { gap: spacing.md },
  empty: { fontSize: fontSize.body, color: colors.textMuted },
});
