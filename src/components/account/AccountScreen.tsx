import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ImageViewer } from '../ui/ImageViewer';
import { MenuRow } from '../ui/Field';
import { Screen } from '../ui/Screen';
import { ScreenHeader } from '../ui/ScreenHeader';
import { useNotifications } from '../../hooks/api/account';
import { useBadges } from '../../hooks/api/chat';
import { useT } from '../../i18n';
import { confirmAction } from '../../lib/confirm';
import { leaveSession } from '../../lib/authFlow';
import { useAuthStore } from '../../store/authStore';
import { fontSize, makeStyles, spacing } from '../../theme';

/** « Mon compte » : menu commun au client et au commerçant ; déconnexion avec confirmation. */
export function AccountScreen() {
  const styles = useStyles();
  const t = useT();
  const { status, user, mode, setMode } = useAuthStore();
  const unread = useNotifications().data?.unread ?? 0;
  const unreadMessages = useBadges().data?.unread_messages ?? 0;
  // Toucher ma photo : elle s'affiche en grand
  const [viewing, setViewing] = useState(false);

  if (status !== 'signedIn' || !user) {
    return (
      <>
        <ScreenHeader title={t('account.title')} showBack={false} />
        <Screen>
          <Card style={{ gap: spacing.md }}>
            <Text style={styles.title}>{t('account.visitorTitle')}</Text>
            <Text style={styles.muted}>{t('account.visitorText')}</Text>
            <Button label={t('auth.createAccount')} onPress={() => router.push('/auth/inscription')} />
            <Button label={t('auth.signIn')} variant="ghost" onPress={() => router.push('/auth/connexion')} />
            <Button label={t('account.backHome')} icon="home" variant="ghost" onPress={() => router.replace('/bienvenue')} />
          </Card>
          <MenuRow icon="settings" label={t('account.settings')} onPress={() => router.push('/parametres')} />
          <Text style={styles.muted}>{t('account.partnerInfo')}</Text>
        </Screen>
      </>
    );
  }

  const merchant = user.role === 'merchant';
  return (
    <>
      <ScreenHeader title={t('account.title')} showBack={false} />
      <Screen>
        <Card style={styles.profile}>
          <Pressable onPress={() => user.avatar && setViewing(true)} disabled={!user.avatar} accessibilityRole="imagebutton" accessibilityLabel={user.name}>
            <Avatar name={user.name} image={user.avatar} size={56} variant="soft" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{user.name}</Text>
            <Text style={styles.muted}>{user.email}</Text>
            <Text style={styles.role}>{merchant ? t('auth.profileMerchant') : t('auth.profileClient')}</Text>
          </View>
        </Card>
        <View>
          {merchant ? (
            <MenuRow
              icon={mode === 'merchant' ? 'shopping-bag' : 'briefcase'}
              label={mode === 'merchant' ? t('account.clientSpace') : t('account.merchantSpace')}
              onPress={() => {
                const next = mode === 'merchant' ? 'client' : 'merchant';
                setMode(next);
                router.replace(next === 'merchant' ? '/commercant' : '/');
              }}
            />
          ) : null}
          <MenuRow icon="message-circle" label={t('chat.title')} value={unreadMessages > 0 ? String(unreadMessages) : undefined} onPress={() => router.push('/messages')} />
          <MenuRow icon="package" label={t('account.orders')} onPress={() => router.push('/commandes')} />
          <MenuRow icon="bar-chart-2" label={merchant && mode === 'merchant' ? t('merchant.sales') : t('account.sales')} onPress={() => router.push('/ventes')} />
          <MenuRow icon="heart" label={t('account.favorites')} onPress={() => router.push('/favoris')} />
          <MenuRow icon="bell" label={t('account.notifications')} value={unread > 0 ? String(unread) : undefined} onPress={() => router.push('/notifications')} />
          <MenuRow icon="user" label={t('account.profile')} onPress={() => router.push('/parametres/profil')} />
          <MenuRow icon="settings" label={t('account.settings')} onPress={() => router.push('/parametres')} />
          {!merchant ? (
            <MenuRow
              icon="briefcase"
              label={t('apply.title')}
              value={user.merchant_application ? t(`apply.status.${user.merchant_application.status}`) : undefined}
              onPress={() => router.push('/parametres/devenir-commercant')}
            />
          ) : null}
        </View>
        <Button label={t('account.logout')} variant="danger" icon="log-out" onPress={() => confirmAction(t('account.logoutConfirm'), t('account.logoutText'), () => leaveSession(), { destructive: true })} />
        <Text style={styles.muted}>{t('account.partnerInfo')}</Text>
      </Screen>
      <ImageViewer images={user.avatar ? [user.avatar] : []} visible={viewing} onClose={() => setViewing(false)} title={user.name} />
    </>
  );
}

const useStyles = makeStyles((c) => ({
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  role: { fontSize: fontSize.small, color: c.brandDark, fontWeight: '700', marginTop: 2 },
}));
