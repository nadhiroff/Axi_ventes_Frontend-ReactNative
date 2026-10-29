import type { Price } from '../api/types';

/** 15000 -> "15 000" */
export function group(amount: number): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** 15000 -> "15 000 F" */
export function formatFcfa(amount: number): string {
  return `${group(amount)} F`;
}

/** Prix d'une tuile produit : "18 000 FCFA", "12 000 – 15 000 FCFA" ou "Prix à débattre". */
export function formatPrice(price: Price | null, negotiable = 'Prix à débattre'): string {
  if (!price) return negotiable;
  if (price.amount_max) return `${group(price.amount)} – ${group(price.amount_max)} FCFA`;
  return `${group(price.amount)} FCFA`;
}

const STOP_WORDS = new Set(['chez', 'ets', 'et', 'le', 'la', 'les', 'de', 'du', 'des']);

/** "Chez Maman Afi" -> "MA", "Boutique Sena, Lomé" -> "BS" */
export function initials(name: string): string {
  const words = name
    .split(/[\s,]+/)
    .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()));
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

const MONTHS = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** "2026-11-30" -> "30 novembre 2026" (ou "30 November 2026") */
export function formatDate(iso: string, lang: string = 'fr'): string {
  const d = new Date(iso);
  const months = lang === 'en' ? MONTHS.en : MONTHS.fr;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Date courte selon le format choisi dans les paramètres : 29/10/2026 ou 2026-10-29, avec l'heure si demandé */
export function formatShortDate(iso: string, format: 'dd/mm/yyyy' | 'yyyy-mm-dd' = 'dd/mm/yyyy', withTime = false): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  const date = format === 'yyyy-mm-dd' ? `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` : `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  return withTime ? `${date} ${p(d.getHours())}:${p(d.getMinutes())}` : date;
}

/** Octets → « 12,5 Mo » */
export function formatBytes(bytes: number): string {
  const mb = bytes / 1048576;
  return mb >= 1 ? `${mb.toFixed(1).replace('.', ',')} Mo` : `${Math.round(bytes / 1024)} Ko`;
}

/** Clé unique d'une tentative de paiement (Idempotency-Key) */
export function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Libellé "Mis à jour ce matin / cet après-midi / hier / le 12 octobre". */
export function updatedLabel(iso: string | null, now = new Date()): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.getHours() < 12 ? 'Mis à jour ce matin' : 'Mis à jour aujourd’hui';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Mis à jour hier';
  return `Mis à jour le ${formatDate(iso).replace(/ \d{4}$/, '')}`;
}

/** "+22997000001" -> "https://wa.me/22997000001" */
export function whatsappUrl(phone: string, text?: string): string {
  const base = `https://wa.me/${phone.replace(/[^\d]/g, '')}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** 2.5 -> "+2,5 %", -1.25 -> "−1,3 %", null -> "—" */
export function formatPct(value: number | null, signed = true): string {
  if (value === null) return '—';
  const sign = signed && value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(1).replace('.', ',').replace(',0', '')} %`;
}
