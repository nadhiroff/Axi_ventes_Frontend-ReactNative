import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { LocalFile } from '../../api/client';
import { api } from '../../api/endpoints';
import type { BroadcastChannel, ClientSegment, NewClientInput, ProductPatch } from '../../api/types';
import { queryKeys } from './queryKeys';

// Les écrans commerçant se rafraîchissent plus souvent : les commandes arrivent dans la journée.
const MERCHANT_STALE = 60_000;

export function useMerchantToday() {
  return useQuery({ queryKey: queryKeys.merchantToday, queryFn: api.merchantToday, staleTime: MERCHANT_STALE });
}

export function useBroadcastRelocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.broadcastRelocation,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.merchantToday }),
  });
}

export function useMarkOrderReady() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => api.markOrderReady(orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.merchantToday }),
  });
}

export function useAnnounceArrival() {
  return useMutation({ mutationFn: (audio: LocalFile) => api.announceArrival(audio) });
}

export function useMerchantStall() {
  return useQuery({ queryKey: queryKeys.merchantStall, queryFn: api.merchantStall, staleTime: MERCHANT_STALE });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; price: number | null; isToday: boolean; photo: LocalFile }) =>
      api.createProduct(
        { name: input.name, price: input.price === null ? '' : String(input.price), is_today: input.isToday ? '1' : '0' },
        input.photo,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.merchantStall }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, patch }: { productId: string; patch: ProductPatch }) => api.updateProduct(productId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.merchantStall }),
  });
}

export function useMerchantClients(segment: ClientSegment) {
  return useQuery({
    queryKey: queryKeys.merchantClients(segment),
    queryFn: () => api.merchantClients(segment),
    staleTime: MERCHANT_STALE,
  });
}

export function useAddClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewClientInput) => api.addClient(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['merchant', 'clients'] }),
  });
}

export function useFollowUpClient() {
  return useMutation({ mutationFn: (clientId: string) => api.followUpClient(clientId) });
}

export function useBroadcastToLoyal() {
  return useMutation({ mutationFn: (channel: BroadcastChannel) => api.broadcastToLoyal(channel) });
}

export function useMerchantMoney() {
  return useQuery({ queryKey: queryKeys.merchantMoney, queryFn: api.merchantMoney, staleTime: MERCHANT_STALE });
}

export function useRequestCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.requestCredit,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.merchantMoney }),
  });
}

export function useSetDataSharing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => api.setDataSharing(enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.merchantMoney }),
  });
}
