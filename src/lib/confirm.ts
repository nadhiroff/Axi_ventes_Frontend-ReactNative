import { useDialogStore, type Tone } from '../components/ui/DialogHost';
import { t } from '../i18n';

/**
 * Confirmation obligatoire avant toute action sensible ou destructive (déconnexion, suppression,
 * annulation, réception, litige…) : « Êtes-vous sûr… ? » Annuler / Confirmer, dans une fenêtre aux couleurs d'Axi.
 */
export function confirmAction(title: string, message: string, onConfirm: () => void, options: { destructive?: boolean; confirmLabel?: string } = {}) {
  useDialogStore.getState().showDialog({
    title,
    message,
    tone: options.destructive ? 'danger' : 'info',
    buttons: [
      { label: t('common.cancel'), variant: 'ghost' },
      { label: options.confirmLabel ?? t('common.confirm'), variant: options.destructive ? 'destructive' : 'primary', onPress: onConfirm },
    ],
  });
}

/**
 * Message à l'utilisateur. Sans détail : notification courte de succès en haut de l'écran.
 * Avec détail : fenêtre à fermer (« error » pour un échec, « success » pour une bonne nouvelle importante).
 */
export function notify(title: string, message?: string, tone: Tone = message === undefined ? 'success' : 'info') {
  if (message === undefined) {
    toast(title, tone);
    return;
  }
  useDialogStore.getState().showDialog({ title, message, tone, buttons: [{ label: 'OK', variant: 'primary' }] });
}

/** Notification courte qui disparaît seule (« Enregistré », « Message envoyé »…) */
export function toast(message: string, tone: Tone = 'success') {
  useDialogStore.getState().showToast(message, tone);
}
