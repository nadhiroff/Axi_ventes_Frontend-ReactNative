import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../../i18n';
import { fontSize, makeStyles, radius, spacing } from '../../theme';
import { Icon } from '../ui/Icon';

/**
 * Vidéo d'une discussion : vignette « lecture » dans la bulle ; la vidéo n'est chargée qu'au toucher
 * (pas de données mobiles consommées pour rien), puis lue en plein écran avec les commandes du téléphone.
 */
export function VideoMessage({ url, onLongPress }: { url: string; onLongPress?: () => void }) {
  const styles = useStyles();
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} onLongPress={onLongPress} delayLongPress={350} style={styles.tile} accessibilityRole="button" accessibilityLabel={t('chat.playVideo')}>
        <View style={styles.play}>
          <Icon name="play" size={26} color="#FFFFFF" />
        </View>
        <Text style={styles.label}>{t('chat.video')}</Text>
      </Pressable>
      {open ? <VideoModal url={url} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function VideoModal({ url, onClose }: { url: string; onClose: () => void }) {
  const styles = useStyles();
  const t = useT();
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(url, (p) => p.play());
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={styles.modal}>
        <VideoView player={player} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} style={{ flex: 1 }} />
        <Pressable onPress={onClose} style={[styles.close, { top: insets.top + spacing.sm }]} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Icon name="x" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(() => ({
  tile: { width: 220, height: 160, borderRadius: radius.md, backgroundColor: '#1C1917', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  play: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  label: { color: '#FFFFFF', fontSize: fontSize.small, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: '#000000' },
  close: { position: 'absolute', right: spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
}));
