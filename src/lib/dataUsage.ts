import AsyncStorage from '@react-native-async-storage/async-storage';

// Consommation de données de l'application : chaque réponse et chaque envoi sont comptés (en octets),
// puis le total est envoyé au serveur (Paramètres > Données), qui garde le compteur du mois.
let pending = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let flush: ((bytes: number) => Promise<void>) | null = null;

export function setDataUsageSender(sender: (bytes: number) => Promise<void>) {
  flush = sender;
}

export function recordDataUsage(bytes: number) {
  // En-têtes HTTP et TLS : environ 500 octets par échange
  pending += bytes + 500;
  if (timer === null) {
    timer = setTimeout(async () => {
      timer = null;
      const amount = pending;
      pending = 0;
      try {
        if (flush) await flush(amount);
        else await AsyncStorage.setItem('axi-data-pending', String(amount));
      } catch {
        pending += amount;
      }
    }, 60_000);
  }
}
