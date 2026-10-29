import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/endpoints';
import type { NewCampaign } from '../../api/types';

export const proKeys = {
  overview: (site: string | null) => ['pro', 'overview', site] as const,
  campaigns: ['pro', 'campaigns'] as const,
  census: ['pro', 'census'] as const,
  financing: ['pro', 'financing'] as const,
};

export function useProOverview(site: string | null) {
  return useQuery({
    queryKey: proKeys.overview(site),
    queryFn: () => api.proOverview(site),
    placeholderData: keepPreviousData,
  });
}

export function useProCampaigns(enabled = true) {
  return useQuery({ queryKey: proKeys.campaigns, queryFn: api.proCampaigns, enabled });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewCampaign) => api.createCampaign(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: proKeys.campaigns }),
  });
}

export function useProCensus() {
  return useQuery({ queryKey: proKeys.census, queryFn: api.proCensus });
}

export function useProFinancing() {
  return useQuery({ queryKey: proKeys.financing, queryFn: api.proFinancing });
}
