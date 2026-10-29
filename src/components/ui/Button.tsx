import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontSize, radius, spacing } from '../../theme';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'outline' | 'dark' | 'accent' | 'ghost';

const variants: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.brand, fg: colors.textOnDark, border: colors.brand },
  outline: { bg: colors.surface, fg: colors.brand, border: colors.brand },
  dark: { bg: colors.ink, fg: colors.textOnDark, border: colors.ink },
  accent: { bg: colors.brandMuted, fg: colors.ink, border: colors.brandMuted },
  ghost: { bg: colors.surface, fg: colors.text, border: colors.border },
};

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, size = 'md', style }: Props) {
  const v = variants[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.lg,
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
          {icon ? <Icon name={icon} size={18} color={v.fg} /> : null}
          <Text style={[styles.label, size === 'lg' && styles.labelLg, { color: v.fg }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Bouton carré à icône seule (ex. téléphone à côté de "Prêt pour le coursier"). */
export function IconButton({
  icon,
  onPress,
  label,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, style]}
    >
      <Icon name={icon} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  label: { fontSize: fontSize.body, fontWeight: '600' },
  labelLg: { fontSize: fontSize.body + 1 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
