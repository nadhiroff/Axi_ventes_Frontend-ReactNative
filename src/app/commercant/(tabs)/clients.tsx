import { router, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { errorMessage } from '../../../api/client';
import { api } from '../../../api/endpoints';
import type { ClientSegment } from '../../../api/types';
import { showBroadcastResult } from '../../../components/merchant/broadcast';
import { Ticks } from '../../../components/chat/Ticks';
import { Avatar } from '../../../components/ui/Avatar';
import { Button, IconButton } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Icon } from '../../../components/ui/Icon';
import { Grid, Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { LoadingView } from '../../../components/ui/StateViews';
import { Tag } from '../../../components/ui/Tag';
import { useMerchantActions, useMerchantClients } from '../../../hooks/api/merchant';
import { useLangStore, useT } from '../../../i18n';
import { formatChatTime, formatCount } from '../../../lib/format';
import { useSettings } from '../../../hooks/api/account';
import { confirmAction, notify } from '../../../lib/confirm';
import { fontSize, makeStyles, radius, spacing, useLayout, useTheme } from '../../../theme';

const SEGMENTS: ClientSegment[] = ['all', 'followers', 'resellers', 'loyal', 'to_follow_up'];

/** « Mes clients » : fichier clients du commerçant, filtres, recherche, relances, message aux fidèles. */
export default function ClientsScreen() {
  const styles = useStyles();
  const t = useT();
  const lang = useLangStore((st) => st.lang);
  const dateFormat = useSettings().data?.date_format;
  const { colors } = useTheme();
  const { listColumns } = useLayout();
  const [segment, setSegment] = useState<ClientSegment>('all');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const clients = useMerchantClients(segment, search, useIsFocused());
  const actions = useMerchantActions();
  const data = clients.data;

  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 400);
    return () => clearTimeout(timer);
  }, [text]);

  // Discussion directe avec un client qui a un compte Axi
  const write = (clientId: string) =>
    api
      .openClientConversation(clientId)
      .then(({ conversation }) => router.push(`/messages/${conversation.id}`))
      .catch((e) => notify(t('chat.title'), errorMessage(e), 'error'));

  const broadcast = () =>
    confirmAction(t('merchant.broadcastLoyal'), t('merchant.broadcastConfirm'), () =>
      actions.broadcast.mutate({ segment: 'loyal' }, { onSuccess: (r) => showBroadcastResult(t('merchant.broadcastLoyal'), r), onError: (e) => notify(t('merchant.broadcastLoyal'), errorMessage(e), 'error') }),
    );

  return (
    <>
      <ScreenHeader title={t('nav.clients')} subtitle={data ? t('merchant.followersCount', { n: data.followers_count, count: formatCount(data.followers_count) }) : undefined} showBack={false} right={<Button label={t('common.add')} icon="user-plus" size="sm" onPress={() => router.push('/commercant/client/nouveau')} />} />
      <Screen refreshing={clients.isRefetching} onRefresh={() => clients.refetch()}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {SEGMENTS.map((s) => (
            <Chip key={s} label={t(`merchant.segments.${s}`)} selected={segment === s} onPress={() => setSegment(s)} />
          ))}
        </ScrollView>
        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.textMuted} />
          <TextInput value={text} onChangeText={setText} placeholder={t('merchant.searchClients')} placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel={t('merchant.searchClients')} />
        </View>
        {data?.arrival_prompt ? (
          <Card tone="brandOutline" style={{ gap: spacing.sm }}>
            <Text style={styles.title}>{data.arrival_prompt.title}</Text>
            <Text style={styles.muted}>{data.arrival_prompt.text}</Text>
            <Button label={data.arrival_prompt.button_label} icon="send" onPress={broadcast} loading={actions.broadcast.isPending} />
          </Card>
        ) : null}
        {clients.isPending ? (
          <LoadingView />
        ) : !data?.clients.length ? (
          <Text style={styles.muted}>{t('merchant.noClients')}</Text>
        ) : (
          <Grid columns={listColumns}>
            {data.clients.map((c) => {
              // Message non lu de ce client : ligne « allumée » (fond, gras, heure et pastille en couleur), comme WhatsApp
              const unread = c.unread_count ?? 0;
              return (
              <Pressable key={c.id} onPress={() => router.push(`/commercant/client/${c.id}`)} style={({ pressed }) => [styles.card, unread > 0 && styles.cardUnread, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityHint={unread > 0 ? t('merchant.unreadCount', { n: unread }) : undefined}>
                <Avatar name={c.display_name} image={c.avatar} size={48} variant="soft" />
                <View style={{ flex: 1, gap: 2 }}>
                  {/* Nom puis badge (Abonné, Fidèle, Nouveau…) sur la même ligne */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text style={[styles.title, unread > 0 && styles.titleUnread, { flexShrink: 1 }]} numberOfLines={1}>{c.display_name}</Text>
                    {c.unavailable ? <Tag label={t('merchant.unavailable')} tone="outline" icon="slash" /> : null}
                    {c.invite_status === 'pending' ? <Tag label={t('invites.pending')} tone="outline" icon="clock" /> : c.invite_status === 'declined' ? <Tag label={t('invites.refused')} tone="outline" /> : null}
                    {c.badge ? <Tag label={c.badge.label} tone={c.badge.kind === 'follow_up' ? 'brand' : c.badge.kind === 'loyal' || c.badge.kind === 'follower' ? 'trust' : 'neutral'} /> : null}
                  </View>
                  {/* Comme WhatsApp : le dernier message envoyé ou reçu, sinon le type de client */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {/* Mon dernier message : ✓ envoyé, ✓✓ reçu, ✓✓ bleu vu, sans ouvrir la discussion */}
                    {c.last_message?.mine && c.last_message.status ? <Ticks status={c.last_message.status} size={15} /> : null}
                    <Text style={[styles.muted, unread > 0 && styles.previewUnread, { flexShrink: 1 }]} numberOfLines={1}>
                      {c.last_message ? `${c.last_message.mine ? `${t('chat.yourself')} : ` : ''}${c.last_message.preview}` : c.description}
                    </Text>
                  </View>
                </View>
                {/* Heure du dernier message, centrée verticalement à droite */}
                {c.last_message ? (
                  <View style={styles.timeBox}>
                    <Text style={[styles.time, unread > 0 && styles.timeUnread]}>{formatChatTime(c.last_message.created_at, lang, dateFormat)}</Text>
                    {unread > 0 ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
                {c.badge?.kind === 'follow_up' ? (
                  <Button
                    label={t('merchant.followUp')}
                    size="sm"
                    onPress={() =>
                      confirmAction(t('merchant.followUpConfirm', { name: c.display_name }), '', () =>
                        actions.followUp.mutate(c.id, { onSuccess: (r) => showBroadcastResult(t('merchant.followUp'), r), onError: (e) => notify(t('merchant.followUp'), errorMessage(e), 'error') }),
                      )
                    }
                  />
                ) : c.user_id && !c.unavailable && (c.invite_status ?? 'accepted') === 'accepted' ? (
                  <IconButton icon="message-circle" label={t('chat.write')} onPress={() => write(c.id)} />
                ) : (
                  <Icon name="chevron-right" size={18} color={colors.textMuted} />
                )}
              </Pressable>
              );
            })}
          </Grid>
        )}
      </Screen>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.md },
  input: { flex: 1, minHeight: 46, fontSize: fontSize.body, color: c.text },
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md },
  title: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  time: { fontSize: fontSize.caption, color: c.textMuted },
  cardUnread: { backgroundColor: c.brandSoft, borderWidth: 1, borderColor: c.brand },
  titleUnread: { fontWeight: '800' },
  previewUnread: { color: c.text, fontWeight: '700' },
  timeBox: { alignItems: 'flex-end', gap: 6 },
  timeUnread: { color: c.brand, fontWeight: '700' },
  unreadBadge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#FFFFFF', fontSize: fontSize.caption, fontWeight: '800' },
}));
