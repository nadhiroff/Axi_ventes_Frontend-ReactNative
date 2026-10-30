import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Product } from '../../api/types';
import { useT } from '../../i18n';
import { formatPrice } from '../../lib/format';
import { fontSize, makeStyles, pickColor, productTilePalette, radius, spacing, useTheme } from '../../theme';
import { useReduceMotion, useSlideIndex } from '../../hooks/useSlideshow';
import { CachedImage } from '../ui/CachedImage';
import { Icon } from '../ui/Icon';
import { ImageViewer } from '../ui/ImageViewer';

type Props = {
  product: Product;
  /** Bouton « Ajouter » (panier) ; absent : tuile en lecture seule */
  onAdd?: () => void;
  inCart?: number;
  subtitle?: string;
  /** Ouvrir la fiche produit au toucher du nom (par défaut) */
  openDetail?: boolean;
};

/**
 * Tuile produit : vraie photo (toucher = plein écran avec zoom et galerie), nom, prix,
 * bouton « Ajouter au panier ». Sans photo : aplat de couleur, rien à télécharger.
 */
export function ProductTile({ product, onAdd, inCart = 0, subtitle, openDetail = true }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const t = useT();
  const [viewer, setViewer] = useState(false);
  const priceLabel = product.in_stock ? formatPrice(product.price, t('product.negotiable')) : t('product.soldOut');
  const images = product.images.length ? product.images : product.image ? [product.image] : [];
  // Plusieurs photos : elles se succèdent en fondu dans la vignette (attire l'œil sans rien ouvrir)
  const slide = useSlideIndex(images.length, product.id);
  const reduceMotion = useReduceMotion();

  return (
    <View style={[styles.tile, !product.in_stock && styles.out]}>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={images.length ? t('product.openPhoto', { name: product.name }) : product.name}
        onPress={() => (images.length ? setViewer(true) : openDetail && router.push(`/produit/${product.id}`))}
        style={[styles.media, { backgroundColor: pickColor(productTilePalette, product.id) }]}
      >
        {images.length ? <CachedImage image={images[slide]} style={styles.fill} contentFit="cover" transition={reduceMotion ? 0 : 450} /> : <Icon name="package" size={28} color="rgba(255,255,255,0.85)" />}
        {images.length > 1 ? (
          <View style={styles.count}>
            <Icon name="image" size={12} color="#FFFFFF" />
            <Text style={styles.countText}>{images.length}</Text>
          </View>
        ) : null}
        {product.is_today ? (
          <View style={styles.today}>
            <Text style={styles.todayText}>{t('product.today')}</Text>
          </View>
        ) : null}
      </Pressable>
      <Pressable style={styles.body} onPress={() => openDetail && router.push(`/produit/${product.id}`)} accessibilityRole="button" accessibilityLabel={`${product.name}, ${priceLabel}`}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.price, !product.price && { color: colors.textMuted }]}>{priceLabel}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </Pressable>
      {onAdd && product.in_stock && product.price ? (
        <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel={t('product.addToCart', { name: product.name })} style={({ pressed }) => [styles.add, inCart > 0 && styles.added, pressed && { opacity: 0.85 }]}>
          <Icon name={inCart > 0 ? 'check' : 'plus'} size={16} color={inCart > 0 ? colors.trustText : '#FFFFFF'} />
          <Text style={[styles.addText, inCart > 0 && { color: colors.trustText }]}>{inCart > 0 ? t('product.inCart', { n: inCart }) : t('product.add')}</Text>
        </Pressable>
      ) : null}
      <ImageViewer images={images} visible={viewer} onClose={() => setViewer(false)} title={product.name} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  tile: { flex: 1, backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' },
  out: { opacity: 0.55 },
  media: { aspectRatio: 1.25, alignItems: 'center', justifyContent: 'center' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  count: { position: 'absolute', bottom: 6, right: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  countText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  today: { position: 'absolute', top: 6, left: 6, backgroundColor: c.trust, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  todayText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  body: { padding: spacing.md, gap: 2, flexGrow: 1 },
  name: { fontSize: fontSize.body, fontWeight: '600', color: c.text },
  price: { fontSize: fontSize.body, fontWeight: '700', color: c.brand },
  subtitle: { fontSize: fontSize.caption, color: c.textMuted },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, margin: spacing.sm, marginTop: 0, minHeight: 40, borderRadius: radius.md, backgroundColor: c.brand },
  added: { backgroundColor: c.trustSoft },
  addText: { color: '#FFFFFF', fontWeight: '700', fontSize: fontSize.small },
}));
