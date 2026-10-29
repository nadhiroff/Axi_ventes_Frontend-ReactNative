import { Alert, Linking, Platform } from 'react-native';

import type { BroadcastResult } from '../../api/types';
import { t } from '../../i18n';
import { notify } from '../../lib/confirm';

/** Résultat d'un envoi (app + email) avec proposition de partage WhatsApp ; aucun SMS. */
export function showBroadcastResult(title: string, result: BroadcastResult) {
  if (!result.whatsapp_url || Platform.OS === 'web' || result.recipients === 0) {
    notify(title, result.message);
    return;
  }
  Alert.alert(title, result.message, [
    { text: t('common.close'), style: 'cancel' },
    { text: t('merchant.shareWhatsapp'), onPress: () => Linking.openURL(result.whatsapp_url!) },
  ]);
}
