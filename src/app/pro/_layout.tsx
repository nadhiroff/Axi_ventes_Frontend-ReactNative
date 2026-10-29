import { Link, Redirect, Slot, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { allowedTabs, proTabs } from '../../components/pro/access';
import { useIsWide } from '../../components/pro/layout';
import { Button } from '../../components/ui/Button';
import { EmptyView, LoadingView } from '../../components/ui/StateViews';
import { useAuthStore } from '../../store/authStore';
import { colors, fontSize, radius, spacing } from '../../theme';

/**
 * Axi Pro, l'espace web des partenaires (ANaGeM, annonceurs, IMF, études).
 * Uniquement sur le web, et uniquement pour les comptes "pro" ou "admin".
 */
export default function ProLayout() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const pathname = usePathname();
  const wide = useIsWide();

  // Sur téléphone, cet espace n'existe pas : retour à l'accueil.
  if (Platform.OS !== 'web') return <Redirect href="/" />;
  if (status === 'loading') return <LoadingView />;
  if (status === 'signedOut') {
    return (
      <Redirect
        href={{ pathname: '/connexion', params: { redirect: '/pro', reason: 'Espace réservé aux partenaires d’Axi.' } }}
      />
    );
  }

  const tabs = proTabs.filter((t) => allowedTabs(user).includes(t.id));

  return (
    <View style={styles.screen}>
      <View style={[styles.bar, !wide && styles.barNarrow]}>
        <View style={styles.brand} accessibilityRole="header">
          <Text style={styles.logo}>axi</Text>
          <Text style={styles.pro}>pro</Text>
        </View>
        <View style={styles.nav}>
          {tabs.map((t) => {
            const active = t.href === '/pro' ? pathname === '/pro' : pathname.startsWith(t.href);
            return (
              <Link key={t.id} href={t.href as never} asChild>
                {/* Link asChild fusionne les styles par copie d'objet : il faut un style déjà aplati. */}
                <Pressable
                  style={StyleSheet.flatten([styles.navItem, active && styles.navActive])}
                  accessibilityRole="link"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.navText, active && styles.navTextActive]}>{t.label}</Text>
                </Pressable>
              </Link>
            );
          })}
          <Pressable onPress={() => signOut()} style={styles.navItem} accessibilityRole="button">
            <Text style={styles.signOut}>{user?.organization?.name ?? user?.name} · Déconnexion</Text>
          </Pressable>
        </View>
      </View>

      {tabs.length === 0 ? (
        <View style={styles.denied}>
          <EmptyView
            icon="lock"
            title="Espace réservé aux partenaires d’Axi"
            text="Votre compte n’est rattaché à aucune organisation partenaire. Contactez l’équipe Axi pour obtenir un accès."
          />
          <Button label="Se déconnecter" variant="ghost" onPress={() => signOut()} />
        </View>
      ) : (
        <Slot />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: {
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl + spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  barNarrow: { flexDirection: 'column', alignItems: 'flex-start', paddingHorizontal: spacing.lg },
  brand: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  logo: { fontSize: 34, fontWeight: '800', color: colors.brandMuted, letterSpacing: -1 },
  pro: { fontSize: fontSize.title + 3, fontWeight: '700', color: colors.textOnDark },
  nav: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  navItem: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md },
  navActive: { backgroundColor: colors.inkSoft },
  navText: { fontSize: fontSize.title, color: colors.textOnDarkMuted },
  navTextActive: { color: colors.textOnDark, fontWeight: '700' },
  signOut: { fontSize: fontSize.small, color: colors.textOnDarkMuted },
  denied: { flex: 1, padding: spacing.xl, maxWidth: 520, alignSelf: 'center' },
});
