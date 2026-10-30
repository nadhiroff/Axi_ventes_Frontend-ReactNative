import { View } from 'react-native';

import type { MessageStatus } from '../../api/types';
import { useTheme } from '../../theme';
import { Icon } from '../ui/Icon';

/** Bleu des messages vus, comme WhatsApp */
const READ_BLUE = '#34B7F1';

/**
 * Coches comme WhatsApp : ✓ envoyé, ✓✓ reçu, ✓✓ bleu vu.
 * onBrand : sur une bulle orange (texte blanc) ; sinon sur fond clair ou sombre de l'écran.
 */
export function Ticks({ status, onBrand = false, size = 14 }: { status: MessageStatus | null; onBrand?: boolean; size?: number }) {
  const { colors } = useTheme();
  if (!status) return null;
  const color = status === 'read' ? (onBrand ? '#7DD3FC' : READ_BLUE) : onBrand ? 'rgba(255,255,255,0.75)' : colors.textMuted;
  return (
    <View style={{ flexDirection: 'row' }} accessibilityLabel={status}>
      <Icon name="check" size={size} color={color} />
      {status !== 'sent' ? (
        <View style={{ marginLeft: -size * 0.64 }}>
          <Icon name="check" size={size} color={color} />
        </View>
      ) : null}
    </View>
  );
}
