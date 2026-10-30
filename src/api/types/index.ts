// Types exacts des réponses du backend PHP (voir docs/POUR_LE_FRONTEND.md du backend).
// Clés en snake_case, montants entiers en FCFA, dates ISO 8601 UTC.

export type ApiSuccess<T> = { ok: true; data: T; meta: { server_time: string; max_age_s: number } };
export type ApiFailure = { ok: false; error: { code: string; message: string; fields?: Record<string, string>; retry_after?: number; remaining_attempts?: number } };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

// ---------------------------------------------------------------------------
// Compte
// ---------------------------------------------------------------------------
export type Role = 'client' | 'merchant';
export type Lang = 'fr' | 'en' | 'fon' | 'yo';

export type User = {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  email_verified: boolean;
  phone: string | null; // simple contact (Mobile Money, WhatsApp), jamais pour se connecter
  avatar: ApiImage | null;
  avatar_visibility: AvatarVisibility;
  /** « À propos de moi », visible des personnes avec qui l'on échange */
  bio: string | null;
  role: Role;
  lang: Lang;
  organization: null;
  merchant: { has_stall: boolean; stall_id: string | null; merchant_type: MerchantType | null; verified: boolean } | null;
  /** Demande « Devenir commerçant » d'un client (null s'il n'en a jamais envoyé) */
  merchant_application: { id: string; status: ApplicationStatus; reject_reason: string | null; created_at: string } | null;
  /** Félicitations à afficher une seule fois après la validation par un agent */
  merchant_welcome: boolean;
};

export type AvatarVisibility = 'everyone' | 'contacts' | 'nobody';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type MerchantApplication = { id: string; status: ApplicationStatus; status_label: string; reject_reason: string | null; stall_name: string; created_at: string; reviewed_at: string | null };
export type IdType = 'cni' | 'cip' | 'passport' | 'other';
export type ApplicationInput = {
  phone: string;
  id_type: IdType;
  id_number: string;
  stall_name: string;
  merchant_type: MerchantType;
  site_id: string;
  site_other: string;
  aisle_id: string;
  aisle_other: string;
  row: string;
  stand: string;
};
export type Badges = { unread_messages: number; unread_notifications: number; role: Role; merchant_welcome: boolean };

export type Session = { token: string; user: User };
export type RegisterInput = { first_name: string; last_name: string; email: string; password: string; password_confirmation: string; phone?: string; lang: Lang };
export type CodePurpose = 'verify_email' | 'reset_password';

export type Currency = 'XOF' | 'EUR' | 'USD';
export type Rates = { base: 'XOF'; rates: Record<Currency, number>; updated_at: string | null };
export type NotificationType = 'order' | 'payment' | 'reminder' | 'promotion' | 'arrival' | 'account';
export type NotificationPrefs = Record<NotificationType, { app: boolean; email: boolean }>;

export type UserSettings = {
  theme: 'system' | 'light' | 'dark';
  lang: Lang;
  currency: Currency;
  date_format: 'dd/mm/yyyy' | 'yyyy-mm-dd';
  notifications: NotificationPrefs;
  default_address: string | null;
  preferred_point_id: string | null;
  preferred_operator: Operator | null;
  preferred_payment_phone: string | null;
  axi_points: { id: string; name: string; address: string }[];
  data: { cap_mb: number; used_bytes: number; used_pct: number; month: string };
};

export type SessionInfo = { id: string; device: string; ip: string | null; current: boolean; created_at: string; last_used_at: string };
export type LoginEvent = { success: boolean; label: string; device: string | null; ip: string; channel: 'app' | 'web'; created_at: string };
export type Consent = { id: string; partner_name: string; scope: string; granted_at: string; revoked_at: string | null; active: boolean };
export type AppNotification = { id: string; type: NotificationType; title: string; body: string; data: Record<string, string>; read: boolean; created_at: string };

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------
export type ApiImage = { thumb_url: string; medium_url: string; width: number; height: number; blurhash: string | null };
export type Price = { amount: number; amount_max: number | null; currency: 'XOF' };
export type MerchantType = 'retail' | 'wholesale';

export type StallLocation = { site: string; site_id: string; row: string | null; stand: string | null; label: string; map_url: string | null; moved_at: string | null };

export type StallSummary = {
  id: string;
  name: string;
  tagline: string;
  avatar: ApiImage | null;
  aisle_id: string;
  verified: boolean;
  is_open: boolean;
  location: StallLocation;
  has_new_products: boolean;
  merchant_type: MerchantType;
  /** Commerçant abonné : badge (comme les comptes certifiés des réseaux sociaux) */
  subscribed: boolean;
};

export type Announcement = { id: string; text: string; image: ApiImage | null; created_at: string };
/** Petite annonce d'arrivage d'un commerçant abonné, sur l'accueil */
export type HomeAnnouncement = Announcement & { stall: StallSummary; is_followed: boolean };

/** Présentation publique d'une personne : jamais d'email ni de téléphone */
export type PublicProfile = {
  id: string;
  display_name: string;
  avatar: ApiImage | null;
  bio: string | null;
  member_since: string;
  role: Role;
  stall: { id: string; name: string; verified: boolean; subscribed: boolean } | null;
  with_me: { orders_count: number; total_spent: number } | null;
  reported: boolean;
};
export type ReportReason = 'spam' | 'fraud' | 'insult' | 'fake' | 'other';

export type StallDetail = StallSummary & {
  /** Photos à faire défiler : principale puis galerie */
  photos: ApiImage[];
  gallery_count: number;
  followers_count: number;
  announcements: Announcement[];
  owner_display_name: string;
  verification: { by: 'agent'; verified_at: string } | null;
  pay_on_delivery: boolean;
  delivery_note: string | null;
  contacts: { phone: string | null; whatsapp: string | null; accepts_voice_messages: boolean };
  is_followed: boolean;
};

export type Product = {
  id: string;
  name: string;
  /** Description du commerçant (matière, taille, couleur…), visible sur la fiche du produit */
  description: string | null;
  image: ApiImage | null; // première photo
  images: ApiImage[]; // galerie
  price: Price | null; // null = « Prix à débattre »
  in_stock: boolean;
  /** null = stock non suivi ; 0 = épuisé (invisible des clients) */
  stock_quantity: number | null;
  sold_out: boolean;
  is_today: boolean;
  /** paused : masqué au-delà de la limite sans abonnement */
  status: 'active' | 'draft' | 'paused';
  has_voice_note: boolean;
  updated_at: string;
  voice_note_url?: string | null;
};

export type ProductWithStall = Product & { stall: { id: string; name: string; verified: boolean } };
export type ProductDetail = Product & { stall: StallSummary; is_favorite: boolean };

export type AisleIcon = 'fabric' | 'grain' | 'beauty' | 'hardware' | 'parts' | 'jewelry' | 'electronics' | 'other';
export type Aisle = { id: string; name: string; icon: AisleIcon; stall_count: number };

export type HomePayload = {
  city: { id: string; name: string };
  market_notice: { text: string; partner: string | null } | null;
  sponsored: { id: string; label: string; title: string; text: string; image: ApiImage | null; target: { type: 'stall' | 'aisle'; id: string } } | null;
  aisles: Aisle[];
  followed_stalls: StallSummary[];
  featured_stalls: StallSummary[];
  announcements: HomeAnnouncement[];
};

export type AislePayload = { aisle: Aisle; stalls: StallSummary[]; next_cursor: string | null };
export type SearchPayload = { query: string; stalls: StallSummary[]; products: ProductWithStall[] };
export type StallPayload = { stall: StallDetail; products: Product[]; products_updated_at: string | null; next_cursor: string | null };

// ---------------------------------------------------------------------------
// Commandes et paiement
// ---------------------------------------------------------------------------
export type ReceptionMode = 'delivery' | 'bus' | 'axi_point';
export type Operator = 'mtn' | 'moov' | 'celtiis';
export type OrderLineInput = { product_id: string; quantity: number };
export type PaymentMode = 'online' | 'on_site';
export type QuoteRequest = { lines: OrderLineInput[]; reception: { mode: ReceptionMode; detail: string }; payment_mode?: PaymentMode };
export type CreateOrderRequest = QuoteRequest & { payment: { operator: Operator | null; phone: string } };

export type Quote = {
  stall_count: number;
  items_total: number;
  grouping_fee: number;
  reception_fee: number;
  reception_fee_label: string;
  payment_mode: PaymentMode;
  /** Tous les commerçants du panier acceptent le paiement sur place */
  pay_on_site_available: boolean;
  /** Sur place : frais de service Axi payés en ligne */
  service_fee: number;
  /** Sur place : marchandise payée en espèces au commerçant */
  cash_total: number;
  /** Montant payé maintenant en Mobile Money */
  total: number;
  axi_points: { id: string; name: string; address: string }[];
  unavailable_product_ids: string[];
};

export type OrderStatus = 'awaiting_payment' | 'paid' | 'preparing' | 'on_the_way' | 'delivered' | 'disputed' | 'refunded' | 'cancelled';
export type EscrowState = 'pending' | 'held' | 'delivered' | 'released' | 'refunded' | 'disputed' | 'cash';

export type PaymentInfo = {
  reference: string;
  provider: 'fedapay' | 'kkiapay' | 'fake';
  provider_ref: string | null;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded' | 'partially_refunded';
  payment_url: string | null;
  return_url_prefix: string;
  refunded_amount: number;
  paid_at: string | null;
};

export type Order = {
  id: string;
  status: OrderStatus;
  status_label: string;
  total: number;
  items_total: number;
  grouping_fee: number;
  reception_fee: number;
  payment_mode: PaymentMode;
  service_fee: number;
  cash_total: number;
  reception: { mode: ReceptionMode; label: string; detail: string };
  payment_instructions: string | null;
  payment: PaymentInfo | null;
  stalls: {
    id: string;
    name: string;
    status: string;
    status_label: string;
    escrow_state: EscrowState;
    items_total: number;
    refunded_amount: number;
    phone: string | null;
    whatsapp: string | null;
    items: { name: string; quantity: number; unit_price: number; line_total: number }[];
  }[];
  can_cancel: boolean;
  can_confirm_receipt: boolean;
  can_dispute: boolean;
  dispute: { status: string; status_label: string; reason: string; resolution: string | null } | null;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
};

export type SalesStatus = 'all' | 'pending' | 'held' | 'released' | 'refunded' | 'disputed' | 'cash' | 'cancelled';
export type SalesRow = {
  order_id: string;
  date: string;
  counterpart: string;
  amount: number;
  commission: number;
  net_amount: number;
  status: string;
  status_label: string;
  payment_method: string;
  gateway_ref: string | null;
};
export type SalesPayload = { rows: SalesRow[]; totals: { count: number; amount: number; commission: number; net_amount: number } };
export type SalesFilters = { from?: string; to?: string; status?: SalesStatus; q?: string };

// ---------------------------------------------------------------------------
// Commerçant
// ---------------------------------------------------------------------------
export type MerchantStallDetail = StallDetail & {
  status: 'active' | 'suspended' | 'closed';
  has_physical_place: boolean;
  verification_requested: boolean;
  site_other: string | null;
  aisle_other: string | null;
  subscription: SubscriptionInfo;
};
export type MerchantStall = { stall: MerchantStallDetail; products: Product[] };
export type StallOptions = { sites: { id: string; name: string }[]; aisles: { id: string; name: string; icon: AisleIcon }[]; other_site_id: string; other_aisle_id: string };
export type StallInput = Partial<{
  name: string;
  tagline: string;
  site_id: string;
  site_other: string;
  aisle_id: string;
  aisle_other: string;
  row: string;
  stand: string;
  has_physical_place: boolean;
  merchant_type: MerchantType;
  phone: string;
  whatsapp: string;
  accepts_voice_messages: boolean;
  pay_on_delivery: boolean;
  delivery_note: string;
  is_open: boolean;
}>;

export type ProductPatch = Partial<{ name: string; description: string | null; price: number | null; price_max: number | null; in_stock: boolean; stock_quantity: number | null; is_today: boolean; status: 'active' }>;

export type MerchantOrder = { id: string; customer_name: string; customer_phone: string | null; summary: string; status: 'to_prepare' | 'ready' | 'picked_up'; status_label: string };
export type MerchantToday = {
  greeting_name: string;
  stall_open: boolean;
  sales_today: number;
  orders_to_prepare: number;
  connection: { active: boolean; included_until: string | null };
  relocation: { title: string; text: string; already_sent: boolean; client_count: number } | null;
  orders: MerchantOrder[];
};

export type ClientSegment = 'all' | 'followers' | 'resellers' | 'loyal' | 'to_follow_up';
export type MerchantClient = {
  id: string;
  display_name: string;
  description: string;
  phone: string | null;
  email: string | null;
  badge: { kind: 'loyal' | 'new' | 'follow_up' | 'follower'; label: string } | null;
  /** Compte Axi : profil et discussion dans l'application */
  user_id: string | null;
  avatar: ApiImage | null;
  follows: boolean;
};
export type MerchantClients = { arrival_prompt: { title: string; text: string; button_label: string } | null; followers_count: number; clients: MerchantClient[] };
export type MerchantClientDetail = MerchantClient & {
  kind: 'individual' | 'reseller';
  note: string | null;
  orders_count: number;
  total_spent: number;
  has_axi_account: boolean;
  orders: { id: string; date: string; amount: number; summary: string; status: string; escrow_state: EscrowState }[];
};
export type ClientInput = { display_name?: string; contact?: string; phone?: string; email?: string; kind?: 'individual' | 'reseller'; note?: string };
/** Compte Axi trouvé par email ou téléphone exact (présentation minimale) et type détecté */
export type ClientLookup = {
  found: boolean;
  valid: boolean;
  user?: { id: string; display_name: string; avatar: ApiImage | null; role: Role; stall_name: string | null };
  kind_detected?: 'individual' | 'reseller';
  existing_client_id?: string | null;
};
export type BroadcastResult = { recipients: number; notified: number; emailed: number; message: string; whatsapp_url: string | null; share_text: string };
export type VoiceMessage = { id: string; client_name: string; client_phone: string | null; audio_url: string; listened: boolean; created_at: string };

export type SubscriptionPeriod = 'month' | 'year';
export type SubscriptionInfo = {
  status: 'active' | 'expired';
  status_label: string;
  plan: MerchantType;
  plan_label: string;
  period: SubscriptionPeriod | null;
  amount: number;
  prices: { month: number; year: number; year_discount_pct: number; year_saving: number };
  ends_on: string | null;
  days_left: number;
  next_due: string;
  note: string | null;
  can_pay: boolean;
  /** Limites sans abonnement (product_limit null quand abonné) */
  limits: { product_limit: number | null; active_products: number; paused_products: number; broadcasts: boolean; text: string | null };
  benefits: string[];
};
export type MerchantMoney = {
  pending_amount: number;
  released_amount: number;
  paid_out_amount: number;
  commission_rate_pct: number;
  subscription: SubscriptionInfo;
  supplier_offer: { id: string; label: string; title: string; text: string; url: string | null } | null;
  credit: { title: string; text: string; can_request: boolean; request_pending: boolean };
  data_sharing: { partner_name: string; enabled: boolean; scope: string; granted_at: string | null; text: string };
  payouts: { id: string; amount: number; status: string; status_label: string; created_at: string }[];
};
export type SubscriptionPayment = {
  period: SubscriptionPeriod;
  reference: string;
  provider: string;
  status: PaymentInfo['status'];
  amount: number;
  payment_url: string | null;
  return_url_prefix: string;
  message: string;
  subscription?: SubscriptionInfo;
};

// ---------------------------------------------------------------------------
// Messagerie client ↔ commerçant
// ---------------------------------------------------------------------------
export type ConversationSummary = {
  id: string;
  my_role: 'client' | 'merchant';
  stall: { id: string; name: string; avatar: ApiImage | null };
  other: { name: string; avatar: ApiImage | null };
  other_user_id: string;
  /** Application de l'autre ouverte il y a moins d'une minute */
  other_online: boolean;
  other_last_seen_at: string | null;
  /** Messages gardés (le client suit l'étal) ; sinon effacés 24 h après leur envoi */
  kept: boolean;
  retention_note: string;
  unread_count: number;
  last_message: { kind: MessageKind; preview: string; mine: boolean; status: MessageStatus | null; created_at: string } | null;
};
export type MessageKind = 'text' | 'photo' | 'voice';
/** sent : ✓ reçu par Axi ; delivered : ✓✓ arrivé sur le téléphone de l'autre ; read : ✓✓ bleu, lu */
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ReplyPreview = { id: string; mine: boolean; kind: MessageKind; preview: string };
export type ChatMessage = { id: string; mine: boolean; status: MessageStatus | null; edited: boolean; deleted: boolean; reply: ReplyPreview | null; kind: MessageKind; body: string | null; image: ApiImage | null; audio_url: string | null; created_at: string; expires_at: string | null };
export type ConversationPayload = { conversation: ConversationSummary; messages: ChatMessage[] };
