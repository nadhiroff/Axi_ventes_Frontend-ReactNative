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
  const mutations = useProductMutations();
  const [viewer, setViewer] = useState(false);
  const toggle = (patch: { in_stock?: boolean; is_today?: boolean }) =>
    new Promise<boolean>((resolve) =>
      mutations.update.mutate({ id: product.id, patch }, {
        onSuccess: () => resolve(true),
        onError: (e) => {
          notify(product.name, errorMessage(e), 'error');
          resolve(false);
        },
      }),
    );
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {draft ? <Tag label={t('merchant.drafts')} tone="brand" /> : null}
            {product.status === 'paused' ? <Tag label={t('merchant.paused')} tone="outline" /> : null}
            {product.sold_out ? <Tag label={t('merchant.soldOut')} tone="danger" /> : product.stock_quantity !== null ? <Tag label={t('merchant.stockLeft', { n: product.stock_quantity })} tone="neutral" /> : null}
            {!draft && product.images.length ? <Text style={styles.muted}>{t('product.photos', { n: product.images.length })}</Text> : null}
          </View>
        </Pressable>
        <Pressable onPress={() => router.push(`/commercant/produit/${product.id}`)} accessibilityRole="button" accessibilityLabel={t('common.edit')} hitSlop={8} style={styles.edit}>
          <Icon name="edit-2" size={18} />
        </Pressable>
      </View>
      {!draft ? (
        <View style={styles.toggles}>
          <ToggleRow key={`stock-${product.in_stock}`} label={t('merchant.inStock')} initial={product.in_stock} onChange={(v) => toggle({ in_stock: v })} />
          <ToggleRow key={`today-${product.is_today}`} label={t('merchant.todayToggle')} initial={product.is_today} onChange={(v) => toggle({ is_today: v })} />
        </View>
      ) : (
        <Text style={styles.muted}>{t('merchant.voiceDraft')}</Text>
      )}
      <ImageViewer images={product.images} visible={viewer} onClose={() => setViewer(false)} title={product.name} />
    </View>
  );
}

/**
 * Ligne « libellé — interrupteur » : toute la ligne se touche ; l'interrupteur bascule tout de suite
 * (sans attendre le serveur) et ne revient en arrière qu'en cas d'échec.
 */
function ToggleRow({ label, initial, onChange }: { label: string; initial: boolean; onChange: (value: boolean) => Promise<boolean> }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [value, setValue] = useState(initial);
  const change = (next: boolean) => {
    setValue(next);
    onChange(next).then((ok) => {
      if (!ok) setValue(!next);
    });
  };
  return (
    <Pressable onPress={() => change(!value)} style={styles.toggle} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label}>
      <Text style={styles.toggleLabel} numberOfLines={1}>
        {label}
      </Text>
      <Switch value={value} onValueChange={change} trackColor={{ true: colors.trust, false: colors.border }} thumbColor="#FFFFFF" ios_backgroundColor={colors.border} style={styles.switch} />
    </Pressable>
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
  // Un interrupteur par ligne : libellé à gauche, interrupteur à droite, toujours alignés quelle que soit la langue
  toggles: {},
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: 52, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.border },
  toggleLabel: { flex: 1, fontSize: fontSize.body, lineHeight: 20, color: c.text, fontWeight: '500', includeFontPadding: false, textAlignVertical: 'center' },
  switch: { marginVertical: 0, alignSelf: 'center' },
}));
