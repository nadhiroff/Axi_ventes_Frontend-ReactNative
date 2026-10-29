import type { Product, StallDetail } from './stall';

/** GET /v1/merchant/today : écran "Ma journée" */
export type MerchantToday = {
  greeting_name: string; // ex. "Maman Afi"
  stall_open: boolean;
  sales_today: number; // FCFA
  orders_to_prepare: number;
  connection: { active: boolean; included_until: string | null };
  relocation: {
    title: string; // ex. "Vous êtes installée à Tokpa Yôyô" (texte fourni par le serveur)
    text: string;
    already_sent: boolean;
    client_count: number;
  } | null;
  orders: MerchantOrder[];
};

export type MerchantOrder = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  summary: string; // ex. "2 × Wax hollandais · Livraison Akpakpa"
  status: 'to_prepare' | 'ready' | 'picked_up';
  status_label: string; // ex. "À préparer"
};

/** GET /v1/merchant/stall : écran "Mon étal" */
export type MerchantStall = {
  stall: StallDetail;
  products: Product[];
};

/** Corps de PATCH /v1/merchant/products/{id} */
export type ProductPatch = Partial<Pick<Product, 'in_stock' | 'is_today'>>;

export type ClientSegment = 'all' | 'resellers' | 'loyal' | 'to_follow_up';

/** GET /v1/merchant/clients?segment= : écran "Mes clients" */
export type MerchantClients = {
  arrival_prompt: { title: string; text: string; button_label: string } | null;
  clients: MerchantClient[];
};

export type MerchantClient = {
  id: string;
  display_name: string; // ex. "Boutique Sena, Lomé"
  description: string; // ex. "Revendeuse · dernier achat hier"
  phone: string | null;
  badge: { kind: 'loyal' | 'new' | 'follow_up'; label: string } | null;
};

export type NewClientInput = { display_name: string; phone: string; kind: 'individual' | 'reseller' };

export type BroadcastChannel = 'axi' | 'whatsapp';

/** GET /v1/merchant/money : écran "Mon argent" */
export type MerchantMoney = {
  pending_amount: number; // "À recevoir, libéré à la réception des colis"
  subscription: {
    status: 'active' | 'expired';
    status_label: string; // "Actif"
    plan_label: string; // ex. "Formule Étal · 2 000 F par mois · connexion incluse"
    note: string | null; // ex. "Inclus dans votre place à Tokpa Yôyô"
  };
  supplier_offer: {
    id: string;
    label: string; // "Sponsorisé"
    title: string;
    text: string;
    url: string | null;
  } | null;
  credit: {
    title: string; // "Votre historique ouvre l'accès au crédit"
    text: string;
    can_request: boolean;
    request_pending: boolean;
  };
  data_sharing: { partner_name: string; enabled: boolean; text: string };
};

/** Réponse de POST /v1/merchant/broadcasts, /relocation/broadcast, /arrivals */
export type BroadcastResult = { recipients: number; message: string };
