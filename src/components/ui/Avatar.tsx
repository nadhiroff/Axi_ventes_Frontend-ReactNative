import { StyleSheet, Text, View } from 'react-native';

import type { ApiImage } from '../../api/types';
import { initials } from '../../lib/format';
import { colors, pickColor, softPalette } from '../../theme';
import { CachedImage } from './CachedImage';

type Props = {
  name: string;
  image?: ApiImage | null;
  size?: number;
  /** brand : carré orange (étal suivi) ; inverse : carré blanc sur fond orange ; soft : rond pastel (client). */
  variant?: 'brand' | 'inverse' | 'soft';
};

/** Initiales plutôt qu'une photo : rien à télécharger, comme sur les maquettes. */
export function Avatar({ name, image, size = 56, variant = 'brand' }: Props) {
  if (image) {
    return <CachedImage image={image} style={{ width: size, height: size, borderRadius: size * 0.22 }} />;
  }
  const soft = pickColor(softPalette, name);
  const style =
    variant === 'brand'
      ? { bg: colors.brand, fg: colors.textOnDark, radius: size * 0.22 }
      : variant === 'inverse'
        ? { bg: colors.surface, fg: colors.brand, radius: size * 0.22 }
        : { bg: soft.bg, fg: soft.fg, radius: size / 2 };
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: style.radius, backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.fg, fontSize: size * 0.4 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700' },
});
