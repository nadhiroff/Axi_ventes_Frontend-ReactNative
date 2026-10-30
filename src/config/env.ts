import Constants from 'expo-constants';

/**
 * Adresse de l'API.
 * - En développement (Expo Go) : déduite AUTOMATIQUEMENT de l'adresse du PC qui sert l'application
 *   (celle qu'Expo Go utilise déjà), port EXPO_PUBLIC_API_PORT (8000 par défaut). Rien à changer
 *   quand le PC change de Wi-Fi : il suffit de relancer « npx expo start ».
 * - En production, ou pour forcer un serveur en ligne : EXPO_PUBLIC_API_URL=https://… dans .env.local.
 */
const configured = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
const port = process.env.EXPO_PUBLIC_API_PORT || '8000';

/** IP du PC de développement, lue dans l'adresse du serveur Expo (ex. « 192.168.1.6:8081 ») */
function devMachineIp(): string | null {
  if (!__DEV__) return null;
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost ?? '';
  const host = hostUri.split(':')[0];
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host === 'localhost' ? host : null;
}

// Une adresse locale écrite à la main (http://192.168…) est ignorée en développement : elle devient fausse au changement de Wi-Fi
const isLocalAddress = /^http:\/\/(\d{1,3}(\.\d{1,3}){3}|localhost)(:\d+)?$/.test(configured);
const ip = devMachineIp();

export const API_URL = ip && (configured === '' || isLocalAddress) ? `http://${ip}:${port}` : configured;

export const API_CONFIGURED = API_URL !== '';
