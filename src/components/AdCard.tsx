import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { api } from '../api/endpoints';
import type { Ad } from '../api/types';
import { useAutoPager } from '../hooks/useSlideshow';
import { useT } from '../i18n';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../theme';
import { VideoMessage } from './chat/VideoMessage';
import { Button } from './ui/Button';
import { CachedImage } from './ui/CachedImage';
import { Icon } from './ui/Icon';
import { ImageViewer } from './ui/ImageViewer';
import { PagerDots } from './ui/PagerDots';
import { Tag } from './ui/Tag';

// Une annonce n'est comptée qu'une fois par ouverture de l'application
const viewed = new Set<string>();

/**
 * Annonce d'un annonceur (clients, commerçants ou tous). Toucher ouvre une petite fenêtre : image ou vidéo,
 * texte, lien s'il y en a un ; le lien ne s'ouvre jamais tout seul. Comptée vue seulement une fois affichée (shown).
 */
function AdCard({ ad, width, shown = true }: { ad: Ad; width?: number; shown?: boolean }) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(false);

  useEffect(() => {
    if (!shown || viewed.has(ad.id)) return;
    viewed.add(ad.id);
    api.promotionView(ad.id).catch(() => undefined);
  }, [ad.id, shown]);

  const show = () => {
    setOpen(true);
    api.promotionClick(ad.id).catch(() => undefined);
  };
  const openTarget = () => {
    if (!ad.target) return;
    setOpen(false);
    router.push(ad.target.type === 'stall' ? `/etal/${ad.target.id}` : `/allee/${ad.target.id}`);
  };

  return (
    <>
      <Pressable onPress={show} style={({ pressed }) => [styles.card, width !== undefined && { width, flex: 1 }, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={`${t('ads.label')} : ${ad.title}`}>
        {ad.image ? <CachedImage image={ad.image} variant="medium" style={styles.thumb} contentFit="cover" /> : null}
        {!ad.image && ad.video_url ? (
          <View style={[styles.thumb, styles.videoThumb]}>
            <Icon name="play" size={24} color="#FFFFFF" />
          </View>
        ) : null}
        <View style={{ flex: 1, gap: 4 }}>
          <Tag label={t('ads.label')} tone="brand" icon="volume-2" />
          <Text style={styles.title} numberOfLines={2}>{ad.title}</Text>
          {ad.text ? <Text style={styles.text} numberOfLines={2}>{ad.text}</Text> : null}
        </View>
        <Icon name="chevron-right" size={20} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Tag label={t('ads.label')} tone="brand" icon="volume-2" />
              <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
                <Icon name="x" size={22} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
              {/* Toucher la photo l'ouvre en grand */}
              {ad.image ? (
                <Pressable onPress={() => setViewing(true)} accessibilityRole="imagebutton" accessibilityLabel={t('ads.seePhoto')}>
                  <CachedImage image={ad.image} variant="medium" style={styles.media} contentFit="cover" />
                  <View style={styles.zoom}>
                    <Icon name="maximize-2" size={15} color="#FFFFFF" />
                  </View>
                </Pressable>
              ) : null}
              {ad.video_url ? <VideoMessage url={ad.video_url} /> : null}
              <Text style={styles.sheetTitle}>{ad.title}</Text>
              {ad.text ? <Text style={styles.sheetText}>{ad.text}</Text> : null}
              {ad.link_url ? <Button label={t('ads.openLink')} icon="external-link" onPress={() => Linking.openURL(ad.link_url!).catch(() => undefined)} /> : null}
              {ad.target ? <Button label={t(ad.target.type === 'stall' ? 'ads.seeStall' : 'ads.seeAisle')} variant="ghost" onPress={openTarget} /> : null}
            </ScrollView>
          </View>
        </View>
        <ImageViewer images={ad.image ? [ad.image] : []} visible={viewing} onClose={() => setViewing(false)} title={ad.title} />
      </Modal>
    </>
  );
}

/**
 * Annonces de l'accueil : une seule s'affiche simplement ; plusieurs défilent seules comme les arrivages
 * (une carte à la fois, retour au début à la fin), et se font glisser au doigt.
 */
export function AdsCarousel({ ads }: { ads: Ad[] }) {
  const list = useRef<FlatList<Ad>>(null);
  const [width, setWidth] = useState(0);
  const step = width + spacing.md;
  const { page, onDrag, setPage } = useAutoPager(list, ads.length, width > 0 ? step : 0);

  if (ads.length === 0) return null;
  if (ads.length === 1) return <AdCard ad={ads[0]} />;
  return (
    <View style={{ gap: spacing.sm }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <FlatList
          ref={list}
          horizontal
          data={ads}
          keyExtractor={(a) => a.id}
          renderItem={({ item, index }) => <AdCard ad={item} width={width} shown={index === page} />}
          ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          decelerationRate="fast"
          getItemLayout={(_, i) => ({ length: step, offset: step * i, index: i })}
          onScrollBeginDrag={onDrag}
          onMomentumScrollEnd={(e) => setPage(Math.max(0, Math.min(ads.length - 1, Math.round(e.nativeEvent.contentOffset.x / step))))}
        />
      ) : null}
      <PagerDots count={ads.length} page={page} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  videoThumb: { backgroundColor: '#1C1917', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  text: { fontSize: fontSize.small, color: c.textMuted },
  backdrop: { flex: 1, backgroundColor: 'rgba(12,10,9,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl, maxHeight: '85%', gap: spacing.md, width: '100%', maxWidth: 560, alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  media: { width: '100%', height: 190, borderRadius: radius.md },
  zoom: { position: 'absolute', right: spacing.sm, bottom: spacing.sm, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: fontSize.heading, fontWeight: '800', color: c.text },
  sheetText: { fontSize: fontSize.body, color: c.text, lineHeight: 22 },
}));
