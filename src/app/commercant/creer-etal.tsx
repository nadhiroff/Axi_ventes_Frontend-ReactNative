import { router } from 'expo-router';
import { Text } from 'react-native';

import { api } from '../../api/endpoints';
import { StallForm } from '../../components/merchant/StallForm';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useStallMutations } from '../../hooks/api/merchant';
import { useT } from '../../i18n';
import { useAuthStore } from '../../store/authStore';
import { fontSize, useTheme } from '../../theme';

/** Premier lancement du commerçant : créer son étal (un agent Axi viendra le vérifier sur place). */
export default function CreateStallScreen() {
  const t = useT();
  const { colors } = useTheme();
  const mutations = useStallMutations();
  const setUser = useAuthStore((s) => s.setUser);
  return (
    <>
      <ScreenHeader title={t('merchant.onboardingTitle')} showBack={false} />
      <Screen>
        <Card tone="brandSoft">
          <Text style={{ color: colors.brandDark, fontSize: fontSize.body, fontWeight: '600' }}>{t('merchant.onboardingText')}</Text>
        </Card>
        <StallForm
          submitLabel={t('merchant.createStall')}
          onSubmit={async (input) => {
            await mutations.create.mutateAsync(input);
            setUser(await api.me());
            router.replace('/commercant/etal');
          }}
        />
      </Screen>
    </>
  );
}
