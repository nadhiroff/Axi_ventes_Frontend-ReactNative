import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '../../api/client';
import type { Product, StallDetail } from '../../api/types';
import { ProductTile } from '../../components/client/ProductTile';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Icon, type IconName } from '../../components/ui/Icon';
import { BackButton } from '../../components/ui/ScreenHeader';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { Tag } from '../../components/ui/Tag';
import { VoiceRecordModal } from '../../components/ui/VoiceRecordModal';
import { useFollowStall, useSendVoiceMessage, useStall } from '../../hooks/api/client';
import { updatedLabel, whatsappUrl } from '../../lib/format';
import { useCartStore } from '../../store/cartStore';
import { colors, fontSize, radius, spacing } from '../../theme';

/** Page d'un étal : identité, contacts, confiance, produits du jour, ajout au panier. */
export default function StallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useStall(id);
  const insets = useSafeAreaInsets();

  if (query.isPending) return <LoadingView />;
  if (query.isError && !query.data) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.xl }]}>
        <BackButton />
        <ErrorView error={query.error} onRetry={() => query.refetch()} />
      </View>
    );
  }

  const pages = query.data!.pages;
  return (
    <StallView
      stall={pages[0].stall}
      products={pages.flatMap((p) => p.products)}
      updatedAt={pages[0].products_updated_at}
      hasMore={!!query.hasNextPage}
      loadingMore={query.isFetchingNextPage}
      onLoadMore={() => query.fetchNextPage()}
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
    />
  );
}

type ViewProps = {
  stall: StallDetail;
  products: Product[];
  updatedAt: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  refreshing: boolean;
  onRefresh: () => void;
};

function StallView({ stall, products, updatedAt, hasMore, loadingMore, onLoadMore, refreshing, onRefresh }: ViewProps) {
  const insets = useSafeAreaInsets();
  const addToCart = useCartStore((s) => s.add);
  const follow = useFollowStall(stall.id);
  const voiceMessage = useSendVoiceMessage(stall.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [voiceOpen, setVoiceOpen] = useState(false);

  const today = useMemo(() => products.filter((p) => p.is_today), [products]);
  const others = useMemo(() => products.filter((p) => !p.is_today), [products]);

  const toggle = (product: Product) => {
    if (!product.price) {
      // Prix à débattre : on garde la négociation directe avec le commerçant.
      Alert.alert(product.name, 'Le prix se discute avec le commerçant. Contactez-le pour vous mettre d’accord.', [
        { text: 'Annuler', style: 'cancel' },
        ...(stall.contacts.whatsapp
          ? [{ text: 'WhatsApp', onPress: () => openWhatsapp(stall, `Bonjour, je suis intéressé(e) par : ${product.name}. Quel est votre prix ?`) }]
          : []),
        ...(stall.contacts.phone ? [{ text: 'Appeler', onPress: () => call(stall.contacts.phone!) }] : []),
      ]);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(product.id)) next.delete(product.id);
      else next.add(product.id);
      return next;
    });
  };

  const addSelected = () => {
    const chosen = products.filter((p) => selected.has(p.id) && p.price);
    if (chosen.length === 0) {
      Alert.alert('Ajouter au panier', 'Touchez un ou plusieurs produits pour les choisir.');
      return;
    }
    for (const p of chosen) {
      addToCart({
        product_id: p.id,
        stall_id: stall.id,
        stall_name: stall.name,
        stall_site: stall.location.site,
        stall_verified: stall.verified,
        name: p.name,
        unit_price: p.price!.amount,
      });
    }
    setSelected(new Set());
    Alert.alert('Ajouté au panier', `${chosen.length} produit${chosen.length > 1 ? 's' : ''} de ${stall.name}.`, [
      { text: 'Continuer', style: 'cancel' },
      { text: 'Voir le panier', onPress: () => router.push('/panier') },
    ]);
  };

  const actions: { icon: IconName; label: string; onPress: () => void; visible: boolean }[] = [
    { icon: 'phone', label: 'Appeler', onPress: () => call(stall.contacts.phone!), visible: !!stall.contacts.phone },
    { icon: 'message-circle', label: 'WhatsApp', onPress: () => openWhatsapp(stall), visible: !!stall.contacts.whatsapp },
    { icon: 'mic', label: 'Message vocal', onPress: () => setVoiceOpen(true), visible: stall.contacts.accepts_voice_messages },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textOnDark} />}
      >
        <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.heroTop}>
            <BackButton tone="onBrand" />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: stall.is_followed }}
              onPress={() => follow.mutate(!stall.is_followed)}
              disabled={follow.isPending}
              style={[styles.follow, stall.is_followed && styles.followActive]}
            >
              {stall.is_followed ? <Icon name="check" size={16} color={colors.brand} /> : null}
              <Text style={[styles.followText, stall.is_followed && styles.followTextActive]}>
                {stall.is_followed ? 'Étal suivi' : 'Suivre l’étal'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.identity}>
            <Avatar name={stall.name} image={stall.avatar} size={84} variant="inverse" />
            <View style={styles.identityText}>
              <Text style={styles.stallName} accessibilityRole="header">
                {stall.name}
              </Text>
              <Text style={styles.stallTagline}>{stall.tagline}</Text>
            </View>
          </View>

          <View style={styles.locationBar}>
            <Icon name="map-pin" size={18} color={colors.textOnDark} />
            <Text style={styles.locationText} numberOfLines={1}>
              {stall.location.label}
            </Text>
            {stall.location.map_url ? (
              <Pressable onPress={() => Linking.openURL(stall.location.map_url!)} hitSlop={8} accessibilityRole="link">
                <Text style={styles.planLink}>Plan</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.actions}>
            {actions
              .filter((a) => a.visible)
              .map((a) => (
                <Pressable
                  key={a.label}
                  onPress={a.onPress}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}
                >
                  <Icon name={a.icon} size={22} />
                  <Text style={styles.actionLabel}>{a.label}</Text>
                </Pressable>
              ))}
          </View>

          <View style={styles.tags}>
            {stall.verification ? <Tag label="Vérifié par un agent Axi" tone="trustSolid" icon="check" size="md" /> : null}
            {stall.pay_on_delivery ? <Tag label="Payez à la réception" tone="trust" size="md" /> : null}
            {stall.delivery_note ? <Tag label={stall.delivery_note} tone="outline" size="md" style={styles.deliveryTag} /> : null}
          </View>

          <SectionHeader title="Disponible aujourd’hui" note={updatedLabel(updatedAt)} />
          {today.length === 0 ? (
            <Text style={styles.empty}>Pas encore de produits du jour. Contactez le commerçant pour connaître l’arrivage.</Text>
          ) : (
            <ProductGrid products={today} selected={selected} onToggle={toggle} />
          )}

          {others.length > 0 ? (
            <>
              <SectionHeader title="Autres produits" />
              <ProductGrid products={others} selected={selected} onToggle={toggle} />
            </>
          ) : null}

          {hasMore ? (
            <Button label="Voir plus de produits" variant="ghost" onPress={onLoadMore} loading={loadingMore} style={styles.more} />
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label={selected.size > 0 ? `Ajouter au panier (${selected.size})` : 'Ajouter au panier'}
          variant="outline"
          size="lg"
          onPress={addSelected}
          style={styles.flex}
        />
        <Button label="Voir le panier" size="lg" onPress={() => router.push('/panier')} style={styles.flex} />
      </View>

      <VoiceRecordModal
        visible={voiceOpen}
        title={`Message vocal à ${stall.owner_display_name}`}
        hint="Parlez dans votre langue. Le commerçant l’écoute et vous répond."
        sending={voiceMessage.isPending}
        onClose={() => setVoiceOpen(false)}
        onSend={(audio) =>
          voiceMessage.mutate(audio, {
            onSuccess: (r) => {
              setVoiceOpen(false);
              Alert.alert('Message envoyé', r.message);
            },
            onError: (e) => Alert.alert('Message vocal', errorMessage(e)),
          })
        }
      />
    </View>
  );
}

function ProductGrid({ products, selected, onToggle }: { products: Product[]; selected: Set<string>; onToggle: (p: Product) => void }) {
  const rows: Product[][] = [];
  for (let i = 0; i < products.length; i += 2) rows.push(products.slice(i, i + 2));
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row[0].id} style={styles.gridRow}>
          {row.map((p) => (
            <ProductTile key={p.id} product={p} selected={selected.has(p.id)} onPress={() => onToggle(p)} />
          ))}
          {row.length === 1 ? <View style={styles.flex} /> : null}
        </View>
      ))}
    </View>
  );
}

function call(phone: string) {
  Linking.openURL(`tel:${phone}`);
}

function openWhatsapp(stall: StallDetail, text?: string) {
  if (!stall.contacts.whatsapp) return;
  Linking.openURL(whatsappUrl(stall.contacts.whatsapp, text ?? `Bonjour ${stall.owner_display_name}, je vous écris depuis Axi.`));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  hero: { backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  follow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  followActive: { backgroundColor: colors.surface, borderColor: colors.surface },
  followText: { color: colors.textOnDark, fontSize: fontSize.body, fontWeight: '600' },
  followTextActive: { color: colors.brand },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityText: { flex: 1 },
  stallName: { color: colors.textOnDark, fontSize: fontSize.display, fontWeight: '700' },
  stallTagline: { color: '#FFE4D3', fontSize: fontSize.body, marginTop: 2 },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  locationText: { flex: 1, color: colors.textOnDark, fontSize: fontSize.body },
  planLink: { color: colors.textOnDark, fontSize: fontSize.body, fontWeight: '700', textDecorationLine: 'underline' },
  body: { padding: spacing.xl },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  actionLabel: { fontSize: fontSize.small, fontWeight: '600', color: colors.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  deliveryTag: { borderColor: colors.surface },
  empty: { fontSize: fontSize.body, color: colors.textMuted },
  grid: { gap: spacing.md },
  gridRow: { flexDirection: 'row', gap: spacing.md },
  more: { marginTop: spacing.lg },
  bottomBar: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
