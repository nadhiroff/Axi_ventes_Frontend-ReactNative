import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import type { ConversationSummary } from '../../api/types';
import { useConversations } from '../../hooks/api/chat';
import { queryKeys } from '../../hooks/api/queryKeys';
import { useLangStore, useT } from '../../i18n';
import { confirmAction, notify, toast } from '../../lib/confirm';
import { formatChatTime } from '../../lib/format';
import { useSettings } from '../../hooks/api/account';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { Avatar } from '../ui/Avatar';
import { Ticks } from './Ticks';
import { Icon } from '../ui/Icon';
import { Screen } from '../ui/Screen';
import { Tag } from '../ui/Tag';
import { SubscriberBadge } from '../ui/VerifiedIcon';
import { EmptyView, ErrorView, LoadingView } from '../ui/StateViews';

/**
 * Mes conversations de l'espace où je suis (comme client, ou avec les clients de mon commerce), la plus récente en haut.
 * Barre de recherche : filtre les discussions, et propose de nouvelles personnes à qui écrire
 * (étals pour un client, clients ayant un compte pour un commerçant). Appui long : supprimer la discussion pour moi.
 */
export function ConversationList({ role }: { role: 'client' | 'merchant' }) {
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

  if (query.isPending) return <LoadingView />;
  if (!query.data) return <ErrorView error={query.error} onRetry={() => query.refetch()} />;
  const all = query.data.conversations.filter((c) => c.my_role === role);
  const needle = search.toLowerCase();
  // Recherche par nom et prénom, parmi les personnes avec qui je discute déjà
  const list = needle ? all.filter((c) => c.other.name.toLowerCase().includes(needle)) : all;

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

  return (
    <Screen contentStyle={{ gap: 0 }}>
      <View style={styles.search}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('chat.searchByName')}
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
      ) : list.length === 0 ? (
        <Text style={styles.empty}>{t('chat.noResult')}</Text>
      ) : (
        list.map((c) => <ConversationRow key={c.id} c={c} onLongPress={() => remove(c)} />)
      )}

    </Screen>
  );
}

function ConversationRow({ c, onLongPress }: { c: ConversationSummary; onLongPress: () => void }) {
  const styles = useStyles();
  const lang = useLangStore((st) => st.lang);
  const dateFormat = useSettings().data?.date_format;
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
          {/* L'autre personne est un commerçant (je lui écris en tant que client) */}
          {c.my_role === 'client' && !c.other_unavailable ? <Tag label={t('chat.merchantBadge')} tone="brand" icon="shopping-bag" /> : null}
          {c.my_role === 'client' && c.stall.subscribed ? <SubscriberBadge size={16} /> : null}
          {c.last_message ? <Text style={styles.date}>{formatChatTime(c.last_message.created_at, lang, dateFormat)}</Text> : null}
        </View>
        <View style={styles.line}>
          {c.last_message?.mine ? <Ticks status={c.last_message.status} size={15} /> : null}
          <Text style={[styles.preview, unread && { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
            {c.last_message ? `${c.last_message.mine ? t('chat.you') : ''}${c.last_message.preview}` : ''}
          </Text>
          {unread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{c.unread_count}</Text>
            </View>
          ) : c.retention_hours <= 48 ? (
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
