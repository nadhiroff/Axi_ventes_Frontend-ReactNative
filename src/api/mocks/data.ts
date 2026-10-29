// Données de démonstration reprises des maquettes de la note de cadrage.
// Les noms sont fictifs. Ce fichier n'est utilisé que lorsque EXPO_PUBLIC_API_URL est vide.
import type { Aisle, MerchantClient, MerchantOrder, Product, StallDetail } from '../types';

export const aisles: Aisle[] = [
  { id: 'tissus', name: 'Tissus et pagnes', icon: 'fabric', stall_count: 412 },
  { id: 'vivriers', name: 'Vivriers en gros', icon: 'grain', stall_count: 655 },
  { id: 'cosmetiques', name: 'Cosmétiques', icon: 'beauty', stall_count: 203 },
  { id: 'quincaillerie', name: 'Quincaillerie', icon: 'hardware', stall_count: 187 },
  { id: 'pieces', name: 'Pièces détachées', icon: 'parts', stall_count: 240 },
  { id: 'bijoux', name: 'Bijoux et sacs', icon: 'jewelry', stall_count: 158 },
  { id: 'electronique', name: 'Électronique', icon: 'electronics', stall_count: 96 },
];

const now = new Date();
const iso = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600_000).toISOString();

function stall(partial: Omit<StallDetail, 'has_new_products' | 'avatar' | 'verification' | 'is_followed'> & {
  is_followed?: boolean;
}): StallDetail {
  return {
    avatar: null,
    has_new_products: true,
    is_followed: false,
    verification: partial.verified ? { by: 'agent', verified_at: iso(24 * 40) } : null,
    ...partial,
  };
}

export const stalls: StallDetail[] = [
  stall({
    id: 'stl_214',
    name: 'Chez Maman Afi',
    tagline: 'Pagnes wax, bazin et tissus de cérémonie',
    aisle_id: 'tissus',
    verified: true,
    is_open: true,
    owner_display_name: 'Maman Afi',
    location: {
      site: 'Tokpa Yôyô',
      row: 'Allée B',
      stand: '214',
      label: 'Tokpa Yôyô · Allée B, stand 214',
      map_url: 'https://maps.google.com/?q=6.3703,2.4339',
      moved_at: iso(24 * 90),
    },
    pay_on_delivery: true,
    delivery_note: 'Livraison Cotonou et Calavi',
    contacts: { phone: '+22997000001', whatsapp: '+22997000001', accepts_voice_messages: true },
    is_followed: true,
  }),
  stall({
    id: 'stl_ayaba',
    name: 'Bijoux Ayaba',
    tagline: 'Perles, parures et sacs tressés',
    aisle_id: 'bijoux',
    verified: true,
    is_open: true,
    owner_display_name: 'Ayaba',
    location: { site: 'Tokpa Yôyô', row: 'Allée F', stand: '38', label: 'Tokpa Yôyô · Allée F, stand 38', map_url: null, moved_at: null },
    pay_on_delivery: true,
    delivery_note: 'Livraison Cotonou',
    contacts: { phone: '+22997000002', whatsapp: '+22997000002', accepts_voice_messages: true },
    is_followed: true,
  }),
  stall({
    id: 'stl_kossi',
    name: 'Ets Kossi et Fils',
    tagline: 'Riz, maïs et gari en gros',
    aisle_id: 'vivriers',
    verified: true,
    is_open: false,
    owner_display_name: 'Kossi',
    location: { site: 'Tokpa Dahô', row: 'Rangée 4', stand: '12', label: 'Tokpa Dahô · Rangée 4, stand 12', map_url: null, moved_at: iso(24 * 60) },
    pay_on_delivery: false,
    delivery_note: 'Expédition par car vers le Nord',
    contacts: { phone: '+22997000003', whatsapp: null, accepts_voice_messages: false },
  }),
  stall({
    id: 'stl_beaute',
    name: 'Beauté Divine',
    tagline: 'Karité, savons et parfums',
    aisle_id: 'cosmetiques',
    verified: false,
    is_open: true,
    owner_display_name: 'Divine',
    location: { site: 'Tokpa Yôyô', row: 'Allée D', stand: '102', label: 'Tokpa Yôyô · Allée D, stand 102', map_url: null, moved_at: null },
    pay_on_delivery: true,
    delivery_note: null,
    contacts: { phone: '+22997000004', whatsapp: '+22997000004', accepts_voice_messages: false },
  }),
];

const price = (amount: number, amount_max: number | null = null) => ({ amount, amount_max, currency: 'XOF' as const });

export const productsByStall: Record<string, Product[]> = {
  stl_214: [
    { id: 'prd_88', name: 'Wax hollandais, 6 yards', image: null, price: price(18000), in_stock: true, is_today: true, updated_at: iso(3) },
    { id: 'prd_91', name: 'Bazin riche, 5 m', image: null, price: null, in_stock: true, is_today: true, updated_at: iso(3) },
    { id: 'prd_92', name: 'Pagne tissé, la pièce', image: null, price: price(12000, 15000), in_stock: true, is_today: true, updated_at: iso(4) },
    { id: 'prd_93', name: 'Lot revendeur, 12 pièces', image: null, price: price(195000), in_stock: true, is_today: true, updated_at: iso(4) },
    { id: 'prd_94', name: 'Wax Vlisco, 6 yards', image: null, price: price(32000), in_stock: true, is_today: false, updated_at: iso(50) },
    { id: 'prd_95', name: 'Kente, 2 pagnes', image: null, price: price(25000), in_stock: false, is_today: false, updated_at: iso(90) },
  ],
  stl_ayaba: [
    { id: 'prd_201', name: 'Parure perles', image: null, price: price(7500), in_stock: true, is_today: true, updated_at: iso(5) },
    { id: 'prd_202', name: 'Sac tressé raphia', image: null, price: price(9000), in_stock: true, is_today: false, updated_at: iso(30) },
  ],
  stl_kossi: [
    { id: 'prd_301', name: 'Sac de riz, 25 kg', image: null, price: price(17500), in_stock: true, is_today: true, updated_at: iso(6) },
    { id: 'prd_302', name: 'Maïs, sac de 100 kg', image: null, price: price(28000, 32000), in_stock: true, is_today: true, updated_at: iso(6) },
  ],
  stl_beaute: [
    { id: 'prd_401', name: 'Beurre de karité, 1 kg', image: null, price: price(3500), in_stock: true, is_today: true, updated_at: iso(8) },
  ],
};

export const merchantOrders: MerchantOrder[] = [
  {
    id: 'cmd_501',
    customer_name: 'Madame Hounsou',
    customer_phone: '+22996000010',
    summary: '2 × Wax hollandais · Livraison Akpakpa',
    status: 'to_prepare',
    status_label: 'À préparer',
  },
  {
    id: 'cmd_502',
    customer_name: 'Boutique Sena',
    customer_phone: '+22890000011',
    summary: '1 × Lot revendeur, 12 pièces · Expédition car Lomé',
    status: 'to_prepare',
    status_label: 'À préparer',
  },
];

export const merchantClients: (MerchantClient & { segments: string[] })[] = [
  {
    id: 'cli_1',
    display_name: 'Boutique Sena, Lomé',
    description: 'Revendeuse · dernier achat hier',
    phone: '+22890000011',
    badge: { kind: 'loyal', label: 'Fidèle' },
    segments: ['resellers', 'loyal'],
  },
  {
    id: 'cli_2',
    display_name: 'Madame Hounsou',
    description: "Particulier · Akpakpa · aujourd'hui",
    phone: '+22996000010',
    badge: { kind: 'new', label: 'Nouvelle' },
    segments: [],
  },
  {
    id: 'cli_3',
    display_name: 'Alhaji Tanko, Kano',
    description: 'Grossiste · dernier achat il y a 6 semaines',
    phone: '+2348030000012',
    badge: { kind: 'follow_up', label: 'Relancer' },
    segments: ['resellers', 'to_follow_up'],
  },
  {
    id: 'cli_4',
    display_name: 'Famille Dossou, Paris',
    description: 'Diaspora · livraison à Calavi',
    phone: '+33600000013',
    badge: { kind: 'loyal', label: 'Fidèle' },
    segments: ['loyal'],
  },
];
