// Adresse de l'API, dans un fichier .env.local à la racine du projet :
//   EXPO_PUBLIC_API_URL=http://192.168.100.175:8000   (IP du PC sur le même Wi-Fi que le téléphone)
// Il n'y a plus de données de démonstration : sans cette adresse, l'application affiche une erreur claire.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

export const API_CONFIGURED = API_URL !== '';
