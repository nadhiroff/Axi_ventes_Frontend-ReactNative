import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { api } from '../api/endpoints';
import { useBadges } from '../hooks/api/chat';
import { t } from '../i18n';
import { useAuthStore } from '../store/authStore';

// Alerte affichée en bannière même quand l'application est ouverte (comme une messagerie)
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Jeton du téléphone pour les alertes envoyées par le serveur (null : impossible ici, voir plus bas) */
async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  // Expo Go sur Android ne reçoit plus les alertes du serveur (development build nécessaire)
  if (Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

async function askPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  // Android 13+ : le canal doit exister avant la demande d'autorisation (alertes du serveur et locales)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Axi', importance: AndroidImportance.MAX });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Alertes du système (bannière, son, centre de notifications), comme une messagerie :
 * - envoyées par le serveur au téléphone, même application fermée (development build ou application publiée) ;
 * - sinon (Expo Go), alerte locale quand un nouveau message ou une nouvelle notification arrive, application ouverte.
 * Toucher l'alerte ouvre l'écran concerné (discussion, commande, notifications).
 */
export function PushNotifications() {
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const badges = useBadges().data;
  const remote = useRef(false);
  const last = useRef<{ messages: number; notifications: number } | null>(null);

  // Connexion : autorisation puis jeton envoyé au serveur (lié à cette session)
  useEffect(() => {
    if (!signedIn) {
      remote.current = false;
      last.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      if (!(await askPermission())) return;
      const token = await registerForPush().catch(() => null);
      if (!token || cancelled) return;
      await api.savePushToken(token, Platform.OS as 'ios' | 'android');
      remote.current = true;
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  // Sans alertes du serveur : alerte locale quand les compteurs non lus augmentent
  useEffect(() => {
    if (!badges || !signedIn) return;
    const now = { messages: badges.unread_messages, notifications: badges.unread_notifications };
    const before = last.current;
    last.current = now;
    if (!before || remote.current) return;
    if (now.messages > before.messages) {
      Notifications.scheduleNotificationAsync({ content: { title: t('push.newMessage'), body: t('push.newMessageText'), data: { url: '/messages' } }, trigger: null }).catch(() => undefined);
    } else if (now.notifications > before.notifications) {
      Notifications.scheduleNotificationAsync({ content: { title: t('push.newNotification'), body: t('push.newNotificationText'), data: { url: '/notifications' } }, trigger: null }).catch(() => undefined);
    }
  }, [badges, signedIn]);

  // Alerte touchée (application ouverte, en arrière-plan ou fermée) : écran concerné
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER || !signedIn) return;
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
    Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  }, [response, signedIn]);

  return null;
}
