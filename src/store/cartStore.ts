import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ReceptionMode = 'delivery_cotonou' | 'bus_shipping' | 'axi_point';

export type CartItem = {
  product_id: string;
  stall_id: string;
  stall_name: string;
  name: string;
  unit_price: number; // FCFA
  quantity: number;
};

type CartState = {
  items: CartItem[];
  receptionMode: ReceptionMode;
  add: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setReceptionMode: (mode: ReceptionMode) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      receptionMode: 'delivery_cotonou',
      add: (item, quantity = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.product_id === item.product_id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.product_id === item.product_id ? { ...i, quantity: i.quantity + quantity } : i,
              ),
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
      setReceptionMode: (receptionMode) => set({ receptionMode }),
      clear: () => set({ items: [] }),
    }),
    { name: 'axi-cart', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Regroupe les articles par étal pour l'écran "Panier multi-étals". */
export function groupByStall(items: CartItem[]) {
  const groups = new Map<string, { stall_id: string; stall_name: string; items: CartItem[]; subtotal: number }>();
  for (const item of items) {
    const group = groups.get(item.stall_id) ?? {
      stall_id: item.stall_id,
      stall_name: item.stall_name,
      items: [],
      subtotal: 0,
    };
    group.items.push(item);
    group.subtotal += item.unit_price * item.quantity;
    groups.set(item.stall_id, group);
  }
  return [...groups.values()];
}
