import type { ApiImage, StallSummary } from './common';
import type { Product } from './stall';

/** GET /v1/home */
export type HomePayload = {
  city: { id: string; name: string }; // ex. { "id": "cotonou", "name": "Cotonou" }
  market_notice: { text: string; partner: string | null } | null;
  sponsored: SponsoredSlot | null;
  aisles: Aisle[];
  followed_stalls: StallSummary[];
};

export type Aisle = {
  id: string; // ex. "tissus"
  name: string; // ex. "Tissus et pagnes"
  icon: AisleIcon; // icône embarquée dans l'application, rien à télécharger
  stall_count: number;
};

export type AisleIcon = 'fabric' | 'grain' | 'beauty' | 'hardware' | 'parts' | 'jewelry' | 'electronics' | 'other';

export type SponsoredSlot = {
  id: string;
  label: string; // "Sponsorisé"
  title: string; // ex. "[Marque] : la promo de la semaine"
  text: string; // ex. "Chez les étals cosmétiques de Tokpa Yôyô"
  image: ApiImage | null;
  target: { type: 'stall' | 'aisle'; id: string };
};

/** GET /v1/aisles/{id}/stalls */
export type AislePayload = {
  aisle: Aisle;
  stalls: StallSummary[];
  next_cursor: string | null;
};

/** GET /v1/search?q= et POST /v1/search/voice */
export type SearchPayload = {
  query: string; // pour la recherche vocale : la transcription
  stalls: StallSummary[];
  products: (Product & { stall: Pick<StallSummary, 'id' | 'name' | 'verified'> })[];
};
