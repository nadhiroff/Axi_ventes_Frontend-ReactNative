import { StyleSheet, Text } from 'react-native';

import { colors } from '../../theme';

/** Le nom s'écrit toujours en minuscules. */
export function AxiLogo({ size = 28 }: { size?: number }) {
  return <Text style={[styles.logo, { fontSize: size }]}>axi</Text>;
}

const styles = StyleSheet.create({
  logo: { color: colors.brand, fontWeight: '800', letterSpacing: -0.5 },
});
