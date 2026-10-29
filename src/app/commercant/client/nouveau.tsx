import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { ApiError, errorMessage } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import { OptionTile } from '../../../components/ui/Chip';
import { Field } from '../../../components/ui/Field';
import { Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { useMerchantActions } from '../../../hooks/api/merchant';
import { useT } from '../../../i18n';
import { notify } from '../../../lib/confirm';
import { fontSize, spacing, useTheme } from '../../../theme';

/** Ajouter un client à la main (téléphone ou email) */
export default function NewClientScreen() {
  const t = useT();
  const { colors } = useTheme();
  const actions = useMerchantActions();
  const [form, setForm] = useState({ display_name: '', phone: '', email: '', note: '' });
  const [kind, setKind] = useState<'individual' | 'reseller'>('individual');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const submit = () => {
    if (!form.display_name.trim()) return setErrors({ display_name: t('auth.required') });
    if (!form.phone.trim() && !form.email.trim()) return setErrors({ phone: t('merchant.phoneOrEmail') });
    actions.addClient.mutate(
      { display_name: form.display_name.trim(), phone: form.phone.trim() || undefined, email: form.email.trim() || undefined, kind, note: form.note.trim() || undefined },
      {
        onSuccess: () => router.back(),
        onError: (e) => {
          setErrors(e instanceof ApiError ? e.fields : {});
          notify(t('merchant.addClient'), errorMessage(e));
        },
      },
    );
  };

  return (
    <>
      <ScreenHeader title={t('merchant.addClient')} />
      <Screen footer={<Button label={t('common.save')} size="lg" onPress={submit} loading={actions.addClient.isPending} />}>
        <View style={{ gap: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          <Field label={t('merchant.clientName')} value={form.display_name} onChangeText={set('display_name')} error={errors.display_name} />
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: fontSize.small }}>{t('merchant.clientKind')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <OptionTile label={t('merchant.individual')} selected={kind === 'individual'} onPress={() => setKind('individual')} />
            <OptionTile label={t('merchant.reseller')} selected={kind === 'reseller'} onPress={() => setKind('reseller')} />
          </View>
          <Field label={t('auth.phone')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={errors.phone} />
          <Field label={t('auth.email')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
          <Field label={t('merchant.note')} value={form.note} onChangeText={set('note')} />
        </View>
      </Screen>
    </>
  );
}
