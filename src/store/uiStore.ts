import { create } from 'zustand';

/** Barre « précédent / suivant / OK » au-dessus du clavier : masquée dans la messagerie (barre d'envoi à la place) */
export const useKeyboardToolbarStore = create<{ enabled: boolean; setEnabled: (enabled: boolean) => void }>()((set) => ({
  enabled: true,
  setEnabled: (enabled) => set({ enabled }),
}));
