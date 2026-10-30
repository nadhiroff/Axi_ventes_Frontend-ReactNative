import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Tag } from '../../components/ui/Tag';
import { useAccountActions, useConsents, useSettings } from '../../hooks/api/account';
import { useT } from '../../i18n';
import { confirmAction, notify } from '../../lib/confirm';
import { formatShortDate } from '../../lib/format';
import { leaveSession } from '../../lib/authFlow';
import { fontSize, makeStyles, spacing } from '../../theme';

/** Confidentialité : consentements (voir, révoquer), export de mes données, suppression du compte (double confirmation) */
export default function PrivacyScreen() {
  const styles = useStyles();
  const t = useT();
  const consents = useConsents();
  const actions = useAccountActions();
  const dateFormat = useSettings().data?.date_format;
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const exportData = () =>
    actions.exportData.mutate(undefined, {
      onSuccess: ({ url }) => Linking.openURL(url).catch(() => notify(t('settings.exportData'), url, 'error')),
      onError: (e) => notify(t('settings.exportData'), errorMessage(e), 'error'),
    });

  const deleteAccount = () =>
    confirmAction(t('settings.deleteConfirm1'), t('settings.deleteText1'), () =>
      confirmAction(t('settings.deleteConfirm2'), t('settings.deleteText2'), async () => {
        setDeleting(true);
        try {
          await api.deleteAccount(password);
          await leaveSession(false);
          notify(t('settings.deleted'));
        } catch (e) {
          notify(t('settings.deleteAccount'), errorMessage(e), 'error');
        } finally {
          setDeleting(false);
        }
      }, { destructive: true, confirmLabel: t('common.delete') }),
      { destructive: true },
    );

  return (
    <>
      <ScreenHeader title={t('settings.privacy')} />
      <Screen>
        <Text style={styles.section}>{t('settings.consents')}</Text>
        {!consents.data?.consents.length ? <Text style={styles.muted}>{t('settings.noConsents')}</Text> : null}
        {(consents.data?.consents ?? []).map((c) => (
          <Card key={c.id} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={[styles.title, { flex: 1 }]}>{c.partner_name}</Text>
              <Tag label={c.active ? t('settings.consentActive') : t('settings.consentRevoked')} tone={c.active ? 'trust' : 'outline'} />
            </View>
            <Text style={styles.muted}>{c.scope}</Text>
            <Text style={styles.muted}>{formatShortDate(c.granted_at, dateFormat)}{c.revoked_at ? ` → ${formatShortDate(c.revoked_at, dateFormat)}` : ''}</Text>
            {c.active ? <Button label={t('settings.revokeConsentButton')} variant="danger" size="sm" onPress={() => confirmAction(t('settings.revokeConsent'), c.partner_name, () => actions.revokeConsent.mutate(c.id, { onError: (e) => notify(t('settings.revokeConsent'), errorMessage(e), 'error') }), { destructive: true })} /> : null}
          </Card>
        ))}

        <Text style={styles.section}>{t('settings.exportData')}</Text>
        <Card style={{ gap: spacing.md }}>
          <Text style={styles.muted}>{t('settings.exportText')}</Text>
          <Button label={t('settings.exportData')} icon="download" variant="ghost" onPress={exportData} loading={actions.exportData.isPending} />
        </Card>

        <Text style={styles.section}>{t('settings.deleteAccount')}</Text>
        <Card tone="dangerSoft" style={{ gap: spacing.md }}>
          <Text style={styles.muted}>{t('settings.deleteText1')}</Text>
          <Field label={t('auth.password')} value={password} onChangeText={setPassword} secret />
          <Button label={t('settings.deleteAccount')} variant="danger" icon="trash-2" onPress={deleteAccount} loading={deleting} disabled={!password} />
        </Card>
      </Screen>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontSize: fontSize.heading - 2, fontWeight: '700', color: c.text, marginTop: spacing.md },
  title: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
}));
