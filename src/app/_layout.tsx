import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PERSIST_MAX_AGE, queryClient, queryPersister } from '../lib/queryClient';
import { colors } from '../theme';

export default function RootLayout() {
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
        </Stack>
        <StatusBar style="dark" />
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
