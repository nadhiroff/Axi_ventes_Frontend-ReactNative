import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { errorMessage } from '../../../api/client';
import { api } from '../../../api/endpoints';
import { showBroadcastResult } from '../../../components/merchant/broadcast';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Field } from '../../../components/ui/Field';
import { Screen } from '../../../components/ui/Screen';
import { Tag } from '../../../components/ui/Tag';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../../components/ui/StateViews';
import { useSettings } from '../../../hooks/api/account';
import { useMerchantActions, useMerchantClient } from '../../../hooks/api/merchant';
import { useT } from '../../../i18n';
import { confirmAction, notify, toast } from '../../../lib/confirm';
import { formatFcfa, formatShortDate, orderNumber } from '../../../lib/format';
import { fontSize, makeStyles, spacing } from '../../../theme';
import { callPhone, openWhatsapp } from '../../../lib/contact';

/** Fiche client : contacts, note, historique des commandes, relance, suppression du fichier */
export default function ClientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const t = useT();
  const client = useMerchantClient(id);
  const actions = useMerchantActions();
  const dateFormat = useSettings().data?.date_format;
  const c = client.data;
  // Fiche gardée sur l'appareil par une ancienne version (sans l'historique) : liste vide plutôt qu'un plantage
  // Les plus récentes en haut, les anciennes en bas
  const orders = [...(c?.orders ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  if (client.isPending) return <LoadingView />;
  if (!c) return <ErrorView error={client.error} onRetry={() => client.refetch()} />;

  return (
    <>
      <ScreenHeader title={c.display_name} subtitle={c.description} />
      <Screen refreshing={client.isRefetching} onRefresh={() => client.refetch()}>
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar name={c.display_name} image={c.avatar} size={56} variant="soft" />
            {/* Le nom du compte est en titre ; l'email du client n'est jamais affiché */}
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <Tag label={c.has_axi_account ? t('merchant.onAxi') : t('merchant.offAxi')} tone={c.has_axi_account ? 'trust' : 'outline'} />
                {c.badge ? <Tag label={c.badge.label} tone="brand" /> : null}
              </View>
              <Text style={styles.muted}>{t('merchant.clientSince', { n: c.orders_count ?? 0, amount: formatFcfa(c.total_spent ?? 0) })}</Text>
              {c.phone ? <Text style={styles.text}>{c.phone}</Text> : null}
            </View>
          </View>
          {/* Ajouté à la main : pas de discussion tant qu'il n'a pas accepté l'invitation */}
          {c.invite_status === 'pending' || c.invite_status === 'declined' ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <Tag label={c.invite_status === 'pending' ? t('invites.pending') : t('invites.refused')} tone="outline" icon={c.invite_status === 'pending' ? 'clock' : 'x'} />
              <Text style={[styles.muted, { flex: 1 }]}>{t(c.invite_status === 'pending' ? 'invites.pendingText' : 'invites.refusedText', { name: c.display_name })}</Text>
            </View>
          ) : (
            <Text style={styles.muted}>{c.has_axi_account ? t('merchant.hasAccount') : c.phone ? t('merchant.noAccountPhone') : t('merchant.noAccount')}</Text>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {c.user_id ? (
              <Button label={t('profile.title')} icon="user" size="sm" variant="ghost" onPress={() => router.push({ pathname: '/profil/[id]', params: { id: c.user_id!, cli: c.id } })} />
            ) : null}
            {c.has_axi_account && (c.invite_status ?? 'accepted') === 'accepted' ? (
              <Button
                label={t('chat.write')}
                icon="message-square"
                size="sm"
                variant="ghost"
                onPress={() =>
                  api
                    .openClientConversation(c.id)
                    .then(({ conversation }) => router.push(`/messages/${conversation.id}`))
                    .catch((e) => notify(t('chat.title'), errorMessage(e), 'error'))
                }
              />
            ) : null}
            {c.phone ? <Button label={t('common.call')} icon="phone" variant="ghost" size="sm" onPress={() => callPhone(c.phone)} /> : null}
            {c.phone ? <Button label={t('common.whatsapp')} icon="whatsapp" variant="ghost" size="sm" onPress={() => openWhatsapp(c.phone!)} /> : null}
            <Button
              label={t('merchant.followUp')}
              icon="send"
              size="sm"
              onPress={() =>
                confirmAction(t('merchant.followUpConfirm', { name: c.display_name }), '', () =>
                  actions.followUp.mutate(c.id, { onSuccess: (r) => showBroadcastResult(t('merchant.followUp'), r), onError: (e) => notify(t('merchant.followUp'), errorMessage(e), 'error') }),
                )
              }
            />
          </View>
          <NoteEditor
            key={c.id}
            initial={c.note ?? ''}
            saving={actions.updateClient.isPending}
            onSave={(note) => actions.updateClient.mutate({ id: c.id, input: { note } }, { onSuccess: () => toast(t('common.saved')), onError: (e) => notify(t('merchant.note'), errorMessage(e), 'error') })}
          />
        </Card>

        <Text style={styles.section}>{t('merchant.clientOrders')}</Text>
        {!orders.length ? <Text style={styles.muted}>{t('orders.empty')}</Text> : null}
        {orders.map((o) => (
          <Card key={o.id} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.text}>{o.summary}</Text>
              <Text style={styles.muted}>{`${t('orders.order', { id: orderNumber(o.id) })} · ${formatShortDate(o.date, dateFormat)}`}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={styles.amount}>{formatFcfa(o.amount)}</Text>
              {o.status_label ? <Tag label={o.status_label} tone={o.status === 'delivered' ? 'trust' : o.status === 'cancelled' ? 'outline' : 'brand'} /> : null}
            </View>
          </Card>
        ))}

        <Button
          label={t('common.delete')}
          variant="danger"
          icon="trash-2"
          onPress={() => confirmAction(t('merchant.deleteClient'), t('merchant.deleteClientText'), () => actions.deleteClient.mutate(c.id, { onSuccess: () => router.back() }), { destructive: true })}
        />
      </Screen>
    </>
  );
}

/**
 * Note privée sur le client, visible par le commerçant seul (initialisée depuis la fiche).
 * Modifiée : « Annuler » remet le texte enregistré, et quitter l'écran sans enregistrer demande Non / Oui.
 */
function NoteEditor({ initial, saving, onSave }: { initial: string; saving: boolean; onSave: (note: string) => void }) {
  const t = useT();
  const [note, setNote] = useState(initial);
  const dirty = note.trim() !== initial.trim();

  usePreventRemove(dirty, ({ repeat }) => {
    confirmAction(t('common.discardTitle'), t('common.discardText'), repeat, {
      destructive: true,
      confirmLabel: t('common.yes'),
      cancelLabel: t('common.no'),
    });
  });

  return (
    <>
      <Field label={t('merchant.note')} value={note} onChangeText={setNote} multiline hint={t('merchant.noteHint')} placeholder={t('merchant.notePlaceholder')} />
      {dirty ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button label={t('common.cancel')} variant="ghost" onPress={() => setNote(initial)} style={{ flex: 1 }} />
          <Button label={t('common.save')} loading={saving} onPress={() => onSave(note.trim())} style={{ flex: 1 }} />
        </View>
      ) : null}
    </>
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontSize: fontSize.heading - 2, fontWeight: '700', color: c.text, marginTop: spacing.md },
  text: { fontSize: fontSize.body, color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  amount: { fontSize: fontSize.body, fontWeight: '800', color: c.text },
}));
