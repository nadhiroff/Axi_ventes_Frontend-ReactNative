import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { errorMessage } from '../../api/client';
import type { CampaignFormat, ProCampaigns } from '../../api/types';
import { useCreateCampaign } from '../../hooks/api/pro';
import { formatFcfa, group } from '../../lib/format';
import { colors, fontSize, radius, spacing } from '../../theme';
import { Button } from '../ui/Button';
import { ProCard } from './layout';
import { SelectField } from './SelectField';

/** "Nouvelle campagne" : public visé, format, budget. Le ciblage reste chez Axi. */
export function CampaignForm({ data }: { data: ProCampaigns }) {
  const create = useCreateCampaign();
  const [audience, setAudience] = useState(data.audiences[0]?.id ?? '');
  const [format, setFormat] = useState<CampaignFormat>(data.formats[0]?.id ?? 'supplier_offer');
  const [budget, setBudget] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const amount = Number(budget.replace(/\D/g, ''));
  const valid = !!audience && amount >= data.min_budget;

  const submit = () => {
    setMessage(null);
    create.mutate(
      { audience_id: audience, format, budget: amount },
      {
        onSuccess: (c) => {
          setBudget('');
          setMessage({ ok: true, text: `Campagne envoyée : ${c.status_label.toLowerCase()} par l’équipe Axi avant diffusion.` });
        },
        onError: (e) => setMessage({ ok: false, text: errorMessage(e) }),
      },
    );
  };

  return (
    <ProCard title="Nouvelle campagne">
      <View style={styles.field}>
        <Text style={styles.label}>Public visé</Text>
        <SelectField
          value={audience}
          onChange={setAudience}
          accessibilityLabel="Public visé"
          options={data.audiences.map((a) => ({ value: a.id, label: `${a.label} (${group(a.reach)})` }))}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Format</Text>
        <SelectField
          value={format}
          onChange={(v) => setFormat(v as CampaignFormat)}
          accessibilityLabel="Format"
          options={data.formats.map((f) => ({ value: f.id, label: f.label }))}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Budget</Text>
        <View style={styles.budgetRow}>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            keyboardType="number-pad"
            placeholder={`${group(data.min_budget)} minimum`}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            accessibilityLabel="Budget en FCFA"
          />
          <Text style={styles.currency}>FCFA</Text>
        </View>
        {amount > 0 && amount < data.min_budget ? (
          <Text style={styles.hint}>Budget minimum : {formatFcfa(data.min_budget)}</Text>
        ) : null}
      </View>
      <Button label="Lancer la campagne" size="lg" onPress={submit} disabled={!valid} loading={create.isPending} />
      {message ? <Text style={[styles.message, { color: message.ok ? colors.trust : colors.danger }]}>{message.text}</Text> : null}
      <Text style={styles.note}>Le ciblage se fait dans Axi. Aucune donnée personnelle n’est transmise à l’annonceur.</Text>
    </ProCard>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { fontSize: fontSize.title, fontWeight: '600', color: colors.text },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.title,
    color: colors.text,
  },
  currency: { fontSize: fontSize.title, color: colors.textMuted },
  hint: { fontSize: fontSize.small, color: colors.danger },
  message: { fontSize: fontSize.body },
  note: { fontSize: fontSize.body, color: colors.textMuted, lineHeight: 21 },
});
