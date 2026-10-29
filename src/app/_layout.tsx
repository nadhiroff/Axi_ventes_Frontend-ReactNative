import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PERSIST_MAX_AGE, queryClient, queryPersister } from '../lib/queryClient';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';

export default function RootLayout() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  // Relit la session gardée sur l'appareil (jeton, profil, espace choisi).
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister, maxAge: PERSIST_MAX_AGE }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(client)" />
          <Stack.Screen name="etal/[id]" />
          <Stack.Screen name="allee/[id]" />
          <Stack.Screen name="recherche" />
          <Stack.Screen name="commande/[id]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="commercant" />
          <Stack.Screen name="connexion" options={{ presentation: 'modal' }} />
          <Stack.Screen name="pro" />
        </Stack>
        <StatusBar style="dark" />
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
