import { router, usePreventRemove } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { t } from '../i18n';
import { confirmAction } from '../lib/confirm';

/**
 * Écran de modification : quitter (bouton retour, glissement, « Annuler ») demande TOUJOURS
 * « Annuler les modifications ? » avec Non (rester) / Oui (quitter). Le texte précise s'il y a des
 * changements non enregistrés. Renvoie leave() pour quitter sans question après un enregistrement réussi,
 * et cancel() pour le bouton « Annuler ».
 */
export function useConfirmLeave(dirty: boolean) {
  const [leaving, setLeaving] = useState(false);

  usePreventRemove(!leaving, ({ repeat }) => {
    confirmAction(t('common.discardTitle'), dirty ? t('common.discardText') : t('common.leaveText'), repeat, {
      destructive: dirty,
      confirmLabel: t('common.yes'),
      cancelLabel: t('common.no'),
    });
  });

  // Enregistré : la protection est levée (au rendu suivant), puis on revient en arrière sans question
  useEffect(() => {
    if (leaving) router.back();
  }, [leaving]);

  const leave = useCallback(() => setLeaving(true), []);
  /** Bouton « Annuler » : revient en arrière, après la question Non / Oui */
  const cancel = useCallback(() => router.back(), []);

  return { leave, cancel };
}
