import type { Price } from '../api/types/common';

/** 15000 -> "15 000 F" */
export function formatFcfa(amount: number): string {
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F`;
}

export function formatPrice(price: Price | null): string {
  if (!price) return 'Prix sur demande';
  if (price.amount_max) return `${formatFcfa(price.amount)} – ${formatFcfa(price.amount_max)}`;
  return formatFcfa(price.amount);
}
