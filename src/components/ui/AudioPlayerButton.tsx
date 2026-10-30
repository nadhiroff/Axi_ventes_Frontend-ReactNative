import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { useT } from '../../i18n';
import { Button } from './Button';

/**
 * Écoute d'un message vocal (lien signé du serveur), aussi souvent qu'on veut : à la fin, un nouvel appui
 * relit depuis le début. Indicateur de chargement tant que l'enregistrement n'est pas prêt.
 */
export function AudioPlayerButton({ url, onPlayed, label }: { url: string; onPlayed?: () => void; label?: string }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const t = useT();
  const ended = status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration - 0.05);
  const seconds = Math.round(status.duration || 0);
  return (
    <Button
      label={status.playing ? t('common.pause') : `${label ?? t('common.listen')}${seconds > 0 ? ` · 0:${String(seconds).padStart(2, '0')}` : ''}`}
      icon={status.playing ? 'pause' : ended ? 'rotate-ccw' : 'play'}
      variant="ghost"
      size="sm"
      loading={status.playing && status.isBuffering}
      onPress={async () => {
        if (status.playing) {
          player.pause();
          return;
        }
        // Relire depuis le début une fois le message terminé
        if (ended) await player.seekTo(0);
        player.play();
        onPlayed?.();
      }}
    />
  );
}
