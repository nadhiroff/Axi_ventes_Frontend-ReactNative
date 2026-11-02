import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
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
import { useAccountActions, useConsents, useSettings } from '../../hooks/api/account';
import { useT } from '../../i18n';
import { confirmAction, notify } from '../../lib/confirm';
import { formatShortDate } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { fontSize, makeStyles, spacing } from '../../theme';

/**
 * Confidentialité : personnes bloquées, consentements (voir, révoquer), mes données (PDF), et demande de suppression du
 * compte : mot de passe + raison, envoyée à l'équipe Axi qui efface le compte ou annule ; annulable tant qu'elle attend.
 */
export default function PrivacyScreen() {
  const styles = useStyles();
  const t = useT();
  const consents = useConsents();
  const actions = useAccountActions();
  const dateFormat = useSettings().data?.date_format;
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();
  const deletion = useQuery({ queryKey: ['me', 'deletion-request'], queryFn: api.deletionRequest, staleTime: 0 });
  const pending = deletion.data?.request ?? null;

  // Commerçant : les accords de partage se donnent dans « Mon argent » (partage de l'historique avec l'IMF)
  const merchant = useAuthStore((s) => s.user?.role === 'merchant');

  const deleteAccount = () => {
    if (reason.trim().length < 10) {
      setReasonError(t('settings.deleteReasonShort'));
      return;
    }
    setReasonError(undefined);
    confirmAction(t('settings.deleteConfirm2'), t('settings.deleteText2'), async () => {
      setDeleting(true);
      try {
        const r = await api.deleteAccount(password, reason.trim());
        setPassword('');
        setReason('');
        setPasswordError(undefined);
        qc.setQueryData(['me', 'deletion-request'], { request: r.request });
        // Alerte claire : la demande est partie vers l'équipe Axi, qui répondra
        notify(t('settings.deleteSentTitle'), r.message, 'success');
      } catch (e) {
        if (e instanceof ApiError) {
          setPasswordError(e.fields.password);
          setReasonError(e.fields.reason);
        }
        notify(t('settings.deleteAccount'), errorMessage(e), 'error');
      } finally {
        setDeleting(false);
      }
    }, { destructive: true, confirmLabel: t('settings.deleteSend') });
  };

  const cancelDeletion = () =>
    confirmAction(t('settings.deleteCancelConfirm'), t('settings.deleteCancelText'), async () => {
      try {
        const r = await api.cancelDeletionRequest();
        qc.setQueryData(['me', 'deletion-request'], { request: null });
        notify(r.message);
      } catch (e) {
        notify(t('settings.deleteCancel'), errorMessage(e), 'error');
      }
    }, { confirmLabel: t('settings.deleteCancel') });

  return (
    <>
      <ScreenHeader title={t('settings.privacy')} />
      <Screen>
        <Text style={styles.section}>{t('settings.consents')}</Text>
        {/* À quoi sert un accord, et où le donner : sans cela, « aucun accord » ne voulait rien dire */}
        <Text style={styles.muted}>{t('settings.consentsHint')}</Text>
        {!consents.data?.consents.length ? (
          <Card style={{ gap: spacing.md }}>
            <Text style={styles.muted}>{t('settings.noConsents')}</Text>
            {merchant ? (
              <Button label={t('settings.consentsManage')} icon="share-2" variant="ghost" onPress={() => router.push('/commercant/argent')} />
            ) : (
              <Text style={styles.muted}>{t('settings.consentsClient')}</Text>
            )}
          </Card>
        ) : null}
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
          <Button label={t('settings.exportData')} icon="download" variant="ghost" onPress={() => router.push('/parametres/mes-donnees')} />
        </Card>

        <Text style={styles.section}>{t('settings.deleteAccount')}</Text>
        {pending ? (
          // Demande en attente : rappel, raison donnée, et possibilité d'annuler
          <Card tone="dangerSoft" style={{ gap: spacing.md }}>
            <Text style={styles.title}>{t('settings.deletePendingTitle')}</Text>
            <Text style={styles.muted}>{t('settings.deletePendingText', { date: formatShortDate(pending.created_at, dateFormat) })}</Text>
            <Text style={styles.muted}>{t('settings.deletePendingReason', { reason: pending.reason })}</Text>
            <Button label={t('settings.deleteCancel')} icon="rotate-ccw" variant="ghost" onPress={cancelDeletion} />
          </Card>
        ) : (
          <Card tone="dangerSoft" style={{ gap: spacing.md }}>
            <Text style={styles.muted}>{t('settings.deleteText1')}</Text>
            <Field
              label={t('settings.deleteReason')}
              value={reason}
              onChangeText={(v) => { setReason(v); setReasonError(undefined); }}
              placeholder={t('settings.deleteReasonPlaceholder')}
              multiline
              maxLength={1000}
              error={reasonError}
            />
            <Field label={t('auth.password')} value={password} onChangeText={(v) => { setPassword(v); setPasswordError(undefined); }} secret error={passwordError} />
            <Button label={t('settings.deleteSend')} variant="danger" icon="send" onPress={deleteAccount} loading={deleting} disabled={!password || !reason.trim() || deletion.isPending} />
          </Card>
        )}
      </Screen>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontSize: fontSize.heading - 2, fontWeight: '700', color: c.text, marginTop: spacing.md },
  title: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
}));
