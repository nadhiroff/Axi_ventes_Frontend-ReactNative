import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { LocalFile } from '../../api/client';
import { api } from '../../api/endpoints';
import type { CreateOrderRequest, QuoteRequest } from '../../api/types';
import { queryKeys } from './queryKeys';

export function useHome() {
  return useQuery({ queryKey: queryKeys.home, queryFn: api.home });
}

export function useAisle(aisleId: string) {
  return useQuery({ queryKey: queryKeys.aisle(aisleId), queryFn: () => api.aisle(aisleId) });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => api.search(query),
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
  });
}

/** Page d'un étal, produits paginés par curseur. */
export function useStall(stallId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.stall(stallId),
    queryFn: ({ pageParam }) => api.stall(stallId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
}

export function useFollowStall(stallId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (follow: boolean) => api.setFollow(stallId, follow),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.stall(stallId) });
      qc.invalidateQueries({ queryKey: queryKeys.home });
    },
  });
}

export function useSendVoiceMessage(stallId: string) {
  return useMutation({ mutationFn: (audio: LocalFile) => api.sendVoiceMessage(stallId, audio) });
}

export function useVoiceSearch() {
  return useMutation({ mutationFn: (audio: LocalFile) => api.voiceSearch(audio) });
}

/** Frais et total calculés par le serveur ; on garde l'ancien devis affiché pendant le recalcul. */
export function useQuote(body: QuoteRequest) {
  return useQuery({
    queryKey: queryKeys.quote(body),
    queryFn: () => api.quote(body),
    enabled: body.lines.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCreateOrder() {
  return useMutation({ mutationFn: (body: CreateOrderRequest) => api.createOrder(body) });
}

/** Suit le paiement Mobile Money jusqu'à sa confirmation. */
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: queryKeys.order(orderId),
    queryFn: () => api.order(orderId),
    refetchInterval: (query) => (query.state.data?.status === 'awaiting_payment' ? 4000 : false),
    staleTime: 0,
  });
}
