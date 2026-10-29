import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PERSIST_MAX_AGE, queryClient, queryPersister } from '../lib/queryClient';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme';

export default function RootLayout() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const { colors, dark } = useTheme();

  // Relit la session gardée sur l'appareil (jeton, profil, thème, langue).
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Fond de la fenêtre (rotation, clavier) assorti au thème clair ou sombre
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister, maxAge: PERSIST_MAX_AGE }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(client)" />
          <Stack.Screen name="bienvenue" options={{ gestureEnabled: false }} />
          <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
          <Stack.Screen name="paiement" options={{ gestureEnabled: false }} />
          <Stack.Screen name="commercant" />
        </Stack>
        <StatusBar style={dark ? 'light' : 'dark'} />
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
