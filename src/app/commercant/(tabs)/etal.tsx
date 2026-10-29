import { router } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '../../../api/client';
import type { Product } from '../../../api/types';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { CachedImage } from '../../../components/ui/CachedImage';
import { Icon } from '../../../components/ui/Icon';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { ErrorView, LoadingView } from '../../../components/ui/StateViews';
import { Tag } from '../../../components/ui/Tag';
import { VerifiedIcon } from '../../../components/ui/VerifiedIcon';
import { useMerchantStall, useUpdateProduct } from '../../../hooks/api/merchant';
import { formatPrice } from '../../../lib/format';
import { useSessionStore } from '../../../store/sessionStore';
import { colors, fontSize, pickColor, productTilePalette, radius, spacing } from '../../../theme';

/** Mon étal : ce que voient les clients, et les produits du jour en un geste. */
export default function MyStallScreen() {
  const insets = useSafeAreaInsets();
  const stall = useMerchantStall();
  const setRole = useSessionStore((s) => s.setRole);

  const switchToClient = () => {
    setRole('client');
    router.replace('/');
  };

  if (stall.isPending) return <LoadingView />;
  if (stall.isError && !stall.data) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <ErrorView error={stall.error} onRetry={() => stall.refetch()} />
      </View>
    );
  }

  const { stall: s, products } = stall.data!;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      refreshControl={<RefreshControl refreshing={stall.isRefetching} onRefresh={() => void stall.refetch()} tintColor={colors.brand} />}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.identity}>
          <Avatar name={s.name} image={s.avatar} size={64} />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{s.name}</Text>
              {s.verified ? <VerifiedIcon /> : null}
            </View>
            <Text style={styles.location}>{s.location.label}</Text>
          </View>
        </View>
        <View style={styles.tags}>
          {s.verification ? <Tag label="Vérifié par un agent Axi" tone="trustSolid" icon="check" /> : <Tag label="Visite d’un agent à prévoir" tone="brand" />}
          <Tag label={s.is_open ? 'Ouvert' : 'Fermé'} tone={s.is_open ? 'trust' : 'outline'} />
        </View>
        <View style={styles.headerActions}>
          <Button label="Voir comme un client" variant="ghost" icon="eye" onPress={() => router.push(`/etal/${s.id}`)} style={{ flex: 1 }} />
          <Button label="Photo" icon="camera" onPress={() => router.push('/commercant/nouveau-produit')} />
        </View>
      </View>

      <View style={styles.body}>
        <SectionHeader title="Mes produits" note={`${products.filter((p) => p.is_today).length} disponibles aujourd’hui`} />
        <View style={styles.list}>
          {products.map((p, i) => (
            <ProductRow key={p.id} product={p} last={i === products.length - 1} />
          ))}
        </View>

        <Pressable onPress={switchToClient} style={styles.switch} accessibilityRole="button">
          <Icon name="repeat" size={16} color={colors.textMuted} />
          <Text style={styles.switchText}>Passer en mode client</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ProductRow({ product, last }: { product: Product; last: boolean }) {
  const update = useUpdateProduct();
  const patch = (field: 'is_today' | 'in_stock', value: boolean) =>
    update.mutate(
      { productId: product.id, patch: { [field]: value } },
      { onError: (e) => Alert.alert('Mise à jour impossible', errorMessage(e)) },
    );

  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.thumb, { backgroundColor: pickColor(productTilePalette, product.id) }]}>
        {product.image ? <CachedImage image={product.image} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
        <View style={styles.toggles}>
          <Toggle label="Aujourd’hui" value={product.is_today} onChange={(v) => patch('is_today', v)} disabled={update.isPending} />
          <Toggle label="En stock" value={product.in_stock} onChange={(v) => patch('in_stock', v)} disabled={update.isPending} />
        </View>
      </View>
    </View>
  );
}

function Toggle({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (v: boolean) => void; disabled: boolean }) {
  return (
    <View style={styles.toggle}>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.trustText, false: colors.border }}
        thumbColor={colors.surface}
        accessibilityLabel={label}
      />
      <Text style={styles.toggleLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.surface, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: fontSize.heading, fontWeight: '700', color: colors.text, flexShrink: 1 },
  location: { fontSize: fontSize.body, color: colors.textMuted, marginTop: 2 },
  tags: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  headerActions: { flexDirection: 'row', gap: spacing.md },
  body: { paddingHorizontal: spacing.xl },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  thumb: { width: 64, height: 64, borderRadius: radius.md, overflow: 'hidden' },
  productName: { fontSize: fontSize.body, fontWeight: '600', color: colors.text },
  productPrice: { fontSize: fontSize.body, color: colors.brand, fontWeight: '600', marginTop: 2 },
  toggles: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  toggleLabel: { fontSize: fontSize.small, color: colors.textMuted },
  switch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  switchText: { fontSize: fontSize.body, color: colors.textMuted, fontWeight: '600' },
});
