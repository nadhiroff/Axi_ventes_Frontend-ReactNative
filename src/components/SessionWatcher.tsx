import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { api } from '../api/endpoints';
import { useBadges } from '../hooks/api/chat';
import { queryKeys } from '../hooks/api/queryKeys';
import { t } from '../i18n';
import { useAuthStore } from '../store/authStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useDialogStore } from './ui/DialogHost';

/**
 * Sans recharger l'application : quand un agent Axi accepte la demande commerçant (le rôle change),
 * le profil est relu et un message de félicitations s'affiche UNE seule fois. Les pastilles
 * (messages, notifications) suivent aussi. Quand l'équipe Axi change ce que tout le monde voit (annonces,
 * réglages, allées, marchés), le serveur le signale ici et l'écran affiché se recharge seul.
 */
export function SessionWatcher() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setMode = useAuthStore((s) => s.setMode);
  const badges = useBadges().data;
  const welcomed = useRef(false);
  const live = useQuery({ queryKey: ['live'], queryFn: api.live, staleTime: 0, refetchInterval: 10_000 }).data?.v;
  const lastLive = useRef<string | undefined>(undefined);
  const lastNotifications = useRef<number | null>(null);
  const currency = useCurrencyStore((s) => s.currency);
  const setRates = useCurrencyStore((s) => s.setRates);
  // Taux du jour (euro, dollar) relus toutes les 6 h quand une autre devise que le F CFA est choisie
  const rates = useQuery({ queryKey: ['rates'], queryFn: api.rates, enabled: currency !== 'XOF', staleTime: 6 * 3600_000 }).data;
  useEffect(() => {
    if (lastLive.current && live && live !== lastLive.current) {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'live' });
    }
    lastLive.current = live ?? lastLive.current;
  }, [live, qc]);
  useEffect(() => {
    if (rates) setRates(rates.rates);
  }, [rates, setRates]);

  // Rôle changé côté serveur ou félicitations en attente : profil relu
  useEffect(() => {
    if (!badges || !user) return;
    if (badges.role !== user.role || badges.merchant_welcome !== user.merchant_welcome) {
      api.me().then(setUser).catch(() => undefined);
      qc.invalidateQueries({ queryKey: ['merchant'] });
    }
    if (lastNotifications.current !== null && badges.unread_notifications !== lastNotifications.current) {
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
      qc.invalidateQueries({ queryKey: queryKeys.clientInvites });
      qc.invalidateQueries({ queryKey: queryKeys.merchantMoney });
      qc.invalidateQueries({ queryKey: queryKeys.merchantStall });
      // Nouvelle notification : le profil est relu (réponse à une demande commerçant, sans redémarrer l'application)
      api.me().then(setUser).catch(() => undefined);
    }
    lastNotifications.current = badges.unread_notifications;
  }, [badges, user, setUser, qc]);

  // Félicitations, une seule fois (le serveur l'enregistre dès qu'elle est vue)
  useEffect(() => {
    if (!user?.merchant_welcome || user.role !== 'merchant' || welcomed.current) return;
    welcomed.current = true;
    api.merchantWelcomeSeen().catch(() => undefined);
    setUser({ ...user, merchant_welcome: false });
    useDialogStore.getState().showDialog({
      title: t('apply.welcomeTitle'),
      message: t('apply.welcomeText'),
      tone: 'success',
      buttons: [
        { label: t('common.later'), variant: 'ghost' },
        {
          label: t('apply.welcomeOpen'),
          onPress: () => {
            setMode('merchant');
            router.replace('/commercant');
          },
        },
      ],
    });
  }, [user, setUser, setMode]);

  return null;
}
