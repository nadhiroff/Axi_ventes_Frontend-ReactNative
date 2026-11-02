import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { api } from '../../api/endpoints';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon, type IconName } from '../../components/ui/Icon';
import { ImageViewer } from '../../components/ui/ImageViewer';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Tag } from '../../components/ui/Tag';
import { SubscriberBadge, VerifiedIcon } from '../../components/ui/VerifiedIcon';
import { LANG_LABELS, useT } from '../../i18n';
import { formatShortDate } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';

/** Date MySQL UTC (« 2026-11-02 09:51:36 ») → date courte */
const day = (value: string | null | undefined) => (value ? formatShortDate(value.replace(' ', 'T') + 'Z') : '');

/**
 * Mes informations (toucher la carte « nom, email, rôle » dans Compte) : d'abord l'essentiel en bref (chiffres clés),
 * puis le détail de l'identité et, pour un commerçant, de l'étal. Lecture seule : un bouton mène à la modification.
 */
export default function MyInfoScreen() {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const merchant = user?.role === 'merchant';
  const data = useQuery({ queryKey: ['me', 'data'], queryFn: api.myData, staleTime: 30_000 }).data;
  // Étal : seulement pour un commerçant (un client n'en a pas, la demande serait refusée)
  const stall = useQuery({ queryKey: ['merchant', 'stall'], queryFn: api.merchantStall, enabled: merchant, staleTime: 30_000 }).data;
  const [viewing, setViewing] = useState(false);

  if (!user) return null;
  const s = merchant ? stall?.stall : undefined;
  const products = stall?.products.length;
  const brief: [IconName, string, number | undefined][] = merchant
    ? [['package', t('myInfo.products'), products], ['users', t('myInfo.followers'), s?.followers_count], ['shopping-bag', t('myInfo.orders'), data?.orders.length]]
    : [['package', t('myInfo.orders'), data?.orders.length], ['heart', t('myInfo.favorites'), data?.favorites.length], ['star', t('myInfo.followed'), data?.followed_stalls.length]];

  return (
    <>
      <ScreenHeader title={t('myInfo.title')} />
      <Screen>
        <View style={styles.column}>
          {/* En-tête : photo, nom, rôle, ancienneté */}
          <Card style={styles.head}>
            <Pressable onPress={() => user.avatar && setViewing(true)} disabled={!user.avatar} accessibilityRole="imagebutton" accessibilityLabel={user.name}>
              <Avatar name={user.name} image={user.avatar} size={88} variant="soft" />
            </Pressable>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{user.name}</Text>
              {s?.verified ? <VerifiedIcon size={18} /> : null}
              {s?.subscribed ? <SubscriberBadge size={18} /> : null}
            </View>
            {/* Rôle centré juste sous le nom (le Tag se place à gauche par défaut) */}
            <Tag label={merchant ? t('auth.profileMerchant') : t('auth.profileClient')} tone={merchant ? 'brand' : 'outline'} icon={merchant ? 'shopping-bag' : 'user'} size="md" style={{ alignSelf: 'center' }} />
            {data?.account?.created_at ? <Text style={styles.muted}>{t('myInfo.since', { date: day(data.account.created_at) })}</Text> : null}
          </Card>

          {/* En bref : trois chiffres clés */}
          <Text style={styles.section}>{t('myInfo.brief')}</Text>
          <View style={styles.tiles}>
            {brief.map(([icon, label, n]) => (
              <View key={label} style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Icon name={icon} size={18} color={colors.brand} />
                <Text style={styles.tileValue}>{n ?? '…'}</Text>
                <Text style={styles.tileLabel} numberOfLines={2}>{label}</Text>
              </View>
            ))}
          </View>

          {/* En détail */}
          <Block icon="user" title={t('myInfo.identity')}>
            <Line label={t('myInfo.firstName')} value={user.first_name} />
            <Line label={t('myInfo.lastName')} value={user.last_name} />
            <Line
              label={t('myInfo.email')}
              value={user.email}
              extra={<Tag label={user.email_verified ? t('myInfo.emailVerified') : t('myInfo.emailNotVerified')} tone={user.email_verified ? 'trust' : 'outline'} />}
            />
            <Line label={t('myInfo.phone')} value={user.phone} />
            <Line label={t('myInfo.language')} value={LANG_LABELS[user.lang]} />
            <Line label={t('myInfo.photoWho')} value={t(`settings.visibility.${user.avatar_visibility}`)} />
            <Line label={t('myInfo.bio')} value={user.bio} />
          </Block>

          {merchant && s ? (
            <Block icon="shopping-bag" title={t('myInfo.stall')}>
              <Line label={t('myInfo.stallName')} value={s.name} />
              <Line label={t('myInfo.location')} value={s.location.label} />
              <Line label={t('myInfo.type')} value={s.merchant_type === 'wholesale' ? t('merchant.wholesale') : t('merchant.retail')} />
              <Line label={t('myInfo.badge')} value={s.verified ? t('myInfo.verified') : t('myInfo.notVerified')} />
              <Line
                label={t('myInfo.subscription')}
                value={s.subscription.status === 'active' && s.subscription.ends_on ? t('myInfo.subscribedUntil', { date: formatShortDate(s.subscription.ends_on) }) : t('myInfo.notSubscribed')}
              />
              <Line label={t('myInfo.stallContacts')} value={[s.contacts.phone, s.contacts.whatsapp ? `WhatsApp ${s.contacts.whatsapp}` : null].filter(Boolean).join(' · ') || null} />
            </Block>
          ) : null}

          {!merchant && user.merchant_application ? (
            <Block icon="briefcase" title={t('myInfo.application')}>
              <Line label={t('myInfo.application')} value={t(`apply.status.${user.merchant_application.status}`)} />
            </Block>
          ) : null}

          <Button label={t('myInfo.edit')} icon="edit-3" onPress={() => router.push('/parametres/profil')} />
          {merchant && s ? (
            <View style={styles.row}>
              <Button label={t('myInfo.editStall')} icon="edit" variant="ghost" onPress={() => router.push('/commercant/modifier-etal')} style={{ flex: 1 }} />
              <Button label={t('myInfo.seeStall')} icon="eye" variant="ghost" onPress={() => router.push(`/etal/${s.id}`)} style={{ flex: 1 }} />
            </View>
          ) : null}
        </View>
      </Screen>
      <ImageViewer images={user.avatar ? [user.avatar] : []} visible={viewing} onClose={() => setViewing(false)} title={user.name} />
    </>
  );
}

function Block({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Card style={{ gap: 2 }}>
      <View style={styles.blockHead}>
        <Icon name={icon} size={18} color={colors.brand} />
        <Text style={styles.blockTitle}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

/** Une information : libellé à gauche, valeur à droite (« Non renseigné » si vide) */
function Line({ label, value, extra }: { label: string; value: string | null | undefined; extra?: ReactNode }) {
  const styles = useStyles();
  const t = useT();
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{label}</Text>
      {/* Valeur et repère (ex. « Confirmé ») sur la même ligne, alignés à droite */}
      <View style={styles.valueBox}>
        <Text style={[styles.value, !value && styles.empty]} selectable>{value || t('myInfo.none')}</Text>
        {extra ? <View style={styles.extra}>{extra}</View> : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  column: { gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  head: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: fontSize.heading, fontWeight: '700', color: c.text, textAlign: 'center' },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  section: { fontSize: fontSize.title, fontWeight: '700', color: c.text, marginTop: spacing.xs },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, borderRadius: radius.lg, borderWidth: 1 },
  tileValue: { fontSize: fontSize.heading, fontWeight: '800', color: c.text },
  tileLabel: { fontSize: fontSize.caption, color: c.textMuted, textAlign: 'center' },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  blockTitle: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: c.border },
  label: { flex: 1, fontSize: fontSize.small, color: c.textMuted },
  valueBox: { flex: 1.6, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm },
  value: { flexShrink: 1, fontSize: fontSize.small, fontWeight: '600', color: c.text, textAlign: 'right' },
  extra: { flexShrink: 0 },
  empty: { color: c.textMuted, fontWeight: '400', fontStyle: 'italic' },
  row: { flexDirection: 'row', gap: spacing.sm },
}));
