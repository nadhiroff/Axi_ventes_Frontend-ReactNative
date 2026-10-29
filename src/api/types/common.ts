// Types partagés par tous les endpoints. Voir docs/API_CONTRACT.md.
// Les clés restent en snake_case, comme le JSON produit par le backend PHP.

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta: ApiMeta;
};

export type ApiFailure = {
  ok: false;
  error: { code: string; message: string };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type ApiMeta = {
  server_time: string; // ISO 8601 UTC
  /** Durée pendant laquelle le client peut réutiliser la réponse sans redemander. */
  max_age_s: number;
};

/** Image servie en WebP, en deux tailles fixes pour limiter la data. */
export type ApiImage = {
  thumb_url: string; // ~200 px de large, < 15 Ko
  medium_url: string; // ~600 px de large, < 60 Ko
  width: number;
  height: number;
  blurhash: string | null;
};

/** Montants entiers en francs CFA, jamais de décimales. */
export type Price = {
  amount: number;
  amount_max: number | null; // renseigné pour une fourchette de prix
  currency: 'XOF';
};

export type StallLocation = {
  site: string; // ex. "Tokpa Yôyô"
  row: string | null; // ex. "Allée B"
  stand: string | null; // ex. "214"
  label: string; // ex. "Tokpa Yôyô · Allée B, stand 214"
  map_url: string | null; // plan d'accès (lien Google Maps ou image)
  moved_at: string | null; // date du dernier déménagement, sinon null
};

export type StallSummary = {
  id: string;
  name: string; // ex. "Chez Maman Afi"
  tagline: string; // ex. "Pagnes wax et bazin"
  avatar: ApiImage | null; // null : on affiche les initiales, sans téléchargement
  aisle_id: string;
  verified: boolean;
  is_open: boolean;
  location: StallLocation;
  has_new_products: boolean;
};
