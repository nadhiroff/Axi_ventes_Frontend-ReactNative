import { router } from 'expo-router';

import { errorMessage } from '../api/client';
import { api } from '../api/endpoints';
import { t } from '../i18n';
import { queryClient } from './queryClient';
import { confirmAction, notify, toast } from './confirm';

/**
 * Bloquer quelqu'un qui dérange (discussion, profil) : confirmation, puis tout ce qui venait de lui disparaît
 * (discussions, étal, produits, pastilles) ; on revient à l'écran précédent puisque celui-ci n'existe plus.
 */
export function blockUser(userId: string, name: string, onDone?: () => void) {
  confirmAction(
    t('block.confirmTitle', { name }),
    t('block.confirmText'),
    async () => {
      try {
        await api.blockUser(userId);
        toast(t('block.done'));
        // D'abord quitter l'écran (la discussion ou le profil n'existe plus), puis tout relire depuis le serveur :
        // ce qui est en mémoire peut contenir la personne bloquée
        if (onDone) onDone();
        else if (router.canGoBack()) router.back();
        setTimeout(() => void queryClient.invalidateQueries(), 300);
      } catch (e) {
        notify(t('block.action'), errorMessage(e), 'error');
      }
    },
    { destructive: true, confirmLabel: t('block.action') },
  );
}

export function unblockUser(userId: string, name: string, onDone?: () => void) {
  confirmAction(t('block.unblockConfirm', { name }), t('block.unblockText'), async () => {
    try {
      await api.unblockUser(userId);
      await queryClient.invalidateQueries();
      toast(t('block.unblocked'));
      onDone?.();
    } catch (e) {
      notify(t('block.unblock'), errorMessage(e), 'error');
    }
  }, { confirmLabel: t('block.unblock') });
}
