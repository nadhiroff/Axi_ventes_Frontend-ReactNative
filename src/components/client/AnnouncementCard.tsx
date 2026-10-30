import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Announcement, HomeAnnouncement } from '../../api/types';
import { useFollow } from '../../hooks/api/client';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useT } from '../../i18n';
import { toast } from '../../lib/confirm';
import { formatShortDate } from '../../lib/format';
import { fontSize, makeStyles, radius, spacing } from '../../theme';
import { Avatar } from '../ui/Avatar';
import { ImageViewer } from '../ui/ImageViewer';
import { PhotoCarousel } from '../ui/PhotoCarousel';
import { Button } from '../ui/Button';
import { useReduceMotion, useSlideIndex } from '../../hooks/useSlideshow';
import { CachedImage } from '../ui/CachedImage';
import { Tag } from '../ui/Tag';
import { SubscriberBadge, VerifiedIcon } from '../ui/VerifiedIcon';

/** Annonce d'arrivage sur la page de l'étal : texte, photo, date */
export function AnnouncementCard({ a }: { a: Announcement }) {
  const styles = useStyles();
  const t = useT();
  // Toucher une photo : toutes les photos en plein écran, à faire défiler, en commençant par celle touchée
  const [viewer, setViewer] = useState<number | null>(null);
  return (
    <View style={styles.card}>
      <Tag label={t('stall.announcement')} tone="brand" icon="package" />
      {a.images.length > 1 ? (
        <PhotoCarousel images={a.images} height={180} onOpen={setViewer} />
      ) : a.image ? (
        <Pressable onPress={() => setViewer(0)} accessibilityRole="imagebutton">
          <CachedImage image={a.image} variant="medium" style={styles.image} contentFit="cover" />
        </Pressable>
      ) : null}
      <Text style={styles.text}>{a.text}</Text>
      <Text style={styles.date}>{t('merchant.announcementUntil', { date: formatShortDate(`${a.ends_on}T12:00:00`) })}</Text>
      <ImageViewer images={a.images} initialIndex={viewer ?? 0} visible={viewer !== null} onClose={() => setViewer(null)} />
    </View>
  );
}

/** Petite annonce sur l'accueil (commerçant abonné) : photo, étal, texte, « Suivre » en un geste */
export function HomeAnnouncementCard({ a, width, preview = false }: { a: HomeAnnouncement; width: number; preview?: boolean }) {
  const styles = useStyles();
  const t = useT();
  const follow = useFollow(a.stall.id);
  const requireAuth = useRequireAuth();
  // Arrivage à plusieurs photos : elles se succèdent en fondu sur la carte
  const photos = a.images.length ? a.images : a.image ? [a.image] : [];
  const slide = useSlideIndex(photos.length, a.id, 5);
  const reduceMotion = useReduceMotion();
  return (
    <Pressable disabled={preview} onPress={() => router.push(`/etal/${a.stall.id}`)} style={[styles.ad, { width }]} accessibilityRole="button" accessibilityLabel={`${a.stall.name} : ${a.text}`}>
      {photos.length ? <CachedImage image={photos[slide]} variant="medium" style={styles.adImage} contentFit="cover" transition={reduceMotion ? 0 : 450} /> : null}
      <View style={styles.adBody}>
        <View style={styles.adStall}>
          <Avatar name={a.stall.name} image={a.stall.avatar} size={32} />
          <Text style={styles.adName} numberOfLines={1}>{a.stall.name}</Text>
          {a.stall.verified ? <VerifiedIcon size={14} /> : null}
          {a.stall.subscribed ? <SubscriberBadge size={14} /> : null}
        </View>
        <Text style={styles.adText} numberOfLines={3}>{a.text}</Text>
        <View style={styles.adFooter}>
          <Tag label={t('home.sponsored')} tone="outline" />
          {preview ? (
            <Tag label={t('stall.follow')} tone="brand" icon="plus" />
          ) : !a.is_followed ? (
            <Button
              label={t('stall.follow')}
              icon="plus"
              size="sm"
              loading={follow.isPending}
              onPress={() => requireAuth(() => follow.mutate(true, { onSuccess: () => toast(t('stall.followed')) }), t('auth.reasonFollow'))}
            />
          ) : (
            <Tag label={t('stall.following')} tone="trust" icon="check" />
          )}
        </View>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.brandSoft, padding: spacing.md, gap: spacing.sm },
  image: { width: '100%', height: 180, borderRadius: radius.md },
  text: { fontSize: fontSize.body, color: c.text, lineHeight: 21 },
  date: { fontSize: fontSize.caption, color: c.textMuted },
  ad: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  adImage: { width: '100%', height: 130 },
  adBody: { padding: spacing.md, gap: spacing.sm },
  adStall: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adName: { flexShrink: 1, fontSize: fontSize.body, fontWeight: '700', color: c.text },
  adText: { fontSize: fontSize.small, color: c.text, lineHeight: 19 },
  adFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
}));
