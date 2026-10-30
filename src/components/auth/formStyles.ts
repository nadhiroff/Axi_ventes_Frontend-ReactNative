import { fontSize, makeStyles, spacing } from '../../theme';

/** Styles communs des formulaires de connexion et d'inscription (largeur limitée sur tablette) */
export const useFormStyles = makeStyles((c) => ({
  form: { gap: spacing.lg, width: '100%', maxWidth: 520, alignSelf: 'center' },
  reason: { color: c.brandDark, fontSize: fontSize.body, fontWeight: '600' },
  error: { color: c.danger, fontSize: fontSize.body, fontWeight: '600' },
  text: { color: c.textMuted, fontSize: fontSize.body },
  hint: { color: c.textMuted, fontSize: fontSize.small, textAlign: 'center' },
  label: { fontSize: fontSize.small, fontWeight: '600', color: c.text },
  row: { flexDirection: 'row', gap: spacing.md },
}));
