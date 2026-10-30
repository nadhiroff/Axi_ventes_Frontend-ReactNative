import { router, useLocalSearchParams } from 'expo-router';
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
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../../components/ui/StateViews';
import { useSettings } from '../../../hooks/api/account';
import { useMerchantActions, useMerchantClient } from '../../../hooks/api/merchant';
import { useT } from '../../../i18n';
import { confirmAction, notify } from '../../../lib/confirm';
import { formatFcfa, formatShortDate } from '../../../lib/format';
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

  if (client.isPending) return <LoadingView />;
  if (!c) return <ErrorView error={client.error} onRetry={() => client.refetch()} />;

  return (
    <>
      <ScreenHeader title={c.display_name} subtitle={c.description} />
      <Screen refreshing={client.isRefetching} onRefresh={() => client.refetch()}>
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar name={c.display_name} image={c.avatar} size={56} variant="soft" />
            <View style={{ flex: 1 }}>
              <Text style={styles.muted}>{t('merchant.clientSince', { n: c.orders_count, amount: formatFcfa(c.total_spent) })}</Text>
              <Text style={styles.muted}>{c.has_axi_account ? t('merchant.hasAccount') : t('merchant.noAccount')}</Text>
              {c.phone ? <Text style={styles.text}>{c.phone}</Text> : null}
              {c.email ? <Text style={styles.text}>{c.email}</Text> : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {c.user_id ? (
              <Button label={t('profile.title')} icon="user" size="sm" variant="ghost" onPress={() => router.push({ pathname: '/profil/[id]', params: { id: c.user_id!, cli: c.id } })} />
            ) : null}
            {c.has_axi_account ? (
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
          <NoteEditor key={c.id} initial={c.note ?? ''} onSave={(note) => actions.updateClient.mutate({ id: c.id, input: { note } }, { onSuccess: () => notify(t('common.saved')) })} />
        </Card>

        <Text style={styles.section}>{t('merchant.clientOrders')}</Text>
        {!c.orders.length ? <Text style={styles.muted}>{t('orders.empty')}</Text> : null}
        {c.orders.map((o) => (
          <Card key={o.id} style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.text}>{o.summary}</Text>
              <Text style={styles.muted}>{`${formatShortDate(o.date, dateFormat)} · ${o.id}`}</Text>
            </View>
            <Text style={styles.amount}>{formatFcfa(o.amount)}</Text>
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

/** Note libre sur le client (initialisée depuis la fiche) */
function NoteEditor({ initial, onSave }: { initial: string; onSave: (note: string) => void }) {
  const t = useT();
  const [note, setNote] = useState(initial);
  return (
    <>
      <Field label={t('merchant.note')} value={note} onChangeText={setNote} multiline />
      <Button label={t('common.update')} variant="ghost" onPress={() => onSave(note)} />
    </>
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontSize: fontSize.heading - 2, fontWeight: '700', color: c.text, marginTop: spacing.md },
  text: { fontSize: fontSize.body, color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  amount: { fontSize: fontSize.body, fontWeight: '800', color: c.text },
}));
