import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, onlineManager } from '@tanstack/react-query';

const DAY = 24 * 60 * 60 * 1000;

// Les requêtes se mettent en pause hors connexion au lieu d'échouer en boucle.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Une donnée fraîche n'est pas redemandée : pas de réseau inutile.
      staleTime: 5 * 60 * 1000,
      // On garde les catalogues une semaine pour pouvoir les afficher hors ligne.
      gcTime: 7 * DAY,
      retry: 2,
      refetchOnReconnect: true,
    },
  },
});

// Le cache survit au redémarrage de l'application : l'écran s'affiche
// immédiatement avec la dernière copie, puis se met à jour en arrière-plan.
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'axi-query-cache',
  throttleTime: 2000,
});

export const PERSIST_MAX_AGE = 7 * DAY;

// À augmenter quand la forme d'une réponse change : l'ancienne copie gardée sur le téléphone est jetée
export const PERSIST_VERSION = '2';
