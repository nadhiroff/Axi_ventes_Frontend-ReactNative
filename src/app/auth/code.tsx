import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { ApiError, errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useT } from '../../i18n';
import { finishAuth } from '../../lib/authFlow';
import { deviceName } from '../../store/authStore';
import { useFormStyles as useStyles } from '../../components/auth/formStyles';

/** Code à 6 chiffres reçu par email pour confirmer l'adresse. */
export default function CodeScreen() {
  const styles = useStyles();
  const t = useT();
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(60);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const submit = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await finishAuth(await api.verifyEmail(email, code.trim(), deviceName()));
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setMessage(null);
    try {
      await api.resendCode(email, 'verify_email');
      setInfo(t('auth.codeSent'));
      setWait(60);
    } catch (e) {
      setMessage(errorMessage(e));
      if (e instanceof ApiError && typeof e.extra.retry_after === 'number') setWait(e.extra.retry_after);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('auth.codeTitle')} />
      <Screen>
        <View style={styles.form}>
          <Text style={styles.text}>{t('auth.codeText', { email })}</Text>
          <Field label={t('auth.code')} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} />
          {message ? <Text style={styles.error}>{message}</Text> : null}
          {info && !message ? <Text style={styles.text}>{info}</Text> : null}
          <Button label={t('auth.verify')} size="lg" onPress={submit} loading={loading} disabled={code.length !== 6} />
          <Button label={wait > 0 ? t('auth.resendIn', { s: wait }) : t('auth.resend')} variant="ghost" onPress={resend} disabled={wait > 0} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
