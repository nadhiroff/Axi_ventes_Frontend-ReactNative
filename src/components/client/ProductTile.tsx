import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Product } from '../../api/types';
import { formatPrice } from '../../lib/format';
import { colors, fontSize, pickColor, productTilePalette, radius, spacing } from '../../theme';
import { CachedImage } from '../ui/CachedImage';
import { Icon } from '../ui/Icon';

type Props = { product: Product; selected: boolean; onPress: () => void; subtitle?: string };

/** Tuile produit sur deux colonnes : photo (ou aplat de couleur), nom, prix en orange. */
export function ProductTile({ product, selected, onPress, subtitle }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: !product.in_stock }}
      accessibilityLabel={`${product.name}, ${formatPrice(product.price)}`}
      onPress={onPress}
      disabled={!product.in_stock}
      style={[styles.tile, selected && styles.selected, !product.in_stock && styles.out]}
    >
      <View style={[styles.media, { backgroundColor: pickColor(productTilePalette, product.id) }]}>
        {product.image ? <CachedImage image={product.image} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        {selected ? (
          <View style={styles.check}>
            <Icon name="check" size={16} color={colors.textOnDark} />
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.price}>{product.in_stock ? formatPrice(product.price) : 'Épuisé'}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: { borderColor: colors.brand },
  out: { opacity: 0.5 },
  media: { aspectRatio: 1.55 },
  check: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: spacing.md, gap: 2 },
  name: { fontSize: fontSize.body, fontWeight: '600', color: colors.text },
  price: { fontSize: fontSize.body, fontWeight: '600', color: colors.brand },
  subtitle: { fontSize: fontSize.caption, color: colors.textMuted },
});
