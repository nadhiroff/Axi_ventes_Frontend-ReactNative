import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { StallForm } from '../../components/merchant/StallForm';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useMerchantStall, useStallMutations } from '../../hooks/api/merchant';
import { takeProductPhoto } from '../../hooks/useProductPhoto';
import { useT } from '../../i18n';
import { notify, toast } from '../../lib/confirm';
import { fontSize, spacing, useTheme } from '../../theme';

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

  return (
    <>
      <ScreenHeader title={t('merchant.editStall')} />
      <Screen>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' }}>
          <Avatar name={s.name} image={s.avatar} size={84} />
          <View style={{ flex: 1, gap: spacing.sm, minWidth: 200 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: fontSize.body }}>{t('merchant.stallPhoto')}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label={t('common.camera')} icon="camera" size="sm" variant="ghost" onPress={() => changePhoto('camera')} loading={mutations.photo.isPending} />
              <Button label={t('common.gallery')} icon="image" size="sm" variant="ghost" onPress={() => changePhoto('library')} />
            </View>
          </View>
        </Card>
        <StallForm
          initial={s}
          submitLabel={t('common.save')}
          onSubmit={async (input) => {
            await mutations.update.mutateAsync(input);
            toast(t('merchant.stallSaved'));
            router.back();
          }}
        />
      </Screen>
    </>
  );
}
