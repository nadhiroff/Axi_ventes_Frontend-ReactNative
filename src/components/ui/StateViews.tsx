import { ActivityIndicator, Text, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { useT } from '../../i18n';
import { fontSize, makeStyles, spacing, useTheme } from '../../theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export function LoadingView() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <Icon name="wifi-off" size={32} color={colors.textMuted} />
      <Text style={styles.text}>{errorMessage(error)}</Text>
      <Button label={t('common.retry')} variant="outline" onPress={onRetry} />
    </View>
  );
}

export function EmptyView({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: { label: string; onPress: () => void } }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <Icon name={icon} size={32} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {text ? <Text style={styles.text}>{text}</Text> : null}
      {action ? <Button label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md, minHeight: 240 },
  title: { fontSize: fontSize.title, fontWeight: '700', color: c.text, textAlign: 'center' },
  text: { fontSize: fontSize.body, color: c.textMuted, textAlign: 'center', maxWidth: 420 },
}));
