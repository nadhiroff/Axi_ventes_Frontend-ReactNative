import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '../../theme';

export type Column<T> = {
  key: string;
  label: string;
  flex?: number;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
};

type Props<T> = { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; empty?: string };

/** Tableau simple ; défile horizontalement si l'écran est trop étroit. */
export function DataTable<T>({ columns, rows, rowKey, empty = 'Aucune donnée.' }: Props<T>) {
  const minWidth = columns.reduce((w, c) => w + (c.flex ?? 1) * 130, 0);
  return (
    <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }} showsHorizontalScrollIndicator={false}>
      <View style={[styles.table, { minWidth }]} accessibilityRole="list">
        <View style={[styles.row, styles.header]}>
          {columns.map((c) => (
            <Text key={c.key} style={[styles.headCell, { flex: c.flex ?? 1 }, c.align === 'right' && styles.right]}>
              {c.label}
            </Text>
          ))}
        </View>
        {rows.length === 0 ? <Text style={styles.empty}>{empty}</Text> : null}
        {rows.map((row) => (
          <View key={rowKey(row)} style={styles.row}>
            {columns.map((c) => {
              const value = c.render(row);
              return (
                <View key={c.key} style={[styles.cellBox, { flex: c.flex ?? 1 }, c.align === 'right' && styles.cellRight]}>
                  {typeof value === 'string' || typeof value === 'number' ? (
                    <Text style={[styles.cell, c.align === 'right' && styles.right]}>{value}</Text>
                  ) : (
                    value
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  header: { borderBottomWidth: 1.5, borderBottomColor: '#D6CFC8', paddingTop: 0 },
  headCell: { fontSize: fontSize.body, fontWeight: '600', color: colors.textMuted },
  cellBox: { justifyContent: 'center' },
  cellRight: { alignItems: 'flex-end' },
  cell: { fontSize: fontSize.title, color: colors.text },
  right: { textAlign: 'right' },
  empty: { padding: spacing.lg, color: colors.textMuted, fontSize: fontSize.body },
});
