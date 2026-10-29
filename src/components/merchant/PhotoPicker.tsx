import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import type { LocalFile } from '../../api/client';
import { takeProductPhoto } from '../../hooks/useProductPhoto';
import { useT } from '../../i18n';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

/** Choix de photos (appareil ou galerie), réduites à 1080 px en WebP sur le téléphone avant l'envoi. */
export function PhotoPicker({ photos, onChange, max = 5 }: { photos: LocalFile[]; onChange: (photos: LocalFile[]) => void; max?: number }) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const pick = async (source: 'camera' | 'library') => {
    const photo = await takeProductPhoto(source);
    if (photo) onChange([...photos, photo].slice(0, max));
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>{t('merchant.photos')}</Text>
      <View style={styles.grid}>
        {photos.map((p, i) => (
          <View key={p.uri} style={styles.thumb}>
            <Image source={{ uri: p.uri }} style={styles.img} contentFit="cover" />
            <Pressable onPress={() => onChange(photos.filter((_, k) => k !== i))} accessibilityRole="button" accessibilityLabel={t('cart.remove')} style={styles.remove} hitSlop={6}>
              <Icon name="x" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}
        {photos.length === 0 ? (
          <View style={[styles.thumb, styles.empty]}>
            <Icon name="image" size={24} color={colors.textMuted} />
          </View>
        ) : null}
      </View>
      {photos.length < max ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button label={t('common.camera')} icon="camera" variant="ghost" size="sm" onPress={() => pick('camera')} style={{ flex: 1 }} />
          <Button label={t('common.gallery')} icon="image" variant="ghost" size="sm" onPress={() => pick('library')} style={{ flex: 1 }} />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  label: { fontSize: fontSize.small, fontWeight: '600', color: c.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: 88, height: 88, borderRadius: radius.md, overflow: 'hidden', backgroundColor: c.surfaceAlt },
  img: { width: 88, height: 88 },
  empty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: c.border },
  remove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
}));
