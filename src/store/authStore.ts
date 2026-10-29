import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { ApiError, setAuthToken, setUnauthorizedHandler } from '../api/client';
import { api } from '../api/endpoints';
import { clearEtagCache } from '../api/etagCache';
import type { User } from '../api/types';
import { queryClient } from '../lib/queryClient';
import { deleteToken, readToken, writeToken } from '../lib/tokenStorage';

/** Espace affiché au démarrage. "merchant" n'est possible que pour un compte commerçant. */
export type Mode = 'client' | 'merchant';

type AuthState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  mode: Mode;
  bootstrap: () => Promise<void>;
  signIn: (token: string, user: User) => Promise<void>;
  setUser: (user: User) => void;
  setMode: (mode: Mode) => void;
  signOut: () => Promise<void>;
};

// Le profil et l'espace choisi sont gardés à part du jeton : ils ne sont pas secrets
// et permettent d'afficher l'application tout de suite, même sans réseau.
const PROFILE_KEY = 'axi-profile';

async function saveProfile(user: User | null, mode: Mode) {
  try {
    if (user) await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({ user, mode }));
    else await AsyncStorage.removeItem(PROFILE_KEY);
  } catch {
    // Le profil sera relu depuis le serveur.
  }
}

async function loadProfile(): Promise<{ user: User; mode: Mode } | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as { user: User; mode: Mode }) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'loading',
  user: null,
  mode: 'client',

  bootstrap: async () => {
    const [token, profile] = await Promise.all([readToken(), loadProfile()]);
    if (!token) {
      set({ status: 'signedOut', user: null, mode: 'client' });
      return;
    }
    setAuthToken(token);
    set({ status: 'signedIn', user: profile?.user ?? null, mode: profile?.mode ?? 'client' });

    // Rafraîchit le profil en arrière-plan (rôle donné par un agent, nom modifié…).
    try {
      const user = await api.me();
      get().setUser(user);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await get().signOut();
    }
  },

  signIn: async (token, user) => {
    await writeToken(token);
    setAuthToken(token);
    const mode: Mode = user.role === 'merchant' ? 'merchant' : 'client';
    set({ status: 'signedIn', user, mode });
    await saveProfile(user, mode);
  },

  setUser: (user) => {
    const mode = user.role === 'merchant' ? get().mode : 'client';
    set({ user, mode });
    saveProfile(user, mode);
  },

  setMode: (mode) => {
    const { user } = get();
    const allowed = mode === 'client' || user?.role === 'merchant';
    if (!allowed) return;
    set({ mode });
    saveProfile(user, mode);
  },

  signOut: async () => {
    if (get().status === 'signedIn') api.logout().catch(() => undefined);
    setAuthToken(null);
    set({ status: 'signedOut', user: null, mode: 'client' });
    await Promise.all([deleteToken(), saveProfile(null, 'client'), clearEtagCache()]);
    queryClient.clear();
  },
}));

setUnauthorizedHandler(() => {
  useAuthStore.getState().signOut();
});
