import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useT } from '../../i18n';
import { isEmail } from '../../lib/authFlow';
import { useFormStyles as useStyles } from '../../components/auth/formStyles';

export default function ForgotScreen() {
  const styles = useStyles();
  const t = useT();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!isEmail(email)) {
      setError(t('auth.invalidEmail'));
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      router.replace({ pathname: '/auth/reinitialiser', params: { email: email.trim() } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('auth.forgotTitle')} />
      <Screen>
        <View style={styles.form}>
          <Text style={styles.text}>{t('auth.forgotText')}</Text>
          <Field label={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={error} />
          <Button label={t('auth.sendCode')} size="lg" onPress={submit} loading={loading} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
