import { Alert, Platform } from 'react-native';

import { t } from '../i18n';

/**
 * Confirmation obligatoire avant toute action sensible ou destructive (déconnexion, suppression,
 * annulation, réception, litige…) : « Êtes-vous sûr… ? » Annuler / Confirmer.
 */
export function confirmAction(title: string, message: string, onConfirm: () => void, options: { destructive?: boolean; confirmLabel?: string } = {}) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: options.confirmLabel ?? t('common.confirm'), style: options.destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

/** Message d'information ou d'erreur */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
