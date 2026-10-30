import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { errorMessage } from '../../api/client';
import type { Announcement } from '../../api/types';
import { useMerchantActions } from '../../hooks/api/merchant';
import { useT } from '../../i18n';
import { confirmAction, notify, toast } from '../../lib/confirm';
import { formatShortDate } from '../../lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { Button } from '../ui/Button';
import { CachedImage } from '../ui/CachedImage';
import { Icon } from '../ui/Icon';
import { SectionHeader } from '../ui/SectionHeader';

/** « Mes annonces d'arrivage » dans Mon étal : chacune peut être modifiée ou supprimée */
export function AnnouncementManager({ announcements }: { announcements: Announcement[] }) {
  const styles = useStyles();
  const t = useT();
  const actions = useMerchantActions();
  const [editing, setEditing] = useState<Announcement | null>(null);
  if (!announcements.length) return null;

  const remove = (a: Announcement) =>
    confirmAction(t('merchant.announcementDeleteConfirm'), t('merchant.announcementDeleteText'), () =>
      actions.deleteAnnouncement.mutate(a.id, { onSuccess: () => toast(t('merchant.announcementDeleted'), 'info'), onError: (e) => notify(t('merchant.arrivalTitle'), errorMessage(e), 'error') }),
    { destructive: true, confirmLabel: t('common.delete') });

  return (
    <>
      <SectionHeader title={t('merchant.myAnnouncements')} />
      {announcements.map((a) => (
        <View key={a.id} style={styles.card}>
          {a.image ? <CachedImage image={a.image} style={styles.thumb} contentFit="cover" /> : null}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.text} numberOfLines={3}>{a.text}</Text>
            <Text style={styles.date}>{formatShortDate(a.created_at)}</Text>
            <View style={styles.row}>
              <Button label={t('common.edit')} icon="edit-2" size="sm" variant="ghost" onPress={() => setEditing(a)} />
              <Button label={t('common.delete')} icon="trash-2" size="sm" variant="danger" onPress={() => remove(a)} />
            </View>
          </View>
        </View>
      ))}
      {editing ? <EditSheet key={editing.id} announcement={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function EditSheet({ announcement, onClose }: { announcement: Announcement; onClose: () => void }) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const actions = useMerchantActions();
  const [text, setText] = useState(announcement.text);
  const save = () =>
    actions.updateAnnouncement.mutate({ id: announcement.id, text: text.trim() }, {
      onSuccess: () => {
        toast(t('merchant.announcementSaved'));
        onClose();
      },
      onError: (e) => notify(t('merchant.arrivalTitle'), errorMessage(e), 'error'),
    });
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('merchant.announcementEdit')}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Icon name="x" size={22} color={colors.text} />
            </Pressable>
          </View>
          <TextInput value={text} onChangeText={setText} multiline maxLength={500} autoFocus style={styles.input} placeholderTextColor={colors.textMuted} />
          <Button label={t('common.save')} icon="check" size="lg" loading={actions.updateAnnouncement.isPending} disabled={text.trim().length < 3} onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  card: { flexDirection: 'row', gap: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.brandSoft, padding: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  text: { fontSize: fontSize.body, color: c.text },
  date: { fontSize: fontSize.caption, color: c.textMuted },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,10,9,0.5)' },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, gap: spacing.md, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSize.title + 1, fontWeight: '700', color: c.text },
  input: { minHeight: 110, maxHeight: 220, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.body, color: c.text, backgroundColor: c.background, textAlignVertical: 'top' },
}));
