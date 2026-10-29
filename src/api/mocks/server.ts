// Faux backend en mémoire, avec la même forme de réponses que le PHP.
// Permet de développer et de montrer l'application avant que l'API soit prête.
import { ApiError } from '../client';
import type { Api } from '../endpoints';
import type { Order, Quote, QuoteRequest, StallSummary } from '../types';
import { mockAuth, requireSession } from './auth';
import { aisles, merchantClients, merchantOrders, productsByStall, stalls } from './data';
import { mockPro } from './pro';

const MY_STALL_ID = 'stl_214';

const delay = <T>(value: T, ms = 350) => new Promise<T>((resolve) => setTimeout(() => resolve(structuredCopy(value)), ms));

function structuredCopy<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function summary(id: string): StallSummary {
  const { owner_display_name, verification, pay_on_delivery, delivery_note, contacts, is_followed, ...rest } = findStall(id);
  return rest;
}

function findStall(id: string) {
  const found = stalls.find((s) => s.id === id);
  if (!found) throw new ApiError('STALL_NOT_FOUND', "Cet étal n'existe pas ou a été fermé.", 404);
  return found;
}

function findProduct(productId: string) {
  for (const [stallId, products] of Object.entries(productsByStall)) {
    const product = products.find((p) => p.id === productId);
    if (product) return { stallId, product };
  }
  return null;
}

const orders = new Map<string, Order & { polls: number }>();
let dataSharing = false;
let creditPending = false;
let relocationSent = false;

function computeQuote(body: QuoteRequest): Quote {
  const stallIds = new Set<string>();
  let itemsTotal = 0;
  const unavailable: string[] = [];
  for (const line of body.lines) {
    const found = findProduct(line.product_id);
    if (!found || !found.product.price || !found.product.in_stock) {
      unavailable.push(line.product_id);
      continue;
    }
    stallIds.add(found.stallId);
    itemsTotal += found.product.price.amount * line.quantity;
  }
  const fees = { delivery: [1500, 'Livraison'], bus: [2500, 'Expédition car'], axi_point: [500, 'Retrait au point Axi'] } as const;
  const [receptionFee, label] = fees[body.reception.mode];
  const groupingFee = stallIds.size > 1 ? 300 * stallIds.size : 0;
  return {
    stall_count: stallIds.size,
    items_total: itemsTotal,
    grouping_fee: groupingFee,
    reception_fee: receptionFee,
    reception_fee_label: label,
    total: itemsTotal + groupingFee + receptionFee,
    axi_points: [
      { id: 'pt_1', name: 'Point Axi Tokpa Yôyô', address: 'Entrée principale, à côté de la pharmacie' },
      { id: 'pt_2', name: 'Point Axi Calavi', address: 'Carrefour IITA' },
    ],
    unavailable_product_ids: unavailable,
  };
}

export const mockApi: Api = {
  ...mockAuth,
  ...mockPro,

  home: () =>
    delay({
      city: { id: 'cotonou', name: 'Cotonou' },
      market_notice: { text: 'Service en ligne des marchés', partner: '[partenaire ANaGeM, si accord]' },
      sponsored: {
        id: 'spn_1',
        label: 'Sponsorisé',
        title: '[Marque] : la promo de la semaine',
        text: 'Chez les étals cosmétiques de Tokpa Yôyô',
        image: null,
        target: { type: 'aisle', id: 'cosmetiques' },
      },
      aisles,
      followed_stalls: stalls.filter((s) => s.is_followed).map((s) => summary(s.id)),
    }),

  aisle: (aisleId) => {
    const aisle = aisles.find((a) => a.id === aisleId);
    if (!aisle) return Promise.reject(new ApiError('AISLE_NOT_FOUND', "Cette allée n'existe pas.", 404));
    return delay({ aisle, stalls: stalls.filter((s) => s.aisle_id === aisleId).map((s) => summary(s.id)), next_cursor: null });
  },

  search: (query) => {
    const needle = query.trim().toLowerCase();
    const match = (text: string) => text.toLowerCase().includes(needle);
    return delay({
      query,
      stalls: stalls.filter((s) => match(s.name) || match(s.tagline)).map((s) => summary(s.id)),
      products: Object.entries(productsByStall).flatMap(([stallId, products]) => {
        const s = findStall(stallId);
        return products.filter((p) => match(p.name)).map((p) => ({ ...p, stall: { id: s.id, name: s.name, verified: s.verified } }));
      }),
    });
  },

  voiceSearch: () => mockApi.search('wax'),

  stall: (stallId) => {
    try {
      const products = [...(productsByStall[stallId] ?? [])].sort((a, b) => Number(b.is_today) - Number(a.is_today));
      return delay({
        stall: findStall(stallId),
        products,
        products_updated_at: products[0]?.updated_at ?? null,
        next_cursor: null,
      });
    } catch (e) {
      return Promise.reject(e);
    }
  },

  setFollow: (stallId, follow) => {
    requireSession();
    findStall(stallId).is_followed = follow;
    return delay({ is_followed: follow });
  },

  sendVoiceMessage: () => {
    requireSession();
    return delay({ message: 'Message vocal envoyé. Le commerçant vous répondra ici ou par téléphone.' }, 800);
  },

  quote: (body) => delay(computeQuote(body)),

  createOrder: (body) => {
    requireSession();
    const quote = computeQuote(body);
    const order: Order & { polls: number } = {
      id: `cmd_${Date.now()}`,
      status: 'awaiting_payment',
      status_label: 'En attente de votre validation Mobile Money',
      total: quote.total,
      payment_instructions: 'Un message de validation arrive sur votre téléphone. Entrez votre code secret Mobile Money pour confirmer.',
      stalls: [...new Set(body.lines.map((l) => findProduct(l.product_id)?.stallId).filter(Boolean) as string[])].map((id) => ({
        id,
        name: findStall(id).name,
        status_label: 'En attente du paiement',
      })),
      created_at: new Date().toISOString(),
      polls: 0,
    };
    orders.set(order.id, order);
    return delay(order, 700);
  },

  order: (orderId) => {
    const order = orders.get(orderId);
    if (!order) return Promise.reject(new ApiError('ORDER_NOT_FOUND', 'Commande introuvable.', 404));
    order.polls += 1;
    if (order.polls >= 2 && order.status === 'awaiting_payment') {
      order.status = 'paid';
      order.status_label = 'Paiement reçu, gardé par Axi jusqu’à la réception';
      order.payment_instructions = null;
      order.stalls = order.stalls.map((s) => ({ ...s, status_label: 'Prépare votre commande' }));
    }
    return delay(order);
  },

  merchantToday: () =>
    delay({
      greeting_name: 'Maman Afi',
      stall_open: true,
      sales_today: 54000,
      orders_to_prepare: merchantOrders.filter((o) => o.status === 'to_prepare').length,
      connection: { active: true, included_until: '2026-11-30' },
      relocation: {
        title: 'Vous êtes installée à Tokpa Yôyô',
        text: 'Prévenez vos clients : votre nouvelle adresse et votre plan d’accès leur sont envoyés en un message.',
        already_sent: relocationSent,
        client_count: merchantClients.length,
      },
      orders: merchantOrders,
    }),

  broadcastRelocation: () => {
    relocationSent = true;
    return delay({ recipients: merchantClients.length, message: `Nouvelle adresse envoyée à ${merchantClients.length} clients.` }, 700);
  },

  markOrderReady: (orderId) => {
    const order = merchantOrders.find((o) => o.id === orderId);
    if (order) {
      order.status = 'ready';
      order.status_label = 'Prête';
    }
    return delay({ status: 'ready' as const });
  },

  announceArrival: () => delay({ recipients: 2, message: 'Arrivage annoncé à vos 2 clients fidèles.' }, 900),

  merchantStall: () => delay({ stall: findStall(MY_STALL_ID), products: productsByStall[MY_STALL_ID] }),

  createProduct: (fields) => {
    const product = {
      id: `prd_${Date.now()}`,
      name: fields.name,
      image: null,
      price: fields.price ? { amount: Number(fields.price), amount_max: null, currency: 'XOF' as const } : null,
      in_stock: true,
      is_today: fields.is_today === '1',
      updated_at: new Date().toISOString(),
    };
    productsByStall[MY_STALL_ID].unshift(product);
    return delay(product, 900);
  },

  updateProduct: (productId, patch) => {
    const found = findProduct(productId);
    if (!found) return Promise.reject(new ApiError('PRODUCT_NOT_FOUND', 'Produit introuvable.', 404));
    Object.assign(found.product, patch, { updated_at: new Date().toISOString() });
    return delay(found.product);
  },

  merchantClients: (segment) =>
    delay({
      arrival_prompt: {
        title: 'Nouvel arrivage de wax ?',
        text: 'Prévenez vos clients fidèles en un message, par Axi ou par WhatsApp.',
        button_label: 'Envoyer à mes clients fidèles',
      },
      clients: merchantClients
        .filter((c) => segment === 'all' || c.segments.includes(segment))
        .map(({ segments, ...client }) => client),
    }),

  addClient: (input) => {
    const client = {
      id: `cli_${Date.now()}`,
      display_name: input.display_name,
      description: input.kind === 'reseller' ? 'Revendeur · ajouté aujourd’hui' : 'Particulier · ajouté aujourd’hui',
      phone: input.phone,
      badge: { kind: 'new' as const, label: 'Nouveau' },
      segments: input.kind === 'reseller' ? ['resellers'] : [],
    };
    merchantClients.unshift(client);
    const { segments, ...rest } = client;
    return delay(rest);
  },

  followUpClient: () => delay({ recipients: 1, message: 'Relance envoyée.' }),

  broadcastToLoyal: (channel) =>
    delay({
      recipients: 2,
      message: channel === 'whatsapp' ? 'Message prêt à partager sur WhatsApp.' : 'Message envoyé à vos 2 clients fidèles.',
    }),

  merchantMoney: () =>
    delay({
      pending_amount: 126500,
      subscription: {
        status: 'active' as const,
        status_label: 'Actif',
        plan_label: 'Formule Étal · 2 000 F par mois · connexion incluse',
        note: 'Inclus dans votre place à Tokpa Yôyô [si accord ANaGeM]',
      },
      supplier_offer: {
        id: 'off_1',
        label: 'Sponsorisé',
        title: '[Fournisseur] : 20 pièces de wax livrées à votre stand',
        text: 'Payables en 4 semaines avec le crédit stock de [IMF partenaire], prélevé sur vos ventes Axi.',
        url: null,
      },
      credit: {
        title: 'Votre historique ouvre l’accès au crédit',
        text: '7 mois de ventes enregistrées sur Axi. Demandez un crédit à [IMF partenaire] sans garantie à fournir.',
        can_request: !creditPending,
        request_pending: creditPending,
      },
      data_sharing: {
        partner_name: '[IMF partenaire]',
        enabled: dataSharing,
        text: 'Seulement si vous le décidez. Axi ne vend jamais vos données ni celles de vos clients.',
      },
    }),

  requestCredit: () => {
    if (!dataSharing) {
      return Promise.reject(
        new ApiError('DATA_SHARING_REQUIRED', 'Pour demander un crédit, acceptez d’abord de partager votre historique avec l’IMF.', 422),
      );
    }
    creditPending = true;
    return delay({ message: 'Demande envoyée. [IMF partenaire] vous appellera sous 48 h.' }, 800);
  },

  setDataSharing: (enabled) => {
    dataSharing = enabled;
    return delay({ enabled });
  },
};
