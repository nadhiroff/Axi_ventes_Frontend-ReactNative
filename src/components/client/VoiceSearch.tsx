import { router } from 'expo-router';
import { Alert } from 'react-native';

import { errorMessage } from '../../api/client';
import { useVoiceSearch } from '../../hooks/api/client';
import { VoiceRecordModal } from '../ui/VoiceRecordModal';

/** Recherche vocale : on enregistre, le serveur transcrit, on ouvre les résultats. */
export function VoiceSearch({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const voiceSearch = useVoiceSearch();
  return (
    <VoiceRecordModal
      visible={visible}
      title="Dites ce que vous cherchez"
      hint="En français, en fon, en yoruba ou en anglais. Par exemple : « wax hollandais » ou « riz en gros »."
      sendLabel="Chercher"
      sending={voiceSearch.isPending}
      onClose={onClose}
      onSend={(audio) =>
        voiceSearch.mutate(audio, {
          onSuccess: (result) => {
            onClose();
            router.push({ pathname: '/recherche', params: { q: result.query } });
          },
          onError: (e) => Alert.alert('Recherche vocale', errorMessage(e)),
        })
      }
    />
  );
}
