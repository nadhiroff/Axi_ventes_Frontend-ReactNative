import type { BroadcastResult } from '../../api/types';
import { t } from '../../i18n';
import { notify } from '../../lib/confirm';
import { openLink } from '../../lib/contact';
import { useDialogStore } from '../ui/DialogHost';

/** Résultat d'un envoi (app + email) avec proposition de partage WhatsApp ; aucun SMS. */
export function showBroadcastResult(title: string, result: BroadcastResult) {
  if (!result.whatsapp_url || result.recipients === 0) {
    notify(title, result.message, 'success');
    return;
  }
  useDialogStore.getState().showDialog({
    title,
    message: result.message,
    tone: 'success',
    buttons: [
      { label: t('common.close'), variant: 'ghost' },
      { label: t('merchant.shareWhatsapp'), onPress: () => openLink(result.whatsapp_url!) },
    ],
  });
}
