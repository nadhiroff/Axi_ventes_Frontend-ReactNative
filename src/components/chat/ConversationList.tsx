import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { ConversationSummary } from '../../api/types';
import { useConversations } from '../../hooks/api/chat';
import { useT } from '../../i18n';
import { formatShortDate } from '../../lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '../../theme';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Screen } from '../ui/Screen';
import { EmptyView, ErrorView, LoadingView } from '../ui/StateViews';

/** Mes conversations (comme client et, pour un commerçant, avec ses clients), la plus récente en haut. */
export function ConversationList({ role }: { role?: 'client' | 'merchant' }) {
  const t = useT();
  const query = useConversations();
  if (query.isPending) return <LoadingView />;
  if (!query.data) return <ErrorView error={query.error} onRetry={() => query.refetch()} />;
  const list = query.data.conversations.filter((c) => !role || c.my_role === role);
  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()} contentStyle={{ gap: 0 }}>
      {list.length === 0 ? (
        <EmptyView icon="message-circle" title={t('chat.emptyTitle')} text={role === 'merchant' ? t('chat.emptyMerchant') : t('chat.emptyClient', { h: query.data.ttl_hours })} />
      ) : (
        list.map((c) => <ConversationRow key={c.id} c={c} />)
      )}
    </Screen>
  );
}

function ConversationRow({ c }: { c: ConversationSummary }) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const unread = c.unread_count > 0;
  return (
    <Pressable
      onPress={() => router.push(`/messages/${c.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${c.other.name}${unread ? `, ${c.unread_count} ${t('chat.unread')}` : ''}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <Avatar name={c.other.name} image={c.other.avatar} size={52} variant={c.my_role === 'client' ? 'brand' : 'soft'} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.line}>
          <Text style={[styles.name, unread && styles.bold]} numberOfLines={1}>
            {c.other.name}
          </Text>
          {c.last_message ? <Text style={styles.date}>{formatShortDate(c.last_message.created_at)}</Text> : null}
        </View>
        <View style={styles.line}>
          <Text style={[styles.preview, unread && { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
            {c.last_message ? `${c.last_message.mine ? t('chat.you') : ''}${c.last_message.preview}` : ''}
          </Text>
          {unread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{c.unread_count}</Text>
            </View>
          ) : !c.kept ? (
            <Icon name="clock" size={14} color={colors.textMuted} />
          ) : null}
        </View>
        {c.my_role === 'merchant' ? <Text style={styles.stall}>{c.stall.name}</Text> : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: c.border },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, fontSize: fontSize.title, color: c.text, fontWeight: '500' },
  bold: { fontWeight: '700' },
  date: { fontSize: fontSize.caption, color: c.textMuted },
  preview: { flex: 1, fontSize: fontSize.small, color: c.textMuted },
  stall: { fontSize: fontSize.caption, color: c.textMuted },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: fontSize.caption, fontWeight: '700' },
}));
