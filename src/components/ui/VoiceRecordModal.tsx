import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import type { LocalFile } from '../../api/client';
import { MAX_VOICE_SECONDS, useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useT } from '../../i18n';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
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

/** Feuille d'enregistrement vocal : produit dicté, message à un étal, annonce d'arrivage. */
export function VoiceRecordModal({ visible, onClose, ...rest }: Props) {
  const styles = useStyles();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={styles.backdrop}>{visible ? <RecorderSheet onClose={onClose} {...rest} /> : null}</View>
    </Modal>
  );
}

type Phase = 'preparing' | 'recording' | 'done' | 'denied' | 'busy';

/** Monté à chaque ouverture : un enregistrement neuf par ouverture. */
function RecorderSheet({ title, hint, sendLabel, sending, onSend, onClose }: Omit<Props, 'visible'>) {
  const styles = useStyles();
  const { colors } = useTheme();
  const t = useT();
  const voice = useVoiceRecorder();
  const { start } = voice;
  const [phase, setPhase] = useState<Phase>('preparing');

  useEffect(() => {
    let active = true;
    start().then((result) => {
      if (!active) return;
      setPhase(result === 'ok' ? 'recording' : result);
    });
    return () => {
      active = false;
    };
  }, [start]);

  // Micro occupé (appel en cours) : l'alerte explique, la feuille se ferme
  useEffect(() => {
    if (phase === 'busy') onClose();
  }, [phase, onClose]);

  const close = async () => {
    if (voice.isRecording) await voice.stop();
    onClose();
  };

  const send = async () => {
    const file = await voice.stop();
    setPhase('done');
    if (file) onSend(file);
  };

  const status =
    phase === 'denied'
      ? t('voice.denied')
      : voice.isRecording
        ? t('voice.recording', { s: `0:${String(voice.seconds).padStart(2, '0')}`, left: MAX_VOICE_SECONDS - voice.seconds })
        : phase === 'preparing'
          ? t('voice.preparing')
          : t('voice.done');

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
      <View style={[styles.mic, voice.isRecording && styles.micActive]}>
        <Icon name="mic" size={40} color={voice.isRecording ? '#FFFFFF' : colors.brand} />
      </View>
      <Text style={styles.timer} accessibilityLiveRegion="polite">
        {status}
      </Text>
      <Button label={sendLabel ?? t('common.send')} icon="send" size="lg" onPress={send} loading={sending} disabled={phase === 'preparing' || phase === 'denied'} />
      <Pressable onPress={close} style={styles.cancel} accessibilityRole="button">
        <Text style={styles.cancelText}>{t('common.cancel')}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 560, backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { fontSize: fontSize.heading, fontWeight: '700', color: c.text },
  hint: { fontSize: fontSize.body, color: c.textMuted },
  mic: { alignSelf: 'center', width: 96, height: 96, borderRadius: 48, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  micActive: { backgroundColor: c.brand },
  timer: { textAlign: 'center', fontSize: fontSize.body, color: c.textMuted, marginBottom: spacing.sm },
  cancel: { alignItems: 'center', paddingVertical: spacing.md },
  cancelText: { fontSize: fontSize.body, color: c.textMuted, fontWeight: '600' },
}));
