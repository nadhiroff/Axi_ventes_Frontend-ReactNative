import { USE_MOCKS } from '../config/env';
import { apiGet, apiSend, apiUpload, type LocalFile } from './client';
import { mockApi } from './mocks/server';
import type {
  AislePayload,
  BroadcastChannel,
  BroadcastResult,
  ClientSegment,
  CreateOrderRequest,
  HomePayload,
  MerchantClient,
  MerchantClients,
  MerchantMoney,
  MerchantStall,
  MerchantToday,
  NewClientInput,
  Order,
  Product,
  ProductPatch,
  Quote,
  QuoteRequest,
  SearchPayload,
  StallPayload,
} from './types';

const q = (params: Record<string, string | null | undefined>) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

const id = encodeURIComponent;

/** Une fonction par route du backend PHP. Voir docs/API_CONTRACT.md. */
export const httpApi = {
  // Client
  home: () => apiGet<HomePayload>('/v1/home'),
  aisle: (aisleId: string, cursor?: string | null) => apiGet<AislePayload>(`/v1/aisles/${id(aisleId)}/stalls${q({ cursor })}`),
  search: (query: string) => apiGet<SearchPayload>(`/v1/search${q({ q: query })}`),
  voiceSearch: (audio: LocalFile) => apiUpload<SearchPayload>('/v1/search/voice', {}, { audio }),
  stall: (stallId: string, cursor?: string | null) => apiGet<StallPayload>(`/v1/stalls/${id(stallId)}${q({ cursor })}`),
  setFollow: (stallId: string, follow: boolean) =>
    apiSend<{ is_followed: boolean }>(follow ? 'POST' : 'DELETE', `/v1/stalls/${id(stallId)}/follow`),
  sendVoiceMessage: (stallId: string, audio: LocalFile) =>
    apiUpload<{ message: string }>(`/v1/stalls/${id(stallId)}/voice-messages`, {}, { audio }),
  quote: (body: QuoteRequest) => apiSend<Quote>('POST', '/v1/orders/quote', body),
  createOrder: (body: CreateOrderRequest) => apiSend<Order>('POST', '/v1/orders', body),
  order: (orderId: string) => apiGet<Order>(`/v1/orders/${id(orderId)}`),

  // Commerçant
  merchantToday: () => apiGet<MerchantToday>('/v1/merchant/today'),
  broadcastRelocation: () => apiSend<BroadcastResult>('POST', '/v1/merchant/relocation/broadcast'),
  markOrderReady: (orderId: string) => apiSend<{ status: 'ready' }>('POST', `/v1/merchant/orders/${id(orderId)}/ready`),
  announceArrival: (audio: LocalFile) => apiUpload<BroadcastResult>('/v1/merchant/arrivals', {}, { audio }),
  merchantStall: () => apiGet<MerchantStall>('/v1/merchant/stall'),
  createProduct: (fields: { name: string; price: string; is_today: string }, photo: LocalFile) =>
    apiUpload<Product>('/v1/merchant/products', fields, { photo }),
  updateProduct: (productId: string, patch: ProductPatch) =>
    apiSend<Product>('PATCH', `/v1/merchant/products/${id(productId)}`, patch),
  merchantClients: (segment: ClientSegment) => apiGet<MerchantClients>(`/v1/merchant/clients${q({ segment })}`),
  addClient: (input: NewClientInput) => apiSend<MerchantClient>('POST', '/v1/merchant/clients', input),
  followUpClient: (clientId: string) => apiSend<BroadcastResult>('POST', `/v1/merchant/clients/${id(clientId)}/follow-up`),
  broadcastToLoyal: (channel: BroadcastChannel) =>
    apiSend<BroadcastResult>('POST', '/v1/merchant/broadcasts', { segment: 'loyal', channel }),
  merchantMoney: () => apiGet<MerchantMoney>('/v1/merchant/money'),
  requestCredit: () => apiSend<{ message: string }>('POST', '/v1/merchant/credit-requests'),
  setDataSharing: (enabled: boolean) => apiSend<{ enabled: boolean }>('PUT', '/v1/merchant/data-sharing', { enabled }),
};

export type Api = typeof httpApi;

export const api: Api = USE_MOCKS ? mockApi : httpApi;
