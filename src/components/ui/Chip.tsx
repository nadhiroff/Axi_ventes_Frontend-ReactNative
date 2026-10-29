import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, radius, spacing } from '../../theme';

/** Filtre arrondi : "Tous", "Revendeurs", "Fidèles", "À relancer". */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

/** Choix encadré : "Livraison Cotonou", "Expédition car", "Point Axi". */
export function OptionTile({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.tile, selected && styles.tileSelected]}
    >
      <Text style={[styles.tileLabel, selected && styles.tileLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  selected: { backgroundColor: colors.ink, borderColor: colors.ink },
  label: { fontSize: fontSize.body, color: colors.text, fontWeight: '500' },
  labelSelected: { color: colors.textOnDark, fontWeight: '600' },
  tile: {
    flex: 1,
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  tileSelected: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  tileLabel: { fontSize: fontSize.small, fontWeight: '600', color: colors.text, textAlign: 'center' },
  tileLabelSelected: { color: colors.brandDark },
});
