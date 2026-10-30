import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { errorMessage } from '../api/client';
import { api } from '../api/endpoints';
import { queryKeys } from '../hooks/api/queryKeys';
import { useT } from '../i18n';
import { notify, toast } from '../lib/confirm';
import { fontSize, makeStyles, radius, spacing } from '../theme';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';

/**
 * Invitations reçues : un commerçant veut m'ajouter à ses clients. Tant que je n'ai pas accepté,
 * aucune discussion n'est possible entre nous. Accepter ouvre la discussion dans les deux sens.
 */
export function ClientInvites() {
  const styles = useStyles();
  const t = useT();
  const qc = useQueryClient();
  const invites = useQuery({ queryKey: queryKeys.clientInvites, queryFn: api.clientInvites }).data?.invites ?? [];
  const answer = useMutation({
    mutationFn: (v: { id: string; accept: boolean }) => api.answerClientInvite(v.id, v.accept),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: queryKeys.clientInvites });
      qc.invalidateQueries({ queryKey: queryKeys.conversations });
      toast(v.accept ? t('invites.accepted') : t('invites.declined'), v.accept ? 'success' : 'info');
    },
    onError: (e) => notify(t('invites.title'), errorMessage(e), 'error'),
  });
  if (!invites.length) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.section}>{t('invites.title')}</Text>
      {invites.map((inv) => (
        <View key={inv.id} style={styles.card}>
          <Pressable onPress={() => router.push(`/etal/${inv.stall.id}`)} style={styles.who} accessibilityRole="link">
            <Avatar name={inv.stall.name} image={inv.stall.avatar} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{inv.stall.name}</Text>
              <Text style={styles.text}>{t('invites.text')}</Text>
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label={t('invites.decline')} variant="ghost" size="sm" onPress={() => answer.mutate({ id: inv.id, accept: false })} disabled={answer.isPending} style={{ flex: 1 }} />
            <Button label={t('invites.accept')} size="sm" icon="check" onPress={() => answer.mutate({ id: inv.id, accept: true })} loading={answer.isPending && answer.variables?.id === inv.id && answer.variables.accept} style={{ flex: 1 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  card: { gap: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg, borderLeftWidth: 4, borderLeftColor: c.trust },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  text: { fontSize: fontSize.small, color: c.textMuted },
}));
