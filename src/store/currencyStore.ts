import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { Currency } from '../api/types';

const KEY = 'axi-currency';
const RATES_KEY = 'axi-rates';

/**
 * Devise d'affichage : F CFA (par défaut), euro ou dollar. Les paiements restent en F CFA ;
 * les autres devises sont une conversion indicative avec le taux réel du serveur (rates : F CFA pour 1 unité).
 */
export const useCurrencyStore = create<{
  currency: Currency;
  rates: Record<Currency, number>;
  setCurrency: (currency: Currency) => void;
  setRates: (rates: Record<Currency, number>) => void;
  load: () => Promise<void>;
}>()((set) => ({
  currency: 'XOF',
  // Euro : parité fixe officielle ; dollar : remplacé par le taux du jour dès qu'il est reçu
  rates: { XOF: 1, EUR: 655.957, USD: 600 },
  setCurrency: (currency) => {
    set({ currency });
    AsyncStorage.setItem(KEY, currency).catch(() => undefined);
  },
  setRates: (rates) => {
    set({ rates });
    AsyncStorage.setItem(RATES_KEY, JSON.stringify(rates)).catch(() => undefined);
  },
  load: async () => {
    const [currency, rates] = await Promise.all([AsyncStorage.getItem(KEY).catch(() => null), AsyncStorage.getItem(RATES_KEY).catch(() => null)]);
    if (currency === 'XOF' || currency === 'EUR' || currency === 'USD') set({ currency });
    try {
      if (rates) set({ rates: JSON.parse(rates) });
    } catch {
      // Taux par défaut gardés.
    }
  },
}));
