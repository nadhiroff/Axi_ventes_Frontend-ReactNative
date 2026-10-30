import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import { useT } from '../../i18n';
import { notify } from '../../lib/confirm';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

/**
 * Écrire un email au commerçant : son adresse reste cachée ; il répond directement dans la boîte email du client.
 */
export function EmailSheet({ stallId, stallName, visible, onClose }: { stallId: string; stallName: string; visible: boolean; onClose: () => void }) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const r = await api.emailStall(stallId, subject.trim(), message.trim());
      setSubject('');
      setMessage('');
      onClose();
      notify(t('stall.emailSent'), r.message, 'success');
    } catch (e) {
      notify(t('stall.emailTitle'), errorMessage(e), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {t('stall.emailTo', { name: stallName })}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Icon name="x" size={22} color={colors.text} />
            </Pressable>
          </View>
          <Text style={styles.hint}>{t('stall.emailHint')}</Text>
          <TextInput value={subject} onChangeText={setSubject} placeholder={t('stall.emailSubject')} placeholderTextColor={colors.textMuted} maxLength={150} style={styles.subject} />
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t('stall.emailPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            style={styles.input}
          />
          <Button label={t('stall.emailSend')} icon="send" size="lg" loading={sending} disabled={message.trim().length < 5} onPress={send} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,10,9,0.5)' },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, gap: spacing.md, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { flex: 1, fontSize: fontSize.title + 1, fontWeight: '700', color: c.text },
  hint: { fontSize: fontSize.small, color: c.textMuted },
  subject: { minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: fontSize.body, color: c.text, backgroundColor: c.background },
  input: { minHeight: 120, maxHeight: 220, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.body, color: c.text, backgroundColor: c.background, textAlignVertical: 'top' },
}));
