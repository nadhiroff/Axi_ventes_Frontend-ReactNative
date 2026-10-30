import { Text, TextInput, View } from 'react-native';

import { useT } from '../../i18n';
import { group } from '../../lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';

/**
 * Prix d'un produit : un prix, ou une fourchette « minimum – maximum ». Les deux cases ont la même
 * hauteur et des libellés d'une ligne : parfaitement alignées, avec « FCFA » dans la case.
 */
export function PriceFields({ min, max, onMin, onMax, errors }: { min: string; max: string; onMin: (v: string) => void; onMax: (v: string) => void; errors: Record<string, string> }) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const digits = (v: string) => v.replace(/\D/g, '');
  const field = (label: string, value: string, onChange: (v: string) => void, placeholder: string, error?: string) => (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={[styles.box, error ? { borderColor: colors.danger } : null]}>
        <TextInput
          value={value ? group(Number(digits(value))) : ''}
          onChangeText={(v) => onChange(digits(v))}
          keyboardType="number-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          accessibilityLabel={label}
        />
        <Text style={styles.unit}>FCFA</Text>
      </View>
    </View>
  );
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.title}>{t('merchant.priceTitle')}</Text>
      <View style={styles.row}>
        {field(t('merchant.priceMin'), min, onMin, '15 000', errors.price)}
        <Text style={styles.dash}>–</Text>
        {field(t('merchant.priceMaxShort'), max, onMax, '18 000', errors.price_max)}
      </View>
      {errors.price || errors.price_max ? <Text style={styles.error}>{errors.price ?? errors.price_max}</Text> : <Text style={styles.hint}>{t('merchant.priceHint')}</Text>}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  title: { fontSize: fontSize.small, fontWeight: '700', color: c.text },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  label: { fontSize: fontSize.caption, fontWeight: '600', color: c.textMuted },
  box: { flexDirection: 'row', alignItems: 'center', height: 52, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, backgroundColor: c.surface, paddingHorizontal: spacing.md, gap: 6 },
  input: { flex: 1, fontSize: fontSize.title, fontWeight: '600', color: c.text, paddingVertical: 0 },
  unit: { fontSize: fontSize.small, color: c.textMuted, fontWeight: '600' },
  dash: { fontSize: fontSize.title, color: c.textMuted, paddingBottom: 14 },
  hint: { fontSize: fontSize.small, color: c.textMuted },
  error: { fontSize: fontSize.small, color: c.danger },
}));
