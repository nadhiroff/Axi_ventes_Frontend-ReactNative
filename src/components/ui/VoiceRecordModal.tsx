import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { LocalFile } from '../../api/client';
import { MAX_VOICE_SECONDS, useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { colors, fontSize, radius, spacing } from '../../theme';
import { Button } from './Button';
import { Icon } from './Icon';

type Props = {
  visible: boolean;
  title: string;
  hint: string;
  sendLabel?: string;
  sending?: boolean;
  onSend: (audio: LocalFile) => void;
  onClose: () => void;
};

/**
 * Feuille d'enregistrement vocal partagée : recherche vocale, message à un étal,
 * annonce d'arrivage. L'enregistrement démarre dès l'ouverture.
 */
export function VoiceRecordModal({ visible, onClose, ...rest }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>{visible ? <RecorderSheet onClose={onClose} {...rest} /> : null}</View>
    </Modal>
  );
}

type Phase = 'preparing' | 'recording' | 'done' | 'denied';

/** Monté à chaque ouverture : un enregistrement neuf par ouverture. */
function RecorderSheet({ title, hint, sendLabel = 'Envoyer', sending, onSend, onClose }: Omit<Props, 'visible'>) {
  const voice = useVoiceRecorder();
  const { start } = voice;
  const [phase, setPhase] = useState<Phase>('preparing');

  useEffect(() => {
    let active = true;
    start().then((ok) => {
      if (active) setPhase(ok ? 'recording' : 'denied');
    });
    return () => {
      active = false;
    };
  }, [start]);

  const close = async () => {
    if (voice.isRecording) await voice.stop();
    onClose();
  };

  const send = async () => {
    const file = await voice.stop();
    setPhase('done');
    if (file) onSend(file);
  };

  const remaining = MAX_VOICE_SECONDS - voice.seconds;
  const status =
    phase === 'denied'
      ? 'Micro non autorisé'
      : voice.isRecording
        ? `0:${String(voice.seconds).padStart(2, '0')} · encore ${remaining} s`
        : phase === 'preparing'
          ? 'Préparation du micro…'
          : 'Enregistrement terminé';

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>

      <View style={[styles.mic, voice.isRecording && styles.micActive]}>
        <Icon name="mic" size={40} color={voice.isRecording ? colors.textOnDark : colors.brand} />
      </View>
      <Text style={styles.timer} accessibilityLiveRegion="polite">
        {status}
      </Text>

      <Button
        label={sendLabel}
        icon="send"
        size="lg"
        onPress={send}
        loading={sending}
        disabled={phase === 'preparing' || phase === 'denied'}
      />
      <Pressable onPress={close} style={styles.cancel} accessibilityRole="button">
        <Text style={styles.cancelText}>Annuler</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  title: { fontSize: fontSize.heading, fontWeight: '700', color: colors.text },
  hint: { fontSize: fontSize.body, color: colors.textMuted },
  mic: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  micActive: { backgroundColor: colors.brand },
  timer: { textAlign: 'center', fontSize: fontSize.body, color: colors.textMuted, marginBottom: spacing.sm },
  cancel: { alignItems: 'center', paddingVertical: spacing.md },
  cancelText: { fontSize: fontSize.body, color: colors.textMuted, fontWeight: '600' },
});
