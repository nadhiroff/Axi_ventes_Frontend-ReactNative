import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { errorMessage } from '../../../api/client';
import type { ClientSegment } from '../../../api/types';
import { showBroadcastResult } from '../../../components/merchant/broadcast';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Icon } from '../../../components/ui/Icon';
import { Grid, Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { LoadingView } from '../../../components/ui/StateViews';
import { Tag } from '../../../components/ui/Tag';
import { useMerchantActions, useMerchantClients } from '../../../hooks/api/merchant';
import { useT } from '../../../i18n';
import { confirmAction, notify } from '../../../lib/confirm';
import { fontSize, makeStyles, radius, spacing, useLayout, useTheme } from '../../../theme';

const SEGMENTS: ClientSegment[] = ['all', 'resellers', 'loyal', 'to_follow_up'];

/** « Mes clients » : fichier clients du commerçant, filtres, recherche, relances, message aux fidèles. */
export default function ClientsScreen() {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const { listColumns } = useLayout();
  const [segment, setSegment] = useState<ClientSegment>('all');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const clients = useMerchantClients(segment, search);
  const actions = useMerchantActions();
  const data = clients.data;

  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 400);
    return () => clearTimeout(timer);
  }, [text]);

  const broadcast = () =>
    confirmAction(t('merchant.broadcastLoyal'), t('merchant.broadcastConfirm'), () =>
      actions.broadcast.mutate({ segment: 'loyal' }, { onSuccess: (r) => showBroadcastResult(t('merchant.broadcastLoyal'), r), onError: (e) => notify(t('merchant.broadcastLoyal'), errorMessage(e), 'error') }),
    );

  return (
    <>
      <ScreenHeader title={t('nav.clients')} showBack={false} right={<Button label={t('common.add')} icon="user-plus" size="sm" onPress={() => router.push('/commercant/client/nouveau')} />} />
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
            {data.clients.map((c) => (
              <Pressable key={c.id} onPress={() => router.push(`/commercant/client/${c.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} accessibilityRole="button">
                <Avatar name={c.display_name} size={48} variant="soft" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.title}>{c.display_name}</Text>
                  <Text style={styles.muted}>{c.description}</Text>
                  {c.badge ? <Tag label={c.badge.label} tone={c.badge.kind === 'follow_up' ? 'brand' : c.badge.kind === 'loyal' ? 'trust' : 'neutral'} /> : null}
                </View>
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
                ) : (
                  <Icon name="chevron-right" size={18} color={colors.textMuted} />
                )}
              </Pressable>
            ))}
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
}));
