import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { MerchantOrderRow } from '../../api/types';
import { useSettings } from '../../hooks/api/account';
import { useLangStore, useT } from '../../i18n';
import { formatChatTime, formatFcfa, orderNumber } from '../../lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '../../theme';
import { Icon } from '../ui/Icon';
import { Tag } from '../ui/Tag';

type Row = Omit<MerchantOrderRow, 'items_count' | 'reception_label'> & { items_count?: number; reception_label?: string };

/** Une commande : client, contenu, réception, montant, statut ; toucher ouvre le détail */
/** footer : actions rapides sous la carte (ex. « Prêt pour le coursier » sur Ma journée) */
export function OrderCard({ order: o, footer }: { order: Row; footer?: ReactNode }) {
  const t = useT();
  const styles = useStyles();
  const { colors } = useTheme();
  const lang = useLangStore((s) => s.lang);
  const dateFormat = useSettings().data?.date_format;
  const tone = o.status === 'to_prepare' ? 'brand' : o.status === 'cancelled' ? 'danger' : o.status === 'delivered' ? 'neutral' : 'trust';
  const meta = [
    `n° ${orderNumber(o.id)}`,
    o.created_at ? formatChatTime(o.created_at, lang, dateFormat) : null,
    o.items_count ? t('merchantOrders.items', { n: o.items_count }) : null,
    o.reception_label ?? null,
  ].filter(Boolean);
  return (
    <Pressable
      onPress={() => router.push(`/commercant/commande/${o.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${o.customer_name}, ${o.status_label}, ${formatFcfa(o.amount)}`}
      style={({ pressed }) => [styles.card, o.status === 'to_prepare' && { borderColor: colors.brandMuted }, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.row}>
        <Text style={[styles.title, { flex: 1 }]} numberOfLines={1}>{o.customer_name}</Text>
        <Tag label={o.status_label} tone={tone} />
      </View>
      <Text style={styles.text} numberOfLines={2}>{o.summary}</Text>
      <View style={styles.row}>
        <Text style={[styles.muted, { flex: 1 }]} numberOfLines={1}>{meta.join(' · ')}</Text>
        <Text style={styles.amount}>{formatFcfa(o.amount)}</Text>
        <Icon name="chevron-right" size={16} color={colors.textMuted} />
      </View>
      {footer}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  card: { flex: 1, gap: 6, padding: spacing.md, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  text: { fontSize: fontSize.small, color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  amount: { fontSize: fontSize.body, fontWeight: '800', color: c.text },
}));
