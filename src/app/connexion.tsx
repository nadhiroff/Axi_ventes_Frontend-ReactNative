import Constants from 'expo-constants';
import { router, useCanGoBack, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '../api/client';
import { api } from '../api/endpoints';
import { DEMO_CODE } from '../api/mocks/auth';
import type { OtpSent, User } from '../api/types';
import { AxiLogo } from '../components/ui/AxiLogo';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { BackButton } from '../components/ui/ScreenHeader';
import { USE_MOCKS } from '../config/env';
import { useAuthStore } from '../store/authStore';
import { colors, fontSize, radius, spacing } from '../theme';

const countries = [
  { code: '+229', name: 'Bénin' },
  { code: '+228', name: 'Togo' },
  { code: '+234', name: 'Nigeria' },
  { code: '+227', name: 'Niger' },
  { code: '+226', name: 'Burkina Faso' },
  { code: '+225', name: 'Côte d’Ivoire' },
  { code: '+33', name: 'France' },
];

type Step = 'phone' | 'code' | 'profile';

/**
 * Connexion sans mot de passe : numéro, code reçu par SMS (WhatsApp hors Bénin),
 * puis le nom pour un nouveau compte. On reste connecté 90 jours.
 *
 * Paramètres : `reason` (pourquoi on demande la connexion) et `redirect`
 * (où aller ensuite ; sinon on revient à l'écran précédent).
 */
export default function SignInScreen() {
  const { reason, redirect } = useLocalSearchParams<{ reason?: string; redirect?: string }>();
  const insets = useSafeAreaInsets();
  const canGoBack = useCanGoBack();
  const signIn = useAuthStore((s) => s.signIn);
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState<Step>('phone');
  const [country, setCountry] = useState(countries[0]);
  const [digits, setDigits] = useState('');
  const [otp, setOtp] = useState<OtpSent | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [pickingCountry, setPickingCountry] = useState(false);

  const phone = `${country.code}${digits.replace(/\D/g, '')}`;

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const finish = (user: User) => {
    if (redirect) router.replace(redirect as never);
    else if (canGoBack) router.back();
    else router.replace(user.role === 'merchant' ? '/commercant' : '/');
  };

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const sent = await api.requestOtp(phone);
      setOtp(sent);
      setCode('');
      setCountdown(sent.resend_in);
      setStep('code');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      const device = `${Platform.OS} ${Constants.deviceName ?? ''}`.trim();
      const session = await api.verifyOtp({ phone, code: value, device });
      await signIn(session.token, session.user);
      if (session.is_new || !session.user.name) setStep('profile');
      else finish(session.user);
    } catch (e) {
      setError(errorMessage(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    setBusy(true);
    setError(null);
    try {
      const user = await api.updateMe({ name: name.trim() });
      setUser(user);
      finish(user);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onCodeChange = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, otp?.code_length ?? 6);
    setCode(clean);
    if (clean.length === (otp?.code_length ?? 6)) verify(clean);
  };

  const digitsOk = digits.replace(/\D/g, '').length >= 8;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.column}>
          {step === 'profile' ? null : step === 'code' ? (
            <Pressable onPress={() => setStep('phone')} style={styles.backLink} accessibilityRole="button">
              <Icon name="chevron-left" size={20} />
              <Text style={styles.backText}>Changer de numéro</Text>
            </Pressable>
          ) : canGoBack ? (
            <BackButton />
          ) : null}

          <AxiLogo size={42} />

          {step === 'phone' ? (
            <>
              <Text style={styles.title}>Votre numéro de téléphone</Text>
              <Text style={styles.text}>
                {reason ?? 'Pour payer, suivre vos étals et retrouver vos commandes.'} Pas de mot de passe : vous recevez un code.
              </Text>

              <View style={styles.phoneRow}>
                <Pressable
                  onPress={() => setPickingCountry(true)}
                  style={styles.country}
                  accessibilityRole="button"
                  accessibilityLabel={`Pays : ${country.name}`}
                >
                  <Text style={styles.countryCode}>{country.code}</Text>
                  <Icon name="chevron-down" size={16} color={colors.textMuted} />
                </Pressable>
                <TextInput
                  value={digits}
                  onChangeText={setDigits}
                  onSubmitEditing={() => digitsOk && sendCode()}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  placeholder="01 97 00 00 00"
                  placeholderTextColor={colors.textMuted}
                  style={styles.phoneInput}
                  maxLength={16}
                  autoFocus
                  accessibilityLabel="Numéro de téléphone"
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label="Recevoir mon code" size="lg" onPress={sendCode} disabled={!digitsOk} loading={busy} />
              <Text style={styles.small}>
                Hors du Bénin, le code arrive par WhatsApp. Axi ne partage jamais votre numéro.
              </Text>
            </>
          ) : step === 'code' ? (
            <>
              <Text style={styles.title}>Entrez le code</Text>
              <Text style={styles.text}>
                Envoyé par {otp?.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} au {country.code} {digits}.
              </Text>
              <CodeInput value={code} length={otp?.code_length ?? 6} onChange={onCodeChange} disabled={busy} />
              {USE_MOCKS ? <Text style={styles.demo}>Démonstration : le code est {DEMO_CODE}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button
                label={countdown > 0 ? `Renvoyer le code dans ${countdown} s` : 'Renvoyer le code'}
                variant="ghost"
                onPress={sendCode}
                disabled={countdown > 0 || busy}
              />
            </>
          ) : (
            <>
              <Text style={styles.title}>Comment vous appelez-vous ?</Text>
              <Text style={styles.text}>Ce nom apparaît chez les commerçants quand vous commandez.</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                onSubmitEditing={() => name.trim().length >= 2 && saveProfile()}
                placeholder="Ex. Madame Hounsou"
                placeholderTextColor={colors.textMuted}
                autoComplete="name"
                textContentType="name"
                style={styles.nameInput}
                autoFocus
                maxLength={100}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label="Continuer" size="lg" onPress={saveProfile} disabled={name.trim().length < 2} loading={busy} />
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={pickingCountry} transparent animationType="fade" onRequestClose={() => setPickingCountry(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickingCountry(false)}>
          <View style={styles.sheet}>
            {countries.map((c) => (
              <Pressable
                key={c.code}
                onPress={() => {
                  setCountry(c);
                  setPickingCountry(false);
                }}
                style={styles.countryRow}
                accessibilityRole="button"
              >
                <Text style={styles.countryName}>{c.name}</Text>
                <Text style={styles.countryRowCode}>{c.code}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/** Six cases ; un seul champ caché reçoit la saisie et le remplissage automatique du SMS. */
function CodeInput({ value, length, onChange, disabled }: { value: string; length: number; onChange: (v: string) => void; disabled: boolean }) {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  return (
    <Pressable onPress={() => input.current?.focus()} style={styles.codeRow} accessibilityLabel="Code reçu">
      {Array.from({ length }, (_, i) => (
        <View key={i} style={[styles.codeBox, i === value.length && styles.codeBoxActive]}>
          <Text style={styles.codeDigit}>{value[i] ?? ''}</Text>
        </View>
      ))}
      <TextInput
        ref={input}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={length}
        autoFocus
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { flexGrow: 1, paddingHorizontal: spacing.xl },
  column: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: spacing.lg },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', paddingVertical: spacing.sm },
  backText: { fontSize: fontSize.body, color: colors.text, fontWeight: '600' },
  title: { fontSize: fontSize.display, fontWeight: '700', color: colors.text },
  text: { fontSize: fontSize.body, color: colors.textMuted, marginTop: -spacing.sm },
  phoneRow: { flexDirection: 'row', gap: spacing.sm },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  countryCode: { fontSize: fontSize.title, color: colors.text, fontWeight: '600' },
  phoneInput: {
    flex: 1,
    minWidth: 0, // sur le web, un champ a une largeur minimale qui déborderait de l'écran
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.heading,
    color: colors.text,
    letterSpacing: 1,
  },
  nameInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.title,
    color: colors.text,
  },
  small: { fontSize: fontSize.small, color: colors.textMuted, textAlign: 'center' },
  demo: { fontSize: fontSize.small, color: colors.brandDark, backgroundColor: colors.brandSoft, padding: spacing.sm, borderRadius: radius.sm, textAlign: 'center' },
  error: { fontSize: fontSize.body, color: colors.danger },
  codeRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  codeBox: {
    flex: 1,
    maxWidth: 56,
    aspectRatio: 0.85,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: { borderColor: colors.brand },
  codeDigit: { fontSize: 26, fontWeight: '700', color: colors.text },
  hiddenInput: { position: 'absolute', width: '100%', height: '100%', opacity: 0 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.sm, width: '100%', maxWidth: 400, alignSelf: 'center' },
  countryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  countryName: { fontSize: fontSize.body, color: colors.text },
  countryRowCode: { fontSize: fontSize.body, color: colors.textMuted, fontWeight: '600' },
});
