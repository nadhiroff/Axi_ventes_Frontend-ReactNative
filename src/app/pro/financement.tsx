import { StyleSheet, Text } from 'react-native';

import type { SharedFile } from '../../api/types';
import { DataTable } from '../../components/pro/DataTable';
import { KpiCard, KpiRow, ProCard, ProPage } from '../../components/pro/layout';
import { TabGuard } from '../../components/pro/TabGuard';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { Tag } from '../../components/ui/Tag';
import { useProFinancing } from '../../hooks/api/pro';
import { formatFcfa, formatPct, group } from '../../lib/format';
import { colors, fontSize } from '../../theme';

const statusTone = { new: 'brand', in_review: 'neutral', granted: 'trust', declined: 'outline' } as const;

/** Financement : crédits accordés via Axi et dossiers partagés avec l'accord des commerçants. */
export default function ProFinancingScreen() {
  const financing = useProFinancing();

  return (
    <ProPage
      title="Financement"
      subtitle="Axi ne prête pas lui-même : il présente aux institutions des commerçants dont il connaît l'activité, avec leur accord."
    >
      <TabGuard tab="financement">
        {financing.isPending ? (
          <LoadingView />
        ) : financing.isError && !financing.data ? (
          <ErrorView error={financing.error} onRetry={() => financing.refetch()} />
        ) : (
          <>
            <KpiRow>
              <KpiCard label="Crédits accordés via Axi" value={group(financing.data!.totals.credits_granted)} note="avec l'accord des commerçants" />
              <KpiCard label="Montant accordé" value={formatFcfa(financing.data!.totals.amount_granted)} />
              <KpiCard
                label="Taux de remboursement"
                value={formatPct(financing.data!.totals.repayment_rate_pct, false)}
                note="prélevé sur les ventes Axi"
              />
            </KpiRow>

            <ProCard title="Dossiers partagés avec l'accord des commerçants">
              <DataTable<SharedFile>
                rows={financing.data!.shared_files}
                rowKey={(f) => f.id}
                empty="Aucun commerçant n’a encore partagé son historique avec vous."
                columns={[
                  { key: 'name', label: 'Commerçant', flex: 1.5, render: (f) => f.merchant_name },
                  { key: 'site', label: 'Site', render: (f) => f.site },
                  { key: 'aisle', label: 'Allée', render: (f) => f.aisle },
                  { key: 'history', label: 'Historique', align: 'right', render: (f) => `${f.months_of_history} mois` },
                  { key: 'sales', label: 'Ventes moyennes / mois', flex: 1.3, align: 'right', render: (f) => formatFcfa(f.avg_monthly_sales) },
                  { key: 'status', label: 'Statut', render: (f) => <Tag label={f.status_label} tone={statusTone[f.status]} size="md" /> },
                ]}
              />
              <Text style={styles.note}>
                Seuls les commerçants qui ont coché « Partager mon historique » dans l’application apparaissent ici. S’ils retirent leur
                accord, leur dossier disparaît.
              </Text>
            </ProCard>
          </>
        )}
      </TabGuard>
    </ProPage>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: fontSize.small, color: colors.textMuted },
});
