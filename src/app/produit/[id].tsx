import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { useAddToCart } from '../../components/client/useAddToCart';
import { StallCard } from '../../components/client/StallCard';
import { Button } from '../../components/ui/Button';
import { CachedImage } from '../../components/ui/CachedImage';
import { Icon } from '../../components/ui/Icon';
import { ImageViewer } from '../../components/ui/ImageViewer';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { Tag } from '../../components/ui/Tag';
import type { ApiImage } from '../../api/types';
import { useFavorite, useProduct } from '../../hooks/api/client';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useAutoPager } from '../../hooks/useSlideshow';
import { useT } from '../../i18n';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../lib/format';
import { fontSize, makeStyles, pickColor, productTilePalette, radius, spacing, useLayout, useTheme } from '../../theme';

/** Fiche produit : galerie de photos (plein écran avec zoom), prix, étal, favori, ajout au panier. */
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const { contentWidth, gutter, tablet } = useLayout();
  const product = useProduct(id);
  const favorite = useFavorite(id);
  const requireAuth = useRequireAuth();
  const [viewer, setViewer] = useState<number | null>(null);
  const p = product.data;
  // Photos du produit : défilent seules, et au doigt
  const width = Math.min(contentWidth - gutter * 2, tablet ? 560 : contentWidth);
  const gallery = useRef<FlatList<ApiImage>>(null);
  const { page, onDrag, setPage } = useAutoPager(gallery, p?.images.length ?? 0, width);
  // Produit de mon propre étal : pas de panier, de favori ni de « Voir l'étal », mais « Modifier ce produit »
  const ownStallId = useAuthStore((st) => st.user?.merchant?.stall_id ?? null);
  const addToCart = useAddToCart(p?.stall ?? { id: '', name: '', verified: false, location: { site: '', site_id: '', row: null, stand: null, label: '', map_url: null, moved_at: null } });

  if (product.isPending) return <LoadingView />;
  if (!p) return <ErrorView error={product.error} onRetry={() => product.refetch()} />;

  const inCart = addToCart.quantityOf(p.id);
  const own = ownStallId !== null && p.stall.id === ownStallId;

  return (
    <>
      <ScreenHeader
        title={p.name}
        right={
          own ? undefined : (
          <Pressable
            onPress={() => requireAuth(() => favorite.mutate(!p.is_favorite), t('auth.reasonFavorite'))}
            accessibilityRole="button"
            accessibilityLabel={p.is_favorite ? t('product.unfavorite') : t('product.favorite')}
            hitSlop={10}
            style={styles.heart}
          >
            <Icon name="heart" size={22} color={p.is_favorite ? colors.brand : colors.textMuted} />
          </Pressable>
          )
        }
      />
      <Screen
        footer={
          own ? (
            <Button label={t('product.editOwn')} icon="edit-2" size="lg" onPress={() => router.push(`/commercant/produit/${p.id}`)} />
          ) : p.in_stock && p.price ? (
            // Ajouter : on reste ici pour continuer ses achats. Acheter maintenant : directement au panier.
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label={inCart ? t('product.inCart', { n: inCart }) : t('product.add')} icon={inCart ? 'check' : 'shopping-bag'} size="lg" variant={inCart ? 'trust' : 'ghost'} onPress={() => addToCart.add(p)} style={{ flex: 1 }} />
              <Button label={t('product.buyNow')} size="lg" onPress={() => addToCart.buy(p)} style={{ flex: 1.3 }} />
            </View>
          ) : undefined
        }
      >
        <View style={{ alignSelf: 'center', width }}>
          {p.images.length ? (
            <>
              <FlatList
                ref={gallery}
                data={p.images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(img, i) => `${img.thumb_url}-${i}`}
                onScrollBeginDrag={onDrag}
                onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
                getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
                renderItem={({ item, index }) => (
                  <Pressable onPress={() => setViewer(index)} accessibilityRole="imagebutton" accessibilityLabel={t('product.openPhoto', { name: p.name })}>
                    <CachedImage image={item} variant="medium" style={{ width, height: width, borderRadius: radius.lg }} contentFit="cover" />
                  </Pressable>
                )}
              />
              {p.images.length > 1 ? (
                <View style={styles.dots}>
                  {p.images.map((_, i) => (
                    <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <View style={[styles.noPhoto, { width, height: width * 0.6, backgroundColor: pickColor(productTilePalette, p.id) }]}>
              <Icon name="package" size={42} color="rgba(255,255,255,0.9)" />
              <Text style={styles.noPhotoText}>{t('product.noPhoto')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>{p.name}</Text>
        <Text style={[styles.price, !p.price && { color: colors.textMuted }]}>{p.in_stock ? formatPrice(p.price, t('product.negotiable')) : t('product.soldOut')}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {p.is_today ? <Tag label={t('stall.todayProducts')} tone="trust" size="md" /> : null}
          {p.images.length ? <Tag label={t('product.photos', { n: p.images.length })} tone="neutral" size="md" icon="image" /> : null}
        </View>
        {!p.price ? <Text style={styles.muted}>{t('stall.negotiate')}</Text> : null}
        {p.description ? (
          <View style={styles.description}>
            <Text style={styles.descriptionTitle}>{t('product.description')}</Text>
            <Text style={styles.descriptionText}>{p.description}</Text>
          </View>
        ) : null}
        {/* La carte de l'étal suffit : la toucher ouvre l'étal */}
        {!own ? <StallCard stall={p.stall} /> : null}
      </Screen>
      <ImageViewer images={p.images} initialIndex={viewer ?? 0} visible={viewer !== null} onClose={() => setViewer(null)} title={p.name} />
    </>
  );
}

const useStyles = makeStyles((c) => ({
  heart: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
  dotOn: { backgroundColor: c.brand, width: 20 },
  noPhoto: { borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  noPhotoText: { color: '#FFFFFF', fontWeight: '600' },
  name: { fontSize: fontSize.display, fontWeight: '800', color: c.text },
  price: { fontSize: fontSize.heading, fontWeight: '800', color: c.brand },
  muted: { fontSize: fontSize.body, color: c.textMuted },
  description: { gap: 4, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md },
  descriptionTitle: { fontSize: fontSize.small, fontWeight: '700', color: c.text },
  descriptionText: { fontSize: fontSize.body, color: c.text, lineHeight: 22 },
}));
