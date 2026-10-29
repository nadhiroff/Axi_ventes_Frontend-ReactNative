import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { StallSummary } from '../../api/types';
import { useT } from '../../i18n';
import { fontSize, makeStyles, radius, spacing } from '../../theme';
import { Avatar } from '../ui/Avatar';
import { Tag } from '../ui/Tag';
import { VerifiedIcon } from '../ui/VerifiedIcon';

/** Ligne d'étal : photo ou initiales, nom + coche verte, spécialité, emplacement, « Ouvert ». */
export function StallCard({ stall }: { stall: StallSummary }) {
  const styles = useStyles();
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${stall.name}, ${stall.location.label}`}
      onPress={() => router.push(`/etal/${stall.id}`)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <Avatar name={stall.name} image={stall.avatar} size={64} />
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {stall.name}
          </Text>
          {stall.verified ? <VerifiedIcon /> : null}
        </View>
        {stall.tagline ? (
          <Text style={styles.tagline} numberOfLines={1}>
            {stall.tagline}
          </Text>
        ) : null}
        <Text style={styles.location} numberOfLines={1}>
          {stall.location.label}
        </Text>
        {stall.location.moved_at ? <Text style={styles.moved}>{t('stall.newLocation')}</Text> : null}
      </View>
      {stall.is_open ? <Tag label={t('stall.open')} tone="trust" /> : <Tag label={t('stall.closed')} tone="outline" />}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg },
  body: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: fontSize.title, fontWeight: '700', color: c.text, flexShrink: 1 },
  tagline: { fontSize: fontSize.body, color: c.textMuted },
  location: { fontSize: fontSize.small, color: c.textMuted },
  moved: { fontSize: fontSize.caption, color: c.brand, fontWeight: '600', marginTop: 2 },
}));
