import { Pressable, Text, View } from 'react-native';

import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { Icon } from './Icon';

/** Puce de choix : « Tous », « Revendeurs », une allée, un marché… Sélectionnée : gris foncé avec une coche. */
export function Chip({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: 'plus' }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && !selected && styles.pressed]}
    >
      {selected ? <Icon name="check" size={15} color={colors.selectedText} /> : icon ? <Icon name={icon} size={15} color={colors.text} /> : null}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

/** Choix encadré : « Livraison Cotonou », « Expédition car », « Point Axi ». Sélectionné : gris foncé avec une coche. */
export function OptionTile({ label, selected, onPress, hint }: { label: string; selected: boolean; onPress: () => void; hint?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.tile, selected && styles.tileSelected, pressed && !selected && styles.pressed]}>
      {selected ? (
        <View style={styles.tick}>
          <Icon name="check" size={12} color={colors.selected} />
        </View>
      ) : null}
      <Text style={[styles.tileLabel, selected && styles.tileLabelSelected]}>{label}</Text>
      {hint ? <Text style={[styles.hint, selected && styles.hintSelected]}>{hint}</Text> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: spacing.lg, paddingVertical: 10, minHeight: 44 },
  selected: { backgroundColor: c.selected, borderColor: c.selected },
  pressed: { backgroundColor: c.surfaceAlt },
  label: { fontSize: fontSize.body, color: c.text, fontWeight: '500' },
  labelSelected: { color: c.selectedText, fontWeight: '700' },
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
  tileSelected: { borderColor: c.selected, backgroundColor: c.selected },
  tick: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: c.selectedText, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: fontSize.small, fontWeight: '600', color: c.text, textAlign: 'center' },
  tileLabelSelected: { color: c.selectedText, fontWeight: '700' },
  hint: { fontSize: fontSize.caption, color: c.textMuted, marginTop: 2, textAlign: 'center' },
  hintSelected: { color: c.selectedText, opacity: 0.85 },
}));
