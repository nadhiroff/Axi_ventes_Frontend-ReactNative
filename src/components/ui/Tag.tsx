import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, radius, spacing, useTheme, type Palette } from '../../theme';
import { Icon, type IconName } from './Icon';

type Tone = 'trust' | 'trustSolid' | 'brand' | 'neutral' | 'outline' | 'danger';

const tones = (c: Palette): Record<Tone, { bg: string; fg: string; border: string }> => ({
  trust: { bg: c.trustSoft, fg: c.trustText, border: c.trustSoft },
  trustSolid: { bg: c.trust, fg: '#FFFFFF', border: c.trust },
  brand: { bg: c.brandSoft, fg: c.brandDark, border: c.brandSoft },
  neutral: { bg: c.surfaceAlt, fg: c.text, border: c.surfaceAlt },
  outline: { bg: c.surface, fg: c.textMuted, border: c.border },
  danger: { bg: c.dangerSoft, fg: c.danger, border: c.dangerSoft },
});

type Props = { label: string; tone?: Tone; icon?: IconName; size?: 'sm' | 'md'; style?: StyleProp<ViewStyle> };

export function Tag({ label, tone = 'neutral', icon, size = 'sm', style }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const v = tones(colors)[tone];
  return (
    <View style={[styles.tag, size === 'md' && styles.md, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      {icon ? <Icon name={icon} size={size === 'md' ? 15 : 12} color={v.fg} /> : null}
      <Text style={[styles.text, size === 'md' && styles.textMd, { color: v.fg }]}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  md: { borderRadius: radius.md, paddingHorizontal: spacing.md - 2, paddingVertical: 6 },
  text: { fontSize: 12, fontWeight: '600' },
  textMd: { fontSize: 13 },
}));
