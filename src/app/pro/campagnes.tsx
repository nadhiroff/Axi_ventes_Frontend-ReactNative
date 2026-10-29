import type { Campaign } from '../../api/types';
import { CampaignForm } from '../../components/pro/CampaignForm';
import { DataTable } from '../../components/pro/DataTable';
import { ProCard, ProPage, ProRow } from '../../components/pro/layout';
import { TabGuard } from '../../components/pro/TabGuard';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { Tag } from '../../components/ui/Tag';
import { useProCampaigns } from '../../hooks/api/pro';
import { formatDate, formatFcfa, group } from '../../lib/format';

const statusTone = { pending_review: 'brand', active: 'trust', ended: 'neutral', rejected: 'outline' } as const;

/** Campagnes : suivi des campagnes lancées et création d'une nouvelle. */
export default function ProCampaignsScreen() {
  const campaigns = useProCampaigns();

  return (
    <ProPage
      title="Campagnes"
      subtitle="Touchez les commerçants et leurs clients par allée et par site. Chaque campagne est relue par l'équipe Axi avant diffusion."
    >
      <TabGuard tab="campagnes">
        {campaigns.isPending ? (
          <LoadingView />
        ) : campaigns.isError && !campaigns.data ? (
          <ErrorView error={campaigns.error} onRetry={() => campaigns.refetch()} />
        ) : (
          <ProRow>
            <ProCard title="Vos campagnes" flex={2}>
              <DataTable<Campaign>
                rows={campaigns.data!.campaigns}
                rowKey={(c) => c.id}
                empty="Aucune campagne pour l’instant."
                columns={[
                  { key: 'audience', label: 'Public visé', flex: 2, render: (c) => c.audience_label },
                  { key: 'format', label: 'Format', flex: 1.5, render: (c) => c.format_label },
                  { key: 'budget', label: 'Budget', align: 'right', render: (c) => formatFcfa(c.budget) },
                  { key: 'status', label: 'Statut', render: (c) => <Tag label={c.status_label} tone={statusTone[c.status]} size="md" /> },
                  { key: 'impressions', label: 'Affichages', align: 'right', render: (c) => group(c.impressions) },
                  { key: 'clicks', label: 'Clics', align: 'right', render: (c) => group(c.clicks) },
                  { key: 'date', label: 'Créée le', render: (c) => formatDate(c.created_at) },
                ]}
              />
            </ProCard>
            <CampaignForm data={campaigns.data!} />
          </ProRow>
        )}
      </TabGuard>
    </ProPage>
  );
}
