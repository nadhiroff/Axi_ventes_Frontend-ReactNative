import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { AppNotification } from '../api/types';
import { ClientInvites } from '../components/ClientInvites';
import { AudioPlayerButton } from '../components/ui/AudioPlayerButton';
import { Button } from '../components/ui/Button';
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
 * Toucher une notification la fait disparaître (effacée sur le serveur) puis ouvre ce qu'elle concerne ;
 * « Tout marquer comme lu » vide la liste.
 */
export default function NotificationsScreen() {
  const t = useT();
  const { colors } = useTheme();
  const styles = useStyles();
  const qc = useQueryClient();
  const list = useNotifications();
  const dateFormat = useSettings().data?.date_format;
  const items = list.data?.notifications ?? [];

  // Retire tout de suite de l'écran, puis efface sur le serveur
  const remove = (ids: string[] | 'all') => {
    qc.setQueryData<{ unread: number; notifications: AppNotification[] }>(queryKeys.notifications, (old) => {
      if (!old) return old;
      const left = ids === 'all' ? [] : old.notifications.filter((n) => !ids.includes(n.id));
      return { unread: left.filter((n) => !n.read).length, notifications: left };
    });
    api
      .readNotifications(ids)
      .then(() => qc.invalidateQueries({ queryKey: queryKeys.badges }))
      .catch(() => qc.invalidateQueries({ queryKey: queryKeys.notifications }));
  };

  const open = (n: AppNotification) => {
    remove([n.id]);
    if (n.data.order_id) router.push(`/commande/${n.data.order_id}`);
    else if (n.data.stall_id && !n.data.audio_url) router.push(`/etal/${n.data.stall_id}`);
    else if (n.data.voice_messages) router.push('/commercant/messages');
  };

  return (
    <>
      <ScreenHeader
        title={t('notifications.title')}
        right={items.length ? <Button label={t('notifications.readAll')} size="sm" variant="ghost" onPress={() => remove('all')} /> : undefined}
      />
      {list.isPending ? (
        <LoadingView />
      ) : list.isError ? (
        <ErrorView error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <Screen>
          {/* Invitations des commerçants (accepter avant toute discussion), puis les notifications */}
          <ClientInvites />
          {!items.length ? <EmptyView icon="bell" title={t('notifications.empty')} text={t('notifications.emptyText')} /> : null}
          {items.map((n) => (
            <Pressable key={n.id} onPress={() => open(n)} style={({ pressed }) => [styles.card, !n.read && styles.unread, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityHint={t('notifications.tapHint')}>
              <Icon name={icons[n.type]} size={20} color={n.read ? colors.textMuted : colors.brand} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.body}>{n.body}</Text>
                {n.data.audio_url ? <AudioPlayerButton url={n.data.audio_url} /> : null}
                <Text style={styles.date}>{formatShortDate(n.created_at, dateFormat, true)}</Text>
              </View>
              <Pressable onPress={() => remove([n.id])} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('notifications.dismiss')}>
                <Icon name="x" size={18} color={colors.textMuted} />
              </Pressable>
            </Pressable>
          ))}
        </Screen>
      )}
    </>
  );
}

const useStyles = makeStyles((c) => ({
  card: { flexDirection: 'row', gap: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg },
  unread: { borderLeftWidth: 4, borderLeftColor: c.brand },
  title: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  body: { fontSize: fontSize.body, color: c.textMuted },
  date: { fontSize: fontSize.caption, color: c.textMuted },
}));
