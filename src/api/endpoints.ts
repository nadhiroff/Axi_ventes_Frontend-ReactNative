import { apiGet, apiSend, apiUpload, type LocalFile } from './client';
import type {
  AislePayload,
  ApplicationInput,
  AvatarVisibility,
  Badges,
  ConversationPayload,
  ConversationSummary,
  ChatMessage,
  Rates,
  PublicProfile,
  ReportReason,
  MerchantApplication,
  SubscriptionPeriod,
  AppNotification,
  BroadcastResult,
  ClientInput,
  ClientLookup,
  ClientSegment,
  CodePurpose,
  Consent,
  CreateOrderRequest,
  HomePayload,
  LoginEvent,
  MerchantClient,
  MerchantClientDetail,
  MerchantClients,
  MerchantMoney,
  MerchantStall,
  MerchantToday,
  Order,
  Product,
  ProductDetail,
  ProductPatch,
  ProductWithStall,
  Quote,
  QuoteRequest,
  RegisterInput,
  SalesFilters,
  SalesPayload,
  SearchPayload,
  Session,
  SessionInfo,
  StallInput,
  StallOptions,
  StallPayload,
  SubscriptionPayment,
  User,
  UserSettings,
  VoiceMessage,
} from './types';

const q = (params: Record<string, string | null | undefined>) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

const id = encodeURIComponent;

/** Une fonction par route du backend PHP. Connexion par email et mot de passe uniquement. */
export const api = {
  // Compte
  register: (body: RegisterInput) => apiSend<{ user: User; message: string }>('POST', '/v1/auth/register', body),
  verifyEmail: (email: string, code: string, device: string) => apiSend<Session>('POST', '/v1/auth/verify-email', { email, code, device }),
  resendCode: (email: string, purpose: CodePurpose) => apiSend<{ message: string }>('POST', '/v1/auth/resend-code', { email, purpose }),
  login: (email: string, password: string, device: string) => apiSend<Session>('POST', '/v1/auth/login', { email, password, device }),
  forgotPassword: (email: string) => apiSend<{ message: string }>('POST', '/v1/auth/forgot-password', { email }),
  resetPassword: (email: string, code: string, password: string, device: string) =>
    apiSend<Session>('POST', '/v1/auth/reset-password', { email, code, password, device }),
  changePassword: (current_password: string, new_password: string) => apiSend<{ changed: true }>('POST', '/v1/auth/change-password', { current_password, new_password }),
  logout: () => apiSend<{ logged_out: true }>('POST', '/v1/auth/logout'),
  logoutAll: () => apiSend<{ logged_out: true }>('POST', '/v1/auth/logout-all'),
  me: () => apiGet<User>('/v1/me'),
  updateMe: (patch: Partial<Pick<User, 'first_name' | 'last_name' | 'lang'>> & { phone?: string | null; avatar_visibility?: AvatarVisibility; bio?: string | null }) => apiSend<User>('PATCH', '/v1/me', patch),
  uploadAvatar: (photo: LocalFile) => apiUpload<User>('/v1/me/avatar', {}, { photo }),
  deleteAvatar: () => apiSend<User>('DELETE', '/v1/me/avatar'),
  badges: () => apiGet<Badges>('/v1/me/badges'),

  // Devenir commerçant : demande vérifiée par un agent Axi
  merchantApplication: () => apiGet<{ application: MerchantApplication | null }>('/v1/me/merchant-application'),
  applyMerchant: (fields: ApplicationInput, files: { id_front: LocalFile; id_back: LocalFile | null; selfie: LocalFile; stall_photo: LocalFile }) =>
    apiUpload<{ application: MerchantApplication; user: User; message: string }>(
      '/v1/me/merchant-application',
      Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== '')),
      Object.fromEntries(Object.entries(files).filter(([, v]) => v !== null)) as Record<string, LocalFile>,
    ),
  merchantWelcomeSeen: () => apiSend<{ seen: true }>('POST', '/v1/me/merchant-welcome/seen'),

  // Messagerie (effacée après 24 h sauf si le client suit l'étal)
  conversations: () => apiGet<{ conversations: ConversationSummary[]; ttl_hours: number }>('/v1/conversations'),
  openStallConversation: (stallId: string) => apiSend<{ conversation: ConversationSummary }>('POST', `/v1/stalls/${id(stallId)}/conversation`),
  openClientConversation: (clientId: string) => apiSend<{ conversation: ConversationSummary }>('POST', `/v1/merchant/clients/${id(clientId)}/conversation`),
  messages: (conversationId: string) => apiGet<ConversationPayload>(`/v1/conversations/${id(conversationId)}/messages`),
  sendText: (conversationId: string, body: string, replyTo?: string) =>
    apiSend<ChatMessage>('POST', `/v1/conversations/${id(conversationId)}/messages`, replyTo ? { body, reply_to: replyTo } : { body }),
  editMessage: (conversationId: string, messageId: string, body: string) => apiSend<ChatMessage>('PATCH', `/v1/conversations/${id(conversationId)}/messages/${id(messageId)}`, { body }),
  deleteMessage: (conversationId: string, messageId: string) => apiSend<ChatMessage>('DELETE', `/v1/conversations/${id(conversationId)}/messages/${id(messageId)}`),
  sendMedia: (conversationId: string, file: { photo: LocalFile } | { audio: LocalFile }, replyTo?: string) =>
    apiUpload<ChatMessage>(`/v1/conversations/${id(conversationId)}/messages`, replyTo ? { reply_to: replyTo } : {}, file),
  rates: () => apiGet<Rates>('/v1/rates'),
  hideMessage: (conversationId: string, messageId: string) => apiSend<{ hidden: true; id: string }>('POST', `/v1/conversations/${id(conversationId)}/messages/${id(messageId)}/hide`),
  profile: (userId: string, contact?: string) => apiGet<PublicProfile>(`/v1/users/${id(userId)}/profile${q({ contact })}`),
  report: (userId: string, reason: ReportReason, details: string, conversationId?: string) =>
    apiSend<{ message: string }>('POST', `/v1/users/${id(userId)}/report`, { reason, details, ...(conversationId ? { conversation_id: conversationId } : {}) }),
  settings: () => apiGet<UserSettings>('/v1/me/settings'),
  updateSettings: (patch: Partial<Omit<UserSettings, 'data' | 'lang' | 'notifications' | 'axi_points'>> & { data_cap_mb?: number; notifications?: Partial<UserSettings['notifications']> }) =>
    apiSend<UserSettings>('PATCH', '/v1/me/settings', patch),
  dataUsage: (bytes: number) => apiSend<UserSettings['data']>('POST', '/v1/me/data-usage', { bytes }),
  sessions: () => apiGet<{ sessions: SessionInfo[] }>('/v1/me/sessions'),
  revokeSession: (sessionId: string) => apiSend<{ revoked: true }>('DELETE', `/v1/me/sessions/${id(sessionId)}`),
  loginHistory: () => apiGet<{ events: LoginEvent[] }>('/v1/me/login-history'),
  consents: () => apiGet<{ consents: Consent[] }>('/v1/me/consents'),
  revokeConsent: (consentId: string) => apiSend<{ revoked: true }>('DELETE', `/v1/me/consents/${id(consentId)}`),
  exportData: () => apiSend<{ url: string }>('POST', '/v1/me/export'),
  deleteAccount: (password: string) => apiSend<{ deleted: true }>('POST', '/v1/me/delete', { password }),
  notifications: () => apiGet<{ unread: number; notifications: AppNotification[] }>('/v1/notifications'),
  readNotifications: (ids: string[] | 'all') => apiSend<{ unread: number }>('POST', '/v1/notifications/read', ids === 'all' ? { all: true } : { ids }),
  favorites: () => apiGet<{ products: ProductWithStall[] }>('/v1/favorites'),
  setFavorite: (productId: string, favorite: boolean) => apiSend<{ is_favorite: boolean }>(favorite ? 'POST' : 'DELETE', `/v1/favorites/${id(productId)}`),
  recentlyViewed: () => apiGet<{ products: ProductWithStall[] }>('/v1/me/recently-viewed'),

  // Client
  home: () => apiGet<HomePayload>('/v1/home'),
  aisle: (aisleId: string, cursor?: string | null) => apiGet<AislePayload>(`/v1/aisles/${id(aisleId)}/stalls${q({ cursor })}`),
  search: (query: string) => apiGet<SearchPayload>(`/v1/search${q({ q: query })}`),
  stall: (stallId: string, cursor?: string | null) => apiGet<StallPayload>(`/v1/stalls/${id(stallId)}${q({ cursor })}`),
  product: (productId: string) => apiGet<ProductDetail>(`/v1/products/${id(productId)}`),
  promotionClick: (promotionId: string) => apiSend<{ counted: true }>('POST', `/v1/promotions/${id(promotionId)}/click`),
  setFollow: (stallId: string, follow: boolean) => apiSend<{ is_followed: boolean }>(follow ? 'POST' : 'DELETE', `/v1/stalls/${id(stallId)}/follow`),
  emailStall: (stallId: string, subject: string, message: string) => apiSend<{ message: string }>('POST', `/v1/stalls/${id(stallId)}/email`, { subject, message }),
  sendVoiceMessage: (stallId: string, audio: LocalFile) => apiUpload<{ message: string }>(`/v1/stalls/${id(stallId)}/voice-messages`, {}, { audio }),
  quote: (body: QuoteRequest) => apiSend<Quote>('POST', '/v1/orders/quote', body),
  /** idempotencyKey : la même clé renvoie toujours la même commande (jamais deux débits) */
  createOrder: (body: CreateOrderRequest, idempotencyKey: string) => apiSend<Order>('POST', '/v1/orders', body, { 'Idempotency-Key': idempotencyKey }),
  orders: () => apiGet<{ orders: Order[] }>('/v1/orders'),
  order: (orderId: string) => apiGet<Order>(`/v1/orders/${id(orderId)}`),
  verifyPayment: (orderId: string, transactionId?: string) => apiSend<Order>('POST', `/v1/orders/${id(orderId)}/verify-payment`, transactionId ? { transaction_id: transactionId } : {}),
  cancelOrder: (orderId: string) => apiSend<Order>('POST', `/v1/orders/${id(orderId)}/cancel`),
  confirmReceipt: (orderId: string) => apiSend<Order>('POST', `/v1/orders/${id(orderId)}/confirm-receipt`),
  openDispute: (orderId: string, reason: string, stallId?: string) => apiSend<Order>('POST', `/v1/orders/${id(orderId)}/dispute`, stallId ? { reason, stall_id: stallId } : { reason }),
  sales: (f: SalesFilters) => apiGet<SalesPayload>(`/v1/sales${q({ from: f.from, to: f.to, status: f.status, q: f.q })}`),
  salesExport: (f: SalesFilters) => apiSend<{ url: string }>('POST', '/v1/sales/export', f),

  // Commerçant
  stallOptions: () => apiGet<StallOptions>('/v1/merchant/stall-options'),
  merchantStall: () => apiGet<MerchantStall>('/v1/merchant/stall'),
  updateStall: (input: StallInput) => apiSend<MerchantStall>('PATCH', '/v1/merchant/stall', input),
  stallPhoto: (photo: LocalFile) => apiUpload<MerchantStall>('/v1/merchant/stall/photo', {}, { photo }),
  addStallPhotos: (photos: LocalFile[]) => apiUpload<MerchantStall>('/v1/merchant/stall/photos', {}, { photos }),
  removeStallPhoto: (index: number) => apiSend<MerchantStall>('DELETE', `/v1/merchant/stall/photos/${index}`),
  requestVerification: () => apiSend<{ message: string }>('POST', '/v1/merchant/verification-request'),
  createProduct: (fields: { name: string; price: string; price_max: string; is_today: string; stock_quantity: string }, photos: LocalFile[]) =>
    apiUpload<Product>('/v1/merchant/products', fields, photos.length ? { photos } : {}),
  createVoiceProduct: (audio: LocalFile, photos: LocalFile[]) => apiUpload<Product>('/v1/merchant/products/voice', {}, photos.length ? { audio, photos } : { audio }),
  updateProduct: (productId: string, patch: ProductPatch) => apiSend<Product>('PATCH', `/v1/merchant/products/${id(productId)}`, patch),
  addProductPhotos: (productId: string, photos: LocalFile[]) => apiUpload<Product>(`/v1/merchant/products/${id(productId)}/photos`, {}, { photos }),
  removeProductPhoto: (productId: string, index: number) => apiSend<Product>('DELETE', `/v1/merchant/products/${id(productId)}/photos/${index}`),
  deleteProduct: (productId: string) => apiSend<{ deleted: true }>('DELETE', `/v1/merchant/products/${id(productId)}`),
  voiceMessages: () => apiGet<{ messages: VoiceMessage[] }>('/v1/merchant/voice-messages'),
  markListened: (messageId: string) => apiSend<{ listened: true }>('POST', `/v1/merchant/voice-messages/${id(messageId)}/listened`),
  merchantToday: () => apiGet<MerchantToday>('/v1/merchant/today'),
  markOrderReady: (orderId: string) => apiSend<{ status: 'ready' }>('POST', `/v1/merchant/orders/${id(orderId)}/ready`),
  broadcastRelocation: () => apiSend<BroadcastResult>('POST', '/v1/merchant/relocation/broadcast'),
  announceArrival: (text: string, photo: LocalFile | null) => apiUpload<BroadcastResult>('/v1/merchant/arrivals', { text }, photo ? { photo } : {}),
  deleteVoiceMessage: (messageId: string) => apiSend<{ deleted: true }>('DELETE', `/v1/merchant/voice-messages/${id(messageId)}`),
  merchantClients: (segment: ClientSegment, search?: string) => apiGet<MerchantClients>(`/v1/merchant/clients${q({ segment, q: search })}`),
  merchantClient: (clientId: string) => apiGet<MerchantClientDetail>(`/v1/merchant/clients/${id(clientId)}`),
  lookupClient: (contact: string) => apiGet<ClientLookup>(`/v1/merchant/clients/lookup${q({ contact })}`),
  addClient: (input: ClientInput) => apiSend<MerchantClient>('POST', '/v1/merchant/clients', input),
  updateClient: (clientId: string, input: Partial<ClientInput>) => apiSend<MerchantClient>('PATCH', `/v1/merchant/clients/${id(clientId)}`, input),
  deleteClient: (clientId: string) => apiSend<{ deleted: true }>('DELETE', `/v1/merchant/clients/${id(clientId)}`),
  followUpClient: (clientId: string) => apiSend<BroadcastResult>('POST', `/v1/merchant/clients/${id(clientId)}/follow-up`),
  broadcastToSegment: (segment: ClientSegment, text?: string) => apiSend<BroadcastResult>('POST', '/v1/merchant/broadcasts', text ? { segment, text } : { segment }),
  merchantMoney: () => apiGet<MerchantMoney>('/v1/merchant/money'),
  paySubscription: (period: SubscriptionPeriod) => apiSend<SubscriptionPayment>('POST', '/v1/merchant/subscription/pay', { period }),
  verifySubscription: (reference: string, transactionId?: string) =>
    apiSend<SubscriptionPayment>('POST', '/v1/merchant/subscription/verify', transactionId ? { reference, transaction_id: transactionId } : { reference }),
  requestCredit: (amount?: number) => apiSend<{ message: string }>('POST', '/v1/merchant/credit-requests', amount ? { amount } : {}),
  setDataSharing: (enabled: boolean) => apiSend<{ enabled: boolean }>('PUT', '/v1/merchant/data-sharing', { enabled }),
};

export type Api = typeof api;
