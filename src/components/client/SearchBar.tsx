import { TextInput, View } from 'react-native';

import { useT } from '../../i18n';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { Icon } from '../ui/Icon';

type Props = { value: string; onChangeText: (text: string) => void; onSubmit: () => void; autoFocus?: boolean };

/** Barre « Un produit, un étal, une allée… » */
export function SearchBar({ value, onChangeText, onSubmit, autoFocus }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const t = useT();
  return (
    <View style={styles.bar}>
      <Icon name="search" size={20} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={t('search.placeholder')}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        autoFocus={autoFocus}
        style={styles.input}
        accessibilityLabel={t('search.title')}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: c.surfaceAlt, borderRadius: radius.lg, paddingHorizontal: spacing.lg, minHeight: 54 },
  input: { flex: 1, fontSize: fontSize.title, color: c.text, paddingVertical: spacing.md },
}));
