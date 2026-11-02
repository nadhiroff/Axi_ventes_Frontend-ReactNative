import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ApiError, errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import type { AvatarVisibility } from '../../api/types';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { OptionTile } from '../../components/ui/Chip';
import { Field } from '../../components/ui/Field';
import { ImageViewer } from '../../components/ui/ImageViewer';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { takeProductPhoto } from '../../hooks/useProductPhoto';
import { useConfirmLeave } from '../../hooks/useConfirmLeave';
import { useT } from '../../i18n';
import { confirmAction, notify, toast } from '../../lib/confirm';
import { useAuthStore } from '../../store/authStore';
import { fontSize, makeStyles, spacing } from '../../theme';

const VISIBILITY: AvatarVisibility[] = ['everyone', 'contacts', 'nobody'];

/**
 * Mon profil : photo (facultative) et qui peut la voir, prénom, nom, téléphone de contact.
 * L'email sert d'identifiant et ne change pas ici.
 */
export default function ProfileScreen() {
  const styles = useStyles();
  const t = useT();
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '', phone: user?.phone ?? '', bio: user?.bio ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  // Toucher ma photo : elle s'affiche en grand
  const [viewing, setViewing] = useState(false);
  // Différent du profil enregistré = modification en cours
  const dirty = !!user && (form.first_name !== user.first_name || form.last_name !== user.last_name || form.phone !== (user.phone ?? '') || form.bio !== (user.bio ?? ''));
  const { leave, cancel } = useConfirmLeave(dirty);

  const save = async () => {
    setSaving(true);
    try {
      setUser(await api.updateMe({ first_name: form.first_name.trim(), last_name: form.last_name.trim(), phone: form.phone.trim() || null, bio: form.bio.trim() || null }));
      setErrors({});
      toast(t('settings.profileSaved'));
      // Enregistré : retour automatique à l'écran précédent, sans question
      leave();
    } catch (e) {
      setErrors(e instanceof ApiError ? e.fields : {});
      notify(t('settings.profile'), errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    const photo = await takeProductPhoto(source);
    if (!photo) return;
    setPhotoBusy(true);
    try {
      setUser(await api.uploadAvatar(photo));
      toast(t('settings.photoSaved'));
    } catch (e) {
      notify(t('settings.photo'), errorMessage(e), 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = () =>
    confirmAction(t('settings.photoRemoveConfirm'), t('settings.photoRemoveText'), async () => {
      try {
        setUser(await api.deleteAvatar());
        toast(t('settings.photoRemoved'));
      } catch (e) {
        notify(t('settings.photo'), errorMessage(e), 'error');
      }
    }, { destructive: true, confirmLabel: t('common.delete') });

  // Qui peut voir ma photo : le choix s'affiche tout de suite ; plusieurs appuis rapides n'envoient qu'UN
  // enregistrement (le dernier choix, après une courte pause), donc un seul « Enregistré » et jamais un ancien
  // choix qui reviendrait parce que les réponses du serveur arrivent dans le désordre
  const [pendingVisibility, setPendingVisibility] = useState<AvatarVisibility | null>(null);
  const visibilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityRequest = useRef(0);
  const sendVisibility = useRef<(v: AvatarVisibility, quiet: boolean) => Promise<void>>(async () => undefined);
  const send = async (avatar_visibility: AvatarVisibility, quiet: boolean) => {
    const request = ++visibilityRequest.current;
    try {
      const updated = await api.updateMe({ avatar_visibility });
      if (request !== visibilityRequest.current) return; // un choix plus récent a pris le relais
      setUser(updated);
      setPendingVisibility(null);
      if (!quiet) toast(t('common.saved'));
    } catch (e) {
      if (request !== visibilityRequest.current) return;
      setPendingVisibility(null);
      if (!quiet) notify(t('settings.photo'), errorMessage(e), 'error');
    }
  };
  // Toujours la dernière version (langue à jour) pour l'enregistrement lancé en quittant l'écran
  useEffect(() => {
    sendVisibility.current = send;
  });
  const latestVisibility = useRef<AvatarVisibility | null>(null);
  // Écran quitté pendant la pause : le dernier choix est quand même enregistré
  useEffect(
    () => () => {
      if (visibilityTimer.current && latestVisibility.current) {
        clearTimeout(visibilityTimer.current);
        void sendVisibility.current(latestVisibility.current, true);
      }
    },
    [],
  );
  const setVisibility = (avatar_visibility: AvatarVisibility) => {
    if (!user) return;
    const shown = pendingVisibility ?? user.avatar_visibility;
    if (shown === avatar_visibility) return;
    setPendingVisibility(avatar_visibility);
    latestVisibility.current = avatar_visibility;
    if (visibilityTimer.current) clearTimeout(visibilityTimer.current);
    visibilityTimer.current = setTimeout(() => {
      visibilityTimer.current = null;
      latestVisibility.current = null;
      void send(avatar_visibility, false);
    }, 500);
  };

  if (!user) return null;
  const visibility = pendingVisibility ?? user.avatar_visibility;
  return (
    <>
      <ScreenHeader title={t('settings.profile')} />
      <Screen>
        <View style={styles.column}>
          <Card style={{ gap: spacing.md, alignItems: 'center' }}>
            <Pressable onPress={() => user.avatar && setViewing(true)} disabled={!user.avatar} accessibilityRole="imagebutton" accessibilityLabel={t('settings.photo')}>
              <Avatar name={user.name} image={user.avatar} size={104} variant="soft" />
            </Pressable>
            <Text style={styles.muted}>{t('settings.photoHint')}</Text>
            <View style={styles.row}>
              <Button label={t('common.camera')} icon="camera" variant="ghost" size="sm" onPress={() => pickPhoto('camera')} loading={photoBusy} style={{ flex: 1 }} />
              <Button label={t('common.gallery')} icon="image" variant="ghost" size="sm" onPress={() => pickPhoto('library')} disabled={photoBusy} style={{ flex: 1 }} />
            </View>
            {user.avatar ? <Button label={t('settings.photoRemove')} variant="danger" size="sm" icon="trash-2" onPress={removePhoto} /> : null}
            <Text style={[styles.label, { alignSelf: 'flex-start' }]}>{t('settings.photoWho')}</Text>
            <View style={styles.row}>
              {VISIBILITY.map((v) => (
                <OptionTile key={v} label={t(`settings.visibility.${v}`)} selected={visibility === v} onPress={() => setVisibility(v)} />
              ))}
            </View>
            <Text style={styles.muted}>{t(`settings.visibilityHint.${visibility}`)}</Text>
          </Card>
          <Card style={{ gap: spacing.lg }}>
            <Text style={styles.muted}>{user.email}</Text>
            <Field label={t('auth.firstName')} value={form.first_name} onChangeText={(v) => setForm((f) => ({ ...f, first_name: v }))} error={errors.first_name} />
            <Field label={t('auth.lastName')} value={form.last_name} onChangeText={(v) => setForm((f) => ({ ...f, last_name: v }))} error={errors.last_name} />
            <Field label={`${t('auth.phone')} (${t('common.optional')})`} value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" hint={t('auth.phoneHint')} error={errors.phone} />
            <Field
              label={`${t('profile.bio')} (${t('common.optional')})`}
              value={form.bio}
              onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))}
              multiline
              maxLength={300}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
              hint={t('profile.bioHint')}
              error={errors.bio}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label={t('common.cancel')} variant="ghost" onPress={cancel} style={{ flex: 1 }} />
              <Button label={t('common.update')} onPress={save} loading={saving} style={{ flex: 2 }} />
            </View>
          </Card>
        </View>
      </Screen>
      <ImageViewer images={user.avatar ? [user.avatar] : []} visible={viewing} onClose={() => setViewing(false)} title={user.name} />
    </>
  );
}

const useStyles = makeStyles((c) => ({
  column: { gap: spacing.md, maxWidth: 560, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  label: { fontSize: fontSize.body, fontWeight: '600', color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted, textAlign: 'center' },
}));
