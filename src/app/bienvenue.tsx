import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AxiLogo } from '../components/ui/AxiLogo';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useT } from '../i18n';
import { useAuthStore } from '../store/authStore';
import { fontSize, makeStyles, spacing, useLayout } from '../theme';

/** Premier lancement : Créer un compte / Se connecter / Continuer en visiteur. */
export default function WelcomeScreen() {
  const styles = useStyles();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useLayout();
  const continueAsVisitor = useAuthStore((s) => s.continueAsVisitor);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={[styles.inner, { maxWidth: Math.min(contentWidth, 520) }]}>
        <View style={styles.hero}>
          <AxiLogo size={64} onDark />
          <Text style={styles.title}>{t('auth.welcomeTitle')}</Text>
          <Text style={styles.text}>{t('auth.welcomeText')}</Text>
          <View style={styles.points}>
            {(['shield', 'map-pin', 'smartphone'] as const).map((icon, i) => (
              <View key={icon} style={styles.point}>
                <Icon name={icon} size={18} color="#FB923C" />
                <Text style={styles.pointText}>{[t('stall.verifiedBy'), t('stall.newLocation'), t('cart.payHint')][i]}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.actions}>
          <Button label={t('auth.createAccount')} size="lg" onPress={() => router.push('/auth/inscription')} />
          <Button label={t('auth.signIn')} size="lg" variant="ghost" onPress={() => router.push('/auth/connexion')} />
          <Button
            label={t('auth.visitor')}
            variant="dark"
            onPress={async () => {
              await continueAsVisitor();
              router.replace('/');
            }}
          />
          <Text style={styles.hint}>{t('auth.visitorHint')}</Text>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: '#1C1917', alignItems: 'center', paddingHorizontal: spacing.xl },
  inner: { flex: 1, width: '100%', justifyContent: 'space-between' },
  hero: { gap: spacing.md, marginTop: spacing.xl },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: '#FFFFFF' },
  text: { fontSize: fontSize.title, color: '#D6D3D1' },
  points: { gap: spacing.md, marginTop: spacing.lg },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pointText: { color: '#F5F5F4', fontSize: fontSize.body, flex: 1 },
  actions: { gap: spacing.md },
  hint: { color: c.textOnDarkMuted, fontSize: fontSize.small, textAlign: 'center' },
}));
