// Axi Pro, l'espace web des partenaires. Données agrégées et anonymes seulement :
// le serveur ne renvoie jamais un chiffre calculé sur moins de 5 étals.

export type ProSite = { id: string; name: string };

/** GET /v1/pro/overview?site= : onglet "Tendances du marché" */
export type ProOverview = {
  kpis: {
    stalls_registered: number;
    stalls_without_place: number;
    stalls_active_month: number;
    sites_count: number;
    online_orders_month: number;
    outside_cotonou_pct: number; // 0 à 100
    credits_granted: number;
  };
  sites: ProSite[];
  median_prices: MedianPrice[];
};

export type MedianPrice = {
  product_ref_id: string;
  product_name: string; // ex. "Riz, sac de 25 kg" (référentiel produits)
  site: string;
  median_price: number | null; // null : moins de 5 étals, "données insuffisantes"
  change_30d_pct: number | null; // ex. -3.5
  sample_size: number;
};

export type CampaignFormat = 'supplier_offer' | 'sponsored_home';

export type CampaignStatus = 'pending_review' | 'active' | 'ended' | 'rejected';

export type Campaign = {
  id: string;
  audience_label: string; // ex. "Commerçants cosmétiques, Tokpa Yôyô"
  format: CampaignFormat;
  format_label: string;
  budget: number; // FCFA
  status: CampaignStatus;
  status_label: string; // ex. "En relecture"
  impressions: number;
  clicks: number;
  created_at: string;
};

/** GET /v1/pro/campaigns : onglet "Campagnes" et formulaire "Nouvelle campagne" */
export type ProCampaigns = {
  campaigns: Campaign[];
  audiences: { id: string; label: string; reach: number }[]; // reach : nombre d'étals touchés
  formats: { id: CampaignFormat; label: string }[];
  min_budget: number;
};

/** POST /v1/pro/campaigns */
export type NewCampaign = { audience_id: string; format: CampaignFormat; budget: number };

/** GET /v1/pro/census : onglet "Recensement des étals" (ANaGeM) */
export type ProCensus = {
  totals: { stalls: number; without_place: number; verified: number; relocated: number };
  by_site: CensusRow[];
  by_aisle: CensusRow[];
  updated_at: string;
};

export type CensusRow = {
  label: string; // nom du site ou de l'allée
  stalls: number;
  without_place: number;
  verified: number;
  relocated: number;
};

/** GET /v1/pro/financing : onglet "Financement" (IMF, banques) */
export type ProFinancing = {
  totals: { credits_granted: number; amount_granted: number; repayment_rate_pct: number | null };
  /** Dossiers des seuls commerçants qui ont coché "Partager mon historique". */
  shared_files: SharedFile[];
};

export type SharedFile = {
  id: string;
  merchant_name: string;
  site: string;
  aisle: string;
  months_of_history: number;
  avg_monthly_sales: number; // FCFA
  status: 'new' | 'in_review' | 'granted' | 'declined';
  status_label: string;
};
