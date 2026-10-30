import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ApiError, errorMessage, type LocalFile } from '../../../api/client';
import type { Product, ProductPatch } from '../../../api/types';
import { PriceFields } from '../../../components/merchant/PriceFields';
import { PhotoPicker } from '../../../components/merchant/PhotoPicker';
import { AudioPlayerButton } from '../../../components/ui/AudioPlayerButton';
import { Button } from '../../../components/ui/Button';
import { CachedImage } from '../../../components/ui/CachedImage';
import { Card } from '../../../components/ui/Card';
import { Field, SwitchRow } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import { ImageViewer } from '../../../components/ui/ImageViewer';
import { Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { EmptyView, LoadingView } from '../../../components/ui/StateViews';
import { useMerchantStall, useProductMutations } from '../../../hooks/api/merchant';
import { useT } from '../../../i18n';
import { confirmAction, notify, toast } from '../../../lib/confirm';
import { fontSize, makeStyles, radius, spacing } from '../../../theme';

/** Modifier un produit (ou compléter un brouillon vocal) : nom, prix, photos, stock, publication, suppression. */
export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const stall = useMerchantStall();
  const product = stall.data?.products.find((p) => p.id === id);
  if (stall.isPending) return <LoadingView />;
  if (!product) return <EmptyView icon="package" title={t('merchant.noProducts')} />;
  return <EditProductForm key={product.id + product.updated_at} product={product} />;
}

function EditProductForm({ product }: { product: Product }) {
  const styles = useStyles();
  const t = useT();
  const mutations = useProductMutations();
  const [form, setForm] = useState({
    name: product.name,
    description: product.description ?? '',
    price: product.price ? String(product.price.amount) : '',
    priceMax: product.price?.amount_max ? String(product.price.amount_max) : '',
    negotiable: product.price === null && product.status !== 'draft',
    in_stock: product.in_stock || product.sold_out,
    is_today: product.is_today,
    trackStock: product.stock_quantity !== null,
    stock: product.stock_quantity !== null ? String(product.stock_quantity) : '',
  });
  const [newPhotos, setNewPhotos] = useState<LocalFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewer, setViewer] = useState<number | null>(null);
  const draft = product.status === 'draft';

  const paused = product.status === 'paused';
  const save = (publish: boolean) => {
    if (form.trackStock && !form.stock.replace(/\D/g, '')) {
      setErrors({ stock_quantity: t('merchant.stockRequired') });
      return;
    }
    const patch: ProductPatch = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.negotiable || !form.price ? null : Number(form.price.replace(/\D/g, '')),
      price_max: form.negotiable || !form.priceMax ? null : Number(form.priceMax.replace(/\D/g, '')),
      in_stock: form.in_stock,
      stock_quantity: form.trackStock ? Number(form.stock.replace(/\D/g, '')) : null,
      is_today: form.is_today,
      ...(publish ? { status: 'active' as const } : {}),
    };
    mutations.update.mutate(
      { id: product.id, patch },
      {
        onSuccess: async () => {
          if (newPhotos.length) await mutations.addPhotos.mutateAsync({ id: product.id, photos: newPhotos }).catch((e) => notify(t('merchant.photos'), errorMessage(e), 'error'));
          toast(publish ? t('merchant.productPublished') : t('merchant.productSaved'));
          router.back();
        },
        onError: (e) => {
          setErrors(e instanceof ApiError ? e.fields : {});
          notify(t('merchant.editProduct'), errorMessage(e), 'error');
        },
      },
    );
  };

  return (
    <>
      <ScreenHeader title={draft ? t('merchant.publishDraft') : t('merchant.editProduct')} />
      <Screen
        footer={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {paused ? <Button label={t('merchant.resume')} onPress={() => save(true)} loading={mutations.update.isPending} style={{ flex: 1 }} /> : null}
            {draft ? <Button label={t('merchant.publishDraft')} onPress={() => save(true)} loading={mutations.update.isPending} style={{ flex: 1 }} /> : null}
            <Button label={t('common.save')} variant={draft || paused ? 'ghost' : 'primary'} onPress={() => save(false)} loading={mutations.update.isPending} style={{ flex: 1 }} />
          </View>
        }
      >
        <View style={{ gap: spacing.lg, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
          {draft ? <Card tone="brandSoft"><Text style={styles.brand}>{t('merchant.voiceDraft')}</Text></Card> : null}
          {paused ? <Card tone="brandSoft"><Text style={styles.brand}>{t('merchant.pausedText')}</Text></Card> : null}
          {product.sold_out ? <Card tone="brandSoft"><Text style={styles.brand}>{t('merchant.soldOutText')}</Text></Card> : null}
          {product.voice_note_url ? (
            <Card style={{ gap: spacing.sm }}>
              <Text style={styles.label}>{t('merchant.voiceNote')}</Text>
              <AudioPlayerButton url={product.voice_note_url} />
            </Card>
          ) : null}
          {product.images.length ? (
            <View style={styles.grid}>
              {product.images.map((img, i) => (
                <View key={img.thumb_url + i} style={styles.thumb}>
                  <Pressable onPress={() => setViewer(i)} accessibilityRole="imagebutton" accessibilityLabel={t('product.openPhoto', { name: product.name })}>
                    <CachedImage image={img} style={styles.img} contentFit="cover" />
                  </Pressable>
                  <Pressable
                    onPress={() => confirmAction(t('merchant.removePhoto'), product.name, () => mutations.removePhoto.mutate({ id: product.id, index: i }), { destructive: true })}
                    accessibilityRole="button"
                    accessibilityLabel={t('cart.remove')}
                    style={styles.remove}
                    hitSlop={6}
                  >
                    <Icon name="trash-2" size={14} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          <PhotoPicker photos={newPhotos} onChange={setNewPhotos} max={Math.max(0, 5 - product.images.length)} />
          <Field label={t('merchant.productName')} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} error={errors.name} />
          <Field
            label={`${t('merchant.productDescription')} (${t('common.optional')})`}
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder={t('merchant.productDescriptionPlaceholder')}
            multiline
            maxLength={1000}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
            error={errors.description}
          />
          <SwitchRow label={t('merchant.negotiable')} value={form.negotiable} onChange={(v) => setForm((f) => ({ ...f, negotiable: v }))} />
          {!form.negotiable ? (
            <PriceFields min={form.price} max={form.priceMax} onMin={(v) => setForm((f) => ({ ...f, price: v }))} onMax={(v) => setForm((f) => ({ ...f, priceMax: v }))} errors={errors} />
          ) : null}
          <SwitchRow label={t('merchant.inStock')} value={form.in_stock} onChange={(v) => setForm((f) => ({ ...f, in_stock: v }))} />
          <SwitchRow label={t('merchant.trackStock')} hint={t('merchant.trackStockHint')} value={form.trackStock} onChange={(v) => setForm((f) => ({ ...f, trackStock: v }))} />
          {form.trackStock ? (
            <Field label={t('merchant.stockQuantity')} value={form.stock} onChangeText={(v) => setForm((f) => ({ ...f, stock: v }))} keyboardType="number-pad" error={errors.stock_quantity} hint={product.sold_out ? t('merchant.restockHint') : undefined} />
          ) : null}
          <SwitchRow label={t('merchant.todayToggle')} value={form.is_today} onChange={(v) => setForm((f) => ({ ...f, is_today: v }))} />
          <Button
            label={t('common.delete')}
            variant="danger"
            icon="trash-2"
            onPress={() => confirmAction(t('merchant.deleteProduct'), t('merchant.deleteProductText'), () => mutations.remove.mutate(product.id, { onSuccess: () => router.back() }), { destructive: true })}
          />
        </View>
      </Screen>
      <ImageViewer images={product.images} initialIndex={viewer ?? 0} visible={viewer !== null} onClose={() => setViewer(null)} title={product.name} />
    </>
  );
}

const useStyles = makeStyles((c) => ({
  brand: { color: c.brandDark, fontSize: fontSize.body, fontWeight: '600' },
  label: { fontSize: fontSize.small, fontWeight: '600', color: c.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: 96, height: 96, borderRadius: radius.md, overflow: 'hidden' },
  img: { width: 96, height: 96 },
  remove: { position: 'absolute', top: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
}));
