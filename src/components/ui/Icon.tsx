import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useTheme } from '../../theme';

/** Icônes Feather, plus le logo WhatsApp (même couleur que les autres icônes) */
export type IconName = ComponentProps<typeof Feather>['name'] | 'whatsapp';

/** Icônes au trait fin, comme sur les maquettes. Police embarquée : aucun téléchargement. */
export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useTheme();
  if (name === 'whatsapp') return <FontAwesome name="whatsapp" size={size * 1.1} color={color ?? colors.text} />;
  return <Feather name={name} size={size} color={color ?? colors.text} />;
}

/** Icône d'onglet pour les barres de navigation client et commerçant. */
export function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return name === 'whatsapp' ? <FontAwesome name="whatsapp" size={24} color={color as string} /> : <Feather name={name} size={22} color={color as string} />;
  };
}
