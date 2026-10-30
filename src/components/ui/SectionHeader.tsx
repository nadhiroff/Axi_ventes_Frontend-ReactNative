import { Pressable, Text, View } from 'react-native';

import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { Icon } from './Icon';

type Props = { title: string; actionLabel?: string; onAction?: () => void; note?: string | null };

/** « Les allées … Tout voir » : l'action est un vrai bouton (pastille avec flèche), jamais un lien souligné. */
export function SectionHeader({ title, actionLabel, onAction, note }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button" accessibilityLabel={actionLabel} style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Icon name="chevron-right" size={16} color={colors.brandDark} />
        </Pressable>
      ) : note ? (
        <Text style={styles.note}>{note}</Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  title: { fontSize: fontSize.heading - 2, fontWeight: '700', color: c.text, flexShrink: 1 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: c.brandSoft, borderRadius: radius.pill, paddingLeft: spacing.md, paddingRight: spacing.sm, paddingVertical: 6 },
  actionText: { fontSize: fontSize.small, color: c.brandDark, fontWeight: '700' },
  note: { fontSize: fontSize.small, color: c.textMuted },
}));
