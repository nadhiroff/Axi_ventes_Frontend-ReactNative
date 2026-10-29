import { Stack } from 'expo-router';

import { colors } from '../../theme';

export default function MerchantLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="nouveau-produit" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
