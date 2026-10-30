import type { Price } from '../api/types';
import { useCurrencyStore } from '../store/currencyStore';

/** 15000 -> "15 000" */
export function group(amount: number): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Montant en F CFA, toujours (paiements, abonnement) : 15000 -> "15 000 F" */
export function formatXof(amount: number): string {
  return `${group(amount)} F`;
}

/** Conversion dans la devise choisie : "≈ 22,87 €" / "≈ $25.49" (null en F CFA) */
export function converted(amount: number): string | null {
  const { currency, rates } = useCurrencyStore.getState();
  if (currency === 'XOF') return null;
  const value = amount / rates[currency];
  return currency === 'EUR'
    ? `≈ ${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
    : `≈ $${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Montant affiché dans la devise choisie dans Paramètres : "15 000 F", "≈ 22,87 €" ou "≈ $25.49" */
export function formatFcfa(amount: number): string {
  return converted(amount) ?? formatXof(amount);
}

/** Pour un paiement : toujours le vrai montant en F CFA, avec la conversion entre parenthèses */
export function formatPayment(amount: number): string {
  const c = converted(amount);
  return c ? `${formatXof(amount)} (${c})` : formatXof(amount);
}

/** Prix d'une tuile produit : "18 000 FCFA", "12 000 – 15 000 FCFA" ou "Prix à débattre". */
export function formatPrice(price: Price | null, negotiable = 'Prix à débattre'): string {
  if (!price) return negotiable;
  const low = converted(price.amount);
  if (low) return price.amount_max ? `${low} – ${converted(price.amount_max)!.replace('≈ ', '')}` : low;
  if (price.amount_max) return `${group(price.amount)} – ${group(price.amount_max)} FCFA`;
  return `${group(price.amount)} FCFA`;
}

const STOP_WORDS = new Set(['chez', 'ets', 'et', 'le', 'la', 'les', 'de', 'du', 'des']);

/** "Chez Maman Afi" -> "MA", "Boutique Sena, Lomé" -> "BS" */
export function initials(name: string | null | undefined): string {
  const words = (name ?? '')
    .split(/[\s,]+/)
    .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()));
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';
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

/** « cmd_2 » → « 2 » : le numéro lisible d'une commande (le préfixe ne sert qu'à l'API) */
export function orderNumber(id: string): string {
  return id.replace(/^cmd_/, '');
}

const WEEKDAYS: Record<'fr' | 'en', string[]> = {
  fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

/**
 * Heure d'un message dans une liste (discussions, clients) : « 14:05 » aujourd'hui, « Hier 14:05 »,
 * « lun. 14:05 » dans la semaine ; au-delà d'une semaine sans échange, la date seule.
 */
export function formatChatTime(iso: string, lang: string = 'fr', format: 'dd/mm/yyyy' | 'yyyy-mm-dd' = 'dd/mm/yyyy'): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  const time = `${p(d.getHours())}:${p(d.getMinutes())}`;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
  const en = lang === 'en';
  if (days <= 0) return time;
  if (days === 1) return `${en ? 'Yesterday' : 'Hier'} ${time}`;
  if (days < 7) return `${WEEKDAYS[en ? 'en' : 'fr'][d.getDay()]} ${time}`;
  return formatShortDate(iso, format);
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

/** Nombre court comme les réseaux : 950 -> "950", 1 234 -> "1,2K", 3 000 -> "3K", 2 500 000 -> "2,5M" */
export function formatCount(n: number): string {
  const short = (v: number, unit: string) => `${(Math.floor(v * 10) / 10).toString().replace('.', ',').replace(/,0$/, '')}${unit}`;
  if (n >= 1_000_000) return short(n / 1_000_000, 'M');
  if (n >= 1_000) return short(n / 1_000, 'K');
  return String(n);
}
