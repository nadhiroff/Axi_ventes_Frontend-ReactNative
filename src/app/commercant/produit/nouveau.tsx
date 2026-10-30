import { useState } from 'react';
import { View } from 'react-native';

import { ApiError, errorMessage, type LocalFile } from '../../../api/client';
import { PriceFields } from '../../../components/merchant/PriceFields';
import { PhotoPicker } from '../../../components/merchant/PhotoPicker';
import { Button } from '../../../components/ui/Button';
import { Field, SwitchRow } from '../../../components/ui/Field';
import { Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { useProductMutations } from '../../../hooks/api/merchant';
import { useConfirmLeave } from '../../../hooks/useConfirmLeave';
import { useT } from '../../../i18n';
import { notify, toast } from '../../../lib/confirm';
import { spacing } from '../../../theme';

/** Nouveau produit : photos et formulaire complet. */
export default function NewProductScreen() {
  const t = useT();
  const mutations = useProductMutations();
  const [photos, setPhotos] = useState<LocalFile[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [negotiable, setNegotiable] = useState(false);
  const [today, setToday] = useState(true);
  const [trackStock, setTrackStock] = useState(false);
  const [stock, setStock] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Quelque chose de saisi : quitter demande confirmation
  const { leave, cancel } = useConfirmLeave(photos.length > 0 || !!name.trim() || !!description.trim() || !!price || !!priceMax || !!stock);

  const create = () => {
    const local: Record<string, string> = {};
    if (!name.trim()) local.name = t('auth.required');
    if (trackStock && !stock.replace(/\D/g, '')) local.stock_quantity = t('merchant.stockRequired');
    setErrors(local);
    if (Object.keys(local).length) return;
    mutations.create.mutate(
      { fields: { name: name.trim(), description: description.trim(), price: negotiable ? '' : price.replace(/\D/g, ''), price_max: negotiable ? '' : priceMax.replace(/\D/g, ''), is_today: today ? '1' : '0', stock_quantity: trackStock ? stock.replace(/\D/g, '') : '' }, photos },
      {
        onSuccess: () => {
          toast(t('merchant.productPublished'));
          leave();
        },
        onError: (e) => {
          setErrors(e instanceof ApiError ? e.fields : {});
          notify(t('merchant.productTitle'), errorMessage(e), 'error');
        },
      },
    );
  };

  return (
    <>
      <ScreenHeader title={t('merchant.productTitle')} />
      <Screen
        footer={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label={t('common.cancel')} variant="ghost" size="lg" onPress={cancel} style={{ flex: 1 }} />
            <Button label={t('merchant.publish')} size="lg" onPress={create} loading={mutations.create.isPending} style={{ flex: 2 }} />
          </View>
        }
      >
        <View style={{ gap: spacing.lg, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
          <PhotoPicker photos={photos} onChange={setPhotos} />
          <Field label={t('merchant.productName')} value={name} onChangeText={setName} error={errors.name} />
          <Field
            label={`${t('merchant.productDescription')} (${t('common.optional')})`}
            value={description}
            onChangeText={setDescription}
            placeholder={t('merchant.productDescriptionPlaceholder')}
            multiline
            maxLength={1000}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
            hint={t('merchant.productDescriptionHint')}
            error={errors.description}
          />
          <SwitchRow label={t('merchant.negotiable')} value={negotiable} onChange={setNegotiable} />
          {!negotiable ? (
            <PriceFields min={price} max={priceMax} onMin={setPrice} onMax={setPriceMax} errors={errors} />
          ) : null}
          <SwitchRow label={t('merchant.trackStock')} hint={t('merchant.trackStockHint')} value={trackStock} onChange={setTrackStock} />
          {trackStock ? <Field label={t('merchant.stockQuantity')} value={stock} onChangeText={setStock} keyboardType="number-pad" error={errors.stock_quantity} /> : null}
          <SwitchRow label={t('merchant.todayToggle')} value={today} onChange={setToday} />
        </View>
      </Screen>
    </>
  );
}
