import { router, useNavigation, usePreventRemove } from 'expo-router';
import { useCallback, useRef } from 'react';

import { t } from '../i18n';
import { confirmAction } from '../lib/confirm';

/**
 * Écran de modification : si des changements ne sont pas enregistrés, quitter (bouton retour, glissement,
 * « Annuler ») demande d'abord « Abandonner les modifications ? ».
 * Renvoie leave() pour quitter sans question (après un enregistrement réussi) et cancel() pour le bouton « Annuler ».
 */
export function useConfirmLeave(dirty: boolean) {
  const navigation = useNavigation();
  const allowed = useRef(false);

  usePreventRemove(dirty, ({ data }) => {
    if (allowed.current) {
      navigation.dispatch(data.action);
      return;
    }
    // Choix simple : Non (rester) / Oui (quitter sans enregistrer)
    confirmAction(t('common.discardTitle'), t('common.discardText'), () => navigation.dispatch(data.action), {
      destructive: true,
      confirmLabel: t('common.yes'),
      cancelLabel: t('common.no'),
    });
  });

  /** Quitter sans demander (les modifications viennent d'être enregistrées) */
  const leave = useCallback(() => {
    allowed.current = true;
    router.back();
  }, []);

  /** Bouton « Annuler » : revient en arrière, avec confirmation s'il y a des changements */
  const cancel = useCallback(() => router.back(), []);

  return { leave, cancel };
}
