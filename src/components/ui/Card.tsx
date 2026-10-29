import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../theme';

type Tone = 'surface' | 'dark' | 'brandSoft' | 'trustSoft' | 'brandOutline';

const tones: Record<Tone, ViewStyle> = {
  surface: { backgroundColor: colors.surface },
  dark: { backgroundColor: colors.ink },
  brandSoft: { backgroundColor: colors.brandSoft },
  trustSoft: { backgroundColor: colors.trustSoft },
  brandOutline: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: '#F6C9AE' },
};

export function Card({ children, tone = 'surface', style }: { children: ReactNode; tone?: Tone; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, tones[tone], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.lg },
});
