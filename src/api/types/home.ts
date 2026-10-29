import type { ApiImage, StallSummary } from './common';

/** GET /v1/home */
export type HomePayload = {
  market_notice: { text: string; partner: string | null } | null;
  aisles: Aisle[];
  followed_stalls: StallSummary[];
  sponsored: SponsoredSlot | null;
};

export type Aisle = {
  id: string; // ex. "tissus"
  name: string; // ex. "Tissus et pagnes"
  icon: string; // clé d'icône locale, pas d'image à télécharger
  stall_count: number;
};

export type SponsoredSlot = {
  id: string;
  brand: string;
  title: string;
  image: ApiImage;
  target: { type: 'stall' | 'aisle' | 'url'; id: string };
};
