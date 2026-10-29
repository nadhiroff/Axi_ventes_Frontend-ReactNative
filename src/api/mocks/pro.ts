// Données de démonstration d'Axi Pro (chiffres fictifs, agrégés).
import { ApiError } from '../client';
import type { Campaign, NewCampaign, ProCampaigns, ProCensus, ProFinancing, ProOverview } from '../types';

const delay = <T>(value: T, ms = 400) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(JSON.parse(JSON.stringify(value)) as T), ms));

const sites = [
  { id: 'yoyo', name: 'Tokpa Yôyô' },
  { id: 'daho', name: 'Tokpa Dahô' },
  { id: 'ouando', name: 'Ouando' },
  { id: 'st-michel', name: 'Saint-Michel' },
];

const medianPrices = [
  { product_ref_id: 'ref_wax6', product_name: 'Wax hollandais, 6 yards', site: 'Tokpa Yôyô', median_price: 18000, change_30d_pct: 2.5, sample_size: 64 },
  { product_ref_id: 'ref_riz25', product_name: 'Riz, sac de 25 kg', site: 'Tokpa Dahô', median_price: 17500, change_30d_pct: -1.2, sample_size: 41 },
  { product_ref_id: 'ref_huile25', product_name: 'Huile, bidon de 25 l', site: 'Tokpa Dahô', median_price: 26000, change_30d_pct: 4.1, sample_size: 27 },
  { product_ref_id: 'ref_creme400', product_name: 'Crème corporelle, 400 ml', site: 'Tokpa Yôyô', median_price: 3500, change_30d_pct: 0, sample_size: 18 },
  { product_ref_id: 'ref_mais100', product_name: 'Maïs, sac de 100 kg', site: 'Ouando', median_price: 30000, change_30d_pct: -6.3, sample_size: 12 },
  { product_ref_id: 'ref_bazin5', product_name: 'Bazin riche, 5 m', site: 'Saint-Michel', median_price: null, change_30d_pct: null, sample_size: 3 },
];

const campaigns: Campaign[] = [
  {
    id: 'cmp_1',
    audience_label: 'Commerçants tissus, Tokpa Yôyô',
    format: 'supplier_offer',
    format_label: 'Offre fournisseur aux commerçants',
    budget: 250000,
    status: 'active',
    status_label: 'En cours',
    impressions: 3120,
    clicks: 214,
    created_at: '2026-10-02T09:00:00Z',
  },
  {
    id: 'cmp_2',
    audience_label: 'Clients, allée Cosmétiques',
    format: 'sponsored_home',
    format_label: 'Promotion sur l’accueil client',
    budget: 150000,
    status: 'ended',
    status_label: 'Terminée',
    impressions: 18450,
    clicks: 905,
    created_at: '2026-09-01T09:00:00Z',
  },
];

const audiences = [
  { id: 'aud_cosm_yoyo', label: 'Commerçants cosmétiques, Tokpa Yôyô', reach: 142 },
  { id: 'aud_tissus_yoyo', label: 'Commerçants tissus, Tokpa Yôyô', reach: 318 },
  { id: 'aud_vivriers_daho', label: 'Commerçants vivriers, Tokpa Dahô', reach: 401 },
  { id: 'aud_clients_cosm', label: 'Clients, allée Cosmétiques', reach: 5200 },
];

const formats = [
  { id: 'supplier_offer' as const, label: 'Offre fournisseur aux commerçants' },
  { id: 'sponsored_home' as const, label: 'Promotion sur l’accueil client' },
];

export const mockPro = {
  proOverview: (site?: string | null): Promise<ProOverview> => {
    const siteName = sites.find((s) => s.id === site)?.name;
    return delay({
      kpis: {
        stalls_registered: 2480,
        stalls_without_place: 610,
        stalls_active_month: 1735,
        sites_count: sites.length,
        online_orders_month: 4120,
        outside_cotonou_pct: 23,
        credits_granted: 86,
      },
      sites,
      median_prices: siteName ? medianPrices.filter((m) => m.site === siteName) : medianPrices,
    });
  },

  proCampaigns: (): Promise<ProCampaigns> => delay({ campaigns, audiences, formats, min_budget: 50000 }),

  createCampaign: (body: NewCampaign): Promise<Campaign> => {
    const audience = audiences.find((a) => a.id === body.audience_id);
    if (!audience) return Promise.reject(new ApiError('INVALID_AUDIENCE', 'Choisissez un public.', 422));
    if (body.budget < 50000) {
      return Promise.reject(new ApiError('BUDGET_TOO_LOW', 'Le budget minimum est de 50 000 FCFA.', 422));
    }
    const campaign: Campaign = {
      id: `cmp_${Date.now()}`,
      audience_label: audience.label,
      format: body.format,
      format_label: formats.find((f) => f.id === body.format)!.label,
      budget: body.budget,
      status: 'pending_review',
      status_label: 'En relecture',
      impressions: 0,
      clicks: 0,
      created_at: new Date().toISOString(),
    };
    campaigns.unshift(campaign);
    return delay(campaign, 700);
  },

  proCensus: (): Promise<ProCensus> =>
    delay({
      totals: { stalls: 2480, without_place: 610, verified: 1902, relocated: 1340 },
      by_site: [
        { label: 'Tokpa Yôyô', stalls: 1120, without_place: 210, verified: 905, relocated: 760 },
        { label: 'Tokpa Dahô', stalls: 780, without_place: 190, verified: 590, relocated: 480 },
        { label: 'Ouando', stalls: 350, without_place: 120, verified: 260, relocated: 70 },
        { label: 'Saint-Michel', stalls: 230, without_place: 90, verified: 147, relocated: 30 },
      ],
      by_aisle: [
        { label: 'Tissus et pagnes', stalls: 412, without_place: 98, verified: 350, relocated: 260 },
        { label: 'Vivriers en gros', stalls: 655, without_place: 170, verified: 480, relocated: 390 },
        { label: 'Cosmétiques', stalls: 203, without_place: 55, verified: 160, relocated: 120 },
        { label: 'Quincaillerie', stalls: 187, without_place: 40, verified: 150, relocated: 95 },
        { label: 'Pièces détachées', stalls: 240, without_place: 62, verified: 190, relocated: 140 },
        { label: 'Bijoux et sacs', stalls: 158, without_place: 45, verified: 122, relocated: 88 },
      ],
      updated_at: new Date().toISOString(),
    }),

  proFinancing: (): Promise<ProFinancing> =>
    delay({
      totals: { credits_granted: 86, amount_granted: 21500000, repayment_rate_pct: 97.2 },
      shared_files: [
        { id: 'dos_1', merchant_name: 'Chez Maman Afi', site: 'Tokpa Yôyô', aisle: 'Tissus et pagnes', months_of_history: 7, avg_monthly_sales: 840000, status: 'new', status_label: 'Nouveau' },
        { id: 'dos_2', merchant_name: 'Ets Kossi et Fils', site: 'Tokpa Dahô', aisle: 'Vivriers en gros', months_of_history: 5, avg_monthly_sales: 1650000, status: 'in_review', status_label: 'En étude' },
        { id: 'dos_3', merchant_name: 'Bijoux Ayaba', site: 'Tokpa Yôyô', aisle: 'Bijoux et sacs', months_of_history: 9, avg_monthly_sales: 410000, status: 'granted', status_label: 'Accordé' },
      ],
    }),
};
