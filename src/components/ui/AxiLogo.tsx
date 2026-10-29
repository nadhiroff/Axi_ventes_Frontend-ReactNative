import { Text } from 'react-native';

import { useTheme } from '../../theme';

/** Le nom s'écrit toujours en minuscules. Orange clair sur fond sombre. */
export function AxiLogo({ size = 34, onDark = false }: { size?: number; onDark?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text accessibilityRole="header" accessibilityLabel="axi" style={{ fontSize: size, fontWeight: '800', letterSpacing: -1, color: onDark ? colors.brandMuted : colors.brand }}>
      axi
    </Text>
  );
}
