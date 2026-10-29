// Charte Axi (relevée sur les maquettes de la note de cadrage) :
// orange terre cuite pour la marque, vert pour l'argent, la confiance et la connexion.
export const colors = {
  brand: '#C2410C', // terre cuite : logo, boutons principaux, en-tête d'étal
  brandDark: '#9A3412',
  brandSoft: '#FDEBDD', // fonds de cartes d'annonce, mode de réception choisi
  brandMuted: '#FB923C', // "Demander un crédit", logo sur fond sombre

  trust: '#166534', // badge "Vérifié par un agent Axi"
  trustText: '#15803D',
  trustSoft: '#DCFCE7', // "Connexion Axi active", "À recevoir", "Payez à la réception"

  ink: '#1C1917', // bannières et boutons sombres
  inkSoft: '#2E2A27', // tuiles sur fond sombre
  background: '#F3F1EE',
  surface: '#FFFFFF',
  border: '#E7E2DC',
  text: '#1C1917',
  textMuted: '#6B6460',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: '#C9C3BE',
  danger: '#B91C1C',
} as const;

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

export function pickColor<T>(palette: readonly T[], key: string): T {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}
