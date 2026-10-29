import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { useMerchantMoney } from '../../hooks/api/merchant';
import { useT } from '../../i18n';
import { formatFcfa } from '../../lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

/** Bandeau visible tant que le commerçant n'est pas abonné : ce qui est limité, et comment le débloquer. */
export function SubscriptionBanner() {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const sub = useMerchantMoney().data?.subscription;
  if (!sub || sub.status === 'active') {
    if (sub && sub.days_left > 0 && sub.days_left <= 5) {
      return (
        <View style={[styles.banner, { backgroundColor: colors.brandSoft }]}>
          <Icon name="clock" size={18} color={colors.brandDark} />
          <Text style={[styles.text, { flex: 1 }]}>{t('subscription.endsSoon', { n: sub.days_left })}</Text>
          <Button label={t('subscription.renew')} size="sm" onPress={() => router.push('/commercant/abonnement')} />
        </View>
      );
    }
    return null;
  }
  return (
    <View style={styles.banner}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
        <Icon name="lock" size={18} color={colors.brandDark} />
        <Text style={styles.title}>{t('subscription.freeTitle')}</Text>
      </View>
      {sub.limits.text ? <Text style={styles.text}>{sub.limits.text}</Text> : null}
      {sub.limits.paused_products > 0 ? <Text style={styles.text}>{t('subscription.paused', { n: sub.limits.paused_products })}</Text> : null}
      <Button label={t('subscription.cta', { amount: formatFcfa(sub.prices.month) })} icon="star" onPress={() => router.push('/commercant/abonnement')} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  banner: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.brand, backgroundColor: c.surface, flexDirection: 'column' },
  title: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  text: { fontSize: fontSize.small, color: c.text },
}));
