import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';
import { create } from 'zustand';

import { en } from './en';
import { fon } from './fon';
import { fr, type Dict } from './fr';
import { yo } from './yo';

export type Lang = 'fr' | 'en' | 'fon' | 'yo';

// fon et yoruba : structure prête, traductions à faire valider par un locuteur ; en attendant, le français s'affiche
const dictionaries: Record<Lang, Partial<Dict>> = { fr, en, fon, yo };

/** Clés pointées du dictionnaire : « home.title », « cart.pay »… */
type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];
export type TKey = Paths<Dict>;

const KEY = 'axi-lang';

export const useLangStore = create<{ lang: Lang; setLang: (lang: Lang) => void; load: () => Promise<void> }>()((set) => ({
  lang: 'fr',
  setLang: (lang) => {
    set({ lang });
    AsyncStorage.setItem(KEY, lang).catch(() => undefined);
  },
  load: async () => {
    const saved = await AsyncStorage.getItem(KEY).catch(() => null);
    if (saved === 'fr' || saved === 'en' || saved === 'fon' || saved === 'yo') set({ lang: saved });
  },
}));

function lookup(dict: Partial<Dict>, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Traduction avec paramètres : t('cart.stalls', { n: 3 }) → « 3 étals » ; {n} remplacé, pluriel « |» */
export function translate(lang: Lang, key: TKey, params: Record<string, string | number> = {}): string {
  let text = lookup(dictionaries[lang], key) ?? lookup(fr, key) ?? key;
  // « 1 étal|{n} étals » : forme au singulier puis au pluriel selon params.n
  if (text.includes('|') && typeof params.n === 'number') {
    const [one, many] = text.split('|');
    text = Math.abs(params.n) > 1 ? many : one;
  }
  return text.replace(/\{(\w+)\}/g, (_, name: string) => (params[name] !== undefined ? String(params[name]) : `{${name}}`));
}

export function useT() {
  const lang = useLangStore((s) => s.lang);
  return useCallback((key: TKey, params?: Record<string, string | number>) => translate(lang, key, params), [lang]);
}

/** Pour le code hors composant (alertes, stores) */
export function t(key: TKey, params?: Record<string, string | number>): string {
  return translate(useLangStore.getState().lang, key, params);
}

export const LANG_LABELS: Record<Lang, string> = { fr: 'Français', en: 'English', fon: 'Fɔngbè', yo: 'Yorùbá' };
