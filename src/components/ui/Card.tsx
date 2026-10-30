import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, radius, spacing } from '../../theme';

type Tone = 'surface' | 'dark' | 'brandSoft' | 'trustSoft' | 'brandOutline' | 'dangerSoft';

export function Card({ children, tone = 'surface', style }: { children: ReactNode; tone?: Tone; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return <View style={[styles.card, styles[tone], style]}>{children}</View>;
}

const useStyles = makeStyles((c) => ({
  card: { borderRadius: radius.lg, padding: spacing.lg },
  surface: { backgroundColor: c.surface },
  dark: { backgroundColor: c.ink },
  brandSoft: { backgroundColor: c.brandSoft },
  trustSoft: { backgroundColor: c.trustSoft },
  dangerSoft: { backgroundColor: c.dangerSoft },
  brandOutline: { backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.brandMuted },
}));
