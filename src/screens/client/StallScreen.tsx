import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenPlaceholder } from '../../components/ui/ScreenPlaceholder';
import type { ClientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ClientStackParamList, 'Stall'>;

// À venir : identité de l'étal, Appeler / WhatsApp / Message vocal, produits du jour (useStall).
export function StallScreen({ route }: Props) {
  return <ScreenPlaceholder title="Page d'un étal" note={`Étal ${route.params.stallId}`} />;
}
