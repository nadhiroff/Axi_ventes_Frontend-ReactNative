import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ReceptionMode } from '../api/types';

export type CartItem = {
  product_id: string;
  stall_id: string;
  stall_name: string;
  stall_site: string;
  stall_verified: boolean;
  name: string;
  unit_price: number; // FCFA, indicatif : le serveur recalcule au devis
  quantity: number;
};

type CartState = {
  items: CartItem[];
  receptionMode: ReceptionMode;
  receptionDetail: string;
  add: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setReception: (mode: ReceptionMode, detail?: string) => void;
  setReceptionDetail: (detail: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      receptionMode: 'delivery',
      receptionDetail: '',
      add: (item, quantity = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.product_id === item.product_id);
          if (existing) {
            return {
              items: s.items.map((i) => (i.product_id === item.product_id ? { ...i, quantity: i.quantity + quantity } : i)),
            };
          }
          return { items: [...s.items, { ...item, quantity }] };
        }),
      setQuantity: (productId, quantity) =>
        set((s) => ({
          items:
            quantity <= 0
              ? s.items.filter((i) => i.product_id !== productId)
              : s.items.map((i) => (i.product_id === productId ? { ...i, quantity } : i)),
        })),
      setReception: (receptionMode, receptionDetail = '') => set({ receptionMode, receptionDetail }),
      setReceptionDetail: (receptionDetail) => set({ receptionDetail }),
      clear: () => set({ items: [], receptionDetail: '' }),
    }),
    { name: 'axi-cart', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export type StallGroup = {
  stall_id: string;
  stall_name: string;
  stall_site: string;
  stall_verified: boolean;
  items: CartItem[];
};

/** Regroupe les articles par étal pour l'écran "Panier multi-étals". */
export function groupByStall(items: CartItem[]): StallGroup[] {
  const groups = new Map<string, StallGroup>();
  for (const item of items) {
    const group = groups.get(item.stall_id) ?? {
      stall_id: item.stall_id,
      stall_name: item.stall_name,
      stall_site: item.stall_site,
      stall_verified: item.stall_verified,
      items: [],
    };
    group.items.push(item);
    groups.set(item.stall_id, group);
  }
  return [...groups.values()];
}

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0);
