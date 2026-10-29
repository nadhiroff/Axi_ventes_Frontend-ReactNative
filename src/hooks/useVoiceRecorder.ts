import {
  AudioQuality,
  IOSOutputFormat,
  type RecordingOptions,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import type { LocalFile } from '../api/client';
import { useLangStore } from '../i18n';

// Voix seulement : AAC mono 16 kHz à 24 kbit/s, soit environ 3 Ko par seconde.
// Un message de 30 secondes pèse moins de 100 Ko.
const VOICE_OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 24000,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.LOW,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 24000 },
};

export const MAX_VOICE_SECONDS = 60;

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(VOICE_OPTIONS);
  const state = useAudioRecorderState(recorder, 250);

  const start = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      const en = useLangStore.getState().lang === 'en';
      Alert.alert(en ? 'Microphone disabled' : 'Micro désactivé', en ? 'Allow the microphone in the phone settings to record a voice message.' : 'Autorisez le micro dans les réglages du téléphone pour enregistrer un message vocal.');
      return false;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record({ forDuration: MAX_VOICE_SECONDS });
    return true;
  }, [recorder]);

  /** Arrête l'enregistrement et renvoie le fichier prêt à envoyer. */
  const stop = useCallback(async (): Promise<LocalFile | null> => {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    const uri = recorder.uri;
    return uri ? { uri, name: `vocal-${Date.now()}.m4a`, type: 'audio/mp4' } : null;
  }, [recorder]);

  return {
    start,
    stop,
    isRecording: state.isRecording,
    seconds: Math.floor((state.durationMillis ?? 0) / 1000),
  };
}
