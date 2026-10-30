import { router } from 'expo-router';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AxiLogo } from '../components/ui/AxiLogo';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useT } from '../i18n';
import { useAuthStore } from '../store/authStore';
import { fontSize, makeStyles, spacing, useLayout } from '../theme';

/**
 * Premier lancement : Se connecter / Créer un compte / Continuer en visiteur. Défile si tout ne tient pas
 * (petit téléphone, écran couché, grande police) ; texte et marges plus serrés sur les petits écrans.
 */
export default function WelcomeScreen() {
  const styles = useStyles();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { contentWidth, width } = useLayout();
  const { height } = useWindowDimensions();
  const compact = height < 680 || width < 360;
  const continueAsVisitor = useAuthStore((s) => s.continueAsVisitor);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + (compact ? spacing.md : spacing.xxl), paddingBottom: insets.bottom + (compact ? spacing.md : spacing.xl), paddingLeft: insets.left + (compact ? spacing.md : spacing.xl), paddingRight: insets.right + (compact ? spacing.md : spacing.xl) },
      ]}
      bounces={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.inner, { maxWidth: Math.min(contentWidth, 520), gap: compact ? spacing.lg : spacing.xl }]}>
        <View style={[styles.hero, !compact && { marginTop: spacing.xl }]}>
          <AxiLogo size={compact ? 48 : 64} onDark />
          <Text style={[styles.title, compact && styles.titleCompact]}>{t('auth.welcomeTitle')}</Text>
          <Text style={styles.text}>{t('auth.welcomeText')}</Text>
          <View style={[styles.points, !compact && { marginTop: spacing.lg }]}>
            {(['shield', 'map-pin', 'smartphone'] as const).map((icon, i) => (
              <View key={icon} style={styles.point}>
                <Icon name={icon} size={18} color="#FB923C" />
                <Text style={styles.pointText}>{[t('stall.verifiedBy'), t('stall.newLocation'), t('cart.payHint')][i]}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.actions}>
          <Button label={t('auth.signIn')} size="lg" onPress={() => router.push('/auth/connexion')} />
          <Button label={t('auth.createAccount')} size="lg" variant="ghost" onPress={() => router.push('/auth/inscription')} />
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
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: '#1C1917' },
  content: { flexGrow: 1, alignItems: 'center' },
  inner: { flexGrow: 1, width: '100%', justifyContent: 'space-between' },
  hero: { gap: spacing.md },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: '#FFFFFF' },
  titleCompact: { fontSize: 26, lineHeight: 31 },
  text: { fontSize: fontSize.title, color: '#D6D3D1' },
  points: { gap: spacing.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pointText: { color: '#F5F5F4', fontSize: fontSize.body, flex: 1 },
  actions: { gap: spacing.md },
  hint: { color: c.textOnDarkMuted, fontSize: fontSize.small, textAlign: 'center' },
}));
