import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync } from 'expo-audio';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { KeyboardProvider, KeyboardToolbar } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionWatcher } from '../components/SessionWatcher';
import { DialogHost } from '../components/ui/DialogHost';
import { useT } from '../i18n';

import { PERSIST_MAX_AGE, queryClient, queryPersister } from '../lib/queryClient';
import { useAuthStore } from '../store/authStore';
import { useKeyboardToolbarStore } from '../store/uiStore';
import { useTheme } from '../theme';

export default function RootLayout() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const { colors, dark } = useTheme();
  const t = useT();
  const toolbar = useKeyboardToolbarStore((s) => s.enabled);

  // Relit la session gardée sur l'appareil (jeton, profil, thème, langue).
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Les messages vocaux s'entendent même quand l'iPhone est en mode silencieux
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => undefined);
  }, []);

  // Fond de la fenêtre (rotation, clavier) assorti au thème clair ou sombre
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister, maxAge: PERSIST_MAX_AGE }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(client)" />
          <Stack.Screen name="bienvenue" options={{ gestureEnabled: false }} />
          <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
          <Stack.Screen name="paiement" options={{ gestureEnabled: false }} />
          <Stack.Screen name="commercant" />
          {/* Dans une discussion, glisser un message sert à y répondre : pas de retour arrière par glissement */}
          <Stack.Screen name="messages/[id]" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
        </Stack>
        <StatusBar style={dark ? 'light' : 'dark'} />
        {/* Au-dessus du clavier : champ précédent / suivant et « OK » pour le fermer */}
        {toolbar ? <KeyboardToolbar doneText={t('common.done')} theme={{ light: { primary: colors.brand, disabled: colors.textMuted, background: colors.surfaceAlt, ripple: colors.border }, dark: { primary: colors.brand, disabled: colors.textMuted, background: colors.surfaceAlt, ripple: colors.border } }} /> : null}
        <SessionWatcher />
        <DialogHost />
      </PersistQueryClientProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
