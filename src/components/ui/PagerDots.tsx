import { View } from 'react-native';

import { makeStyles } from '../../theme';

/** Petits points sous un carrousel : celui de la carte affichée est allongé */
export function PagerDots({ count, page }: { count: number; page: number }) {
  const styles = useStyles();
  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.border },
  dotOn: { width: 18, backgroundColor: c.brand },
}));
