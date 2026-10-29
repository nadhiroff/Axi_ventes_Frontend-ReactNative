import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '../../theme';

type Props = { title: string; actionLabel?: string; onAction?: () => void; note?: string | null };

/** "Les allées … Tout voir", "Disponible aujourd'hui … Mis à jour ce matin". */
export function SectionHeader({ title, actionLabel, onAction, note }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="link">
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : note ? (
        <Text style={styles.note}>{note}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  title: { fontSize: fontSize.heading - 2, fontWeight: '700', color: colors.text, flexShrink: 1 },
  action: { fontSize: fontSize.body, color: '#1D4ED8', textDecorationLine: 'underline', fontWeight: '600' },
  note: { fontSize: fontSize.small, color: colors.textMuted },
});
