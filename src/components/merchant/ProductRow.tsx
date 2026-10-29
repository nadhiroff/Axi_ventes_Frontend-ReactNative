import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { errorMessage } from '../../api/client';
import type { Product } from '../../api/types';
import { useProductMutations } from '../../hooks/api/merchant';
import { useT } from '../../i18n';
import { notify } from '../../lib/confirm';
import { formatPrice } from '../../lib/format';
import { fontSize, makeStyles, pickColor, productTilePalette, radius, spacing, useTheme } from '../../theme';
import { CachedImage } from '../ui/CachedImage';
import { Icon } from '../ui/Icon';
import { ImageViewer } from '../ui/ImageViewer';
import { Tag } from '../ui/Tag';

/** Ligne du catalogue du commerçant : photo (plein écran au toucher), prix, en stock, aujourd'hui, modifier. */
export function ProductRow({ product }: { product: Product }) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const mutations = useProductMutations();
  const [viewer, setViewer] = useState(false);
  const toggle = (patch: { in_stock?: boolean; is_today?: boolean }) =>
    mutations.update.mutate({ id: product.id, patch }, { onError: (e) => notify(product.name, errorMessage(e)) });
  const draft = product.status === 'draft';

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Pressable onPress={() => (product.images.length ? setViewer(true) : router.push(`/commercant/produit/${product.id}`))} accessibilityRole="imagebutton" accessibilityLabel={product.name} style={[styles.thumb, { backgroundColor: pickColor(productTilePalette, product.id) }]}>
          {product.image ? <CachedImage image={product.image} style={styles.thumbImg} contentFit="cover" /> : <Icon name={draft ? 'mic' : 'package'} size={22} color="#FFFFFF" />}
        </Pressable>
        <Pressable style={{ flex: 1, gap: 2 }} onPress={() => router.push(`/commercant/produit/${product.id}`)} accessibilityRole="button">
          <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.price}>{formatPrice(product.price, t('product.negotiable'))}</Text>
          {draft ? <Tag label={t('merchant.drafts')} tone="brand" /> : product.images.length ? <Text style={styles.muted}>{t('product.photos', { n: product.images.length })}</Text> : null}
        </Pressable>
        <Pressable onPress={() => router.push(`/commercant/produit/${product.id}`)} accessibilityRole="button" accessibilityLabel={t('common.edit')} hitSlop={8} style={styles.edit}>
          <Icon name="edit-2" size={18} />
        </Pressable>
      </View>
      {!draft ? (
        <View style={styles.toggles}>
          <View style={styles.toggle}>
            <Text style={styles.toggleLabel}>{t('merchant.inStock')}</Text>
            <Switch value={product.in_stock} onValueChange={(v) => toggle({ in_stock: v })} trackColor={{ true: colors.trust, false: colors.border }} thumbColor="#FFFFFF" accessibilityLabel={t('merchant.inStock')} />
          </View>
          <View style={styles.toggle}>
            <Text style={styles.toggleLabel}>{t('merchant.todayToggle')}</Text>
            <Switch value={product.is_today} onValueChange={(v) => toggle({ is_today: v })} trackColor={{ true: colors.trust, false: colors.border }} thumbColor="#FFFFFF" accessibilityLabel={t('merchant.todayToggle')} />
          </View>
        </View>
      ) : (
        <Text style={styles.muted}>{t('merchant.voiceDraft')}</Text>
      )}
      <ImageViewer images={product.images} visible={viewer} onClose={() => setViewer(false)} title={product.name} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { flex: 1, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumbImg: { width: 64, height: 64 },
  name: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  price: { fontSize: fontSize.body, fontWeight: '700', color: c.brand },
  muted: { fontSize: fontSize.caption, color: c.textMuted },
  edit: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  toggles: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, justifyContent: 'space-between', minWidth: 150 },
  toggleLabel: { fontSize: fontSize.small, color: c.text, fontWeight: '500' },
}));
