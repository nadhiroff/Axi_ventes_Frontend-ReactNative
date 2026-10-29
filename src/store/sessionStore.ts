import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Role = 'client' | 'merchant';

type SessionState = {
  role: Role;
  setRole: (role: Role) => void;
};

// L'espace ouvert au démarrage est mémorisé. Sera relié à la connexion
// (POST /v1/auth/...) quand l'API d'authentification sera prête.
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      role: 'client',
      setRole: (role) => set({ role }),
    }),
    { name: 'axi-session', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
