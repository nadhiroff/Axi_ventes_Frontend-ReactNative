// Charte Axi (note de cadrage) : orange terre cuite pour la marque, vert pour l'argent,
// la confiance et la connexion, nom « axi » écrit en minuscules. Deux palettes : claire et sombre.
export type Palette = {
  brand: string;
  brandDark: string;
  brandSoft: string;
  brandMuted: string;
  trust: string;
  trustText: string;
  trustSoft: string;
  ink: string;
  inkSoft: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textOnDark: string;
  textOnDarkMuted: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
};

export const lightPalette: Palette = {
  brand: '#C2410C', // terre cuite : logo, boutons principaux
  brandDark: '#9A3412',
  brandSoft: '#FDEBDD',
  brandMuted: '#FB923C',
  trust: '#166534', // vert : argent, confiance, « vérifié »
  trustText: '#15803D',
  trustSoft: '#DCFCE7',
  ink: '#1C1917',
  inkSoft: '#2E2A27',
  background: '#F3F1EE',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EEEA',
  border: '#E7E2DC',
  text: '#1C1917',
  textMuted: '#6B6460',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: '#C9C3BE',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  overlay: 'rgba(0,0,0,0.92)',
};

// Contrastes vérifiés pour la lecture : texte clair sur fonds sombres chauds, orange éclairci
export const darkPalette: Palette = {
  brand: '#EA580C',
  brandDark: '#FDBA74',
  brandSoft: '#3B2417',
  brandMuted: '#FB923C',
  trust: '#22C55E',
  trustText: '#4ADE80',
  trustSoft: '#13301F',
  ink: '#2A2622',
  inkSoft: '#3A3530',
  background: '#12100E',
  surface: '#1F1C19',
  surfaceAlt: '#2A2622',
  border: '#36312C',
  text: '#F5F5F4',
  textMuted: '#B4ADA7',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: '#D6D3D1',
  danger: '#F87171',
  dangerSoft: '#3A1616',
  overlay: 'rgba(0,0,0,0.95)',
};

// Pastilles d'initiales et carrés d'allées : couleurs douces, texte foncé assorti.
export const softPalette = [
  { bg: '#FDEBDD', fg: '#9A3412' },
  { bg: '#DCFCE7', fg: '#166534' },
  { bg: '#FCE7F3', fg: '#9D174D' },
  { bg: '#E0E7FF', fg: '#3730A3' },
  { bg: '#E7E5E4', fg: '#44403C' },
  { bg: '#FEF3C7', fg: '#92400E' },
] as const;

// Tuiles produit sans photo : aplats vifs, comme sur la maquette de l'étal.
export const productTilePalette = ['#F59E0B', '#1D4ED8', '#166534', '#BE185D', '#C2410C', '#0F766E'] as const;

export function pickColor<T>(palette: readonly T[], key: string | null | undefined): T {
  key = key ?? '';
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}
