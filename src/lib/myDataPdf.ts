import * as Print from 'expo-print';

import type { MyData } from '../api/types';
import { t } from '../i18n';
import { formatFcfa, formatShortDate } from './format';

/** Date MySQL UTC (« 2026-11-02 09:51:36 ») → date courte */
const day = (value: string | null | undefined) => (value ? formatShortDate(value.replace(' ', 'T') + 'Z') : '—');

const esc = (s: unknown) =>
  String(s ?? '—').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Tableau à deux colonnes (information, valeur) ou liste datée (élément, date) */
function table(rows: [string, string][], headers?: [string, string]): string {
  if (rows.length === 0) return `<p class="empty">${esc(t('myData.none'))}</p>`;
  return `<table>${headers ? `<thead><tr><th>${esc(headers[0])}</th><th>${esc(headers[1])}</th></tr></thead>` : ''}<tbody>${rows
    .map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`)
    .join('')}</tbody></table>`;
}

function section(title: string, body: string, count?: number): string {
  return `<section><h2>${esc(title)}${count !== undefined ? ` <span>(${count})</span>` : ''}</h2>${body}</section>`;
}

/**
 * Mes données en document PDF lisible par tout le monde (au lieu d'un fichier JSON) : titres, tableaux, dates.
 * Tout y est, pas seulement les 5 premières lignes montrées à l'écran. Renvoie l'adresse du PDF créé.
 */
export async function myDataPdf(d: MyData): Promise<string> {
  const a = d.account;
  const name = a ? `${a.first_name} ${a.last_name}` : '';
  const listed = (head: string) => [head, t('myData.date')] as [string, string];
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Roboto,Arial,sans-serif;color:#1C1917;margin:32px;font-size:12px}
    header{border-bottom:3px solid #C2410C;padding-bottom:12px;margin-bottom:18px}
    .logo{color:#C2410C;font-size:26px;font-weight:800;letter-spacing:-0.5px}
    h1{font-size:20px;margin:4px 0}
    .intro{color:#57534E;margin:0}
    section{margin-bottom:18px;page-break-inside:avoid}
    h2{font-size:14px;color:#9A3412;border-bottom:1px solid #E7E5E4;padding-bottom:4px;margin:0 0 6px}
    h2 span{color:#78716C;font-weight:400}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;font-size:11px;color:#78716C;font-weight:600;padding:4px 6px;background:#FAF7F2}
    td{padding:5px 6px;border-bottom:1px solid #F5F5F4;vertical-align:top}
    td:last-child{text-align:right;color:#57534E;white-space:nowrap}
    .empty{color:#A8A29E;margin:2px 0}
    footer{margin-top:24px;color:#A8A29E;font-size:10px;text-align:center}
  </style></head><body>
  <header><div class="logo">axi</div><h1>${esc(t('myData.pdfTitle'))}</h1>
  <p class="intro">${esc(t('myData.pdfIntro', { date: day(d.exported_at.replace('T', ' ').slice(0, 19)), name }))}</p></header>
  ${a ? section(t('myData.account'), table([
    [t('myData.name'), name],
    [t('myData.email'), a.email],
    [t('myData.phone'), a.phone ?? '—'],
    [t('myData.role'), a.role === 'merchant' ? t('block.merchant') : t('block.client')],
    [t('myData.language'), a.lang],
    [t('myData.memberSince'), day(a.created_at)],
    ...(a.bio ? ([[t('myData.bio'), a.bio]] as [string, string][]) : []),
  ])) : ''}
  ${d.stall ? section(t('myData.stall'), table([
    [t('myData.name'), d.stall.name],
    [t('myData.phone'), d.stall.phone ?? '—'],
    ['WhatsApp', d.stall.whatsapp ?? '—'],
    [t('myData.memberSince'), day(d.stall.created_at)],
  ])) : ''}
  ${section(t('myData.orders'), table(d.orders.map((o) => [`n° ${o.id} · ${formatFcfa(o.total)} · ${o.status}`, day(o.created_at)]), listed(t('myData.detail'))), d.orders.length)}
  ${section(t('myData.payments'), table(d.payments.map((p) => [`${formatFcfa(p.amount)} · ${p.status} · ${p.reference}`, day(p.created_at)]), listed(t('myData.detail'))), d.payments.length)}
  ${section(t('myData.followed'), table(d.followed_stalls.map((f) => [f.name, day(f.created_at)]), listed(t('myData.name'))), d.followed_stalls.length)}
  ${section(t('myData.favorites'), table(d.favorites.map((f) => [f.name, day(f.created_at)]), listed(t('myData.name'))), d.favorites.length)}
  ${section(t('myData.consents'), table(d.consents.map((c) => [c.partner, c.revoked_at ? t('myData.revoked', { date: day(c.revoked_at) }) : day(c.granted_at)]), listed(t('myData.name'))), d.consents.length)}
  ${section(t('myData.blocked'), table(d.blocked_users.map((b) => [b.name, day(b.created_at)]), listed(t('myData.name'))), d.blocked_users.length)}
  ${section(t('myData.logins'), table(d.logins.map((l) => [`${l.success ? t('myData.loginOk') : t('myData.loginFailed')}${l.device ? ` · ${l.device}` : ''}${l.ip ? ` · ${l.ip}` : ''}`, day(l.created_at)]), listed(t('myData.detail'))), d.logins.length)}
  <footer>${esc(t('myData.pdfFooter'))}</footer>
  </body></html>`;
  // Format A4 (595 × 842 points)
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  return uri;
}
