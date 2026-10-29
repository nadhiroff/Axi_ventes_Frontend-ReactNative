import AsyncStorage from '@react-native-async-storage/async-storage';

// Garde la dernière réponse de chaque URL avec son ETag. Au prochain appel on
// envoie If-None-Match : si rien n'a changé, le serveur répond 304 sans corps
// et on relit la copie locale. Le catalogue n'est donc retéléchargé que s'il change.

type Entry = { etag: string; body: unknown };

const PREFIX = 'etag:';

export async function readEtagEntry(url: string): Promise<Entry | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + url);
    return raw ? (JSON.parse(raw) as Entry) : null;
  } catch {
    return null;
  }
}

export async function writeEtagEntry(url: string, entry: Entry): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + url, JSON.stringify(entry));
  } catch {
    // Le cache est une optimisation : un échec d'écriture ne doit pas casser l'appel.
  }
}
