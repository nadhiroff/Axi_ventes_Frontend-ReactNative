import { StyleSheet, Text } from 'react-native';

import type { CensusRow } from '../../api/types';
import { DataTable } from '../../components/pro/DataTable';
import { KpiCard, KpiRow, ProCard, ProPage, ProRow } from '../../components/pro/layout';
import { TabGuard } from '../../components/pro/TabGuard';
import { Button } from '../../components/ui/Button';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useProCensus } from '../../hooks/api/pro';
import { downloadCsv } from '../../lib/downloadCsv';
import { formatDate, formatPct, group } from '../../lib/format';
import { colors, fontSize } from '../../theme';

const pct = (part: number, total: number) => (total ? formatPct((part / total) * 100, false) : '—');

const columns = (first: string) => [
  { key: 'label', label: first, flex: 1.6, render: (r: CensusRow) => r.label },
  { key: 'stalls', label: 'Étals', align: 'right' as const, render: (r: CensusRow) => group(r.stalls) },
  { key: 'without', label: 'Sans place', align: 'right' as const, render: (r: CensusRow) => group(r.without_place) },
  { key: 'verified', label: 'Vérifiés', align: 'right' as const, render: (r: CensusRow) => `${group(r.verified)} (${pct(r.verified, r.stalls)})` },
  { key: 'relocated', label: 'Déménagés', align: 'right' as const, render: (r: CensusRow) => group(r.relocated) },
];

/** Recensement des étals pour l'ANaGeM, sous-locataires et commerçants sans place compris. */
export default function ProCensusScreen() {
  const census = useProCensus();

  const exportCsv = () => {
    const d = census.data;
    if (!d) return;
    const header = ['Type', 'Libellé', 'Étals', 'Sans place', 'Vérifiés', 'Déménagés'];
    const rows = [
      ...d.by_site.map((r) => ['Site', r.label, r.stalls, r.without_place, r.verified, r.relocated]),
      ...d.by_aisle.map((r) => ['Allée', r.label, r.stalls, r.without_place, r.verified, r.relocated]),
    ];
    downloadCsv(`axi-recensement-${d.updated_at.slice(0, 10)}.csv`, header, rows);
  };

  return (
    <ProPage
      title="Recensement des étals"
      subtitle="Tous les étals présents sur Axi, sous-locataires et commerçants sans place compris. Chaque étal vérifié a été visité par un agent Axi."
    >
      <TabGuard tab="recensement">
        {census.isPending ? (
          <LoadingView />
        ) : census.isError && !census.data ? (
          <ErrorView error={census.error} onRetry={() => census.refetch()} />
        ) : (
          <>
            <KpiRow>
              <KpiCard label="Étals recensés" value={group(census.data!.totals.stalls)} />
              <KpiCard
                label="Sans place physique"
                value={group(census.data!.totals.without_place)}
                note={pct(census.data!.totals.without_place, census.data!.totals.stalls)}
              />
              <KpiCard
                label="Vérifiés par un agent"
                value={group(census.data!.totals.verified)}
                note={pct(census.data!.totals.verified, census.data!.totals.stalls)}
              />
              <KpiCard label="Retrouvés après déménagement" value={group(census.data!.totals.relocated)} />
            </KpiRow>

            <ProCard title="Par site">
              <DataTable<CensusRow> rows={census.data!.by_site} rowKey={(r) => r.label} columns={columns('Site')} />
            </ProCard>
            <ProCard title="Par allée">
              <DataTable<CensusRow> rows={census.data!.by_aisle} rowKey={(r) => r.label} columns={columns('Allée')} />
            </ProCard>

            <ProRow style={styles.footer}>
              <Text style={styles.updated}>Mis à jour le {formatDate(census.data!.updated_at)}</Text>
              <Button label="Exporter en CSV" icon="download" variant="ghost" onPress={exportCsv} />
            </ProRow>
          </>
        )}
      </TabGuard>
    </ProPage>
  );
}

const styles = StyleSheet.create({
  footer: { justifyContent: 'space-between', alignItems: 'center' },
  updated: { fontSize: fontSize.body, color: colors.textMuted },
});
