import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import type { MedianPrice } from '../../api/types';
import { allowedTabs } from '../../components/pro/access';
import { CampaignForm } from '../../components/pro/CampaignForm';
import { DataTable } from '../../components/pro/DataTable';
import { KpiCard, KpiRow, ProCard, ProPage, ProRow } from '../../components/pro/layout';
import { SelectField } from '../../components/pro/SelectField';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useProCampaigns, useProOverview } from '../../hooks/api/pro';
import { formatFcfa, formatPct, group } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { colors, fontSize } from '../../theme';

/** Tendances du marché : chiffres clés, prix médians par produit et par site, nouvelle campagne. */
export default function ProOverviewScreen() {
  const [site, setSite] = useState<string | null>(null);
  const overview = useProOverview(site);
  const user = useAuthStore((s) => s.user);
  const canCampaign = allowedTabs(user).includes('campagnes');
  const campaigns = useProCampaigns(canCampaign);

  return (
    <ProPage
      title="L'espace des partenaires d'Axi"
      subtitle="Pour l'ANaGeM, les annonceurs, les institutions de financement et les acheteurs d'études. Toutes les données affichées sont agrégées et anonymes."
    >
      {overview.isPending ? (
        <LoadingView />
      ) : overview.isError && !overview.data ? (
        <ErrorView error={overview.error} onRetry={() => overview.refetch()} />
      ) : (
        <>
          <KpiRow>
            <KpiCard
              label="Étals recensés"
              value={group(overview.data!.kpis.stalls_registered)}
              note={`dont ${group(overview.data!.kpis.stalls_without_place)} sans place physique`}
            />
            <KpiCard
              label="Étals actifs ce mois"
              value={group(overview.data!.kpis.stalls_active_month)}
              note={`sur ${overview.data!.kpis.sites_count} sites`}
            />
            <KpiCard
              label="Commandes en ligne"
              value={group(overview.data!.kpis.online_orders_month)}
              note={`dont ${formatPct(overview.data!.kpis.outside_cotonou_pct, false)} hors Cotonou`}
            />
            <KpiCard
              label="Crédits accordés via Axi"
              value={group(overview.data!.kpis.credits_granted)}
              note="avec l'accord des commerçants"
            />
          </KpiRow>

          <ProRow>
            <ProCard
              title="Prix médians par produit"
              flex={2}
              right={
                <SelectField
                  value={site ?? ''}
                  onChange={(v) => setSite(v || null)}
                  accessibilityLabel="Site"
                  options={[{ value: '', label: 'Tous les sites' }, ...overview.data!.sites.map((s) => ({ value: s.id, label: s.name }))]}
                />
              }
            >
              <DataTable<MedianPrice>
                rows={overview.data!.median_prices}
                rowKey={(r) => `${r.product_ref_id}-${r.site}`}
                columns={[
                  { key: 'product', label: 'Produit', flex: 2, render: (r) => r.product_name },
                  { key: 'site', label: 'Site', render: (r) => r.site },
                  {
                    key: 'median',
                    label: 'Prix médian',
                    render: (r) =>
                      r.median_price === null ? <Text style={styles.insufficient}>Données insuffisantes</Text> : formatFcfa(r.median_price),
                  },
                  { key: 'change', label: 'Sur 30 jours', render: (r) => formatPct(r.change_30d_pct) },
                ]}
              />
              <Text style={styles.note}>
                Prix médian des étals qui vendent le produit sur le site. Affiché seulement à partir de 5 étals, pour qu’aucun commerçant ne
                soit reconnaissable.
              </Text>
            </ProCard>

            {canCampaign ? (
              campaigns.data ? (
                <CampaignForm data={campaigns.data} />
              ) : (
                <ProCard>
                  <LoadingView />
                </ProCard>
              )
            ) : null}
          </ProRow>
        </>
      )}
    </ProPage>
  );
}

const styles = StyleSheet.create({
  insufficient: { fontSize: fontSize.body, color: colors.textMuted, fontStyle: 'italic' },
  note: { fontSize: fontSize.small, color: colors.textMuted },
});
