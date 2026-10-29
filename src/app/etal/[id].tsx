import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import { ProductTile } from '../../components/client/ProductTile';
import { useAddToCart } from '../../components/client/useAddToCart';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { ImageViewer } from '../../components/ui/ImageViewer';
import { PhotoCarousel } from '../../components/ui/PhotoCarousel';
import { Grid, Screen } from '../../components/ui/Screen';
import { BackButton } from '../../components/ui/ScreenHeader';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { Tag } from '../../components/ui/Tag';
import { VoiceRecordModal } from '../../components/ui/VoiceRecordModal';
import { useFollow, useStall } from '../../hooks/api/client';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useT } from '../../i18n';
import { confirmAction, notify, toast } from '../../lib/confirm';
import { useAuthStore } from '../../store/authStore';
import { formatCount, formatFcfa } from '../../lib/format';
import { cartCount, useCartStore } from '../../store/cartStore';
import { fontSize, makeStyles, radius, spacing, useLayout } from '../../theme';
import { callPhone, openWhatsapp, openLink } from '../../lib/contact';

/** Page d'un étal. Aucune publicité n'y est affichée (règle du cahier des charges). */
export default function StallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { contentWidth, gutter, productColumns } = useLayout();
  const stall = useStall(id);
  const follow = useFollow(id);
  const requireAuth = useRequireAuth();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [opening, setOpening] = useState(false);
  const ownStallId = useAuthStore((st) => st.user?.merchant?.stall_id ?? null);
  const cart = useCartStore((s) => s.items);
  const s = stall.data?.stall;
  const addToCart = useAddToCart(s ?? { id, name: '', verified: false, location: { site: '', site_id: '', row: null, stand: null, label: '', map_url: null, moved_at: null } });

  if (stall.isPending) return <LoadingView />;
  if (!s) return <ErrorView error={stall.error} onRetry={() => stall.refetch()} />;

  const products = stall.data!.products;
  const today = products.filter((p) => p.is_today);
  const others = products.filter((p) => !p.is_today);
  const inCart = cart.filter((i) => i.stall_id === s.id);

  const toggleFollow = () =>
    requireAuth(() => {
      if (s.is_followed) confirmAction(t('stall.unfollowConfirm'), t('stall.unfollowText'), () => follow.mutate(false, { onSuccess: () => toast(t('stall.unfollowed'), 'info'), onError: (e) => notify(t('stall.follow'), errorMessage(e), 'error') }));
      else follow.mutate(true, { onSuccess: () => toast(t('stall.followed')), onError: (e) => notify(t('stall.follow'), errorMessage(e), 'error') });
    }, t('auth.reasonFollow'));

  // Écrire au commerçant dans l'application (conversation retrouvée si elle existe déjà)
  const writeToStall = () =>
    requireAuth(async () => {
      setOpening(true);
      try {
        const { conversation } = await api.openStallConversation(s.id);
        router.push(`/messages/${conversation.id}`);
      } catch (e) {
        notify(t('chat.title'), errorMessage(e), 'error');
      } finally {
        setOpening(false);
      }
    }, t('auth.reasonChat'));

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={{ width: '100%', maxWidth: contentWidth, paddingHorizontal: gutter, gap: spacing.md }}>
          <BackButton tone="onBrand" />
          <View style={styles.identity}>
            <Pressable onPress={() => s.photos.length > 0 && setPhotoIndex(0)} accessibilityRole="imagebutton" accessibilityLabel={s.name}>
              <Avatar name={s.name} image={s.avatar} size={76} variant="inverse" />
            </Pressable>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name}>{s.name}</Text>
              {s.tagline ? <Text style={styles.tagline}>{s.tagline}</Text> : null}
              <Text style={styles.location}>{s.location.label}</Text>
              <Text style={styles.followers}>{t('stall.followers', { n: s.followers_count, count: formatCount(s.followers_count) })}</Text>
            </View>
          </View>
          <View style={styles.tags}>
            {s.verification ? <Tag label={t('stall.verifiedBy')} tone="trustSolid" icon="check-circle" size="md" /> : <Tag label={t('stall.notVerified')} tone="outline" size="md" />}
            {s.pay_on_delivery ? <Tag label={t('stall.payOnDelivery')} tone="trust" size="md" /> : null}
            {s.location.moved_at ? <Tag label={t('stall.newLocation')} tone="brand" size="md" /> : null}
            {s.delivery_note ? <Tag label={s.delivery_note} tone="neutral" size="md" /> : null}
          </View>
        </View>
      </View>

      <Screen refreshing={stall.isRefetching} onRefresh={() => stall.refetch()}>
        {s.photos.length > 1 ? <PhotoCarousel images={s.photos} onOpen={setPhotoIndex} /> : null}
        <View style={styles.actions}>
          <Button label={s.is_followed ? t('stall.following') : t('stall.follow')} icon={s.is_followed ? 'check' : 'plus'} variant={s.is_followed ? 'ghost' : 'primary'} onPress={toggleFollow} loading={follow.isPending} style={{ flexGrow: 1 }} />
          {ownStallId !== s.id ? <Button label={t('chat.write')} icon="message-square" variant="ghost" onPress={writeToStall} loading={opening} style={{ flexGrow: 1 }} /> : null}
          {s.contacts.whatsapp ? <Button label={t('common.whatsapp')} icon="message-circle" variant="ghost" onPress={() => openWhatsapp(s.contacts.whatsapp!)} style={{ flexGrow: 1 }} /> : null}
          {s.contacts.phone ? <Button label={t('common.call')} icon="phone" variant="ghost" onPress={() => callPhone(s.contacts.phone)} style={{ flexGrow: 1 }} /> : null}
          {s.contacts.accepts_voice_messages ? <Button label={t('stall.voice')} icon="mic" variant="ghost" onPress={() => requireAuth(() => setVoiceOpen(true), t('auth.reasonVoice'))} style={{ flexGrow: 1 }} /> : null}
          {s.location.map_url ? <Button label={t('stall.map')} icon="map" variant="ghost" onPress={() => openLink(s.location.map_url!)} style={{ flexGrow: 1 }} /> : null}
        </View>

        {products.length === 0 ? <Text style={styles.muted}>{t('stall.noProducts')}</Text> : null}
        {today.length ? (
          <>
            <SectionHeader title={t('stall.todayProducts')} />
            <Grid columns={productColumns}>{today.map((p) => <ProductTile key={p.id} product={p} onAdd={() => addToCart.add(p)} inCart={addToCart.quantityOf(p.id)} />)}</Grid>
          </>
        ) : null}
        {others.length ? (
          <>
            <SectionHeader title={t('stall.allProducts')} />
            <Grid columns={productColumns}>{others.map((p) => <ProductTile key={p.id} product={p} onAdd={() => addToCart.add(p)} inCart={addToCart.quantityOf(p.id)} />)}</Grid>
          </>
        ) : null}
        {products.some((p) => !p.price) ? <Text style={styles.muted}>{t('stall.negotiate')}</Text> : null}
      </Screen>

      {inCart.length ? (
        <View style={styles.cartBar}>
          <Button label={`${t('nav.cart')} · ${cartCount(cart)} · ${formatFcfa(cart.reduce((n, i) => n + i.unit_price * i.quantity, 0))}`} icon="shopping-bag" onPress={() => router.push('/panier')} style={{ width: '100%', maxWidth: contentWidth - gutter * 2 }} />
        </View>
      ) : null}

      <ImageViewer images={s.photos} initialIndex={photoIndex ?? 0} visible={photoIndex !== null} onClose={() => setPhotoIndex(null)} title={s.name} />
      <VoiceRecordModal
        visible={voiceOpen}
        title={t('stall.voiceTitle')}
        hint={t('stall.voiceHint')}
        sending={sending}
        onClose={() => setVoiceOpen(false)}
        onSend={async (audio) => {
          setSending(true);
          try {
            const result = await api.sendVoiceMessage(s.id, audio);
            setVoiceOpen(false);
            notify(t('stall.voiceSent'), result.message, 'success');
          } catch (e) {
            notify(t('stall.voiceTitle'), errorMessage(e), 'error');
          } finally {
            setSending(false);
          }
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  header: { backgroundColor: c.brand, paddingBottom: spacing.xl, alignItems: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  followers: { color: '#FFFFFF', fontSize: fontSize.small, fontWeight: '700', marginTop: 2 },
  name: { fontSize: fontSize.display, fontWeight: '800', color: '#FFFFFF' },
  tagline: { fontSize: fontSize.body, color: '#FFEDD5' },
  location: { fontSize: fontSize.small, color: '#FED7AA', fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  muted: { fontSize: fontSize.body, color: c.textMuted },
  cartBar: { backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, padding: spacing.md, alignItems: 'center', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
}));
