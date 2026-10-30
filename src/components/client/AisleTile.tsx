import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { Aisle, AisleIcon } from '../../api/types';
import { useT } from '../../i18n';
import { fontSize, makeStyles, radius, softPalette, spacing } from '../../theme';
import { Icon, type IconName } from '../ui/Icon';

export const aisleIcons: Record<AisleIcon, IconName> = {
  fabric: 'scissors',
  grain: 'package',
  beauty: 'droplet',
  hardware: 'tool',
  parts: 'settings',
  jewelry: 'star',
  electronics: 'smartphone',
  other: 'grid',
};

/** Carré d'allée : pastille de couleur douce, nom, nombre d'étals. */
export function AisleTile({ aisle, index }: { aisle: Aisle; index: number }) {
  const styles = useStyles();
  const t = useT();
  const tint = softPalette[index % softPalette.length];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${aisle.name}, ${t('aisle.stalls', { n: aisle.stall_count })}`}
      onPress={() => router.push(`/allee/${aisle.id}`)}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.swatch, { backgroundColor: tint.bg }]}>
        <Icon name={aisleIcons[aisle.icon] ?? 'grid'} size={18} color={tint.fg} />
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {aisle.name}
      </Text>
      <Text style={styles.count}>{t('aisle.stalls', { n: aisle.stall_count })}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  tile: { flex: 1, minHeight: 118, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, justifyContent: 'space-between', gap: 4 },
  swatch: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: fontSize.small, fontWeight: '600', color: c.text },
  count: { fontSize: fontSize.caption, color: c.textMuted },
}));
