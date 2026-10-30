import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

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

/** Code reçu par email + nouveau mot de passe ; les autres appareils sont déconnectés. */
export default function ResetScreen() {
  const styles = useStyles();
  const t = useT();
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (password.length < 8) {
      setErrors({ password: t('auth.shortPassword') });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await finishAuth(await api.resetPassword(email, code, password, deviceName()));
    } catch (e) {
      setErrors(e instanceof ApiError ? e.fields : {});
      setMessage(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title={t('auth.resetTitle')} />
      <Screen>
        <View style={styles.form}>
          <Text style={styles.text}>{t('auth.resetText', { email })}</Text>
          <Field label={t('auth.code')} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} error={errors.code} />
          <Field label={t('auth.newPassword')} value={password} onChangeText={setPassword} secret autoComplete="new-password" hint={t('auth.passwordHint')} error={errors.password} />
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <Button label={t('auth.resetButton')} size="lg" onPress={submit} loading={loading} disabled={code.length !== 6} />
        </View>
      </Screen>
    </View>
  );
}
