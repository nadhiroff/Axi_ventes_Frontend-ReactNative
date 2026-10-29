import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { Icon, type IconName } from './Icon';

type Tone = 'trust' | 'trustSolid' | 'brand' | 'neutral' | 'outline';

const tones: Record<Tone, { bg: string; fg: string; border: string }> = {
  trust: { bg: colors.trustSoft, fg: colors.trust, border: colors.trustSoft }, // "Ouvert", "Actif", "Payez à la réception"
  trustSolid: { bg: colors.trust, fg: colors.textOnDark, border: colors.trust }, // "Vérifié par un agent Axi"
  brand: { bg: colors.brandSoft, fg: colors.brandDark, border: colors.brandSoft }, // "À préparer"
  neutral: { bg: '#F1EEEA', fg: colors.text, border: '#F1EEEA' }, // "Fidèle", "Nouvelle"
  outline: { bg: colors.surface, fg: colors.textMuted, border: colors.border }, // "Sponsorisé"
};

type Props = { label: string; tone?: Tone; icon?: IconName; size?: 'sm' | 'md'; style?: StyleProp<ViewStyle> };

export function Tag({ label, tone = 'neutral', icon, size = 'sm', style }: Props) {
  const t = tones[tone];
  return (
    <View style={[styles.tag, size === 'md' && styles.md, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      {icon ? <Icon name={icon} size={size === 'md' ? 15 : 12} color={t.fg} /> : null}
      <Text style={[styles.text, size === 'md' && styles.textMd, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  md: { borderRadius: radius.md, paddingHorizontal: spacing.md - 2, paddingVertical: 6 },
  text: { fontSize: 12, fontWeight: '600' },
  textMd: { fontSize: 13 },
});
