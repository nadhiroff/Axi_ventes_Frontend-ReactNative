import { StyleSheet, View } from 'react-native';

import { OptionTile } from '../ui/Chip';

export type SelectOption = { value: string; label: string };

export type SelectFieldProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  accessibilityLabel: string;
};

/**
 * Version téléphone : des cases à choisir. Axi Pro est un site web ; ce fichier
 * n'existe que pour que le code compile aussi pour Android et iOS.
 * La vraie liste déroulante est dans SelectField.web.tsx.
 */
export function SelectField({ value, options, onChange }: SelectFieldProps) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => (
        <OptionTile key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
});
