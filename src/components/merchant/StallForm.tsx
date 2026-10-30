import { useState } from 'react';
import { Text, View } from 'react-native';

import { ApiError, errorMessage } from '../../api/client';
import type { MerchantStallDetail, StallInput } from '../../api/types';
import { useStallOptions } from '../../hooks/api/merchant';
import { useT } from '../../i18n';
import { confirmAction, notify } from '../../lib/confirm';
import { fontSize, makeStyles, spacing } from '../../theme';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { OptionTile } from '../ui/Chip';
import { Field, SwitchRow } from '../ui/Field';
import { PlacePicker } from './PlacePicker';
import { useConfirmLeave } from '../../hooks/useConfirmLeave';

type Props = { initial: MerchantStallDetail; submitLabel: string; onSubmit: (input: StallInput) => Promise<unknown> };

/** Formulaire de l'étal : nom, emplacement (« Autre » possible), profil, contacts, options. */
export function StallForm({ initial, submitLabel, onSubmit }: Props) {
  const styles = useStyles();
  const t = useT();
  const options = useStallOptions().data;
  const [initialForm] = useState(() => ({
    name: initial.name ?? '',
    tagline: initial.tagline ?? '',
    site: { id: initial.location.site_id, other: initial.site_other ?? '' },
    aisle: { id: initial.aisle_id, other: initial.aisle_other ?? '' },
    row: initial.location.row ?? '',
    stand: initial.location.stand ?? '',
    has_physical_place: initial.has_physical_place ?? true,
    merchant_type: initial.merchant_type ?? 'retail',
    phone: initial.contacts.phone ?? '',
    whatsapp: initial.contacts.whatsapp ?? '',
    delivery_note: initial.delivery_note ?? '',
    pay_on_delivery: initial.pay_on_delivery ?? true,
    accepts_voice_messages: initial.contacts.accepts_voice_messages ?? true,
    is_open: initial.is_open ?? true,
  }));
  const [form, setForm] = useState(initialForm);
  const { leave, cancel } = useConfirmLeave(JSON.stringify(form) !== JSON.stringify(initialForm));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(key: K) => (value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const siteId = form.site.id;
  const moved = (siteId !== initial.location.site_id || form.site.other !== (initial.site_other ?? '') || form.row !== (initial.location.row ?? '') || form.stand !== (initial.location.stand ?? '') || form.has_physical_place !== initial.has_physical_place);

  const submit = async () => {
    const local: Record<string, string> = {};
    if (!form.name.trim()) local.name = t('auth.required');
    if (!siteId) local.site_id = t('auth.required');
    if (!form.aisle.id) local.aisle_id = t('auth.required');
    if (siteId === options?.other_site_id && form.site.other.trim().length < 2) local.site_id = t('merchant.otherRequired');
    if (form.aisle.id === options?.other_aisle_id && form.aisle.other.trim().length < 2) local.aisle_id = t('merchant.otherRequired');
    setErrors(local);
    if (Object.keys(local).length) return;
    const run = async () => {
      setSaving(true);
      try {
        const { site, aisle, ...rest } = form;
        await onSubmit({ ...rest, site_id: site.id, site_other: site.other.trim(), aisle_id: aisle.id, aisle_other: aisle.other.trim(), row: form.has_physical_place ? form.row : '', stand: form.has_physical_place ? form.stand : '' });
        // Enregistré : on quitte l'écran sans demander
        leave();
      } catch (e) {
        setErrors(e instanceof ApiError ? { ...e.fields, ...(e.fields.site_other ? { site_id: e.fields.site_other } : {}), ...(e.fields.aisle_other ? { aisle_id: e.fields.aisle_other } : {}) } : {});
        notify(submitLabel, errorMessage(e), 'error');
      } finally {
        setSaving(false);
      }
    };
    if (moved && initial.verified) confirmAction(t('merchant.moveConfirm'), t('merchant.moveWarning'), run);
    else run();
  };

  return (
    <View style={styles.form}>
      {/* Rangé par blocs : l'étal, son emplacement, les contacts, la vente */}
      <Card style={styles.block}>
        <Text style={styles.title}>{t('merchant.sectionStall')}</Text>
        <Field label={t('merchant.name')} value={form.name} onChangeText={set('name')} error={errors.name} />
        <Field label={t('merchant.tagline')} value={form.tagline} onChangeText={set('tagline')} error={errors.tagline} />
        <Text style={styles.label}>{t('merchant.type')}</Text>
        <View style={styles.row}>
          <OptionTile label={t('merchant.retail')} selected={form.merchant_type === 'retail'} onPress={() => set('merchant_type')('retail')} />
          <OptionTile label={t('merchant.wholesale')} selected={form.merchant_type === 'wholesale'} onPress={() => set('merchant_type')('wholesale')} />
        </View>
        <PlacePicker kind="aisle" options={options} value={form.aisle} onChange={set('aisle')} error={errors.aisle_id} />
      </Card>
      <Card style={styles.block}>
        <Text style={styles.title}>{t('merchant.sectionPlace')}</Text>
        <PlacePicker kind="site" options={options} value={form.site} onChange={set('site')} error={errors.site_id} />
        <SwitchRow label={t('merchant.noPlace')} value={!form.has_physical_place} onChange={(v) => set('has_physical_place')(!v)} />
        {form.has_physical_place ? (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label={t('merchant.row')} value={form.row} onChangeText={set('row')} placeholder={t('merchant.rowPlaceholder')} error={errors.row} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('merchant.stand')} value={form.stand} onChangeText={set('stand')} placeholder={t('merchant.standPlaceholder')} error={errors.stand} />
            </View>
          </View>
        ) : null}
        {moved && initial.verified ? <Text style={styles.warning}>{t('merchant.moveWarning')}</Text> : null}
      </Card>
      <Card style={styles.block}>
        <Text style={styles.title}>{t('merchant.sectionContacts')}</Text>
        <Field label={t('auth.phone')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={errors.phone} />
        <Field label={t('merchant.whatsapp')} value={form.whatsapp} onChangeText={set('whatsapp')} keyboardType="phone-pad" error={errors.whatsapp} />
        <SwitchRow label={t('merchant.voiceMessages')} value={form.accepts_voice_messages} onChange={set('accepts_voice_messages')} />
      </Card>
      <Card style={styles.block}>
        <Text style={styles.title}>{t('merchant.sectionSelling')}</Text>
        <SwitchRow label={t('merchant.isOpen')} value={form.is_open} onChange={set('is_open')} />
        <SwitchRow label={t('merchant.payOnDelivery')} value={form.pay_on_delivery} onChange={set('pay_on_delivery')} />
        <Field label={t('merchant.deliveryNote')} value={form.delivery_note} onChangeText={set('delivery_note')} />
      </Card>
      <View style={styles.row}>
        <Button label={t('common.cancel')} variant="ghost" size="lg" onPress={cancel} style={{ flex: 1 }} />
        <Button label={submitLabel} size="lg" onPress={submit} loading={saving} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  form: { gap: spacing.md, width: '100%' },
  block: { gap: spacing.md },
  title: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  label: { fontSize: fontSize.small, fontWeight: '600', color: c.text },
  row: { flexDirection: 'row', gap: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { color: c.danger, fontSize: fontSize.small },
  warning: { color: c.brandDark, fontSize: fontSize.small, fontWeight: '600' },
}));
