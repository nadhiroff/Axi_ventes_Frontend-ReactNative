import { Text, View } from 'react-native';

import type { StallOptions } from '../../api/types';
import { useT } from '../../i18n';
import { fontSize, makeStyles, spacing } from '../../theme';
import { Chip } from '../ui/Chip';
import { Field } from '../ui/Field';

type Choice = { id: string; other: string };

/**
 * Choix d'une allée ou d'un marché dans la liste, ou « Autre » avec un nom libre
 * (un agent Axi l'ajoutera ensuite à la liste pour tout le monde).
 */
export function PlacePicker({
  kind,
  options,
  value,
  onChange,
  error,
}: {
  kind: 'aisle' | 'site';
  options: StallOptions | undefined;
  value: Choice;
  onChange: (v: Choice) => void;
  error?: string;
}) {
  const styles = useStyles();
  const t = useT();
  const list = kind === 'aisle' ? (options?.aisles ?? []) : (options?.sites ?? []);
  const otherId = kind === 'aisle' ? (options?.other_aisle_id ?? 'autres') : (options?.other_site_id ?? 'autre');
  const isOther = value.id === otherId;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>{kind === 'aisle' ? t('merchant.aisle') : t('merchant.site')}</Text>
      <View style={styles.wrap}>
        {list.map((item) => (
          <Chip key={item.id} label={item.name} selected={value.id === item.id} onPress={() => onChange({ id: item.id, other: '' })} />
        ))}
        <Chip label={t('merchant.other')} icon="plus" selected={isOther} onPress={() => onChange({ id: otherId, other: value.other })} />
      </View>
      {isOther ? (
        <Field
          label={kind === 'aisle' ? t('merchant.otherAisle') : t('merchant.otherSite')}
          value={value.other}
          onChangeText={(other) => onChange({ id: otherId, other })}
          placeholder={kind === 'aisle' ? t('merchant.otherAislePlaceholder') : t('merchant.otherSitePlaceholder')}
          hint={t('merchant.otherHint')}
          autoFocus
          maxLength={100}
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  label: { fontSize: fontSize.small, fontWeight: '600', color: c.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { color: c.danger, fontSize: fontSize.small },
}));
