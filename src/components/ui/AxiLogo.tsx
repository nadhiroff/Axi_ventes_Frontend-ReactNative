import { StyleSheet, Text } from 'react-native';

import { colors } from '../../theme';

/** Le nom s'écrit toujours en minuscules. Orange clair sur fond sombre. */
export function AxiLogo({ size = 34, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <Text accessibilityRole="header" style={[styles.logo, { fontSize: size, color: onDark ? colors.brandMuted : colors.brand }]}>
      axi
    </Text>
  );
}

const styles = StyleSheet.create({
  logo: { fontWeight: '800', letterSpacing: -1 },
});
