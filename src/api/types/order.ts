export type ReceptionMode = 'delivery' | 'bus' | 'axi_point';

export type OrderLineInput = { product_id: string; quantity: number };

export type ReceptionInput = {
  mode: ReceptionMode;
  /** delivery : quartier et repère ; bus : ville de destination ; axi_point : identifiant du point. */
  detail: string;
};

/** POST /v1/orders/quote */
export type QuoteRequest = { lines: OrderLineInput[]; reception: ReceptionInput };

export type Quote = {
  stall_count: number;
  items_total: number;
  grouping_fee: number; // "Regroupement de N étals"
  reception_fee: number; // livraison, expédition car ou point Axi
  reception_fee_label: string; // ex. "Livraison", "Expédition car"
  total: number;
  axi_points: { id: string; name: string; address: string }[];
  unavailable_product_ids: string[];
};

export type MobileMoneyOperator = 'mtn' | 'moov' | 'celtiis';

/** POST /v1/orders */
export type CreateOrderRequest = QuoteRequest & {
  payment: { operator: MobileMoneyOperator; phone: string };
};

export type OrderStatus = 'awaiting_payment' | 'paid' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled';

/** Réponse de POST /v1/orders et de GET /v1/orders/{id} */
export type Order = {
  id: string;
  status: OrderStatus;
  status_label: string; // ex. "En attente de votre validation Mobile Money"
  total: number;
  payment_instructions: string | null; // ex. "Composez *880# et validez le paiement"
  stalls: { id: string; name: string; status_label: string }[];
  created_at: string;
};
