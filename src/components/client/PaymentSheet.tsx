import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { MobileMoneyOperator } from '../../api/types';
import { formatFcfa } from '../../lib/format';
import { colors, fontSize, radius, spacing } from '../../theme';
import { Button } from '../ui/Button';
import { OptionTile } from '../ui/Chip';

const operators: { id: MobileMoneyOperator; label: string }[] = [
  { id: 'mtn', label: 'MTN MoMo' },
  { id: 'moov', label: 'Moov Money' },
  { id: 'celtiis', label: 'Celtiis Cash' },
];

type Props = {
  visible: boolean;
  total: number;
  paying: boolean;
  onPay: (operator: MobileMoneyOperator, phone: string) => void;
  onClose: () => void;
};

/** Choix de l'opérateur et du numéro avant le paiement unique. */
export function PaymentSheet({ visible, total, paying, onPay, onClose }: Props) {
  const [operator, setOperator] = useState<MobileMoneyOperator>('mtn');
  const [phone, setPhone] = useState('');
  const digits = phone.replace(/\D/g, '');
  const valid = digits.length >= 8;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Payer {formatFcfa(total)}</Text>
          <Text style={styles.hint}>Un seul paiement pour tous les étals. Axi garde l’argent jusqu’à la réception.</Text>

          <Text style={styles.label}>Opérateur</Text>
          <View style={styles.row}>
            {operators.map((o) => (
              <OptionTile key={o.id} label={o.label} selected={operator === o.id} onPress={() => setOperator(o.id)} />
            ))}
          </View>

          <Text style={styles.label}>Numéro Mobile Money</Text>
          <View style={styles.phoneRow}>
            <Text style={styles.prefix}>+229</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="01 97 00 00 00"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              maxLength={14}
              accessibilityLabel="Numéro Mobile Money"
            />
          </View>

          <Button
            label="Confirmer le paiement"
            size="lg"
            onPress={() => onPay(operator, `+229${digits}`)}
            disabled={!valid}
            loading={paying}
          />
          <Pressable onPress={onClose} style={styles.cancel} accessibilityRole="button">
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  title: { fontSize: fontSize.heading, fontWeight: '700', color: colors.text },
  hint: { fontSize: fontSize.body, color: colors.trustText },
  label: { fontSize: fontSize.small, fontWeight: '600', color: colors.textMuted, marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  prefix: { fontSize: fontSize.title, color: colors.textMuted, marginRight: spacing.sm },
  input: { flex: 1, fontSize: fontSize.title, color: colors.text, paddingVertical: spacing.md },
  cancel: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { fontSize: fontSize.body, color: colors.textMuted, fontWeight: '600' },
});
