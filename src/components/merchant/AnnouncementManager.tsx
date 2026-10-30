import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { errorMessage } from '../../api/client';
import type { Announcement, ApiImage, MerchantStallDetail } from '../../api/types';
import { useMerchantActions } from '../../hooks/api/merchant';
import { pickPhotos, takeProductPhoto } from '../../hooks/useProductPhoto';
import { useT } from '../../i18n';
import { confirmAction, notify, toast } from '../../lib/confirm';
import { formatShortDate } from '../../lib/format';
import { fontSize, makeStyles, radius, spacing, useLayout, useTheme } from '../../theme';
import { AnnouncementCard, HomeAnnouncementCard } from '../client/AnnouncementCard';
import { Button } from '../ui/Button';
import { CachedImage } from '../ui/CachedImage';
import { Icon } from '../ui/Icon';
import { ImageViewer } from '../ui/ImageViewer';
import { SectionHeader } from '../ui/SectionHeader';
import { EndDatePicker } from './EndDatePicker';

/**
 * « Mes annonces d'arrivage » dans Mon étal : voir l'annonce comme les clients, l'image en grand,
 * modifier le texte et la photo, supprimer.
 */
export function AnnouncementManager({ announcements, stall }: { announcements: Announcement[]; stall: MerchantStallDetail }) {
  const styles = useStyles();
  const t = useT();
  const actions = useMerchantActions();
  const [editing, setEditing] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<Announcement | null>(null);
  const [image, setImage] = useState<ApiImage | null>(null);
  if (!announcements.length) return null;

  const remove = (a: Announcement) =>
    confirmAction(t('merchant.announcementDeleteConfirm'), t('merchant.announcementDeleteText'), () =>
      actions.deleteAnnouncement.mutate(a.id, { onSuccess: () => toast(t('merchant.announcementDeleted'), 'info'), onError: (e) => notify(t('merchant.arrivalTitle'), errorMessage(e), 'error') }),
    { destructive: true, confirmLabel: t('common.delete') });

  // Annonce en cours de modification : version à jour (photo changée, texte modifié)
  const current = announcements.find((a) => a.id === editing) ?? null;

  return (
    <>
      <SectionHeader title={t('merchant.myAnnouncements')} />
      {announcements.map((a) => (
        <View key={a.id} style={styles.card}>
          {a.image ? (
            <Pressable onPress={() => setImage(a.image)} accessibilityRole="imagebutton" accessibilityLabel={t('merchant.announcementImage')}>
              <CachedImage image={a.image} style={styles.thumb} contentFit="cover" />
            </Pressable>
          ) : null}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.text} numberOfLines={3}>{a.text}</Text>
            <Text style={styles.date}>{t('merchant.announcementUntil', { date: formatShortDate(`${a.ends_on}T12:00:00`) })}{a.images.length > 1 ? ` · ${t('product.photos', { n: a.images.length })}` : ''}</Text>
            {/* Trois petits boutons de même largeur, alignés sur une ligne */}
            <View style={styles.row}>
              <SmallAction icon="eye" label={t('merchant.announcementView')} onPress={() => setPreviewing(a)} />
              <SmallAction icon="edit-2" label={t('common.edit')} onPress={() => setEditing(a.id)} />
              <SmallAction icon="trash-2" label={t('common.delete')} onPress={() => remove(a)} danger />
            </View>
          </View>
        </View>
      ))}
      {current ? (
        <EditSheet
          key={current.id}
          announcement={current}
          limits={{ days: stall.subscription.limits.announcement_days, photos: stall.subscription.limits.announcement_photos }}
          onClose={() => setEditing(null)}
          onImage={setImage}
        />
      ) : null}
      {previewing ? <PreviewSheet announcement={previewing} stall={stall} onClose={() => setPreviewing(null)} onImage={setImage} /> : null}
      <ImageViewer images={image ? [image] : []} visible={!!image} onClose={() => setImage(null)} />
    </>
  );
}

function SmallAction({ icon, label, onPress, danger = false }: { icon: 'eye' | 'edit-2' | 'trash-2'; label: string; onPress: () => void; danger?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.small, danger && { borderColor: colors.danger }, pressed && { opacity: 0.7 }]}>
      <Icon name={icon} size={14} color={color} />
      <Text style={[styles.smallLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Aperçu : l'annonce telle que les clients la voient, sur la page de l'étal et (abonné) sur l'accueil */
function PreviewSheet({ announcement, stall, onClose, onImage }: { announcement: Announcement; stall: MerchantStallDetail; onClose: () => void; onImage: (image: ApiImage) => void }) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const { contentWidth } = useLayout();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { maxHeight: '88%' }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('merchant.announcementPreview')}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Icon name="x" size={22} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: spacing.md }}>
            <Text style={styles.label}>{t('merchant.previewOnStall')}</Text>
            <AnnouncementCard a={announcement} onImage={announcement.image ? () => onImage(announcement.image!) : undefined} />
            <Text style={styles.label}>{t('merchant.previewOnHome')}</Text>
            {stall.subscription.status === 'active' ? (
              <HomeAnnouncementCard a={{ ...announcement, stall, is_followed: false }} width={Math.min(300, contentWidth - 48)} preview />
            ) : (
              <Text style={styles.date}>{t('merchant.previewHomeLocked')}</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Modifier : texte, date de fin et photos (ajouter, retirer), dans la limite de la formule */
function EditSheet({ announcement, limits, onClose, onImage }: { announcement: Announcement; limits: { days: number; photos: number }; onClose: () => void; onImage: (image: ApiImage) => void }) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const actions = useMerchantActions();
  const [text, setText] = useState(announcement.text);
  const [endsOn, setEndsOn] = useState<string>(announcement.ends_on);
  const busy = actions.addAnnouncementPhotos.isPending || actions.removeAnnouncementPhoto.isPending;
  const left = limits.photos - announcement.images.length;
  const changed = text.trim() !== announcement.text.trim() || endsOn !== announcement.ends_on;

  // Fermer : toujours la question Non / Oui
  const close = () =>
    confirmAction(t('common.discardTitle'), changed ? t('common.discardText') : t('common.leaveText'), onClose, { destructive: changed, confirmLabel: t('common.yes'), cancelLabel: t('common.no') });

  const pick = async (source: 'camera' | 'library') => {
    const photos = source === 'library' ? await pickPhotos(left) : await takeProductPhoto('camera', false).then((p) => (p ? [p] : []));
    if (photos.length)
      actions.addAnnouncementPhotos.mutate({ id: announcement.id, photos }, { onSuccess: () => toast(t('merchant.photoAdded')), onError: (e) => notify(t('merchant.arrivalTitle'), errorMessage(e), 'error') });
  };
  const removePhoto = (index: number) =>
    confirmAction(t('merchant.removePhoto'), '', () =>
      actions.removeAnnouncementPhoto.mutate({ id: announcement.id, index }, { onSuccess: () => toast(t('merchant.photoRemoved'), 'info'), onError: (e) => notify(t('merchant.arrivalTitle'), errorMessage(e), 'error') }),
    { destructive: true, confirmLabel: t('common.yes'), cancelLabel: t('common.no') });
  const save = () =>
    actions.updateAnnouncement.mutate({ id: announcement.id, text: text.trim(), ends_on: endsOn !== announcement.ends_on ? endsOn : undefined }, {
      onSuccess: () => {
        toast(t('merchant.announcementSaved'));
        onClose();
      },
      onError: (e) => notify(t('merchant.arrivalTitle'), errorMessage(e), 'error'),
    });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <View style={[styles.sheet, { maxHeight: '92%' }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('merchant.announcementEdit')}</Text>
            <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Icon name="x" size={22} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: spacing.md }} keyboardShouldPersistTaps="handled">
            <TextInput value={text} onChangeText={setText} multiline maxLength={500} style={styles.input} placeholderTextColor={colors.textMuted} />
            <EndDatePicker value={endsOn} onChange={setEndsOn} maxDays={limits.days} />
            <Text style={styles.label}>
              {t('merchant.photosMax', { n: limits.photos })} · {announcement.images.length}/{limits.photos}
            </Text>
            {announcement.images.length ? (
              <View style={styles.photos}>
                {announcement.images.map((img, i) => (
                  <View key={img.thumb_url + i} style={styles.editThumb}>
                    <Pressable onPress={() => onImage(img)} accessibilityRole="imagebutton">
                      <CachedImage image={img} style={styles.editImage} contentFit="cover" />
                    </Pressable>
                    <Pressable onPress={() => removePhoto(i)} style={styles.removeBadge} accessibilityRole="button" accessibilityLabel={t('cart.remove')} hitSlop={6}>
                      <Icon name="x" size={14} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            {left > 0 ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button label={t('common.camera')} icon="camera" size="sm" variant="ghost" onPress={() => pick('camera')} loading={busy} style={{ flex: 1 }} />
                <Button label={t('common.gallery')} icon="image" size="sm" variant="ghost" onPress={() => pick('library')} disabled={busy} style={{ flex: 1 }} />
              </View>
            ) : null}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label={t('common.cancel')} variant="ghost" size="lg" onPress={close} style={{ flex: 1 }} />
            <Button label={t('common.update')} icon="check" size="lg" loading={actions.updateAnnouncement.isPending} disabled={text.trim().length < 3} onPress={save} style={{ flex: 2 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  card: { flexDirection: 'row', gap: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.brandSoft, padding: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  editImage: { width: 80, height: 80, borderRadius: radius.md },
  editThumb: { width: 80, height: 80 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  removeBadge: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: fontSize.body, color: c.text },
  date: { fontSize: fontSize.caption, color: c.textMuted },
  label: { fontSize: fontSize.small, fontWeight: '700', color: c.text },
  row: { flexDirection: 'row', gap: 6, marginTop: 4 },
  small: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 32, borderRadius: radius.sm, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 4 },
  smallLabel: { fontSize: fontSize.caption, fontWeight: '600' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,10,9,0.5)' },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, gap: spacing.md, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSize.title + 1, fontWeight: '700', color: c.text },
  input: { minHeight: 100, maxHeight: 200, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.body, color: c.text, backgroundColor: c.background, textAlignVertical: 'top' },
}));
