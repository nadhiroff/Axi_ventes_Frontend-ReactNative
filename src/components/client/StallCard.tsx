import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { StallSummary } from '../../api/types';
import { colors, fontSize, radius, spacing } from '../../theme';
import { Avatar } from '../ui/Avatar';
import { Tag } from '../ui/Tag';
import { VerifiedIcon } from '../ui/VerifiedIcon';

/** Ligne "Vos étals" : initiales, nom + coche verte, spécialité, emplacement, "Ouvert". */
export function StallCard({ stall }: { stall: StallSummary }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${stall.name}, ${stall.location.label}`}
      onPress={() => router.push(`/etal/${stall.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Avatar name={stall.name} image={stall.avatar} size={64} />
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {stall.name}
          </Text>
          {stall.verified ? <VerifiedIcon /> : null}
        </View>
        <Text style={styles.tagline} numberOfLines={1}>
          {stall.tagline}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {stall.location.label}
        </Text>
        {stall.location.moved_at ? <Text style={styles.moved}>Nouvel emplacement</Text> : null}
      </View>
      {stall.is_open ? <Tag label="Ouvert" tone="trust" /> : <Tag label="Fermé" tone="outline" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.85 },
  body: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: fontSize.title, fontWeight: '700', color: colors.text, flexShrink: 1 },
  tagline: { fontSize: fontSize.body, color: colors.textMuted },
  location: { fontSize: fontSize.small, color: colors.textMuted },
  moved: { fontSize: fontSize.caption, color: colors.brand, fontWeight: '600', marginTop: 2 },
});
