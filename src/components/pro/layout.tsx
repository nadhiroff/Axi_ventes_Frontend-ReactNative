import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontSize, radius, spacing } from '../../theme';

/** Écran large (ordinateur) : colonnes côte à côte ; sinon tout s'empile. */
export function useIsWide() {
  return useWindowDimensions().width >= 960;
}

/** Page Axi Pro : largeur limitée, marges confortables sur ordinateur. */
export function ProPage({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const wide = useIsWide();
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.page, { padding: wide ? spacing.xxl + spacing.lg : spacing.lg }]}>
      <View style={styles.inner}>
        <Text style={[styles.title, !wide && styles.titleNarrow]} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.body}>{children}</View>
      </View>
    </ScrollView>
  );
}

/** Ligne qui passe en colonne sur petit écran. */
export function ProRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const wide = useIsWide();
  return <View style={[wide ? styles.row : styles.column, style]}>{children}</View>;
}

export function ProCard({ title, right, children, flex = 1 }: { title?: string; right?: ReactNode; children: ReactNode; flex?: number }) {
  const wide = useIsWide();
  return (
    <View style={[styles.card, wide && { flex }]}>
      {title || right ? (
        <View style={styles.cardHeader}>
          {title ? (
            <Text style={styles.cardTitle} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Carte de chiffre clé : "Étals recensés · 2 480 · dont 610 sans place physique". */
export function KpiCard({ label, value, note }: { label: string; value: string; note?: string }) {
  const wide = useIsWide();
  return (
    <View style={[styles.kpi, wide ? { flex: 1 } : styles.kpiNarrow]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {note ? <Text style={styles.kpiNote}>{note}</Text> : null}
    </View>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <View style={styles.kpiRow}>{children}</View>;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  page: { flexGrow: 1 },
  inner: { width: '100%', maxWidth: 1240, alignSelf: 'center' },
  title: { fontSize: 34, fontWeight: '700', color: colors.text },
  titleNarrow: { fontSize: 26 },
  subtitle: { fontSize: fontSize.title, color: colors.textMuted, marginTop: spacing.sm, maxWidth: 760, lineHeight: 24 },
  body: { marginTop: spacing.xl, gap: spacing.xl },
  row: { flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start' },
  column: { gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  cardTitle: { fontSize: fontSize.heading, fontWeight: '700', color: colors.text },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  kpi: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.xs, minWidth: 220 },
  kpiNarrow: { flexBasis: '46%', flexGrow: 1, minWidth: 150 },
  kpiLabel: { fontSize: fontSize.body, color: colors.textMuted },
  kpiValue: { fontSize: 32, fontWeight: '700', color: colors.text },
  kpiNote: { fontSize: fontSize.body, color: colors.textMuted },
});
