import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme';
import { Icon } from './Icon';

/** Pastille verte cochée à côté du nom d'un étal vérifié. */
export function VerifiedIcon({ size = 16 }: { size?: number }) {
  return (
    <View
      accessibilityLabel="Vérifié"
      style={[styles.dot, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Icon name="check" size={size * 0.7} color={colors.textOnDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { backgroundColor: colors.trustText, alignItems: 'center', justifyContent: 'center' },
});
