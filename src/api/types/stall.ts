import type { ApiImage, Price, StallSummary } from './common';

/** GET /v1/stalls/{id} */
export type StallPayload = {
  stall: StallDetail;
  products: Product[];
  products_updated_at: string | null; // pour "Mis à jour ce matin"
  next_cursor: string | null;
};

export type StallDetail = StallSummary & {
  owner_display_name: string; // ex. "Maman Afi"
  verification: { by: 'agent'; verified_at: string } | null;
  pay_on_delivery: boolean;
  delivery_note: string | null; // ex. "Livraison Cotonou et Calavi"
  contacts: {
    phone: string | null; // E.164, ex. "+22997000000"
    whatsapp: string | null;
    accepts_voice_messages: boolean;
  };
  is_followed: boolean;
};

export type Product = {
  id: string;
  name: string; // ex. "Wax hollandais, 6 yards"
  image: ApiImage | null;
  price: Price | null; // null = "Prix à débattre"
  in_stock: boolean;
  is_today: boolean; // fait partie de "Disponible aujourd'hui"
  updated_at: string;
};
