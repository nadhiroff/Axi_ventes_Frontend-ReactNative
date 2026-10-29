import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import type { LocalFile } from '../../api/client';
import { takeProductPhoto } from '../../hooks/useProductPhoto';
import { useT } from '../../i18n';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

/**
 * Annonce d'arrivage écrite, avec photo facultative. Sans abonnement : affichée sur la page de l'étal ;
 * abonné : aussi en petite annonce sur l'accueil des clients et envoyée à ses clients.
 */
export function ArrivalSheet({ visible, sending, subscribed, onClose, onSend }: { visible: boolean; sending: boolean; subscribed: boolean; onClose: () => void; onSend: (text: string, photo: LocalFile | null) => void }) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<LocalFile | null>(null);
  const pick = async (source: 'camera' | 'library') => {
    const p = await takeProductPhoto(source, false);
    if (p) setPhoto(p);
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
          {photo ? (
            <View>
              <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" />
              <Pressable onPress={() => setPhoto(null)} style={styles.remove} accessibilityRole="button" accessibilityLabel={t('cart.remove')}>
                <Icon name="x" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label={t('common.camera')} icon="camera" variant="ghost" size="sm" onPress={() => pick('camera')} style={{ flex: 1 }} />
              <Button label={t('common.gallery')} icon="image" variant="ghost" size="sm" onPress={() => pick('library')} style={{ flex: 1 }} />
            </View>
          )}
          <Button label={t('merchant.arrivalPublish')} icon="send" size="lg" loading={sending} disabled={text.trim().length < 3} onPress={() => onSend(text.trim(), photo)} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,10,9,0.5)' },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, gap: spacing.md, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSize.title + 1, fontWeight: '700', color: c.text },
  hint: { fontSize: fontSize.small, color: c.textMuted },
  input: { minHeight: 110, maxHeight: 200, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.body, color: c.text, backgroundColor: c.background, textAlignVertical: 'top' },
  preview: { width: '100%', height: 160, borderRadius: radius.md },
  remove: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
}));
