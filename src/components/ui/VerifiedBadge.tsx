import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../theme';

export function VerifiedBadge({ label = 'Vérifié' }: { label?: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>✓ {label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.trustSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  text: { color: colors.trustDark, fontSize: 12, fontWeight: '600' },
});
