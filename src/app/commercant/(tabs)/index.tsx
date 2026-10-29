import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '../../../api/client';
import type { MerchantOrder, MerchantToday } from '../../../api/types';
import { AxiLogo } from '../../../components/ui/AxiLogo';
import { Button, IconButton } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Icon } from '../../../components/ui/Icon';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { ErrorView, LoadingView } from '../../../components/ui/StateViews';
import { Tag } from '../../../components/ui/Tag';
import { VoiceRecordModal } from '../../../components/ui/VoiceRecordModal';
import { useAnnounceArrival, useBroadcastRelocation, useMarkOrderReady, useMerchantToday } from '../../../hooks/api/merchant';
import { formatDate, formatFcfa } from '../../../lib/format';
import { colors, fontSize, radius, spacing } from '../../../theme';

/** Ma journée : ventes, commandes, connexion incluse, nouvelle adresse, ajout photo ou vocal. */
export default function MyDayScreen() {
  const today = useMerchantToday();
  const insets = useSafeAreaInsets();

  if (today.isPending) return <LoadingView />;
  if (today.isError && !today.data) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <ErrorView error={today.error} onRetry={() => today.refetch()} />
      </View>
    );
  }
  return <MyDay data={today.data!} refreshing={today.isRefetching} onRefresh={() => today.refetch()} />;
}

function MyDay({ data, refreshing, onRefresh }: { data: MerchantToday; refreshing: boolean; onRefresh: () => void }) {
  const insets = useSafeAreaInsets();
  const relocation = useBroadcastRelocation();
  const announce = useAnnounceArrival();
  const [voiceOpen, setVoiceOpen] = useState(false);

  const sendAddress = () =>
    relocation.mutate(undefined, {
      onSuccess: (r) => Alert.alert('Nouvelle adresse envoyée', r.message),
      onError: (e) => Alert.alert('Envoi impossible', errorMessage(e)),
    });

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <View style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.hello}>Bonjour {data.greeting_name}</Text>
            <Text style={styles.heroTitle}>{data.stall_open ? 'Votre étal est ouvert' : 'Votre étal est fermé'}</Text>
          </View>
          <AxiLogo size={30} onDark />
        </View>
        <View style={styles.stats}>
          <Stat label="Ventes du jour" value={formatFcfa(data.sales_today)} />
          <Stat label="Commandes à préparer" value={String(data.orders_to_prepare)} />
        </View>
      </View>

      <View style={styles.body}>
        <Card tone={data.connection.active ? 'trustSoft' : 'brandSoft'} style={styles.connection}>
          <Icon name="wifi" size={24} color={data.connection.active ? colors.trust : colors.brandDark} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.connectionTitle, !data.connection.active && { color: colors.brandDark }]}>
              {data.connection.active ? 'Connexion Axi active' : 'Connexion Axi suspendue'}
            </Text>
            <Text style={[styles.connectionText, !data.connection.active && { color: colors.brandDark }]}>
              {data.connection.active && data.connection.included_until
                ? `Incluse dans votre abonnement jusqu’au ${formatDate(data.connection.included_until)}`
                : 'Renouvelez votre abonnement dans Mon argent pour retrouver la connexion incluse.'}
            </Text>
          </View>
        </Card>

        {data.relocation ? (
          <Card tone="brandOutline" style={styles.relocation}>
            <Text style={styles.relocationTitle}>{data.relocation.title}</Text>
            <Text style={styles.relocationText}>{data.relocation.text}</Text>
            {data.relocation.already_sent ? (
              <Tag label={`Adresse envoyée à vos ${data.relocation.client_count} clients`} tone="trust" icon="check" size="md" />
            ) : (
              <Button label="Envoyer ma nouvelle adresse" variant="dark" onPress={sendAddress} loading={relocation.isPending} />
            )}
          </Card>
        ) : null}

        <View style={styles.quick}>
          <Pressable
            onPress={() => router.push('/commercant/nouveau-produit')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.quickTile, styles.quickPrimary, pressed && { opacity: 0.85 }]}
          >
            <Icon name="camera" size={24} color={colors.textOnDark} />
            <Text style={[styles.quickLabel, { color: colors.textOnDark }]}>Ajouter un produit en photo</Text>
          </Pressable>
          <Pressable
            onPress={() => setVoiceOpen(true)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.quickTile, pressed && { opacity: 0.85 }]}
          >
            <Icon name="mic" size={24} />
            <Text style={styles.quickLabel}>Annoncer un arrivage en vocal</Text>
          </Pressable>
        </View>

        <SectionHeader title="Commandes du jour" />
        {data.orders.length === 0 ? (
          <Text style={styles.empty}>Pas encore de commande aujourd’hui.</Text>
        ) : (
          <View style={styles.orders}>
            {data.orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </View>
        )}
      </View>

      <VoiceRecordModal
        visible={voiceOpen}
        title="Annoncer un arrivage"
        hint="Dites ce qui vient d’arriver et le prix. Vos clients fidèles reçoivent votre message vocal."
        sending={announce.isPending}
        onClose={() => setVoiceOpen(false)}
        onSend={(audio) =>
          announce.mutate(audio, {
            onSuccess: (r) => {
              setVoiceOpen(false);
              Alert.alert('Arrivage annoncé', r.message);
            },
            onError: (e) => Alert.alert('Envoi impossible', errorMessage(e)),
          })
        }
      />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function OrderCard({ order }: { order: MerchantOrder }) {
  const markReady = useMarkOrderReady();
  const toPrepare = order.status === 'to_prepare';
  return (
    <Card style={styles.order}>
      <View style={styles.orderTop}>
        <Text style={styles.orderName}>{order.customer_name}</Text>
        <Tag label={order.status_label} tone={toPrepare ? 'brand' : 'trust'} size="md" />
      </View>
      <Text style={styles.orderSummary}>{order.summary}</Text>
      <View style={styles.orderActions}>
        <Button
          label={toPrepare ? 'Prêt pour le coursier' : 'Coursier prévenu'}
          variant="dark"
          disabled={!toPrepare}
          loading={markReady.isPending}
          onPress={() =>
            markReady.mutate(order.id, { onError: (e) => Alert.alert('Commande', errorMessage(e)) })
          }
          style={{ flex: 1 }}
        />
        {order.customer_phone ? (
          <IconButton icon="phone" label={`Appeler ${order.customer_name}`} onPress={() => Linking.openURL(`tel:${order.customer_phone}`)} />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: { backgroundColor: colors.ink, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hello: { color: colors.textOnDarkMuted, fontSize: fontSize.body },
  heroTitle: { color: colors.textOnDark, fontSize: fontSize.heading, fontWeight: '700', marginTop: 2 },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, backgroundColor: colors.inkSoft, borderRadius: radius.md, padding: spacing.lg, gap: spacing.xs },
  statLabel: { color: colors.textOnDarkMuted, fontSize: fontSize.small },
  statValue: { color: colors.textOnDark, fontSize: fontSize.heading, fontWeight: '700' },
  body: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  connection: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  connectionTitle: { fontSize: fontSize.title, fontWeight: '600', color: colors.trust },
  connectionText: { fontSize: fontSize.small, color: colors.trust, marginTop: 2 },
  relocation: { gap: spacing.md },
  relocationTitle: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  relocationText: { fontSize: fontSize.body, color: colors.textMuted },
  quick: { flexDirection: 'row', gap: spacing.md },
  quickTile: {
    flex: 1,
    minHeight: 112,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  quickPrimary: { backgroundColor: colors.brand },
  quickLabel: { fontSize: fontSize.title, fontWeight: '600', color: colors.text },
  empty: { fontSize: fontSize.body, color: colors.textMuted },
  orders: { gap: spacing.md },
  order: { gap: spacing.sm },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  orderName: { fontSize: fontSize.title, fontWeight: '600', color: colors.text, flex: 1 },
  orderSummary: { fontSize: fontSize.body, color: colors.textMuted },
  orderActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});
