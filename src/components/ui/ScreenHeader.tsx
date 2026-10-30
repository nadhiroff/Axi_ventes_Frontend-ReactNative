import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../../i18n';
import { fontSize, makeStyles, spacing, useLayout, useTheme } from '../../theme';
import { Icon } from './Icon';

type Props = { title: string; subtitle?: string; showBack?: boolean; right?: ReactNode };

/** En-tête : bouton retour rond, titre et sous-titre ; contenu centré sur tablette. */
export function ScreenHeader({ title, subtitle, showBack = true, right }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { contentWidth, gutter } = useLayout();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <View style={[styles.inner, { maxWidth: contentWidth, paddingHorizontal: gutter }]}>
        {showBack ? <BackButton /> : null}
        <View style={styles.titles}>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

/** Bouton retour ; compact : plus petit, pour les en-têtes colorés où il partage la ligne avec le contenu */
export function BackButton({ tone = 'light', compact = false }: { tone?: 'light' | 'onBrand'; compact?: boolean }) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      hitSlop={8}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={[styles.back, compact && styles.backCompact, tone === 'onBrand' && styles.backOnBrand]}
    >
      <Icon name="chevron-left" size={compact ? 20 : 22} color={tone === 'onBrand' ? '#FFFFFF' : colors.text} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  header: { backgroundColor: c.surface, paddingBottom: spacing.lg, alignItems: 'center' },
  inner: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titles: { flex: 1 },
  title: { fontSize: fontSize.display, fontWeight: '700', color: c.text },
  subtitle: { fontSize: fontSize.body, color: c.textMuted, marginTop: 2 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  backCompact: { width: 36, height: 36, borderRadius: 18 },
  backOnBrand: { backgroundColor: 'rgba(255,255,255,0.18)' },
}));
