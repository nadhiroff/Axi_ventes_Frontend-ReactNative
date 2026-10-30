import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/endpoints';
import type { NotificationType, UserSettings } from '../../api/types';
import { clearPendingDataUsage } from '../../lib/dataUsage';
import { useAuthStore } from '../../store/authStore';
import { queryKeys } from './queryKeys';

const useSignedIn = () => useAuthStore((s) => s.status === 'signedIn');

export const useSettings = () => useQuery({ queryKey: queryKeys.settings, queryFn: api.settings, enabled: useSignedIn() });
export const useSessions = () => useQuery({ queryKey: queryKeys.sessions, queryFn: api.sessions, enabled: useSignedIn() });
export const useLoginHistory = () => useQuery({ queryKey: queryKeys.loginHistory, queryFn: api.loginHistory, enabled: useSignedIn() });
export const useConsents = () => useQuery({ queryKey: queryKeys.consents, queryFn: api.consents, enabled: useSignedIn() });
export const useNotifications = () =>
  useQuery({ queryKey: queryKeys.notifications, queryFn: api.notifications, enabled: useSignedIn(), refetchInterval: 120_000 });

type SettingsPatch = Parameters<typeof api.updateSettings>[0];

/** Applique le changement tout de suite à l'écran (interrupteurs réactifs), puis la réponse du serveur ; en cas d'erreur, on revient en arrière */
export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateSettings,
    onMutate: async (patch: SettingsPatch) => {
      await qc.cancelQueries({ queryKey: queryKeys.settings });
      const previous = qc.getQueryData<UserSettings>(queryKeys.settings);
      if (previous) {
        const { notifications, data_cap_mb, ...rest } = patch;
        const merged = { ...previous.notifications };
        for (const [type, channels] of Object.entries(notifications ?? {}) as [NotificationType, UserSettings['notifications'][NotificationType]][]) {
          merged[type] = { ...merged[type], ...channels };
        }
        qc.setQueryData<UserSettings>(queryKeys.settings, {
          ...previous,
          ...rest,
          notifications: merged,
          data: data_cap_mb ? { ...previous.data, cap_mb: data_cap_mb } : previous.data,
        });
      }
      return { previous };
    },
    // Échec : retour à l'état d'avant si rien d'autre n'est en cours, sinon on relit les réglages du serveur
    onError: (_e, _patch, context) => {
      if (qc.isMutating({ mutationKey: ['settings'] }) <= 1 && context?.previous) qc.setQueryData(queryKeys.settings, context.previous);
      else qc.invalidateQueries({ queryKey: queryKeys.settings });
    },
    // Plusieurs changements rapides : seule la dernière réponse remplace l'écran, pour ne pas faire « sauter » un interrupteur
    onSuccess: (data) => {
      if (qc.isMutating({ mutationKey: ['settings'] }) <= 1) qc.setQueryData(queryKeys.settings, data);
    },
    mutationKey: ['settings'],
  });
}

export function useReadNotifications() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (ids: string[] | 'all') => api.readNotifications(ids), onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications }) });
}

export function useAccountActions() {
  const qc = useQueryClient();
  return {
    revokeSession: useMutation({ mutationFn: (id: string) => api.revokeSession(id), onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sessions }) }),
    revokeConsent: useMutation({
      mutationFn: (id: string) => api.revokeConsent(id),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: queryKeys.consents });
        qc.invalidateQueries({ queryKey: queryKeys.merchantMoney });
      },
    }),
    changePassword: useMutation({ mutationFn: (v: { current: string; next: string }) => api.changePassword(v.current, v.next) }),
    exportData: useMutation({ mutationFn: api.exportData }),
    resetDataUsage: useMutation({
      mutationFn: api.resetDataUsage,
      onSuccess: (data) => {
        clearPendingDataUsage();
        qc.setQueryData(queryKeys.settings, data);
      },
    }),
  };
}
