import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useTheme } from '../../theme';

export type IconName = ComponentProps<typeof Feather>['name'];

/** Icônes au trait fin, comme sur les maquettes. Police embarquée : aucun téléchargement. */
export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <Feather name={name} size={size} color={color ?? colors.text} />;
}

/** Icône d'onglet pour les barres de navigation client et commerçant. */
export function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Feather name={name} size={22} color={color as string} />;
  };
}
