import { useState } from 'react';
import { Text, View } from 'react-native';

import { ApiError, errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Tag } from '../../components/ui/Tag';
import { useAccountActions, useLoginHistory, useSessions, useSettings } from '../../hooks/api/account';
import { useT } from '../../i18n';
import { confirmAction, notify } from '../../lib/confirm';
import { formatShortDate } from '../../lib/format';
import { leaveSession } from '../../lib/authFlow';
import { fontSize, makeStyles, spacing } from '../../theme';

/** Sécurité : changer le mot de passe, appareils connectés, historique, déconnexion de tous les appareils */
export default function SecurityScreen() {
  const styles = useStyles();
  const t = useT();
  const sessions = useSessions();
  const history = useLoginHistory();
  const actions = useAccountActions();
  const dateFormat = useSettings().data?.date_format;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const changePassword = () => {
    if (next.length < 8) {
      setErrors({ new_password: t('auth.shortPassword') });
      return;
    }
    confirmAction(t('settings.changePassword'), t('settings.passwordConfirm'), () =>
      actions.changePassword.mutate(
        { current, next },
        {
          onSuccess: () => {
            setCurrent('');
            setNext('');
            setErrors({});
            notify(t('settings.passwordChanged'));
            sessions.refetch();
          },
          // Chaque erreur sous son champ (mot de passe actuel faux, nouveau trop long…)
          onError: (e) => setErrors(e instanceof ApiError && Object.keys(e.fields).length ? e.fields : { current_password: errorMessage(e) }),
        },
      ),
    );
  };

  return (
    <>
      <ScreenHeader title={t('settings.security')} />
      <Screen>
        <Card style={{ gap: spacing.md }}>
          <Text style={styles.title}>{t('settings.changePassword')}</Text>
          <Field label={t('settings.currentPassword')} value={current} onChangeText={setCurrent} secret error={errors.current_password} />
          <Field label={t('auth.newPassword')} value={next} onChangeText={setNext} secret hint={t('auth.passwordHint')} error={errors.new_password} />
          <Button label={t('settings.changePassword')} onPress={changePassword} loading={actions.changePassword.isPending} disabled={!current || !next} />
        </Card>

        <Text style={styles.section}>{t('settings.sessions')}</Text>
        {(sessions.data?.sessions ?? []).map((s) => (
          <Card key={s.id} style={styles.line}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{s.device}</Text>
              <Text style={styles.muted}>{formatShortDate(s.last_used_at, dateFormat, true)}{s.ip ? ` · ${s.ip}` : ''}</Text>
            </View>
            {s.current ? (
              <Tag label={t('settings.thisDevice')} tone="trust" />
            ) : (
              <Button label={t('account.logout')} size="sm" variant="danger" onPress={() => confirmAction(t('settings.revokeSession'), s.device, () => actions.revokeSession.mutate(s.id, { onError: (e) => notify(t('settings.revokeSession'), errorMessage(e), 'error') }), { destructive: true })} />
            )}
          </Card>
        ))}
        <Button
          label={t('settings.logoutAll')}
          variant="danger"
          icon="log-out"
          onPress={() =>
            confirmAction(t('settings.logoutAllConfirm'), t('account.logoutText'), async () => {
              await api.logoutAll().catch(() => undefined);
              await leaveSession(false);
            }, { destructive: true })
          }
        />

        <Text style={styles.section}>{t('settings.history')}</Text>
        {(history.data?.events ?? []).map((e, i) => (
          <View key={i} style={styles.event}>
            <Tag label={e.label} tone={e.success ? 'trust' : 'danger'} />
            <Text style={styles.muted}>{[formatShortDate(e.created_at, dateFormat, true), e.channel === 'web' ? 'Web' : e.device, e.ip].filter(Boolean).join(' · ')}</Text>
          </View>
        ))}
      </Screen>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontSize: fontSize.heading - 2, fontWeight: '700', color: c.text, marginTop: spacing.md },
  title: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted, flexShrink: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  event: { gap: 4, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border },
}));
