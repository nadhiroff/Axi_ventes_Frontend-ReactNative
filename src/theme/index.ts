import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { StyleSheet, useColorScheme, useWindowDimensions } from 'react-native';
import { create } from 'zustand';

import { darkPalette, lightPalette, type Palette } from './colors';

export { pickColor, productTilePalette, softPalette, type Palette } from './colors';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const fontSize = { caption: 12, small: 13, body: 15, title: 17, heading: 22, display: 26 } as const;

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'axi-theme';

/** Préférence « Clair / Sombre / Suivre le système » : appliquée tout de suite, enregistrée en base (Paramètres) */
export const useThemeStore = create<{ preference: ThemePreference; setPreference: (p: ThemePreference) => void; load: () => Promise<void> }>()((set) => ({
  preference: 'system',
  setPreference: (preference) => {
    set({ preference });
    AsyncStorage.setItem(KEY, preference).catch(() => undefined);
  },
  load: async () => {
    const saved = await AsyncStorage.getItem(KEY).catch(() => null);
    if (saved === 'light' || saved === 'dark' || saved === 'system') set({ preference: saved });
  },
}));

/** Couleurs du thème actif */
export function useTheme(): { colors: Palette; dark: boolean } {
  const system = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const dark = preference === 'dark' || (preference === 'system' && system === 'dark');
  return { colors: dark ? darkPalette : lightPalette, dark };
}

/** Feuille de styles recalculée quand le thème change : const useStyles = makeStyles((c) => ({ … })) */
type StyleObject = Parameters<typeof StyleSheet.create>[0];

export function makeStyles<T extends StyleObject>(factory: (colors: Palette) => T & StyleObject) {
  const cache = new WeakMap<Palette, Readonly<T>>();
  return function useStyles(): Readonly<T> {
    const { colors } = useTheme();
    return useMemo(() => {
      const cached = cache.get(colors);
      if (cached) return cached;
      const styles = StyleSheet.create(factory(colors)) as Readonly<T>;
      cache.set(colors, styles);
      return styles;
    }, [colors]);
  };
}

/**
 * Mise en page adaptée à l'écran : téléphone, grand téléphone, tablette, iPad (portrait et paysage).
 * columns : nombre de colonnes des grilles de produits ; contentWidth : largeur utile centrée.
 */
export function useLayout() {
  const { width } = useWindowDimensions();
  const tablet = width >= 700;
  const wide = width >= 1000;
  const contentWidth = Math.min(width, wide ? 1100 : tablet ? 900 : width);
  return {
    width,
    tablet,
    wide,
    contentWidth,
    gutter: tablet ? spacing.xxl : spacing.xl,
    productColumns: wide ? 4 : tablet ? 3 : 2,
    aisleColumns: wide ? 6 : tablet ? 4 : 3,
    listColumns: tablet ? 2 : 1,
  };
}
