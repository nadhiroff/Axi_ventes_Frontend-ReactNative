import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import type { LocalFile } from '../../api/client';
import { pickPhotos, takeProductPhoto } from '../../hooks/useProductPhoto';
import { useT } from '../../i18n';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { EndDatePicker } from './EndDatePicker';

/**
 * Annonce d'arrivage écrite : texte, date de fin obligatoire et photos.
 * Sans abonnement : 2 photos, 7 jours au plus, page de l'étal seulement ;
 * abonné : 5 photos, 30 jours, aussi sur l'accueil des clients et envoyée à ses clients.
 */
export function ArrivalSheet({
  visible,
  sending,
  subscribed,
  limits,
  onClose,
  onSend,
}: {
  visible: boolean;
  sending: boolean;
  subscribed: boolean;
  limits: { days: number; photos: number };
  onClose: () => void;
  onSend: (text: string, endsOn: string, photos: LocalFile[]) => void;
}) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [endsOn, setEndsOn] = useState<string | null>(null);
  const [photos, setPhotos] = useState<LocalFile[]>([]);
  const [tried, setTried] = useState(false);
  const left = limits.photos - photos.length;

  const pick = async (source: 'camera' | 'library') => {
    if (source === 'library') {
      const picked = await pickPhotos(left);
      if (picked.length) setPhotos((p) => [...p, ...picked].slice(0, limits.photos));
      return;
    }
    const p = await takeProductPhoto('camera', false);
    if (p) setPhotos((x) => [...x, p].slice(0, limits.photos));
  };

  const publish = () => {
    setTried(true);
    if (text.trim().length < 3 || !endsOn) return;
    onSend(text.trim(), endsOn, photos);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('merchant.arrivalTitle')}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Icon name="x" size={22} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: spacing.md }} keyboardShouldPersistTaps="handled">
            <Text style={styles.hint}>{subscribed ? t('merchant.arrivalHintPro') : t('merchant.arrivalHintFree')}</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('merchant.arrivalPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              style={styles.input}
              accessibilityLabel={t('merchant.arrivalTitle')}
            />
            <EndDatePicker value={endsOn} onChange={setEndsOn} maxDays={limits.days} error={tried && !endsOn ? t('merchant.endsRequired') : undefined} />

            <Text style={styles.label}>
              {t('merchant.photosMax', { n: limits.photos })}
              {photos.length ? ` · ${photos.length}/${limits.photos}` : ''}
            </Text>
            {photos.length ? (
              <View style={styles.grid}>
                {photos.map((p, i) => (
                  <View key={p.uri} style={styles.thumb}>
                    <Image source={{ uri: p.uri }} style={styles.thumbImg} contentFit="cover" />
                    <Pressable onPress={() => setPhotos((x) => x.filter((_, k) => k !== i))} style={styles.remove} accessibilityRole="button" accessibilityLabel={t('cart.remove')} hitSlop={6}>
                      <Icon name="x" size={14} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            {left > 0 ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button label={t('common.camera')} icon="camera" variant="ghost" size="sm" onPress={() => pick('camera')} style={{ flex: 1 }} />
                <Button label={t('common.gallery')} icon="image" variant="ghost" size="sm" onPress={() => pick('library')} style={{ flex: 1 }} />
              </View>
            ) : null}
            {!subscribed ? <Text style={styles.hint}>{t('merchant.photosMaxFree')}</Text> : null}
          </ScrollView>
          <Button label={t('merchant.arrivalPublish')} icon="send" size="lg" loading={sending} disabled={text.trim().length < 3} onPress={publish} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,10,9,0.5)' },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, gap: spacing.md, width: '100%', maxWidth: 640, alignSelf: 'center', maxHeight: '92%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSize.title + 1, fontWeight: '700', color: c.text },
  label: { fontSize: fontSize.small, fontWeight: '700', color: c.text },
  hint: { fontSize: fontSize.small, color: c.textMuted },
  input: { minHeight: 100, maxHeight: 180, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.body, color: c.text, backgroundColor: c.background, textAlignVertical: 'top' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: 76, height: 76, borderRadius: radius.md, overflow: 'hidden' },
  thumbImg: { width: 76, height: 76 },
  remove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
}));
