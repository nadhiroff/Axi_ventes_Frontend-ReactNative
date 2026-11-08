import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { errorMessage } from '../../api/client';
import type { BroadcastChannel, BroadcastResult, ClientSegment } from '../../api/types';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip, OptionTile } from '../../components/ui/Chip';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { LoadingView } from '../../components/ui/StateViews';
import { Tag } from '../../components/ui/Tag';
import { useMerchantActions, useMerchantClients, useMerchantMoney } from '../../hooks/api/merchant';
import { useT } from '../../i18n';
import { confirmAction, notify } from '../../lib/confirm';
import { openLink } from '../../lib/contact';
import { formatFcfa } from '../../lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';

const SEGMENTS: ClientSegment[] = ['loyal', 'followers', 'resellers', 'to_follow_up', 'all'];
const MAX = 400;

/**
 * « Message à mes clients » : par Axi (dans la discussion de chacun, badge « Annonce ») ou par WhatsApp
 * (Axi prépare le message, le commerçant l'envoie client par client). À tout un groupe, ou aux clients cochés.
 */
export default function GroupMessageScreen() {
  const t = useT();
  const styles = useStyles();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ segment?: string }>();
  const [segment, setSegment] = useState<ClientSegment>(SEGMENTS.includes(params.segment as ClientSegment) ? (params.segment as ClientSegment) : 'loyal');
  const [channel, setChannel] = useState<BroadcastChannel>('axi');
  const [pick, setPick] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const focused = useIsFocused();
  const clients = useMerchantClients(segment, '', focused && !result);
  const subscription = useMerchantMoney().data?.subscription;
  const actions = useMerchantActions();

  const list = useMemo(() => clients.data?.clients ?? [], [clients.data]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? list.filter((c) => c.display_name.toLowerCase().includes(q) || (c.phone ?? '').includes(q)) : list;
  }, [list, search]);
  const count = pick ? selected.size : list.length;
  const allowed = subscription?.limits.broadcasts !== false;
  const canSend = allowed && count > 0 && text.trim().length >= 3;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const send = () =>
    confirmAction(t('groupMessage.confirm', { n: count }), text.trim(), () =>
      actions.groupMessage.mutate(pick ? { channel, text: text.trim(), client_ids: [...selected] } : { channel, text: text.trim(), segment }, {
        onSuccess: setResult,
        onError: (e) => notify(t('groupMessage.title'), errorMessage(e), 'error'),
      }),
    );

  const openTarget = (clientId: string, url: string) => {
    openLink(url);
    setOpened((prev) => new Set(prev).add(clientId));
  };

  // Après l'envoi : ce qui est parti, et les clients à joindre sur WhatsApp un par un
  if (result) {
    const targets = result.whatsapp_targets ?? [];
    return (
      <>
        <ScreenHeader title={t('groupMessage.title')} />
        <Screen>
          <Card tone={result.channel === 'whatsapp' ? 'surface' : 'trustSoft'} style={{ gap: spacing.sm }}>
            <View style={styles.row}>
              <Icon name={result.channel === 'whatsapp' ? 'whatsapp' : 'check-circle'} size={22} color={result.channel === 'whatsapp' ? '#25D366' : colors.trustText} />
              <Text style={[styles.title, { flex: 1 }]}>{result.channel === 'whatsapp' ? t('groupMessage.toWhatsapp') : t('groupMessage.sent')}</Text>
            </View>
            <Text style={styles.text}>{result.message}</Text>
          </Card>
          {targets.length ? (
            <Card style={{ gap: spacing.sm }}>
              {targets.map((c) => (
                <View key={c.client_id} style={styles.target}>
                  <Avatar name={c.name} size={36} variant="soft" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.strong} numberOfLines={1}>{c.name}</Text>
                    <Text style={styles.muted}>{c.phone}</Text>
                  </View>
                  {opened.has(c.client_id) ? <Tag label={t('groupMessage.opened')} tone="trust" icon="check" /> : null}
                  <Button label={t('groupMessage.open')} icon="whatsapp" size="sm" variant={opened.has(c.client_id) ? 'ghost' : 'trust'} onPress={() => openTarget(c.client_id, c.url)} />
                </View>
              ))}
            </Card>
          ) : null}
          {result.channel === 'whatsapp' && result.whatsapp_url ? <Button label={t('groupMessage.shareAll')} icon="users" variant="ghost" onPress={() => openLink(result.whatsapp_url!)} /> : null}
          <Button label={t('groupMessage.done')} variant="dark" onPress={() => router.back()} />
        </Screen>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title={t('groupMessage.title')} />
      <Screen
        footer={
          <Button
            label={channel === 'axi' ? t('groupMessage.send', { n: count }) : t('groupMessage.prepare', { n: count })}
            icon={channel === 'axi' ? 'send' : 'whatsapp'}
            size="lg"
            disabled={!canSend}
            loading={actions.groupMessage.isPending}
            onPress={send}
          />
        }
      >
        {!allowed ? (
          <Card tone="brandSoft" style={{ gap: spacing.sm }}>
            <Text style={[styles.text, { color: colors.brandDark }]}>{t('groupMessage.subscribersOnly')}</Text>
            <Button label={t('subscription.cta', { amount: formatFcfa(subscription?.prices.month ?? 0) })} icon="star" size="sm" onPress={() => router.push('/commercant/abonnement')} />
          </Card>
        ) : null}

        {/* 1. Canal */}
        <Text style={styles.section}>{t('groupMessage.channel')}</Text>
        <View style={styles.row}>
          <OptionTile label={t('groupMessage.channelAxi')} hint={t('groupMessage.channelAxiHint')} selected={channel === 'axi'} onPress={() => setChannel('axi')} />
          <OptionTile label={t('groupMessage.channelWhatsapp')} hint={t('groupMessage.channelWhatsappHint')} selected={channel === 'whatsapp'} onPress={() => setChannel('whatsapp')} />
        </View>
        <Text style={styles.muted}>{channel === 'axi' ? t('groupMessage.axiNote') : t('groupMessage.whatsappNote')}</Text>

        {/* 2. Destinataires */}
        <Text style={styles.section}>{t('groupMessage.recipients')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}>
          {SEGMENTS.map((s) => (
            <Chip key={s} label={t(`merchant.segments.${s}`)} selected={segment === s} onPress={() => { setSegment(s); setSelected(new Set()); }} />
          ))}
        </ScrollView>
        <View style={styles.row}>
          <OptionTile label={t('groupMessage.allOf', { segment: t(`merchant.segments.${segment}`) })} hint={clients.data ? `${list.length}` : '…'} selected={!pick} onPress={() => setPick(false)} />
          <OptionTile label={t('groupMessage.pick')} hint={pick ? t('groupMessage.selected', { n: selected.size }) : undefined} selected={pick} onPress={() => setPick(true)} />
        </View>

        {pick ? (
          <Card style={{ gap: spacing.sm, padding: spacing.md }}>
            <TextInput value={search} onChangeText={setSearch} placeholder={t('groupMessage.search')} placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel={t('groupMessage.search')} />
            <View style={styles.row}>
              <Text style={[styles.muted, { flex: 1 }]}>{t('groupMessage.selected', { n: selected.size })}</Text>
              <Button
                label={selected.size === list.length && list.length > 0 ? t('groupMessage.selectNone') : t('groupMessage.selectAll')}
                size="sm"
                variant="ghost"
                onPress={() => setSelected(selected.size === list.length ? new Set() : new Set(list.map((c) => c.id)))}
              />
            </View>
            {clients.isPending ? <LoadingView /> : null}
            {shown.map((c) => {
              const on = selected.has(c.id);
              const flag = channel === 'axi' ? (!c.user_id ? t('groupMessage.noAxi') : null) : !c.phone ? t('groupMessage.noPhone') : null;
              return (
                <Pressable key={c.id} onPress={() => toggle(c.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={({ pressed }) => [styles.pickRow, on && { backgroundColor: colors.brandSoft }, pressed && { opacity: 0.8 }]}>
                  <Icon name={on ? 'check-square' : 'square'} size={20} color={on ? colors.brand : colors.textMuted} />
                  <Avatar name={c.display_name} image={c.avatar} size={34} variant="soft" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.strong} numberOfLines={1}>{c.display_name}</Text>
                    <Text style={styles.muted} numberOfLines={1}>{c.description}</Text>
                  </View>
                  {flag ? <Tag label={flag} tone="outline" /> : null}
                </Pressable>
              );
            })}
          </Card>
        ) : null}

        {/* 3. Message */}
        <Text style={styles.section}>{t('groupMessage.text')}</Text>
        <TextInput
          value={text}
          onChangeText={(v) => setText(v.slice(0, MAX))}
          placeholder={t('groupMessage.textPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          style={[styles.input, styles.textarea]}
          accessibilityLabel={t('groupMessage.text')}
        />
        <Text style={[styles.muted, { textAlign: 'right' }]}>{`${text.length}/${MAX}`}</Text>
      </Screen>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontSize: fontSize.body, fontWeight: '700', color: c.text, marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  strong: { fontSize: fontSize.body, fontWeight: '600', color: c.text },
  text: { fontSize: fontSize.body, color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  input: { borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 46, color: c.text, fontSize: fontSize.body, backgroundColor: c.surface },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md },
  target: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));
