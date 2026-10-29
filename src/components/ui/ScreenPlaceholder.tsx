import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '../../theme';

/** Écran provisoire, remplacé au fur et à mesure par les vraies maquettes. */
export function ScreenPlaceholder({ title, note }: { title: string; note?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { fontSize: fontSize.heading, fontWeight: '700', color: colors.text },
  note: { marginTop: spacing.sm, color: colors.textMuted, textAlign: 'center' },
});
