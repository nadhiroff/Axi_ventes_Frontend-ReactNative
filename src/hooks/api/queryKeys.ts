import type { ClientSegment, QuoteRequest } from '../../api/types';

export const queryKeys = {
  home: ['home'] as const,
  aisle: (id: string) => ['aisle', id] as const,
  search: (q: string) => ['search', q] as const,
  stall: (id: string) => ['stall', id] as const,
  quote: (body: QuoteRequest) => ['quote', body] as const,
  order: (id: string) => ['order', id] as const,
  merchantToday: ['merchant', 'today'] as const,
  merchantStall: ['merchant', 'stall'] as const,
  merchantClients: (segment: ClientSegment) => ['merchant', 'clients', segment] as const,
  merchantMoney: ['merchant', 'money'] as const,
};
