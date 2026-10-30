import { Text, View } from 'react-native';

import { useT } from '../../i18n';
import { useTheme } from '../../theme';
import { Icon } from './Icon';

/** Pastille verte cochée à côté du nom d'un étal vérifié par un agent Axi. */
export function VerifiedIcon({ size = 16 }: { size?: number }) {
  const { colors } = useTheme();
  const t = useT();
  return (
    <View accessibilityLabel={t('stall.verified')} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.trustText, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="check" size={size * 0.7} color="#FFFFFF" />
    </View>
  );
}

/** Badge « Axi Pro » : commerçant abonné (étoile orange, comme les badges des comptes certifiés). */
export function SubscriberBadge({ size = 16, onDark = false }: { size?: number; onDark?: boolean }) {
  const { colors } = useTheme();
  const t = useT();
  return (
    <View
      accessibilityLabel={t('stall.subscriberBadge')}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: onDark ? '#FFFFFF' : colors.brand, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name="star" size={size * 0.62} color={onDark ? colors.brand : '#FFFFFF'} />
    </View>
  );
}

/**
 * Étiquette lisible « ★ Abonné » : là où il y a de la place (page de l'étal, profil, discussion, Mon étal).
 * onDark : sur le bandeau orange de l'étal.
 */
export function SubscriberTag({ onDark = false, label }: { onDark?: boolean; label?: string }) {
  const { colors } = useTheme();
  const t = useT();
  const fg = onDark ? colors.brand : '#FFFFFF';
  return (
    <View
      accessibilityLabel={t('stall.subscriberBadge')}
      style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 4, minHeight: 24, paddingHorizontal: 8, borderRadius: 6, backgroundColor: onDark ? '#FFFFFF' : colors.brand }}
    >
      <Icon name="star" size={12} color={fg} />
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{label ?? t('stall.subscriberShort')}</Text>
    </View>
  );
}
