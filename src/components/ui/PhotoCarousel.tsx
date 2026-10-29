import { useState } from 'react';
import { FlatList, Pressable, View, type LayoutChangeEvent } from 'react-native';

import type { ApiImage } from '../../api/types';
import { radius, spacing, useTheme } from '../../theme';
import { CachedImage } from './CachedImage';

/** Photos qu'on fait défiler du doigt (une par page), avec des points ; toucher ouvre la photo en grand. */
export function PhotoCarousel({ images, height = 220, onOpen }: { images: ApiImage[]; height?: number; onOpen: (index: number) => void }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  if (images.length === 0) return null;
  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ gap: spacing.sm }}>
      {width > 0 ? (
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(img, i) => img.medium_url + i}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item, index: i }) => (
            <Pressable onPress={() => onOpen(i)} accessibilityRole="imagebutton" style={{ width, height }}>
              <CachedImage image={item} variant="medium" style={{ width, height, borderRadius: radius.lg }} contentFit="cover" />
            </Pressable>
          )}
        />
      ) : (
        <View style={{ height }} />
      )}
      {images.length > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          {images.map((img, i) => (
            <View key={img.medium_url + i} style={{ width: i === index ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: i === index ? colors.brand : colors.border }} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
