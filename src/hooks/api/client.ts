import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/endpoints';
import type { QuoteRequest, SalesFilters } from '../../api/types';
import { useAuthStore } from '../../store/authStore';
import { queryKeys } from './queryKeys';

const useSignedIn = () => useAuthStore((s) => s.status === 'signedIn');

export const useHome = () => useQuery({ queryKey: queryKeys.home, queryFn: api.home });

export const useAisle = (aisleId: string) => useQuery({ queryKey: queryKeys.aisle(aisleId), queryFn: () => api.aisle(aisleId) });

export const useSearch = (query: string) =>
  useQuery({ queryKey: queryKeys.search(query), queryFn: () => api.search(query), enabled: query.trim().length >= 2, placeholderData: keepPreviousData });

export const useStall = (stallId: string) => useQuery({ queryKey: queryKeys.stall(stallId), queryFn: () => api.stall(stallId) });

export const useProduct = (productId: string) => useQuery({ queryKey: queryKeys.product(productId), queryFn: () => api.product(productId) });

export const useQuote = (body: QuoteRequest, enabled: boolean) =>
  useQuery({ queryKey: queryKeys.quote(body), queryFn: () => api.quote(body), enabled, placeholderData: keepPreviousData, staleTime: 30_000 });

export const useOrders = () => useQuery({ queryKey: queryKeys.orders, queryFn: api.orders, enabled: useSignedIn() });

/** Suivi de commande : rafraîchi toutes les 5 s tant que le paiement est attendu */
export const useOrder = (orderId: string) =>
  useQuery({
    queryKey: queryKeys.order(orderId),
    queryFn: () => api.order(orderId),
    refetchInterval: (q) => (q.state.data?.status === 'awaiting_payment' ? 5000 : false),
    staleTime: 0,
  });

export const useSales = (filters: SalesFilters) =>
  useQuery({ queryKey: queryKeys.sales(filters), queryFn: () => api.sales(filters), enabled: useSignedIn(), placeholderData: keepPreviousData });

export const useFavorites = () => useQuery({ queryKey: queryKeys.favorites, queryFn: api.favorites, enabled: useSignedIn() });
export const useRecentlyViewed = () => useQuery({ queryKey: queryKeys.recent, queryFn: api.recentlyViewed, enabled: useSignedIn() });

export function useFollow(stallId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (follow: boolean) => api.setFollow(stallId, follow),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.stall(stallId) });
      qc.invalidateQueries({ queryKey: queryKeys.home });
    },
  });
}

export function useFavorite(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (favorite: boolean) => api.setFavorite(productId, favorite),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.product(productId) });
      qc.invalidateQueries({ queryKey: queryKeys.favorites });
    },
  });
}

/** Actions sur une commande : chaque réponse remplace le suivi en cache */
export function useOrderAction(orderId: string) {
  const qc = useQueryClient();
  const done = (order: Awaited<ReturnType<typeof api.order>>) => {
    qc.setQueryData(queryKeys.order(orderId), order);
    qc.invalidateQueries({ queryKey: queryKeys.orders });
  };
  return {
    verify: useMutation({ mutationFn: (transactionId?: string) => api.verifyPayment(orderId, transactionId), onSuccess: done }),
    cancel: useMutation({ mutationFn: () => api.cancelOrder(orderId), onSuccess: done }),
    receive: useMutation({ mutationFn: () => api.confirmReceipt(orderId), onSuccess: done }),
    dispute: useMutation({ mutationFn: (v: { reason: string; stallId?: string }) => api.openDispute(orderId, v.reason, v.stallId), onSuccess: done }),
  };
}
