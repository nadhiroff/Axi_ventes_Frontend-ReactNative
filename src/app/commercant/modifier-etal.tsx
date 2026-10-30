import { Pressable, Text, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { StallForm } from '../../components/merchant/StallForm';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { CachedImage } from '../../components/ui/CachedImage';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useMerchantStall, useStallMutations } from '../../hooks/api/merchant';
import { pickPhotos, takeProductPhoto } from '../../hooks/useProductPhoto';
import { useT } from '../../i18n';
import { confirmAction, notify, toast } from '../../lib/confirm';
import { fontSize, spacing, useTheme } from '../../theme';

// Même limite que le serveur (StallController::GALLERY_MAX)
const GALLERY_MAX = 8;

/** Modifier mon étal : photo, nom, emplacement, contacts, options. */
export default function EditStallScreen() {
  const t = useT();
  const { colors } = useTheme();
  const stall = useMerchantStall();
  const mutations = useStallMutations();
  const s = stall.data?.stall;

  if (stall.isPending) return <LoadingView />;
  if (!s) return <ErrorView error={stall.error} onRetry={() => stall.refetch()} />;

  const changePhoto = async (source: 'camera' | 'library') => {
    const photo = await takeProductPhoto(source);
    if (photo) mutations.photo.mutate(photo, { onSuccess: () => toast(t('common.saved')), onError: (e) => notify(t('merchant.stallPhoto'), errorMessage(e), 'error') });
  };

  // Galerie : les photos après la photo principale ; depuis la galerie du téléphone, plusieurs d'un coup
  const gallery = s.photos.slice(s.avatar ? 1 : 0);
  const left = GALLERY_MAX - gallery.length;
  const addGallery = async (source: 'camera' | 'library') => {
    const photos = source === 'library' ? await pickPhotos(left) : await takeProductPhoto('camera', false).then((p) => (p ? [p] : []));
    if (!photos.length) return;
    mutations.addGallery.mutate(photos, {
      onSuccess: () => toast(photos.length > 1 ? t('merchant.photosAdded', { count: photos.length }) : t('merchant.photoAdded')),
      onError: (e) => notify(t('merchant.gallery'), errorMessage(e), 'error'),
    });
  };

  return (
    <>
      <ScreenHeader title={t('merchant.editStall')} />
      <Screen>
        {/* Photo principale : aperçu à gauche, puis deux boutons de même largeur, alignés sur toute la largeur */}
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar name={s.name} image={s.avatar} size={72} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: fontSize.body }}>{t('merchant.stallPhoto')}</Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.small }}>{t('merchant.stallPhotoHint')}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label={t('common.camera')} icon="camera" size="sm" variant="ghost" onPress={() => changePhoto('camera')} loading={mutations.photo.isPending} style={{ flex: 1 }} />
            <Button label={t('common.gallery')} icon="image" size="sm" variant="ghost" onPress={() => changePhoto('library')} disabled={mutations.photo.isPending} style={{ flex: 1 }} />
          </View>
        </Card>
        <Card style={{ gap: spacing.md }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: fontSize.body }}>{`${t('merchant.gallery')} · ${gallery.length}/${GALLERY_MAX}`}</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.small }}>{t('merchant.galleryHint')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {gallery.map((img, i) => (
              <View key={img.thumb_url + i} style={{ width: 88, height: 88, borderRadius: 12, overflow: 'hidden' }}>
                <CachedImage image={img} style={{ width: 88, height: 88 }} contentFit="cover" />
                <Pressable
                  onPress={() => confirmAction(t('merchant.removePhoto'), s.name, () => mutations.removeGallery.mutate(i, { onSuccess: () => toast(t('merchant.photoRemoved'), 'info'), onError: (e) => notify(t('merchant.gallery'), errorMessage(e), 'error') }), { destructive: true })}
                  accessibilityRole="button"
                  accessibilityLabel={t('cart.remove')}
                  hitSlop={6}
                  style={{ position: 'absolute', top: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="trash-2" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </View>
          {left > 0 ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label={t('common.camera')} icon="camera" size="sm" variant="ghost" onPress={() => addGallery('camera')} loading={mutations.addGallery.isPending} style={{ flex: 1 }} />
              <Button label={t('common.gallery')} icon="image" size="sm" variant="ghost" onPress={() => addGallery('library')} disabled={mutations.addGallery.isPending} style={{ flex: 1 }} />
            </View>
          ) : null}
        </Card>
        <StallForm
          initial={s}
          submitLabel={t('common.update')}
          onSubmit={async (input) => {
            await mutations.update.mutateAsync(input);
            toast(t('merchant.stallSaved'));
          }}
        />
      </Screen>
    </>
  );
}
