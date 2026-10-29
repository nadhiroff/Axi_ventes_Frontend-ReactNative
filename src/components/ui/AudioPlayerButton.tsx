import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { useT } from '../../i18n';
import { Button } from './Button';

/** Écoute d'un message vocal (lien signé du serveur) */
export function AudioPlayerButton({ url, onPlayed, label }: { url: string; onPlayed?: () => void; label?: string }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const t = useT();
  return (
    <Button
      label={status.playing ? t('common.pause') : (label ?? t('common.listen'))}
      icon={status.playing ? 'pause' : 'play'}
      variant="ghost"
      size="sm"
      onPress={() => {
        if (status.playing) player.pause();
        else {
          if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) player.seekTo(0);
          player.play();
          onPlayed?.();
        }
      }}
    />
  );
}
