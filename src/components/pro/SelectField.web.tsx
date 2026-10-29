import { colors, fontSize, radius } from '../../theme';
import type { SelectFieldProps } from './SelectField';

/** Liste déroulante native du navigateur, comme "Public visé" sur la maquette d'Axi Pro. */
export function SelectField({ value, options, onChange, accessibilityLabel }: SelectFieldProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={accessibilityLabel}
      style={{
        width: '100%',
        fontSize: fontSize.title,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: colors.text,
        backgroundColor: colors.surface,
        border: `1.5px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: '14px 16px',
        cursor: 'pointer',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
