import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import type { ReportReason } from '../../api/types';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { ImageViewer } from '../../components/ui/ImageViewer';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { SubscriberBadge, SubscriberTag, VerifiedIcon } from '../../components/ui/VerifiedIcon';
import { useT } from '../../i18n';
import { confirmAction, notify } from '../../lib/confirm';
import { formatFcfa } from '../../lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';

const REASONS: ReportReason[] = ['spam', 'fraud', 'insult', 'fake', 'other'];

/**
 * Présentation publique d'une personne (prénom et initiale, photo selon son choix, « À propos », membre depuis).
 * Jamais d'email ni de téléphone : le reste reste privé. Bouton pour écrire et pour signaler le profil.
 */
export default function PublicProfileScreen() {
  // contact : email ou téléphone exact avec lequel le commerçant vient de trouver la personne (« Ajouter un client »)
  const { id, conv, cli, contact } = useLocalSearchParams<{ id: string; conv?: string; cli?: string; contact?: string }>();
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const profile = useQuery({ queryKey: ['profile', id, contact ?? ''], queryFn: () => api.profile(id, contact) });
  const [reporting, setReporting] = useState(false);
  // Photo de profil touchée : en grand
  const [viewing, setViewing] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const p = profile.data;

  if (profile.isPending) return <LoadingView />;
  if (!p) return <ErrorView error={profile.error} onRetry={() => profile.refetch()} />;

  const since = new Date(p.member_since).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const write = async () => {
    try {
      if (conv) router.back();
      else if (cli) router.push(`/messages/${(await api.openClientConversation(cli)).conversation.id}`);
      else if (p.stall) router.push(`/messages/${(await api.openStallConversation(p.stall.id)).conversation.id}`);
    } catch (e) {
      notify(t('chat.title'), errorMessage(e), 'error');
    }
  };

  const sendReport = () => {
    if (!reason) return;
    confirmAction(t('profile.reportConfirm'), t('profile.reportText'), async () => {
      setSending(true);
      try {
        const r = await api.report(p.id, reason, details.trim(), conv);
        setReporting(false);
        profile.refetch();
        notify(t('profile.reported'), r.message, 'success');
      } catch (e) {
        notify(t('profile.report'), errorMessage(e), 'error');
      } finally {
        setSending(false);
      }
    }, { destructive: true, confirmLabel: t('profile.reportSend') });
  };

  return (
    <>
      <ScreenHeader title={t('profile.title')} />
      <Screen>
        <View style={styles.column}>
          <Card style={{ alignItems: 'center', gap: spacing.sm }}>
            <Pressable onPress={() => p.avatar && setViewing(true)} disabled={!p.avatar} accessibilityRole="imagebutton" accessibilityLabel={p.display_name}>
              <Avatar name={p.display_name} image={p.avatar} size={96} variant="soft" />
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.name}>{p.display_name}</Text>
              {p.stall?.verified ? <VerifiedIcon size={18} /> : null}
              {p.stall?.subscribed ? <SubscriberBadge size={18} /> : null}
            </View>
            <Text style={styles.muted}>{p.role === 'merchant' ? t('profile.merchant') : t('profile.client')} · {t('profile.since', { date: since })}</Text>
            {p.stall?.subscribed ? <SubscriberTag /> : null}
            {p.bio ? <Text style={styles.bio}>{p.bio}</Text> : <Text style={styles.muted}>{t('profile.noBio')}</Text>}
            {p.with_me ? (
              <Text style={styles.stat}>{t('profile.withMe', { n: p.with_me.orders_count, amount: formatFcfa(p.with_me.total_spent) })}</Text>
            ) : null}
            <Text style={styles.private}>{t('profile.privateNote')}</Text>
          </Card>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {conv || cli || p.stall ? <Button label={t('chat.write')} icon="message-circle" onPress={write} style={{ flex: 1 }} /> : null}
            {p.stall ? <Button label={t('profile.seeStall')} icon="shopping-bag" variant="ghost" onPress={() => router.push(`/etal/${p.stall!.id}`)} style={{ flex: 1 }} /> : null}
          </View>

          {contact && !conv && !cli ? null : p.reported ? (
            <Text style={[styles.muted, { textAlign: 'center' }]}>{t('profile.alreadyReported')}</Text>
          ) : !reporting ? (
            <Button label={t('profile.report')} icon="flag" variant="danger" onPress={() => setReporting(true)} />
          ) : (
            <Card style={{ gap: spacing.md }}>
              <Text style={styles.section}>{t('profile.reportTitle')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {REASONS.map((r) => (
                  <Chip key={r} label={t(`profile.reasons.${r}`)} selected={reason === r} onPress={() => setReason(r)} />
                ))}
              </View>
              <TextInput
                value={details}
                onChangeText={setDetails}
                placeholder={t('profile.detailsPlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={1000}
                style={styles.input}
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button label={t('common.cancel')} variant="ghost" onPress={() => setReporting(false)} style={{ flex: 1 }} />
                <Button label={t('profile.reportSend')} variant="destructive" disabled={!reason} loading={sending} onPress={sendReport} style={{ flex: 1 }} />
              </View>
            </Card>
          )}
        </View>
      </Screen>
      <ImageViewer images={p.avatar ? [p.avatar] : []} visible={viewing} onClose={() => setViewing(false)} title={p.display_name} />
    </>
  );
}

const useStyles = makeStyles((c) => ({
  column: { gap: spacing.md, maxWidth: 560, width: '100%', alignSelf: 'center' },
  name: { fontSize: fontSize.heading, fontWeight: '700', color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  bio: { fontSize: fontSize.body, color: c.text, textAlign: 'center', lineHeight: 21 },
  stat: { fontSize: fontSize.small, color: c.trustText, fontWeight: '700' },
  private: { fontSize: fontSize.caption, color: c.textMuted, textAlign: 'center' },
  section: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  input: { minHeight: 90, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.body, color: c.text, backgroundColor: c.background, textAlignVertical: 'top' },
}));
