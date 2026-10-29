import { apiGet } from './client';
import type { HomePayload } from './types/home';
import type { StallPayload } from './types/stall';

export const fetchHome = () => apiGet<HomePayload>('/v1/home');

export const fetchStall = (stallId: string, cursor?: string | null) =>
  apiGet<StallPayload>(
    `/v1/stalls/${encodeURIComponent(stallId)}` +
      (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''),
  );
