import { useState } from 'react';
import { Text, View } from 'react-native';

import { ApiError, errorMessage } from '../../api/client';
import type { MerchantStallDetail, StallInput } from '../../api/types';
import { useStallOptions } from '../../hooks/api/merchant';
import { useT } from '../../i18n';
import { confirmAction, notify } from '../../lib/confirm';
import { fontSize, makeStyles, spacing } from '../../theme';
import { Button } from '../ui/Button';
import { Chip, OptionTile } from '../ui/Chip';
import { Field, SwitchRow } from '../ui/Field';

type Props = { initial?: MerchantStallDetail; submitLabel: string; onSubmit: (input: StallInput) => Promise<unknown> };

/** Formulaire de l'étal (création et modification) : nom, emplacement, profil, contacts, options. */
export function StallForm({ initial, submitLabel, onSubmit }: Props) {
  const styles = useStyles();
  const t = useT();
  const options = useStallOptions().data;
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    tagline: initial?.tagline ?? '',
    site_id: initial?.location.site_id ?? '',
    aisle_id: initial?.aisle_id ?? '',
    row: initial?.location.row ?? '',
    stand: initial?.location.stand ?? '',
    has_physical_place: initial?.has_physical_place ?? true,
    merchant_type: initial?.merchant_type ?? 'retail',
    phone: initial?.contacts.phone ?? '',
    whatsapp: initial?.contacts.whatsapp ?? '',
    delivery_note: initial?.delivery_note ?? '',
    pay_on_delivery: initial?.pay_on_delivery ?? true,
    accepts_voice_messages: initial?.contacts.accepts_voice_messages ?? true,
    is_open: initial?.is_open ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(key: K) => (value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Premier site proposé par défaut tant que le commerçant n'en a pas choisi
  const siteId = form.site_id || options?.sites[0]?.id || '';

  const moved = !!initial && (siteId !== initial.location.site_id || form.row !== (initial.location.row ?? '') || form.stand !== (initial.location.stand ?? '') || form.has_physical_place !== initial.has_physical_place);

  const submit = async () => {
    const local: Record<string, string> = {};
    if (!form.name.trim()) local.name = t('auth.required');
    if (!siteId) local.site_id = t('auth.required');
    if (!form.aisle_id) local.aisle_id = t('auth.required');
    setErrors(local);
    if (Object.keys(local).length) return;
    const run = async () => {
      setSaving(true);
      try {
        await onSubmit({ ...form, site_id: siteId, row: form.has_physical_place ? form.row : '', stand: form.has_physical_place ? form.stand : '' });
      } catch (e) {
        setErrors(e instanceof ApiError ? e.fields : {});
        notify(submitLabel, errorMessage(e));
      } finally {
        setSaving(false);
      }
    };
    if (moved && initial?.verified) confirmAction(t('merchant.moveConfirm'), t('merchant.moveWarning'), run);
    else run();
  };

  return (
    <View style={styles.form}>
      <Field label={t('merchant.name')} value={form.name} onChangeText={set('name')} error={errors.name} />
      <Field label={t('merchant.tagline')} value={form.tagline} onChangeText={set('tagline')} error={errors.tagline} />
      <Text style={styles.label}>{t('merchant.type')}</Text>
      <View style={styles.row}>
        <OptionTile label={t('merchant.retail')} selected={form.merchant_type === 'retail'} onPress={() => set('merchant_type')('retail')} />
        <OptionTile label={t('merchant.wholesale')} selected={form.merchant_type === 'wholesale'} onPress={() => set('merchant_type')('wholesale')} />
      </View>
      <Text style={styles.label}>{t('merchant.aisle')}</Text>
      <View style={styles.wrap}>{(options?.aisles ?? []).map((a) => <Chip key={a.id} label={a.name} selected={form.aisle_id === a.id} onPress={() => set('aisle_id')(a.id)} />)}</View>
      {errors.aisle_id ? <Text style={styles.error}>{errors.aisle_id}</Text> : null}
      <Text style={styles.label}>{t('merchant.site')}</Text>
      <View style={styles.wrap}>{(options?.sites ?? []).map((s) => <Chip key={s.id} label={s.name} selected={siteId === s.id} onPress={() => set('site_id')(s.id)} />)}</View>
      <SwitchRow label={t('merchant.noPlace')} value={!form.has_physical_place} onChange={(v) => set('has_physical_place')(!v)} />
      {form.has_physical_place ? (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label={t('merchant.row')} value={form.row} onChangeText={set('row')} error={errors.row} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t('merchant.stand')} value={form.stand} onChangeText={set('stand')} error={errors.stand} />
          </View>
        </View>
      ) : null}
      {moved && initial?.verified ? <Text style={styles.warning}>{t('merchant.moveWarning')}</Text> : null}
      <Field label={t('auth.phone')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={errors.phone} />
      <Field label={t('merchant.whatsapp')} value={form.whatsapp} onChangeText={set('whatsapp')} keyboardType="phone-pad" error={errors.whatsapp} />
      <Field label={t('merchant.deliveryNote')} value={form.delivery_note} onChangeText={set('delivery_note')} />
      <SwitchRow label={t('merchant.payOnDelivery')} value={form.pay_on_delivery} onChange={set('pay_on_delivery')} />
      <SwitchRow label={t('merchant.voiceMessages')} value={form.accepts_voice_messages} onChange={set('accepts_voice_messages')} />
      {initial ? <SwitchRow label={t('merchant.isOpen')} value={form.is_open} onChange={set('is_open')} /> : null}
      <Button label={submitLabel} size="lg" onPress={submit} loading={saving} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  form: { gap: spacing.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  label: { fontSize: fontSize.small, fontWeight: '600', color: c.text },
  row: { flexDirection: 'row', gap: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { color: c.danger, fontSize: fontSize.small },
  warning: { color: c.brandDark, fontSize: fontSize.small, fontWeight: '600' },
}));
