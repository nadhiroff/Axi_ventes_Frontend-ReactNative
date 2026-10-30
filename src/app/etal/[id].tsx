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
import { Icon } from '../../components/ui/Icon';
import { ImageViewer } from '../../components/ui/ImageViewer';
import { PhotoCarousel } from '../../components/ui/PhotoCarousel';
import { AnnouncementCard } from '../../components/client/AnnouncementCard';
import { SubscriberBadge } from '../../components/ui/VerifiedIcon';
import { Grid, Screen } from '../../components/ui/Screen';
import { BackButton } from '../../components/ui/ScreenHeader';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { Tag } from '../../components/ui/Tag';
import { EmailSheet } from '../../components/client/EmailSheet';
import { useFollow, useStall } from '../../hooks/api/client';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useT } from '../../i18n';
import { confirmAction, notify, toast } from '../../lib/confirm';
import { useAuthStore } from '../../store/authStore';
import { formatCount, formatFcfa } from '../../lib/format';
import { cartCount, useCartStore } from '../../store/cartStore';
import { fontSize, makeStyles, radius, spacing, useLayout, useTheme } from '../../theme';
import { callPhone, openWhatsapp, openLink } from '../../lib/contact';

/** Page d'un étal. Aucune publicité n'y est affichée (règle du cahier des charges). */
export default function StallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { contentWidth, gutter, productColumns, tablet } = useLayout();
  const stall = useStall(id);
  const follow = useFollow(id);
  const requireAuth = useRequireAuth();
  const [emailOpen, setEmailOpen] = useState(false);
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
      {/* En-tête compact : retour à gauche, identité de l'étal juste à côté, sur la même ligne */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={{ width: '100%', maxWidth: contentWidth, paddingHorizontal: gutter, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
          <BackButton tone="onBrand" compact />
          <View style={{ flex: 1, gap: spacing.md }}>
          <View style={styles.identity}>
            <Pressable onPress={() => s.photos.length > 0 && setPhotoIndex(0)} accessibilityRole="imagebutton" accessibilityLabel={s.name}>
              <Avatar name={s.name} image={s.avatar} size={tablet ? 80 : 60} variant="inverse" />
            </Pressable>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.name}>{s.name}</Text>
                {s.subscribed ? <SubscriberBadge size={20} onDark /> : null}
              </View>
              {s.tagline ? <Text style={styles.tagline} numberOfLines={1}>{s.tagline}</Text> : null}
              {/* Emplacement et abonnés sur une seule ligne */}
              <Text style={styles.location} numberOfLines={2}>
                {s.location.label}
                <Text style={styles.followers}>{`  ·  ${t('stall.followers', { n: s.followers_count, count: formatCount(s.followers_count) }).replace(/ /g, '\u00A0')}`}</Text>
              </Text>
            </View>
          </View>
          <View style={styles.tags}>
            {s.verification ? <Tag label={t('stall.verifiedBy')} tone="trustSolid" icon="check-circle" /> : <Tag label={t('stall.notVerified')} tone="outline" />}
            {s.pay_on_delivery ? <Tag label={t('stall.payOnDelivery')} tone="trust" /> : null}
            {s.location.moved_at ? <Tag label={t('stall.newLocation')} tone="brand" /> : null}
            {s.delivery_note ? <Tag label={s.delivery_note} tone="neutral" /> : null}
          </View>
          </View>
        </View>
      </View>

      <Screen refreshing={stall.isRefetching} onRefresh={() => stall.refetch()}>
        {s.photos.length > 1 ? <PhotoCarousel images={s.photos} onOpen={setPhotoIndex} /> : null}
        {/* Actions principales côte à côte, puis contacts en petits boutons ronds sur une seule ligne */}
        <View style={styles.actions}>
          <Button label={s.is_followed ? t('stall.following') : t('stall.follow')} icon={s.is_followed ? 'check' : 'plus'} variant={s.is_followed ? 'ghost' : 'primary'} onPress={toggleFollow} loading={follow.isPending} style={{ flex: 1 }} />
          {ownStallId !== s.id ? <Button label={t('chat.write')} icon="message-square" variant="ghost" onPress={writeToStall} loading={opening} style={{ flex: 1 }} /> : null}
        </View>
        <View style={styles.contacts}>
          {s.contacts.whatsapp ? <ContactButton icon="whatsapp" label={t('common.whatsapp')} onPress={() => openWhatsapp(s.contacts.whatsapp!)} /> : null}
          {s.contacts.phone ? <ContactButton icon="phone" label={t('common.call')} onPress={() => callPhone(s.contacts.phone)} /> : null}
          {ownStallId !== s.id ? <ContactButton icon="mail" label={t('stall.emailShort')} onPress={() => requireAuth(() => setEmailOpen(true), t('auth.reasonEmail'))} /> : null}
          {s.location.map_url ? <ContactButton icon="map" label={t('stall.map')} onPress={() => openLink(s.location.map_url!)} /> : null}
        </View>

        {s.announcements.map((a) => (
          <AnnouncementCard key={a.id} a={a} />
        ))}
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
      <EmailSheet stallId={s.id} stallName={s.name} visible={emailOpen} onClose={() => setEmailOpen(false)} />
    </View>
  );
}

/** Petit bouton rond avec son libellé dessous (WhatsApp, Appeler, Vocal, Plan) */
function ContactButton({ icon, label, onPress }: { icon: 'whatsapp' | 'phone' | 'mail' | 'map'; label: string; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.contact, pressed && { opacity: 0.7 }]}>
      <View style={styles.contactCircle}>
        {/* Le logo WhatsApp garde sa couleur verte, les autres sont orange */}
        <Icon name={icon} size={20} color={icon === 'whatsapp' ? undefined : colors.brand} />
      </View>
      <Text style={styles.contactLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  header: { backgroundColor: c.brand, paddingBottom: spacing.lg, alignItems: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  followers: { color: '#FFFFFF', fontSize: fontSize.small, fontWeight: '700' },
  name: { fontSize: fontSize.heading, fontWeight: '800', color: '#FFFFFF', flexShrink: 1 },
  tagline: { fontSize: fontSize.body, color: '#FFEDD5' },
  location: { fontSize: fontSize.small, color: '#FED7AA', fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  contacts: { flexDirection: 'row', justifyContent: 'space-around', gap: spacing.sm },
  contact: { alignItems: 'center', gap: 4, minWidth: 64 },
  contactCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: fontSize.caption, color: c.text, fontWeight: '600' },
  muted: { fontSize: fontSize.body, color: c.textMuted },
  cartBar: { backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, padding: spacing.md, alignItems: 'center', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
}));
