import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { spacing, useLayout, useTheme } from '../../theme';

type Props = {
  children: ReactNode;
  /** Ignorés : pas de « tirer pour actualiser » (application, pas site web) ; les données se mettent à jour seules */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** contenu fixe en bas (bouton principal) */
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
};

/**
 * Conteneur d'écran adaptatif : sur tablette et iPad, le contenu est centré avec une largeur
 * maximale lisible ; marges plus grandes ; défilement et « tirer pour actualiser ».
 * Clavier : le champ en cours de saisie remonte toujours au-dessus du clavier ; toucher ailleurs ou
 * glisser vers le bas ferme le clavier.
 */
export function Screen({ children, footer, contentStyle, scroll = true }: Props) {
  const { colors } = useTheme();
  const { contentWidth, gutter } = useLayout();
  const inner = <View style={[{ width: '100%', maxWidth: contentWidth, alignSelf: 'center', paddingHorizontal: gutter, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm }, contentStyle]}>{children}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {scroll ? (
        <KeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          bottomOffset={64}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {inner}
        </KeyboardAwareScrollView>
      ) : (
        inner
      )}
      {footer ? (
        <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ width: '100%', maxWidth: contentWidth, alignSelf: 'center', paddingHorizontal: gutter, paddingVertical: spacing.md }}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

/** Grille adaptative : 2 colonnes sur téléphone, 3 sur tablette, 4 sur grand écran (ou nombre imposé) */
export function Grid({ children, columns, gap = spacing.md }: { children: ReactNode[]; columns: number; gap?: number }) {
  const rows: ReactNode[][] = [];
  children.forEach((child, i) => {
    if (i % columns === 0) rows.push([]);
    rows[rows.length - 1].push(child);
  });
  return (
    <View style={{ gap }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap }}>
          {row}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`pad-${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}
