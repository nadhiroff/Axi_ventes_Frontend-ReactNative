import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSize, spacing } from '../../theme';
import { Icon } from './Icon';

type Props = { title: string; subtitle?: string; showBack?: boolean; right?: ReactNode };

/** En-tête blanc : bouton retour rond, titre et sous-titre ("Mon panier"). */
export function ScreenHeader({ title, subtitle, showBack = true, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      {showBack ? <BackButton /> : null}
      <View style={styles.titles}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function BackButton({ tone = 'light' }: { tone?: 'light' | 'onBrand' }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour"
      hitSlop={8}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={[styles.back, tone === 'onBrand' && styles.backOnBrand]}
    >
      <Icon name="chevron-left" size={22} color={tone === 'onBrand' ? colors.textOnDark : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  titles: { flex: 1 },
  title: { fontSize: fontSize.display, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.body, color: colors.textMuted, marginTop: 2 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1EEEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backOnBrand: { backgroundColor: 'rgba(255,255,255,0.18)' },
});
