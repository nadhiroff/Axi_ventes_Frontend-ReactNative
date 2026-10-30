import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import type { ConversationSummary } from '../../api/types';
import { useConversations } from '../../hooks/api/chat';
import { useSearch } from '../../hooks/api/client';
import { queryKeys } from '../../hooks/api/queryKeys';
import { useT } from '../../i18n';
import { confirmAction, notify, toast } from '../../lib/confirm';
import { formatShortDate } from '../../lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Screen } from '../ui/Screen';
import { EmptyView, ErrorView, LoadingView } from '../ui/StateViews';

/**
 * Mes conversations (comme client et, pour un commerçant, avec ses clients), la plus récente en haut.
 * Barre de recherche : filtre les discussions, et propose de nouvelles personnes à qui écrire
 * (étals pour un client, clients ayant un compte pour un commerçant). Appui long : supprimer la discussion pour moi.
 */
export function ConversationList({ role }: { role?: 'client' | 'merchant' }) {
  const t = useT();
  const styles = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const query = useConversations();
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const merchant = role === 'merchant';
  // Nouvelles personnes à qui écrire, selon le rôle
  const stalls = useSearch(merchant ? '' : search).data?.stalls ?? [];
  const clientsQuery = useQuery({ queryKey: queryKeys.merchantClients('all', search), queryFn: () => api.merchantClients('all', search), enabled: merchant && search.length >= 2 });
  const clients = (clientsQuery.data?.clients ?? []).filter((c) => c.user_id);

  if (query.isPending) return <LoadingView />;
  if (!query.data) return <ErrorView error={query.error} onRetry={() => query.refetch()} />;
  const all = query.data.conversations.filter((c) => !role || c.my_role === role);
  const needle = search.toLowerCase();
  const list = needle ? all.filter((c) => c.other.name.toLowerCase().includes(needle) || c.stall.name.toLowerCase().includes(needle)) : all;
  const openStalls = new Set(all.map((c) => c.stall.id));

  const remove = (c: ConversationSummary) =>
    confirmAction(t('chat.clearConfirm', { name: c.other.name }), t('chat.clearText'), () => {
      qc.setQueryData<{ conversations: ConversationSummary[]; ttl_hours: number }>(queryKeys.conversations, (old) => (old ? { ...old, conversations: old.conversations.filter((x) => x.id !== c.id) } : old));
      api
        .clearConversation(c.id)
        .then(() => {
          toast(t('chat.cleared'), 'info');
          qc.invalidateQueries({ queryKey: queryKeys.badges });
        })
        .catch((e) => {
          qc.invalidateQueries({ queryKey: queryKeys.conversations });
          notify(t('chat.title'), errorMessage(e), 'error');
        });
    }, { destructive: true, confirmLabel: t('common.delete') });

  const open = async (start: () => Promise<{ conversation: ConversationSummary }>) => {
    try {
      router.push(`/messages/${(await start()).conversation.id}`);
    } catch (e) {
      notify(t('chat.title'), errorMessage(e), 'error');
    }
  };

  return (
    <Screen contentStyle={{ gap: 0 }}>
      <View style={styles.search}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={merchant ? t('chat.searchMerchant') : t('chat.searchClient')}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={t('chat.search')}
        />
        {text ? (
          <Pressable onPress={() => setText('')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <Icon name="x" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {list.length === 0 && !search ? (
        <EmptyView icon="message-circle" title={t('chat.emptyTitle')} text={merchant ? t('chat.emptyMerchant') : t('chat.emptyClient', { h: query.data.ttl_hours })} />
      ) : (
        list.map((c) => <ConversationRow key={c.id} c={c} onLongPress={() => remove(c)} />)
      )}

      {search.length >= 2 ? (
        <>
          <Text style={styles.section}>{merchant ? t('chat.newWithClient') : t('chat.newWithStall')}</Text>
          {(merchant ? clients.length : stalls.filter((st) => !openStalls.has(st.id)).length) === 0 ? <Text style={styles.empty}>{t('chat.noResult')}</Text> : null}
          {merchant
            ? clients.map((cl) => (
                <Pressable key={cl.id} onPress={() => open(() => api.openClientConversation(cl.id))} style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                  <Avatar name={cl.display_name} image={cl.avatar} size={40} variant="soft" />
                  <Text style={styles.suggestionName} numberOfLines={1}>{cl.display_name}</Text>
                  <Icon name="edit-3" size={18} color={colors.brand} />
                </Pressable>
              ))
            : stalls
                .filter((st) => !openStalls.has(st.id))
                .map((st) => (
                  <Pressable key={st.id} onPress={() => open(() => api.openStallConversation(st.id))} style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                    <Avatar name={st.name} image={st.avatar} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionName} numberOfLines={1}>{st.name}</Text>
                      <Text style={styles.empty} numberOfLines={1}>{st.location.label}</Text>
                    </View>
                    <Icon name="edit-3" size={18} color={colors.brand} />
                  </Pressable>
                ))}
        </>
      ) : null}
    </Screen>
  );
}

function ConversationRow({ c, onLongPress }: { c: ConversationSummary; onLongPress: () => void }) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const unread = c.unread_count > 0;
  return (
    <Pressable
      onPress={() => router.push(`/messages/${c.id}`)}
      onLongPress={onLongPress}
      delayLongPress={350}
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
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: c.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  searchInput: { flex: 1, minHeight: 44, fontSize: fontSize.body, color: c.text },
  section: { fontSize: fontSize.small, fontWeight: '700', color: c.textMuted, marginTop: spacing.lg, marginBottom: spacing.xs, textTransform: 'uppercase' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  suggestionName: { flex: 1, fontSize: fontSize.body, fontWeight: '600', color: c.text },
  empty: { fontSize: fontSize.small, color: c.textMuted },
}));
