import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../../theme';
import { Icon } from '../ui/Icon';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onVoice: () => void;
  autoFocus?: boolean;
};

/** Barre "Un produit, un étal, une allée…" avec micro pour la recherche vocale. */
export function SearchBar({ value, onChangeText, onSubmit, onVoice, autoFocus }: Props) {
  return (
    <View style={styles.bar}>
      <Icon name="search" size={20} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder="Un produit, un étal, une allée…"
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        autoFocus={autoFocus}
        style={styles.input}
        accessibilityLabel="Rechercher"
      />
      <Pressable onPress={onVoice} hitSlop={10} accessibilityRole="button" accessibilityLabel="Recherche vocale">
        <Icon name="mic" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F1EEEA',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  input: { flex: 1, fontSize: fontSize.title, color: colors.text, paddingVertical: spacing.md },
});
