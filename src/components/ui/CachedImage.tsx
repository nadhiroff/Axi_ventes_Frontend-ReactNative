import { Image, type ImageProps } from 'expo-image';

import type { ApiImage } from '../../api/types/common';

type Props = Omit<ImageProps, 'source' | 'placeholder'> & {
  image: ApiImage | null;
  variant?: 'thumb' | 'medium';
};

// Toutes les images passent par ici : cache disque + mémoire, et un blurhash
// (quelques octets inclus dans le JSON) affiché pendant le chargement.
export function CachedImage({ image, variant = 'thumb', ...rest }: Props) {
  if (!image) return null;
  return (
    <Image
      source={{ uri: variant === 'thumb' ? image.thumb_url : image.medium_url }}
      placeholder={image.blurhash ? { blurhash: image.blurhash } : undefined}
      cachePolicy="memory-disk"
      recyclingKey={image.thumb_url}
      transition={150}
      {...rest}
    />
  );
}
