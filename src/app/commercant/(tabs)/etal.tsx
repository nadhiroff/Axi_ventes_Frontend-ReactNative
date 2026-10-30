import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { errorMessage } from '../../../api/client';
import { AnnouncementManager } from '../../../components/merchant/AnnouncementManager';
import { ProductRow } from '../../../components/merchant/ProductRow';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ImageViewer } from '../../../components/ui/ImageViewer';
import { Grid, Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { ErrorView, LoadingView } from '../../../components/ui/StateViews';
import { Tag } from '../../../components/ui/Tag';
import { useMerchantStall, useStallMutations } from '../../../hooks/api/merchant';
import { formatCount, formatShortDate } from '../../../lib/format';
import { SubscriberTag } from '../../../components/ui/VerifiedIcon';
import { useT } from '../../../i18n';
import { notify } from '../../../lib/confirm';
import { fontSize, makeStyles, spacing, useLayout } from '../../../theme';

const PREVIEW = 6;

/** « Mon étal » : vitrine, vérification sur place, annonces d'arrivage, catalogue. */
export default function MyStallScreen() {
  const styles = useStyles();
  const t = useT();
  const { listColumns, tablet } = useLayout();
  const stall = useMerchantStall();
  const mutations = useStallMutations();
  const d = stall.data;
  const [showAll, setShowAll] = useState(false);
  // Photo de l'étal touchée : toutes les photos en grand, à faire défiler
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);

  if (stall.isPending) return <LoadingView />;
  if (!d) return <ErrorView error={stall.error} onRetry={() => stall.refetch()} />;

  const s = d.stall;
  const drafts = d.products.filter((p) => p.status === 'draft');
  const published = d.products.filter((p) => p.status !== 'draft');
  // Catalogue : les 6 premiers produits, « Voir tous les produits » déplie la liste complète ici même
  const visible = showAll ? published : published.slice(0, PREVIEW);

  return (
    <>
      <ScreenHeader title={t('nav.stall')} showBack={false} right={<Button label={t('common.edit')} icon="edit-2" size="sm" variant="ghost" onPress={() => router.push('/commercant/modifier-etal')} />} />
      <Screen refreshing={stall.isRefetching} onRefresh={() => stall.refetch()}>
        <Card style={{ gap: spacing.md }}>
          <View style={styles.identity}>
            <Pressable onPress={() => s.photos.length > 0 && setPhotoIndex(0)} disabled={!s.photos.length} accessibilityRole="imagebutton" accessibilityLabel={s.name}>
              <Avatar name={s.name} image={s.avatar} size={72} />
            </Pressable>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name}>{s.name}</Text>
              {s.tagline ? <Text style={styles.muted}>{s.tagline}</Text> : null}
              <Text style={styles.muted}>{s.location.label}</Text>
              <Text style={[styles.muted, { fontWeight: '700' }]}>{t('stall.followers', { n: s.followers_count, count: formatCount(s.followers_count) })}</Text>
              <Text style={styles.type}>{s.merchant_type === 'wholesale' ? t('merchant.wholesale') : t('merchant.retail')}</Text>
              {/* Abonnement visible d'un coup d'œil ; sans abonnement, un toucher mène à la page d'abonnement */}
              {s.subscription.status === 'active' ? (
                <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                  <SubscriberTag label={s.subscription.ends_on ? t('stall.subscribedUntil', { date: formatShortDate(s.subscription.ends_on) }) : undefined} />
                </View>
              ) : (
                <Pressable onPress={() => router.push('/commercant/abonnement')} style={{ alignSelf: 'flex-start', marginTop: 4 }} accessibilityRole="button">
                  <Tag label={`${t('stall.notSubscribed')} ›`} tone="outline" icon="star" />
                </Pressable>
              )}
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
                  onPress={() => mutations.requestVerification.mutate(undefined, { onSuccess: (r) => notify(r.message), onError: (e) => notify(t('merchant.requestVisit'), errorMessage(e), 'error') })}
                />
              ) : null}
            </View>
          )}
        </Card>

        <View style={{ flexDirection: tablet ? 'row' : 'column', gap: spacing.sm }}>
          <Button label={t('merchant.addProduct')} icon="plus" onPress={() => router.push('/commercant/produit/nouveau')} style={{ flex: 1 }} />
        </View>

        <AnnouncementManager announcements={s.announcements} stall={s} />

        {drafts.length ? (
          <>
            <SectionHeader title={t('merchant.drafts')} />
            <Grid columns={listColumns}>{drafts.map((p) => <ProductRow key={p.id} product={p} />)}</Grid>
          </>
        ) : null}
        <SectionHeader title={t('merchant.products')} note={String(published.length)} />
        {!published.length ? <Text style={styles.muted}>{t('merchant.noProducts')}</Text> : null}
        <Grid columns={listColumns}>{visible.map((p) => <ProductRow key={p.id} product={p} />)}</Grid>
        {published.length > PREVIEW ? (
          <Button
            label={showAll ? t('merchant.showLess') : t('merchant.showAllProducts', { n: published.length })}
            variant="ghost"
            icon={showAll ? 'chevron-up' : 'chevron-down'}
            onPress={() => setShowAll((v) => !v)}
          />
        ) : null}
      </Screen>
      <ImageViewer images={s.photos} initialIndex={photoIndex ?? 0} visible={photoIndex !== null} onClose={() => setPhotoIndex(null)} title={s.name} />
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
