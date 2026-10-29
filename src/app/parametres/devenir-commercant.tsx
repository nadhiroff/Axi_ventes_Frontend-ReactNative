import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ApiError, errorMessage, type LocalFile } from '../../api/client';
import { api } from '../../api/endpoints';
import type { IdType, MerchantType } from '../../api/types';
import { PlacePicker } from '../../components/merchant/PlacePicker';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip, OptionTile } from '../../components/ui/Chip';
import { Field } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useStallOptions } from '../../hooks/api/merchant';
import { takeProductPhoto } from '../../hooks/useProductPhoto';
import { useT } from '../../i18n';
import { confirmAction, notify } from '../../lib/confirm';
import { formatShortDate } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';

const ID_TYPES: IdType[] = ['cni', 'cip', 'passport', 'other'];
type Photos = { id_front: LocalFile | null; id_back: LocalFile | null; selfie: LocalFile | null; stall_photo: LocalFile | null };

/**
 * Devenir commerçant : le client envoie sa pièce d'identité, un selfie, une photo de son étal et son emplacement.
 * Un agent Axi vérifie dans l'espace web ; à la validation, le compte devient commerçant (email + félicitations).
 */
export default function BecomeMerchantScreen() {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const application = user?.merchant_application ?? null;
  const [editing, setEditing] = useState(false);

  if (!user) return null;
  const pending = application?.status === 'pending';
  const rejected = application?.status === 'rejected';

  return (
    <>
      <ScreenHeader title={t('apply.title')} />
      <Screen>
        <View style={styles.column}>
          {user.role === 'merchant' ? (
            <Card style={{ gap: spacing.md }}>
              <Text style={styles.title}>{t('apply.alreadyTitle')}</Text>
              <Text style={styles.muted}>{t('apply.alreadyText')}</Text>
              <Button label={t('account.merchantSpace')} icon="briefcase" onPress={() => router.replace('/commercant')} />
            </Card>
          ) : pending ? (
            <Card style={{ gap: spacing.md }}>
              <View style={styles.statusIcon}>
                <Icon name="clock" size={28} color={colors.brand} />
              </View>
              <Text style={styles.title}>{t('apply.pendingTitle')}</Text>
              <Text style={styles.muted}>{t('apply.pendingText', { date: formatShortDate(application.created_at) })}</Text>
            </Card>
          ) : rejected && !editing ? (
            <Card style={{ gap: spacing.md }}>
              <Text style={styles.title}>{t('apply.rejectedTitle')}</Text>
              <Text style={styles.reason}>{application.reject_reason}</Text>
              <Text style={styles.muted}>{t('apply.rejectedText')}</Text>
              <Button label={t('apply.retry')} onPress={() => setEditing(true)} />
            </Card>
          ) : (
            <>
              <Card style={{ gap: spacing.sm }}>
                <Text style={styles.title}>{t('apply.introTitle')}</Text>
                {(['apply.step1', 'apply.step2', 'apply.step3'] as const).map((k, i) => (
                  <View key={k} style={styles.step}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.text, { flex: 1 }]}>{t(k)}</Text>
                  </View>
                ))}
                <Text style={styles.muted}>{t('apply.privacy')}</Text>
              </Card>
              <ApplicationForm initialPhone={user.phone ?? ''} />
            </>
          )}
        </View>
      </Screen>
    </>
  );
}

function ApplicationForm({ initialPhone }: { initialPhone: string }) {
  const styles = useStyles();
  const t = useT();
  const setUser = useAuthStore((s) => s.setUser);
  const options = useStallOptions().data;
  const [form, setForm] = useState({
    stall_name: '',
    merchant_type: 'retail' as MerchantType,
    phone: initialPhone,
    id_type: 'cni' as IdType,
    id_number: '',
    row: '',
    stand: '',
    site: { id: '', other: '' },
    aisle: { id: '', other: '' },
  });
  const [photos, setPhotos] = useState<Photos>({ id_front: null, id_back: null, selfie: null, stall_photo: null });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const set = <K extends keyof typeof form>(key: K) => (value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    const local: Record<string, string> = {};
    if (!form.stall_name.trim()) local.stall_name = t('auth.required');
    if (form.phone.replace(/\D/g, '').length < 8) local.phone = t('apply.phoneRequired');
    if (!form.id_number.trim()) local.id_number = t('auth.required');
    if (!form.aisle.id) local.aisle_id = t('apply.chooseAisle');
    else if (form.aisle.id === options?.other_aisle_id && form.aisle.other.trim().length < 2) local.aisle_id = t('merchant.otherRequired');
    if (!form.site.id) local.site_id = t('apply.chooseSite');
    else if (form.site.id === options?.other_site_id && form.site.other.trim().length < 2) local.site_id = t('merchant.otherRequired');
    if (!photos.id_front) local.id_front = t('apply.photoRequired');
    if (!photos.selfie) local.selfie = t('apply.photoRequired');
    if (!photos.stall_photo) local.stall_photo = t('apply.photoRequired');
    setErrors(local);
    if (Object.keys(local).length) {
      notify(t('apply.title'), t('apply.missing'), 'error');
      return;
    }
    confirmAction(t('apply.confirmTitle'), t('apply.confirmText'), async () => {
      setSending(true);
      try {
        const { site, aisle, ...rest } = form;
        const result = await api.applyMerchant(
          { ...rest, stall_name: rest.stall_name.trim(), id_number: rest.id_number.trim(), site_id: site.id, site_other: site.other.trim(), aisle_id: aisle.id, aisle_other: aisle.other.trim() },
          { id_front: photos.id_front!, id_back: photos.id_back, selfie: photos.selfie!, stall_photo: photos.stall_photo! },
        );
        setUser(result.user);
        notify(t('apply.sentTitle'), result.message, 'success');
      } catch (e) {
        if (e instanceof ApiError) setErrors({ ...e.fields, ...(e.fields.site_other ? { site_id: e.fields.site_other } : {}), ...(e.fields.aisle_other ? { aisle_id: e.fields.aisle_other } : {}) });
        notify(t('apply.title'), errorMessage(e), 'error');
      } finally {
        setSending(false);
      }
    }, { confirmLabel: t('apply.send') });
  };

  return (
    <>
      <Text style={styles.section}>{t('apply.stallSection')}</Text>
      <Card style={{ gap: spacing.lg }}>
        <Field label={t('merchant.name')} value={form.stall_name} onChangeText={set('stall_name')} error={errors.stall_name} placeholder={t('apply.stallNamePlaceholder')} maxLength={100} />
        <Text style={styles.label}>{t('merchant.type')}</Text>
        <View style={styles.row}>
          <OptionTile label={t('merchant.retail')} selected={form.merchant_type === 'retail'} onPress={() => set('merchant_type')('retail')} />
          <OptionTile label={t('merchant.wholesale')} selected={form.merchant_type === 'wholesale'} onPress={() => set('merchant_type')('wholesale')} />
        </View>
        <PlacePicker kind="aisle" options={options} value={form.aisle} onChange={set('aisle')} error={errors.aisle_id} />
        <PlacePicker kind="site" options={options} value={form.site} onChange={set('site')} error={errors.site_id} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label={`${t('merchant.row')} (${t('common.optional')})`} value={form.row} onChangeText={set('row')} maxLength={30} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={`${t('merchant.stand')} (${t('common.optional')})`} value={form.stand} onChangeText={set('stand')} maxLength={20} />
          </View>
        </View>
        <PhotoSlot label={t('apply.stallPhoto')} hint={t('apply.stallPhotoHint')} photo={photos.stall_photo} square error={errors.stall_photo} onChange={(p) => setPhotos((x) => ({ ...x, stall_photo: p }))} />
      </Card>

      <Text style={styles.section}>{t('apply.identitySection')}</Text>
      <Card style={{ gap: spacing.lg }}>
        <Field label={t('apply.phone')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" hint={t('apply.phoneHint')} error={errors.phone} />
        <Text style={styles.label}>{t('apply.idType')}</Text>
        <View style={styles.wrap}>
          {ID_TYPES.map((type) => (
            <Chip key={type} label={t(`apply.idTypes.${type}`)} selected={form.id_type === type} onPress={() => set('id_type')(type)} />
          ))}
        </View>
        <Field label={t('apply.idNumber')} value={form.id_number} onChangeText={set('id_number')} autoCapitalize="characters" error={errors.id_number} maxLength={40} />
        <PhotoSlot label={t('apply.idFront')} photo={photos.id_front} error={errors.id_front} onChange={(p) => setPhotos((x) => ({ ...x, id_front: p }))} />
        <PhotoSlot label={`${t('apply.idBack')} (${t('common.optional')})`} photo={photos.id_back} onChange={(p) => setPhotos((x) => ({ ...x, id_back: p }))} />
        <PhotoSlot label={t('apply.selfie')} hint={t('apply.selfieHint')} photo={photos.selfie} square error={errors.selfie} onChange={(p) => setPhotos((x) => ({ ...x, selfie: p }))} />
      </Card>
      <Button label={t('apply.send')} size="lg" icon="send" onPress={submit} loading={sending} />
      <Text style={styles.muted}>{t('apply.privacy')}</Text>
    </>
  );
}

/** Une photo à fournir : aperçu, « Appareil photo » ou « Galerie », retirer. */
function PhotoSlot({ label, hint, photo, square, error, onChange }: { label: string; hint?: string; photo: LocalFile | null; square?: boolean; error?: string; onChange: (p: LocalFile | null) => void }) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const pick = async (source: 'camera' | 'library') => {
    const p = await takeProductPhoto(source, !!square);
    if (p) onChange(p);
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.muted}>{hint}</Text> : null}
      <View style={[styles.slot, error ? { borderColor: colors.danger } : null]}>
        {photo ? (
          <>
            <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" />
            <Pressable onPress={() => onChange(null)} style={styles.remove} accessibilityRole="button" accessibilityLabel={t('cart.remove')} hitSlop={8}>
              <Icon name="x" size={16} color="#FFFFFF" />
            </Pressable>
          </>
        ) : (
          <Icon name="image" size={28} color={colors.textMuted} />
        )}
      </View>
      <View style={styles.row}>
        <Button label={t('common.camera')} icon="camera" variant="ghost" size="sm" onPress={() => pick('camera')} style={{ flex: 1 }} />
        <Button label={t('common.gallery')} icon="image" variant="ghost" size="sm" onPress={() => pick('library')} style={{ flex: 1 }} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  column: { gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  section: { fontSize: fontSize.title, fontWeight: '700', color: c.text, marginTop: spacing.sm },
  title: { fontSize: fontSize.title + 1, fontWeight: '700', color: c.text },
  text: { fontSize: fontSize.body, color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  reason: { fontSize: fontSize.body, color: c.danger, fontWeight: '600' },
  label: { fontSize: fontSize.small, fontWeight: '600', color: c.text },
  row: { flexDirection: 'row', gap: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { color: c.danger, fontSize: fontSize.small },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: c.brandDark, fontWeight: '700' },
  statusIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' },
  slot: { height: 180, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  preview: { width: '100%', height: '100%' },
  remove: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
}));
