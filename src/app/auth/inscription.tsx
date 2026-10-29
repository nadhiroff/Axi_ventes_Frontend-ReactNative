import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { ApiError, errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import type { Role } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { OptionTile } from '../../components/ui/Chip';
import { Field } from '../../components/ui/Field';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useLangStore, useT } from '../../i18n';
import { isEmail } from '../../lib/authFlow';
import { useFormStyles as useStyles } from '../../components/auth/formStyles';

/** Créer un compte : prénom, nom, email, mot de passe, profil Client ou Commerçant (téléphone facultatif). */
export default function RegisterScreen() {
  const styles = useStyles();
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', phone: '' });
  const [profile, setProfile] = useState<Role>('client');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    const local: Record<string, string> = {};
    if (!form.first_name.trim()) local.first_name = t('auth.required');
    if (!form.last_name.trim()) local.last_name = t('auth.required');
    if (!isEmail(form.email)) local.email = t('auth.invalidEmail');
    if (form.password.length < 8) local.password = t('auth.shortPassword');
    setErrors(local);
    setMessage(null);
    if (Object.keys(local).length) return;
    setLoading(true);
    try {
      await api.register({ ...form, email: form.email.trim(), phone: form.phone.trim() || undefined, profile, lang });
      router.replace({ pathname: '/auth/code', params: { email: form.email.trim(), purpose: 'verify_email' } });
    } catch (e) {
      setErrors(e instanceof ApiError ? e.fields : {});
      setMessage(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('auth.registerTitle')} />
      <Screen>
        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.profileTitle')}</Text>
          <View style={styles.row}>
            <OptionTile label={t('auth.profileClient')} hint={t('auth.profileClientHint')} selected={profile === 'client'} onPress={() => setProfile('client')} />
            <OptionTile label={t('auth.profileMerchant')} hint={t('auth.profileMerchantHint')} selected={profile === 'merchant'} onPress={() => setProfile('merchant')} />
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label={t('auth.firstName')} value={form.first_name} onChangeText={set('first_name')} autoComplete="given-name" error={errors.first_name} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('auth.lastName')} value={form.last_name} onChangeText={set('last_name')} autoComplete="family-name" error={errors.last_name} />
            </View>
          </View>
          <Field label={t('auth.email')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email} />
          <Field label={t('auth.password')} value={form.password} onChangeText={set('password')} secret autoComplete="new-password" hint={t('auth.passwordHint')} error={errors.password} />
          <Field label={`${t('auth.phone')} (${t('common.optional')})`} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" hint={t('auth.phoneHint')} error={errors.phone} />
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <Button label={t('auth.register')} size="lg" onPress={submit} loading={loading} />
          <Button label={t('auth.haveAccount')} variant="ghost" onPress={() => router.replace('/auth/connexion')} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
