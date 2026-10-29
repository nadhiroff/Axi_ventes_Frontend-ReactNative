import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { ApiError, errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useFormStyles as useStyles } from '../../components/auth/formStyles';
import { useT } from '../../i18n';
import { finishAuth, isEmail } from '../../lib/authFlow';
import { deviceName } from '../../store/authStore';

/** Connexion : email et mot de passe uniquement. */
export default function SignInScreen() {
  const styles = useStyles();
  const t = useT();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const local: Record<string, string> = {};
    if (!isEmail(email)) local.email = t('auth.invalidEmail');
    if (!password) local.password = t('auth.required');
    setErrors(local);
    setMessage(null);
    if (Object.keys(local).length) return;
    setLoading(true);
    try {
      await finishAuth(await api.login(email.trim(), password, deviceName()));
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EMAIL_NOT_VERIFIED') {
        router.push({ pathname: '/auth/code', params: { email: email.trim(), purpose: 'verify_email' } });
      } else {
        setErrors(e instanceof ApiError ? e.fields : {});
        setMessage(errorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('auth.title')} />
      <Screen>
        <View style={styles.form}>
          {reason ? <Card tone="brandSoft"><Text style={styles.reason}>{reason}</Text></Card> : null}
          <Field label={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" error={errors.email} />
          <Field label={t('auth.password')} value={password} onChangeText={setPassword} secret autoComplete="password" textContentType="password" error={errors.password} onSubmitEditing={submit} />
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <Button label={t('auth.signIn')} size="lg" onPress={submit} loading={loading} />
          <Button label={t('auth.forgot')} variant="ghost" onPress={() => router.push({ pathname: '/auth/mot-de-passe-oublie', params: { email } })} />
          <Button label={t('auth.noAccount')} variant="outline" onPress={() => router.replace('/auth/inscription')} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
