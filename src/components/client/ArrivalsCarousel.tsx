import { useRef } from 'react';
import { FlatList, View } from 'react-native';

import type { HomeAnnouncement } from '../../api/types';
import { useAutoPager } from '../../hooks/useSlideshow';
import { makeStyles, spacing } from '../../theme';
import { HomeAnnouncementCard } from './AnnouncementCard';

/**
 * Arrivages de l'accueil : défilent seuls (une carte à la fois, retour au début à la fin) pour attirer
 * l'œil, et se font glisser au doigt. Pause après un glissement et quand l'accueil est caché
 * (minuterie partagée de useSlideshow, la même pour toutes les photos de l'application).
 */
export function ArrivalsCarousel({ items, cardWidth }: { items: HomeAnnouncement[]; cardWidth: number }) {
  const styles = useStyles();
  const list = useRef<FlatList<HomeAnnouncement>>(null);
  const step = cardWidth + spacing.md;
  const { page, onDrag, setPage } = useAutoPager(list, items.length, step);

  return (
    <View style={{ gap: spacing.sm }}>
      <FlatList
        ref={list}
        horizontal
        data={items}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <HomeAnnouncementCard a={item} width={cardWidth} />}
        ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
        contentContainerStyle={{ paddingRight: spacing.md }}
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        getItemLayout={(_, i) => ({ length: step, offset: step * i, index: i })}
        onScrollBeginDrag={onDrag}
        onMomentumScrollEnd={(e) => setPage(Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.x / step))))}
      />
      {items.length > 1 ? (
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {items.map((a, i) => (
            <View key={a.id} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.border },
  dotOn: { width: 18, backgroundColor: c.brand },
}));
