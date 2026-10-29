import type { ApiImage, Price, StallSummary } from './common';

/** GET /v1/stalls/{id} */
export type StallPayload = {
  stall: StallDetail;
  products: Product[];
  next_cursor: string | null;
};

export type StallDetail = StallSummary & {
  owner_display_name: string; // ex. "Maman Afi"
  description: string | null;
  verification: { by: 'agent'; agent_name: string | null; verified_at: string } | null;
  pay_on_delivery: boolean;
  languages: ('fr' | 'fon' | 'yo' | 'en')[];
  contacts: {
    phone: string | null; // E.164, ex. "+22997000000"
    whatsapp: string | null;
    accepts_voice_messages: boolean;
  };
  is_followed: boolean;
};

export type Product = {
  id: string;
  name: string;
  image: ApiImage | null;
  price: Price | null; // null = prix sur demande
  unit: string; // ex. "pagne de 6 yards", "sac de 50 kg"
  in_stock: boolean;
  is_today: boolean; // fait partie des "produits du jour"
  updated_at: string;
};
