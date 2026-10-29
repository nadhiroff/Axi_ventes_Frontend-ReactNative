import { useState } from 'react';
import { Pressable, Switch, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useT } from '../../i18n';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { Icon, type IconName } from './Icon';

type Props = TextInputProps & { label: string; error?: string | null; hint?: string; secret?: boolean };

/** Champ de formulaire : libellé, saisie, message d'erreur clair sous le champ */
export function Field({ label, error, hint, secret, style, ...rest }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const t = useT();
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.field}>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          secureTextEntry={secret && hidden}
          accessibilityLabel={label}
          {...rest}
        />
        {secret ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityRole="button" accessibilityLabel={hidden ? t('auth.showPassword') : t('auth.hidePassword')}>
            <Icon name={hidden ? 'eye' : 'eye-off'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Ligne avec interrupteur (paramètres, options de l'étal) */
export function SwitchRow({ label, hint, value, onChange, disabled }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: colors.trust, false: colors.border }} thumbColor="#FFFFFF" accessibilityLabel={label} />
    </View>
  );
}

/** Ligne de menu (paramètres, compte) : icône, libellé, valeur, chevron */
export function MenuRow({ icon, label, value, onPress, danger }: { icon: IconName; label: string; value?: string; onPress: () => void; danger?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}>
      <Icon name={icon} size={20} color={danger ? colors.danger : colors.text} />
      <Text style={[styles.rowLabel, { flex: 1 }, danger && { color: colors.danger }]}>{label}</Text>
      {value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
      <Icon name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  field: { gap: 6 },
  label: { fontSize: fontSize.small, fontWeight: '600', color: c.text },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 50 },
  inputError: { borderColor: c.danger },
  input: { flex: 1, fontSize: fontSize.title, color: c.text, paddingVertical: spacing.sm },
  error: { fontSize: fontSize.small, color: c.danger },
  hint: { fontSize: fontSize.small, color: c.textMuted },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  rowLabel: { fontSize: fontSize.body, color: c.text, fontWeight: '500' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md + 2, borderBottomWidth: 1, borderBottomColor: c.border },
  value: { fontSize: fontSize.small, color: c.textMuted, maxWidth: '45%' },
}));
