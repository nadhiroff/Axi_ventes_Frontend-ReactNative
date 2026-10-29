import { Pressable, Text } from 'react-native';

import { fontSize, makeStyles, radius, spacing } from '../../theme';

/** Filtre arrondi : « Tous », « Revendeurs », « Fidèles », « À relancer ». */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.selected]}>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

/** Choix encadré : « Livraison Cotonou », « Expédition car », « Point Axi ». */
export function OptionTile({ label, selected, onPress, hint }: { label: string; selected: boolean; onPress: () => void; hint?: string }) {
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.tile, selected && styles.tileSelected]}>
      <Text style={[styles.tileLabel, selected && styles.tileLabelSelected]}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  chip: { borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  selected: { backgroundColor: c.ink, borderColor: c.ink },
  label: { fontSize: fontSize.body, color: c.text, fontWeight: '500' },
  labelSelected: { color: c.textOnDark, fontWeight: '600' },
  tile: {
    flex: 1,
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tileSelected: { borderColor: c.brand, backgroundColor: c.brandSoft },
  tileLabel: { fontSize: fontSize.small, fontWeight: '600', color: c.text, textAlign: 'center' },
  tileLabelSelected: { color: c.brandDark },
  hint: { fontSize: fontSize.caption, color: c.textMuted, marginTop: 2 },
}));
