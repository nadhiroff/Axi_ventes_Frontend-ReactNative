import { useState } from 'react';
import { Text } from 'react-native';

import { ApiError, errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useT } from '../../i18n';
import { notify } from '../../lib/confirm';
import { useAuthStore } from '../../store/authStore';
import { fontSize, spacing, useTheme } from '../../theme';

/** Mon profil : prénom, nom, téléphone de contact (l'email sert d'identifiant et ne change pas ici) */
export default function ProfileScreen() {
  const t = useT();
  const { colors } = useTheme();
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '', phone: user?.phone ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      setUser(await api.updateMe({ first_name: form.first_name.trim(), last_name: form.last_name.trim(), phone: form.phone.trim() || null }));
      setErrors({});
      notify(t('common.saved'));
    } catch (e) {
      setErrors(e instanceof ApiError ? e.fields : {});
      notify(t('settings.profile'), errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ScreenHeader title={t('settings.profile')} />
      <Screen>
        <Card style={{ gap: spacing.lg, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>{user?.email}</Text>
          <Field label={t('auth.firstName')} value={form.first_name} onChangeText={(v) => setForm((f) => ({ ...f, first_name: v }))} error={errors.first_name} />
          <Field label={t('auth.lastName')} value={form.last_name} onChangeText={(v) => setForm((f) => ({ ...f, last_name: v }))} error={errors.last_name} />
          <Field label={`${t('auth.phone')} (${t('common.optional')})`} value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" hint={t('auth.phoneHint')} error={errors.phone} />
          <Button label={t('common.save')} onPress={save} loading={saving} />
        </Card>
      </Screen>
    </>
  );
}
