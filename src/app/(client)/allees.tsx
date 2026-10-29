import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../components/ui/Icon';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useHome } from '../../hooks/api/client';
import { colors, fontSize, radius, softPalette, spacing } from '../../theme';

/** Toutes les allées du marché. Réutilise la réponse de l'accueil, déjà en cache. */
export default function AislesScreen() {
  const home = useHome();

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Les allées" subtitle="Entrez par une allée, comme au marché" showBack={false} />
      {home.isPending ? (
        <LoadingView />
      ) : home.isError && !home.data ? (
        <ErrorView error={home.error} onRetry={() => home.refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {home.data!.aisles.map((aisle, i) => {
            const tint = softPalette[i % softPalette.length];
            return (
              <Pressable
                key={aisle.id}
                onPress={() => router.push(`/allee/${aisle.id}`)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              >
                <View style={[styles.swatch, { backgroundColor: tint.bg }]} />
                <View style={styles.body}>
                  <Text style={styles.name}>{aisle.name}</Text>
                  <Text style={styles.count}>{aisle.stall_count} étals</Text>
                </View>
                <Icon name="chevron-right" color={colors.textMuted} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  swatch: { width: 44, height: 44, borderRadius: radius.sm },
  body: { flex: 1 },
  name: { fontSize: fontSize.title, fontWeight: '600', color: colors.text },
  count: { fontSize: fontSize.small, color: colors.textMuted, marginTop: 2 },
});
