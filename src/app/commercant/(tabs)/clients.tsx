import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '../../../api/client';
import type { ClientSegment, MerchantClient, NewClientInput } from '../../../api/types';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Chip, OptionTile } from '../../../components/ui/Chip';
import { Icon } from '../../../components/ui/Icon';
import { EmptyView, ErrorView, LoadingView } from '../../../components/ui/StateViews';
import { Tag } from '../../../components/ui/Tag';
import { useAddClient, useBroadcastToLoyal, useFollowUpClient, useMerchantClients } from '../../../hooks/api/merchant';
import { whatsappUrl } from '../../../lib/format';
import { colors, fontSize, radius, spacing } from '../../../theme';

const segments: { id: ClientSegment; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'resellers', label: 'Revendeurs' },
  { id: 'loyal', label: 'Fidèles' },
  { id: 'to_follow_up', label: 'À relancer' },
];

/** Mes clients : fichier clients filtrable, relances, annonce d'arrivage aux fidèles. */
export default function MyClientsScreen() {
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<ClientSegment>('all');
  const [adding, setAdding] = useState(false);
  const clients = useMerchantClients(segment);
  const broadcast = useBroadcastToLoyal();

  const sendToLoyal = () =>
    Alert.alert('Prévenir vos clients fidèles', 'Par quel moyen ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'WhatsApp',
        onPress: () =>
          broadcast.mutate('whatsapp', {
            onSuccess: () => Linking.openURL(whatsappUrl('', 'Nouvel arrivage à mon étal ! Passez commande sur Axi.')),
            onError: (e) => Alert.alert('Envoi impossible', errorMessage(e)),
          }),
      },
      {
        text: 'Par Axi',
        onPress: () =>
          broadcast.mutate('axi', {
            onSuccess: (r) => Alert.alert('Message envoyé', r.message),
            onError: (e) => Alert.alert('Envoi impossible', errorMessage(e)),
          }),
      },
    ]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title} accessibilityRole="header">
            Mes clients
          </Text>
          <Pressable onPress={() => setAdding(true)} style={styles.add} accessibilityRole="button" accessibilityLabel="Ajouter un client">
            <Icon name="plus" size={26} color={colors.textOnDark} />
          </Pressable>
        </View>
        <View style={styles.chips}>
          {segments.map((s) => (
            <Chip key={s.id} label={s.label} selected={segment === s.id} onPress={() => setSegment(s.id)} />
          ))}
        </View>
      </View>

      {clients.isPending ? (
        <LoadingView />
      ) : clients.isError && !clients.data ? (
        <ErrorView error={clients.error} onRetry={() => clients.refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={clients.isRefetching} onRefresh={() => void clients.refetch()} tintColor={colors.brand} />}
        >
          {clients.data!.arrival_prompt ? (
            <Card tone="brandSoft" style={styles.prompt}>
              <Text style={styles.promptTitle}>{clients.data!.arrival_prompt.title}</Text>
              <Text style={styles.promptText}>{clients.data!.arrival_prompt.text}</Text>
              <Button label={clients.data!.arrival_prompt.button_label} onPress={sendToLoyal} loading={broadcast.isPending} />
            </Card>
          ) : null}

          {clients.data!.clients.length === 0 ? (
            <EmptyView icon="users" title="Aucun client dans ce filtre" />
          ) : (
            <View style={styles.list}>
              {clients.data!.clients.map((client, i) => (
                <ClientRow key={client.id} client={client} last={i === clients.data!.clients.length - 1} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <AddClientModal visible={adding} onClose={() => setAdding(false)} />
    </View>
  );
}

function ClientRow({ client, last }: { client: MerchantClient; last: boolean }) {
  const followUp = useFollowUpClient();

  const contact = () => {
    if (!client.phone) return;
    Alert.alert(client.display_name, undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'WhatsApp', onPress: () => Linking.openURL(whatsappUrl(client.phone!)) },
      { text: 'Appeler', onPress: () => Linking.openURL(`tel:${client.phone}`) },
    ]);
  };

  return (
    <Pressable onPress={contact} style={[styles.row, !last && styles.rowBorder]} accessibilityRole="button">
      <Avatar name={client.display_name} size={52} variant="soft" />
      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{client.display_name}</Text>
        <Text style={styles.rowText}>{client.description}</Text>
      </View>
      {client.badge?.kind === 'follow_up' ? (
        <Button
          label={followUp.isSuccess ? 'Relancé' : client.badge.label}
          onPress={() =>
            followUp.mutate(client.id, {
              onSuccess: (r) => Alert.alert('Relance', r.message),
              onError: (e) => Alert.alert('Relance impossible', errorMessage(e)),
            })
          }
          disabled={followUp.isSuccess}
          loading={followUp.isPending}
          style={styles.followUp}
        />
      ) : client.badge ? (
        <Tag label={client.badge.label} tone="neutral" size="md" />
      ) : null}
    </Pressable>
  );
}

function AddClientModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addClient = useAddClient();
  const [form, setForm] = useState<NewClientInput>({ display_name: '', phone: '', kind: 'individual' });
  const valid = form.display_name.trim().length >= 2 && form.phone.replace(/\D/g, '').length >= 8;

  const save = () =>
    addClient.mutate(
      { ...form, display_name: form.display_name.trim() },
      {
        onSuccess: () => {
          setForm({ display_name: '', phone: '', kind: 'individual' });
          onClose();
        },
        onError: (e) => Alert.alert('Ajout impossible', errorMessage(e)),
      },
    );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Nouveau client</Text>
          <TextInput
            value={form.display_name}
            onChangeText={(display_name) => setForm((f) => ({ ...f, display_name }))}
            placeholder="Nom (ex. Boutique Sena, Lomé)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <TextInput
            value={form.phone}
            onChangeText={(phone) => setForm((f) => ({ ...f, phone }))}
            placeholder="Téléphone avec indicatif (ex. +229 01 97 00 00 00)"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <View style={styles.kinds}>
            <OptionTile label="Particulier" selected={form.kind === 'individual'} onPress={() => setForm((f) => ({ ...f, kind: 'individual' }))} />
            <OptionTile label="Revendeur" selected={form.kind === 'reseller'} onPress={() => setForm((f) => ({ ...f, kind: 'reseller' }))} />
          </View>
          <Button label="Ajouter" size="lg" onPress={save} disabled={!valid} loading={addClient.isPending} />
          <Pressable onPress={onClose} style={styles.cancel} accessibilityRole="button">
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.surface, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: fontSize.display, fontWeight: '700', color: colors.text },
  add: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  prompt: { gap: spacing.md },
  promptTitle: { fontSize: fontSize.title, fontWeight: '700', color: colors.brandDark },
  promptText: { fontSize: fontSize.body, color: colors.brandDark },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowBody: { flex: 1 },
  rowName: { fontSize: fontSize.title, fontWeight: '600', color: colors.text },
  rowText: { fontSize: fontSize.small, color: colors.textMuted, marginTop: 2 },
  followUp: { minHeight: 40, paddingHorizontal: spacing.md },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  sheetTitle: { fontSize: fontSize.heading, fontWeight: '700', color: colors.text },
  input: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    color: colors.text,
  },
  kinds: { flexDirection: 'row', gap: spacing.sm },
  cancel: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { fontSize: fontSize.body, color: colors.textMuted, fontWeight: '600' },
});
