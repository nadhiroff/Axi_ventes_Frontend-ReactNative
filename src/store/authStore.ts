import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { ApiError, setAuthToken, setUnauthorizedHandler } from '../api/client';
import { api } from '../api/endpoints';
import { clearEtagCache } from '../api/etagCache';
import type { User } from '../api/types';
import { useLangStore } from '../i18n';
import { setDataUsageSender } from '../lib/dataUsage';
import { queryClient } from '../lib/queryClient';
import { deleteToken, readToken, writeToken } from '../lib/tokenStorage';
import { useThemeStore } from '../theme';

/**
 * loading : lecture de la session ; welcome : premier lancement (Créer un compte / Se connecter /
 * Continuer en visiteur) ; visitor : visite libre ; signedIn : connecté.
 */
type Status = 'loading' | 'welcome' | 'visitor' | 'signedIn';

type AuthState = {
  status: Status;
  user: User | null;
  /** Écran à rouvrir après la connexion (action interrompue : payer, suivre un étal…) */
  pendingRedirect: string | null;
  /** Espace affiché : un commerçant arrive dans son espace mais peut aussi faire ses achats */
  mode: 'client' | 'merchant';
  setMode: (mode: 'client' | 'merchant') => void;
  bootstrap: () => Promise<void>;
  continueAsVisitor: () => Promise<void>;
  signIn: (token: string, user: User) => Promise<void>;
  setUser: (user: User) => void;
  setPendingRedirect: (path: string | null) => void;
  signOut: (callServer?: boolean) => Promise<void>;
};

// Le profil est gardé à part du jeton : il n'est pas secret et permet d'afficher l'application tout de suite.
const PROFILE_KEY = 'axi-profile';
const VISITOR_KEY = 'axi-visitor';

export const deviceName = () => `${Platform.OS} ${Platform.Version}`;

async function saveProfile(user: User | null) {
  try {
    if (user) await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));
    else await AsyncStorage.removeItem(PROFILE_KEY);
  } catch {
    // Le profil sera relu depuis le serveur.
  }
}

/** Thème et langue enregistrés en base appliqués à l'application */
async function applyServerSettings() {
  try {
    const settings = await api.settings();
    useThemeStore.getState().setPreference(settings.theme);
    useLangStore.getState().setLang(settings.lang);
  } catch {
    // Préférences locales conservées.
  }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'loading',
  user: null,
  pendingRedirect: null,
  mode: 'client',

  setMode: (mode) => set({ mode: mode === 'merchant' && get().user?.role !== 'merchant' ? 'client' : mode }),

  bootstrap: async () => {
    await Promise.all([useThemeStore.getState().load(), useLangStore.getState().load()]);
    const [token, profile, visitor] = await Promise.all([
      readToken(),
      AsyncStorage.getItem(PROFILE_KEY).catch(() => null),
      AsyncStorage.getItem(VISITOR_KEY).catch(() => null),
    ]);
    if (!token) {
      set({ status: visitor === '1' ? 'visitor' : 'welcome', user: null });
      return;
    }
    setAuthToken(token);
    const saved = profile ? (JSON.parse(profile) as User) : null;
    set({ status: 'signedIn', user: saved, mode: saved?.role === 'merchant' ? 'merchant' : 'client' });
    try {
      get().setUser(await api.me());
      applyServerSettings();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await get().signOut(false);
    }
  },

  continueAsVisitor: async () => {
    await AsyncStorage.setItem(VISITOR_KEY, '1').catch(() => undefined);
    set({ status: 'visitor' });
  },

  signIn: async (token, user) => {
    await writeToken(token);
    setAuthToken(token);
    await AsyncStorage.setItem(VISITOR_KEY, '1').catch(() => undefined);
    set({ status: 'signedIn', user, mode: user.role === 'merchant' ? 'merchant' : 'client' });
    await saveProfile(user);
    queryClient.invalidateQueries();
    applyServerSettings();
  },

  setUser: (user) => {
    set({ user });
    saveProfile(user);
  },

  setPendingRedirect: (pendingRedirect) => set({ pendingRedirect }),

  signOut: async (callServer = true) => {
    if (callServer && get().status === 'signedIn') await api.logout().catch(() => undefined);
    setAuthToken(null);
    set({ status: 'welcome', user: null, pendingRedirect: null, mode: 'client' });
    await Promise.all([deleteToken(), saveProfile(null), clearEtagCache(), AsyncStorage.removeItem(VISITOR_KEY).catch(() => undefined)]);
    queryClient.clear();
  },
}));

setUnauthorizedHandler(() => {
  useAuthStore.getState().signOut(false);
});

// Consommation de données : envoyée au serveur pour l'indicateur « Paramètres > Données »
setDataUsageSender(async (bytes) => {
  if (useAuthStore.getState().status === 'signedIn') await api.dataUsage(bytes);
});
