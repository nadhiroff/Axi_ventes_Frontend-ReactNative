import { useQuery } from '@tanstack/react-query';

import { fetchHome } from '../../api/endpoints';
import { queryKeys } from './queryKeys';

export function useHome() {
  return useQuery({ queryKey: queryKeys.home, queryFn: fetchHome });
}
