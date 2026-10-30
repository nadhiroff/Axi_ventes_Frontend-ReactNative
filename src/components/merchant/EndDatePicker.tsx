import { Text, View } from 'react-native';

import { useT } from '../../i18n';
import { fontSize, makeStyles, spacing } from '../../theme';
import { Chip } from '../ui/Chip';

/** AAAA-MM-JJ dans n jours (date du téléphone, heure locale) */
export function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** « mer. 5 novembre » */
export function formatDay(iso: string, lang: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
}

/**
 * Date de fin d'une annonce (obligatoire) : durées toutes prêtes, dans la limite de la formule
 * (7 jours sans abonnement, 30 jours abonné). L'annonce disparaît d'elle-même après ce jour.
 */
export function EndDatePicker({ value, onChange, maxDays, error }: { value: string | null; onChange: (iso: string) => void; maxDays: number; error?: string }) {
  const styles = useStyles();
  const t = useT();
  const lang = t('common.yes') === 'Yes' ? 'en' : 'fr';
  const choices = [1, 3, 7, 14, 30].filter((d) => d <= maxDays);
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>{t('merchant.endsOnLabel')}</Text>
      <View style={styles.wrap}>
        {choices.map((d) => (
          <Chip key={d} label={d === 1 ? t('merchant.endsTomorrow') : t('merchant.endsInDays', { n: d })} selected={value === inDays(d)} onPress={() => onChange(inDays(d))} />
        ))}
      </View>
      {value ? (
        <Text style={styles.until}>{t('merchant.endsUntil', { date: formatDay(value, lang) })}</Text>
      ) : (
        <Text style={error ? styles.error : styles.hint}>{error ?? t('merchant.endsHint', { n: maxDays })}</Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  label: { fontSize: fontSize.small, fontWeight: '700', color: c.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  until: { fontSize: fontSize.small, color: c.trustText, fontWeight: '700' },
  hint: { fontSize: fontSize.small, color: c.textMuted },
  error: { fontSize: fontSize.small, color: c.danger },
}));
