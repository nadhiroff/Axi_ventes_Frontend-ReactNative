import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { colors, fontSize, spacing } from '../../theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export function LoadingView() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Icon name="wifi" size={32} color={colors.textMuted} />
      <Text style={styles.text}>{errorMessage(error)}</Text>
      <Button label="Réessayer" variant="outline" onPress={onRetry} />
    </View>
  );
}

export function EmptyView({ icon, title, text }: { icon: IconName; title: string; text?: string }) {
  return (
    <View style={styles.center}>
      <Icon name={icon} size={32} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {text ? <Text style={styles.text}>{text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  title: { fontSize: fontSize.title, fontWeight: '700', color: colors.text, textAlign: 'center' },
  text: { fontSize: fontSize.body, color: colors.textMuted, textAlign: 'center' },
});
