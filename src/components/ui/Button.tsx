import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';

import { fontSize, makeStyles, radius, spacing, useTheme, type Palette } from '../../theme';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'outline' | 'dark' | 'accent' | 'ghost' | 'danger' | 'destructive' | 'trust';

const variants = (c: Palette): Record<Variant, { bg: string; fg: string; border: string }> => ({
  primary: { bg: c.brand, fg: c.textOnDark, border: c.brand },
  outline: { bg: c.surface, fg: c.brand, border: c.brand },
  dark: { bg: c.ink, fg: c.textOnDark, border: c.ink },
  accent: { bg: c.brandMuted, fg: '#1C1917', border: c.brandMuted },
  ghost: { bg: c.surface, fg: c.text, border: c.border },
  danger: { bg: c.surface, fg: c.danger, border: c.danger },
  destructive: { bg: c.danger, fg: '#FFFFFF', border: c.danger },
  trust: { bg: c.trust, fg: '#FFFFFF', border: c.trust },
});

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, size = 'md', style }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const v = variants(colors)[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.lg,
        size === 'sm' && styles.sm,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={v.fg} /> : null}
          <Text style={[styles.label, size === 'lg' && styles.labelLg, size === 'sm' && styles.labelSm, { color: v.fg }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Bouton carré à icône seule (téléphone, WhatsApp, partager). */
export function IconButton({ icon, onPress, label, style, color }: { icon: IconName; onPress: () => void; label: string; style?: StyleProp<ViewStyle>; color?: string }) {
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, style]}>
      <Icon name={icon} size={20} color={color} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  lg: { minHeight: 56, paddingHorizontal: spacing.md },
  sm: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  label: { fontSize: fontSize.body, fontWeight: '600' },
  labelLg: { fontSize: fontSize.body + 1 },
  labelSm: { fontSize: fontSize.small },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
