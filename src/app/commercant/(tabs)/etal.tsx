import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { errorMessage } from '../../../api/client';
import { ProductRow } from '../../../components/merchant/ProductRow';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Grid, Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { ErrorView, LoadingView } from '../../../components/ui/StateViews';
import { Tag } from '../../../components/ui/Tag';
import { useMerchantStall, useStallMutations, useVoiceMessages } from '../../../hooks/api/merchant';
import { useT } from '../../../i18n';
import { confirmAction, notify } from '../../../lib/confirm';
import { fontSize, makeStyles, spacing, useLayout } from '../../../theme';

/** « Mon étal » : vitrine, vérification sur place, catalogue (photo ou vocal), messages vocaux reçus. */
export default function MyStallScreen() {
  const styles = useStyles();
  const t = useT();
  const { listColumns, tablet } = useLayout();
  const stall = useMerchantStall();
  const mutations = useStallMutations();
  const unheard = (useVoiceMessages().data?.messages ?? []).filter((m) => !m.listened).length;
  const d = stall.data;

  if (stall.isPending) return <LoadingView />;
  if (!d) return <ErrorView error={stall.error} onRetry={() => stall.refetch()} />;

  const s = d.stall;
  const drafts = d.products.filter((p) => p.status === 'draft');
  const published = d.products.filter((p) => p.status !== 'draft');

  return (
    <>
      <ScreenHeader title={t('nav.stall')} showBack={false} right={<Button label={t('common.edit')} icon="edit-2" size="sm" variant="ghost" onPress={() => router.push('/commercant/modifier-etal')} />} />
      <Screen refreshing={stall.isRefetching} onRefresh={() => stall.refetch()}>
        <Card style={{ gap: spacing.md }}>
          <View style={styles.identity}>
            <Avatar name={s.name} image={s.avatar} size={72} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name}>{s.name}</Text>
              {s.tagline ? <Text style={styles.muted}>{s.tagline}</Text> : null}
              <Text style={styles.muted}>{s.location.label}</Text>
              <Text style={styles.type}>{s.merchant_type === 'wholesale' ? t('merchant.wholesale') : t('merchant.retail')}</Text>
            </View>
          </View>
          {s.verified ? (
            <Tag label={t('merchant.verifiedBadge')} tone="trustSolid" icon="check-circle" size="md" />
          ) : (
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.pending}>{t('merchant.pendingVerification')}</Text>
              {!s.verification_requested ? (
                <Button
                  label={t('merchant.requestVisit')}
                  variant="outline"
                  loading={mutations.requestVerification.isPending}
                  onPress={() => mutations.requestVerification.mutate(undefined, { onSuccess: (r) => notify(r.message), onError: (e) => notify(t('merchant.requestVisit'), errorMessage(e)) })}
                />
              ) : null}
            </View>
          )}
          <Button label={unheard ? `${t('merchant.messages')} (${unheard})` : t('merchant.messages')} icon="mic" variant="ghost" onPress={() => router.push('/commercant/messages')} />
        </Card>

        <View style={{ flexDirection: tablet ? 'row' : 'column', gap: spacing.sm }}>
          <Button label={t('merchant.addPhoto')} icon="camera" onPress={() => router.push('/commercant/produit/nouveau')} style={{ flex: 1 }} />
          <Button label={t('merchant.addVoice')} icon="mic" variant="ghost" onPress={() => router.push({ pathname: '/commercant/produit/nouveau', params: { mode: 'voice' } })} style={{ flex: 1 }} />
        </View>

        {drafts.length ? (
          <>
            <SectionHeader title={t('merchant.drafts')} />
            <Grid columns={listColumns}>{drafts.map((p) => <ProductRow key={p.id} product={p} />)}</Grid>
          </>
        ) : null}
        <SectionHeader title={t('merchant.products')} note={String(published.length)} />
        {!published.length ? <Text style={styles.muted}>{t('merchant.noProducts')}</Text> : null}
        <Grid columns={listColumns}>{published.map((p) => <ProductRow key={p.id} product={p} />)}</Grid>
        <Button label={t('stall.allProducts')} variant="ghost" icon="eye" onPress={() => confirmAction(s.name, s.location.label, () => router.push(`/etal/${s.id}`), { confirmLabel: t('product.seeStall') })} />
      </Screen>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: fontSize.heading, fontWeight: '800', color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  type: { fontSize: fontSize.small, color: c.brandDark, fontWeight: '700' },
  pending: { fontSize: fontSize.body, color: c.brandDark, fontWeight: '600' },
}));
