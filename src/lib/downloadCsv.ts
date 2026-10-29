import { Platform } from 'react-native';

/** Télécharge un tableau en CSV (Axi Pro, navigateur uniquement). Séparateur ";" pour Excel en français. */
export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]): void {
  if (Platform.OS !== 'web') return;
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(escape).join(';')).join('\r\n');
  // BOM UTF-8 : les accents s'affichent correctement dans Excel.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
