import { Text, View } from 'react-native';

import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useBlockedUsers } from '../../hooks/api/account';
import { useT } from '../../i18n';
import { unblockUser } from '../../lib/blockUser';
import { formatShortDate } from '../../lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '../../theme';

/** Paramètres > Utilisateurs bloqués : les personnes que j'ai bloquées, pour les débloquer quand je veux */
export default function BlockedUsersScreen() {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const query = useBlockedUsers();

  return (
    <>
      <ScreenHeader title={t('block.listTitle')} />
      <Screen>
        <View style={styles.column}>
          <Text style={styles.muted}>{t('block.listHint')}</Text>
          {query.isPending ? (
            <LoadingView />
          ) : !query.data ? (
            <ErrorView error={query.error} onRetry={() => query.refetch()} />
          ) : query.data.users.length === 0 ? (
            <Card style={styles.empty}>
              <Icon name="slash" size={28} color={colors.textMuted} />
              <Text style={[styles.muted, { textAlign: 'center' }]}>{t('block.empty')}</Text>
            </Card>
          ) : (
            <Card style={{ paddingVertical: spacing.xs }}>
              {query.data.users.map((u, i) => (
                <View key={u.id} style={[styles.row, i > 0 && styles.divider]}>
                  <Avatar name={u.display_name} image={u.avatar} size={44} variant="soft" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{u.display_name}</Text>
                    <Text style={styles.muted} numberOfLines={1}>
                      {u.role === 'merchant' ? `${t('block.merchant')}${u.stall_name ? ` · ${u.stall_name}` : ''}` : t('block.client')}
                    </Text>
                    <Text style={styles.small}>{t('block.since', { date: formatShortDate(u.blocked_at) })}</Text>
                  </View>
                  <Button label={t('block.unblock')} size="sm" variant="ghost" onPress={() => unblockUser(u.id, u.display_name, () => query.refetch())} />
                </View>
              ))}
            </Card>
          )}
        </View>
      </Screen>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  column: { gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  small: { fontSize: fontSize.caption, color: c.textMuted, marginTop: 2 },
  name: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: c.border },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
}));
