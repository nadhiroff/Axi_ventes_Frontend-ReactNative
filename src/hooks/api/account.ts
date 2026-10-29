import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { queryKeys } from './queryKeys';

const useSignedIn = () => useAuthStore((s) => s.status === 'signedIn');

export const useSettings = () => useQuery({ queryKey: queryKeys.settings, queryFn: api.settings, enabled: useSignedIn() });
export const useSessions = () => useQuery({ queryKey: queryKeys.sessions, queryFn: api.sessions, enabled: useSignedIn() });
export const useLoginHistory = () => useQuery({ queryKey: queryKeys.loginHistory, queryFn: api.loginHistory, enabled: useSignedIn() });
export const useConsents = () => useQuery({ queryKey: queryKeys.consents, queryFn: api.consents, enabled: useSignedIn() });
export const useNotifications = () =>
  useQuery({ queryKey: queryKeys.notifications, queryFn: api.notifications, enabled: useSignedIn(), refetchInterval: 120_000 });

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.updateSettings, onSuccess: (data) => qc.setQueryData(queryKeys.settings, data) });
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
  };
}
