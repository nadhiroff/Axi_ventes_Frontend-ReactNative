import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchStall } from '../../api/endpoints';
import { queryKeys } from './queryKeys';

/** Page d'un étal, produits paginés par curseur. */
export function useStall(stallId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.stall(stallId),
    queryFn: ({ pageParam }) => fetchStall(stallId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
}
