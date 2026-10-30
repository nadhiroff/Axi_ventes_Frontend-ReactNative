import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Sur téléphone, le jeton va dans le coffre chiffré du système (Keychain / Keystore).
// Sur le web (Axi Pro), le navigateur n'a pas de coffre : on utilise le stockage local.
const KEY = 'axi-token';

export async function readToken(): Promise<string | null> {
  try {
    return Platform.OS === 'web' ? await AsyncStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function writeToken(token: string): Promise<void> {
  if (Platform.OS === 'web') await AsyncStorage.setItem(KEY, token);
  else await SecureStore.setItemAsync(KEY, token);
}

export async function deleteToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') await AsyncStorage.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Déjà absent.
  }
}
