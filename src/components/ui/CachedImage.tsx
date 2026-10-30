import { Image, type ImageProps } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ApiImage } from '../../api/types';
import { useTheme } from '../../theme';
import { Icon } from './Icon';

type Props = Omit<ImageProps, 'source' | 'placeholder' | 'style'> & {
  image: ApiImage | null;
  variant?: 'thumb' | 'medium';
  style?: StyleProp<ViewStyle>;
  /** Afficher une image par défaut (icône) si le produit n'a pas de photo */
  fallback?: boolean;
};

/**
 * Toutes les images passent par ici : URL absolue renvoyée par le serveur, cache disque et mémoire,
 * indicateur de chargement, et image par défaut si la photo manque ou ne se charge pas.
 */
export function CachedImage({ image, variant = 'thumb', style, fallback = false, ...rest }: Props) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  if (!image || failed) {
    return fallback ? (
      <View style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }, style]}>
        <Icon name="image" size={28} color={colors.textMuted} />
      </View>
    ) : null;
  }
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: colors.surfaceAlt }, style]}>
      <Image
        source={{ uri: variant === 'thumb' ? image.thumb_url : image.medium_url }}
        placeholder={image.blurhash ? { blurhash: image.blurhash } : undefined}
        cachePolicy="memory-disk"
        recyclingKey={image.thumb_url}
        transition={150}
        style={{ width: '100%', height: '100%' }}
        onLoadEnd={() => setLoading(false)}
        onError={() => setFailed(true)}
        {...rest}
      />
      {loading ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : null}
    </View>
  );
}
