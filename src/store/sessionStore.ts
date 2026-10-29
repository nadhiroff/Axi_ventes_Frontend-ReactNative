import { create } from 'zustand';

export type Role = 'client' | 'merchant';

type SessionState = {
  role: Role;
  setRole: (role: Role) => void;
};

// Sera alimenté par la connexion (POST /v1/auth/...) quand l'API sera prête.
export const useSessionStore = create<SessionState>()((set) => ({
  role: 'client',
  setRole: (role) => set({ role }),
}));
