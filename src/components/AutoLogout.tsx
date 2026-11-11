import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { t } from '../i18n';
import { leaveSession } from '../lib/authFlow';
import { toast } from '../lib/confirm';
import { useAuthStore } from '../store/authStore';

/** Application quittée plus longtemps que ça : déconnexion, pour qu'une autre personne ne puisse pas s'en servir */
export const AUTO_LOGOUT_MINUTES = 5;
const KEY = 'axi-left-at';

/**
 * Déconnexion automatique après 5 minutes hors de l'application (écran éteint, autre application…).
 * L'heure de sortie est aussi enregistrée : si le téléphone ferme l'application entre-temps, la règle s'applique au retour.
 */
export function AutoLogout() {
  const signedIn = useAuthStore((s) => s.status === 'signedIn');

  useEffect(() => {
    if (!signedIn) return;
    const check = async () => {
      const left = Number(await AsyncStorage.getItem(KEY).catch(() => null));
      await AsyncStorage.removeItem(KEY).catch(() => undefined);
      if (left > 0 && Date.now() - left >= AUTO_LOGOUT_MINUTES * 60_000) {
        await leaveSession();
        toast(t('account.autoLogout', { min: AUTO_LOGOUT_MINUTES }), 'info');
      }
    };
    // Retour après une fermeture complète de l'application
    check().catch(() => undefined);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') AsyncStorage.setItem(KEY, String(Date.now())).catch(() => undefined);
      else if (state === 'active') check().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [signedIn]);

  return null;
}
