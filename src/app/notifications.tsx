import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { AppNotification } from '../api/types';
import { AudioPlayerButton } from '../components/ui/AudioPlayerButton';
import { Icon, type IconName } from '../components/ui/Icon';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { EmptyView, ErrorView, LoadingView } from '../components/ui/StateViews';
import { useNotifications, useSettings } from '../hooks/api/account';
import { queryKeys } from '../hooks/api/queryKeys';
import { api } from '../api/endpoints';
import { useT } from '../i18n';
import { formatShortDate } from '../lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../theme';

const icons: Record<AppNotification['type'], IconName> = { order: 'package', payment: 'credit-card', reminder: 'clock', promotion: 'tag', arrival: 'volume-2', account: 'shield' };

/**
 * Notifications dans l'application (commandes, paiements, rappels, arrivages, compte).
 * Une fois l'écran ouvert, elles sont effacées sur le serveur : elles restent affichées le temps de la visite,
 * puis la liste ne garde que les nouvelles.
 */
export default function NotificationsScreen() {
  const t = useT();
  const list = useNotifications();
  return (
    <>
      <ScreenHeader title={t('notifications.title')} />
      {list.isPending ? (
        <LoadingView />
      ) : list.isError ? (
        <ErrorView error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data.notifications.length ? (
        <EmptyView icon="bell" title={t('notifications.empty')} text={t('notifications.emptyText')} />
      ) : (
        <SeenList initial={list.data.notifications} />
      )}
    </>
  );
}

function SeenList({ initial }: { initial: AppNotification[] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const dateFormat = useSettings().data?.date_format;
  // Copie affichée pendant la visite ; sur le serveur, les notifications vues sont effacées
  const [items] = useState(initial);
  useEffect(() => {
    api
      .readNotifications('all')
      .then(() => {
        qc.setQueryData(queryKeys.notifications, { unread: 0, notifications: [] });
        qc.invalidateQueries({ queryKey: queryKeys.badges });
      })
      .catch(() => undefined);
  }, [qc]);

  const open = (n: AppNotification) => {
    if (n.data.order_id) router.push(`/commande/${n.data.order_id}`);
    else if (n.data.stall_id && !n.data.audio_url) router.push(`/etal/${n.data.stall_id}`);
    else if (n.data.voice_messages) router.push('/commercant/messages');
  };

  return (
    <Screen>
      {items.map((n) => (
        <Pressable key={n.id} onPress={() => open(n)} style={({ pressed }) => [styles.card, !n.read && styles.unread, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Icon name={icons[n.type]} size={20} color={n.read ? colors.textMuted : colors.brand} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.title}>{n.title}</Text>
            <Text style={styles.body}>{n.body}</Text>
            {n.data.audio_url ? <AudioPlayerButton url={n.data.audio_url} /> : null}
            <Text style={styles.date}>{formatShortDate(n.created_at, dateFormat, true)}</Text>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  card: { flexDirection: 'row', gap: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg },
  unread: { borderLeftWidth: 4, borderLeftColor: c.brand },
  title: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  body: { fontSize: fontSize.body, color: c.textMuted },
  date: { fontSize: fontSize.caption, color: c.textMuted },
}));
