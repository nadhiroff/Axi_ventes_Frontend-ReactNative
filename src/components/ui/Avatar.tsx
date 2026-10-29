import { Text, View } from 'react-native';

import type { ApiImage } from '../../api/types';
import { initials } from '../../lib/format';
import { pickColor, softPalette, useTheme } from '../../theme';
import { CachedImage } from './CachedImage';

type Props = {
  name: string;
  image?: ApiImage | null;
  size?: number;
  /** brand : carré orange (étal) ; inverse : carré blanc sur fond orange ; soft : rond pastel (client). */
  variant?: 'brand' | 'inverse' | 'soft';
};

/** Photo de l'étal si elle existe, sinon initiales (rien à télécharger). */
export function Avatar({ name, image, size = 56, variant = 'brand' }: Props) {
  const { colors } = useTheme();
  if (image) {
    return <CachedImage image={image} style={{ width: size, height: size, borderRadius: variant === 'soft' ? size / 2 : size * 0.22 }} />;
  }
  const soft = pickColor(softPalette, name);
  const style =
    variant === 'brand'
      ? { bg: colors.brand, fg: '#FFFFFF', radius: size * 0.22 }
      : variant === 'inverse'
        ? { bg: '#FFFFFF', fg: colors.brand, radius: size * 0.22 }
        : { bg: soft.bg, fg: soft.fg, radius: size / 2 };
  return (
    <View style={{ width: size, height: size, borderRadius: style.radius, backgroundColor: style.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: style.fg, fontSize: size * 0.4, fontWeight: '700' }}>{initials(name)}</Text>
    </View>
  );
}
