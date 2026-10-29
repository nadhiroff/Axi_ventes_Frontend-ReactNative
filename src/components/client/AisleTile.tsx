import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Aisle, AisleIcon } from '../../api/types';
import { colors, fontSize, radius, softPalette, spacing } from '../../theme';
import { Icon, type IconName } from '../ui/Icon';

const icons: Record<AisleIcon, IconName> = {
  fabric: 'scissors',
  grain: 'package',
  beauty: 'droplet',
  hardware: 'tool',
  parts: 'settings',
  jewelry: 'star',
  electronics: 'smartphone',
  other: 'grid',
};

/** Carré d'allée : pastille de couleur douce et nom, sur trois colonnes. */
export function AisleTile({ aisle, index }: { aisle: Aisle; index: number }) {
  const tint = softPalette[index % softPalette.length];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${aisle.name}, ${aisle.stall_count} étals`}
      onPress={() => router.push(`/allee/${aisle.id}`)}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.swatch, { backgroundColor: tint.bg }]}>
        <Icon name={icons[aisle.icon] ?? 'grid'} size={18} color={tint.fg} />
      </View>
      <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
        {aisle.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 112,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  swatch: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: fontSize.small, fontWeight: '600', color: colors.text },
});
