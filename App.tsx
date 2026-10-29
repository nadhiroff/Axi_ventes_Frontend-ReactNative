import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PERSIST_MAX_AGE, queryClient, queryPersister } from './src/lib/queryClient';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: queryPersister, maxAge: PERSIST_MAX_AGE }}
      >
        <RootNavigator />
        <StatusBar style="dark" />
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
