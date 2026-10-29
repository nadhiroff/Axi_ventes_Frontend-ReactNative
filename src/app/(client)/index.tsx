import { router } from 'expo-router';
import { Pressable, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../api/endpoints';
import { AisleTile } from '../../components/client/AisleTile';
import { StallCard } from '../../components/client/StallCard';
import { AxiLogo } from '../../components/ui/AxiLogo';
import { Button } from '../../components/ui/Button';
import { CachedImage } from '../../components/ui/CachedImage';
import { Icon } from '../../components/ui/Icon';
import { Grid, Screen } from '../../components/ui/Screen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { HomeAnnouncementCard } from '../../components/client/AnnouncementCard';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { Tag } from '../../components/ui/Tag';
import { API_CONFIGURED } from '../../config/env';
import { useNotifications } from '../../hooks/api/account';
import { useHome } from '../../hooks/api/client';
import { useT } from '../../i18n';
import { useAuthStore } from '../../store/authStore';
import { fontSize, makeStyles, radius, spacing, useLayout, useTheme } from '../../theme';

/** Accueil client : recherche, bannière marché, promotion, allées, étals suivis et mis en avant. */
export default function HomeScreen() {
  const styles = useStyles();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { contentWidth, gutter, aisleColumns, listColumns } = useLayout();
  const home = useHome();
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const unread = useNotifications().data?.unread ?? 0;
  const data = home.data;

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
      <View style={{ width: '100%', maxWidth: contentWidth, paddingHorizontal: gutter, gap: spacing.lg }}>
        <View style={styles.brandRow}>
          <View>
            <AxiLogo />
            <Text style={styles.tagline}>{t('home.tagline')}</Text>
          </View>
          <View style={styles.headerActions}>
            {data ? (
              <View style={styles.city}>
                <Icon name="map-pin" size={16} />
                <Text style={styles.cityText}>{data.city.name}</Text>
              </View>
            ) : null}
            {signedIn ? (
              <Pressable onPress={() => router.push('/notifications')} accessibilityRole="button" accessibilityLabel={t('notifications.title')} style={styles.bell} hitSlop={8}>
                <Icon name="bell" size={20} />
                {unread > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                  </View>
                ) : null}
              </Pressable>
            ) : null}
          </View>
        </View>
        <Pressable onPress={() => router.push('/recherche')} accessibilityRole="search" style={styles.search}>
          <Icon name="search" size={20} color={colors.textMuted} />
          <Text style={styles.searchText}>{t('search.placeholder')}</Text>
        </Pressable>
      </View>
    </View>
  );

  if (!API_CONFIGURED) {
    return (
      <View style={{ flex: 1 }}>
        {header}
        <ErrorView error={new Error(t('common.noApi'))} onRetry={() => home.refetch()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {header}
      {home.isPending ? (
        <LoadingView />
      ) : home.isError && !data ? (
        <ErrorView error={home.error} onRetry={() => home.refetch()} />
      ) : data ? (
        <Screen refreshing={home.isRefetching} onRefresh={() => home.refetch()}>
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>{t('home.bannerTitle')}</Text>
            <Text style={styles.bannerText}>{t('home.bannerText')}</Text>
            {data.market_notice ? <Text style={styles.bannerNote}>{data.market_notice.text + (data.market_notice.partner ? ` · ${data.market_notice.partner}` : '')}</Text> : null}
          </View>

          {data.sponsored ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                api.promotionClick(data.sponsored!.id).catch(() => undefined);
                router.push(data.sponsored!.target.type === 'stall' ? `/etal/${data.sponsored!.target.id}` : `/allee/${data.sponsored!.target.id}`);
              }}
              style={styles.sponsored}
            >
              {data.sponsored.image ? <CachedImage image={data.sponsored.image} variant="medium" style={styles.sponsoredImage} contentFit="cover" /> : null}
              <View style={{ flex: 1, gap: 4 }}>
                <Tag label={t('home.sponsored')} tone="outline" />
                <Text style={styles.sponsoredTitle}>{data.sponsored.title}</Text>
                {data.sponsored.text ? <Text style={styles.sponsoredText}>{data.sponsored.text}</Text> : null}
              </View>
              <Icon name="chevron-right" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}

          {/* Arrivages des commerçants abonnés : petites annonces avec photo, à faire défiler, « Suivre » en un geste */}
          {(data.announcements ?? []).length ? (
            <>
              <SectionHeader title={t('home.arrivals')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.md }}>
                {data.announcements.map((a) => (
                  <HomeAnnouncementCard key={a.id} a={a} width={Math.min(280, contentWidth * 0.78)} />
                ))}
              </ScrollView>
            </>
          ) : null}

          <SectionHeader title={t('home.aisles')} actionLabel={data.aisles.length > aisleColumns * 2 ? t('common.seeAll') : undefined} onAction={() => router.push('/allees')} />
          <Grid columns={aisleColumns}>{data.aisles.slice(0, aisleColumns * 2).map((aisle, i) => <AisleTile key={aisle.id} aisle={aisle} index={i} />)}</Grid>

          {data.featured_stalls.length ? (
            <>
              <SectionHeader title={t('home.featured')} />
              <Grid columns={listColumns}>{data.featured_stalls.map((stall) => <StallCard key={stall.id} stall={stall} />)}</Grid>
            </>
          ) : null}

          <SectionHeader title={t('home.followed')} />
          {data.followed_stalls.length ? (
            <Grid columns={listColumns}>{data.followed_stalls.map((stall) => <StallCard key={stall.id} stall={stall} />)}</Grid>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{signedIn ? t('home.followedEmpty') : t('home.signInBanner')}</Text>
              {!signedIn ? <Button label={t('auth.createAccount')} onPress={() => router.push('/auth/inscription')} /> : null}
            </View>
          )}
        </Screen>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  header: { backgroundColor: c.surface, paddingBottom: spacing.lg, alignItems: 'center' },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tagline: { fontSize: fontSize.body, color: c.textMuted, marginTop: -4 },
  city: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.border, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 8 },
  cityText: { fontSize: fontSize.body, fontWeight: '600', color: c.text },
  bell: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: c.surfaceAlt, borderRadius: radius.lg, paddingHorizontal: spacing.lg, minHeight: 54 },
  searchText: { fontSize: fontSize.title, color: c.textMuted },
  banner: { backgroundColor: '#1C1917', borderRadius: radius.lg, padding: spacing.xl, gap: spacing.xs },
  bannerTitle: { fontSize: fontSize.heading, fontWeight: '800', color: '#FFFFFF' },
  bannerText: { fontSize: fontSize.body, color: '#D6D3D1' },
  bannerNote: { fontSize: fontSize.small, color: '#FB923C', fontWeight: '600', marginTop: spacing.sm },
  sponsored: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.brandMuted, borderRadius: radius.lg, padding: spacing.lg },
  sponsoredImage: { width: 72, height: 72, borderRadius: radius.md },
  sponsoredTitle: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  sponsoredText: { fontSize: fontSize.small, color: c.textMuted },
  emptyCard: { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  emptyText: { fontSize: fontSize.body, color: c.textMuted },
}));
