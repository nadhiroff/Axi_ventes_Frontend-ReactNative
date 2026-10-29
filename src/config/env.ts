// Défini dans un fichier .env.local : EXPO_PUBLIC_API_URL=https://api.axi.bj
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

export const API_URL = apiUrl ?? '';

/** Sans backend configuré, l'application tourne sur les données de démonstration de src/api/mocks. */
export const USE_MOCKS = !apiUrl;
