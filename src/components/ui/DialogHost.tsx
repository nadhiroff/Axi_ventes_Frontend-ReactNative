import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export type Tone = 'success' | 'error' | 'info' | 'danger';
export type DialogButton = { label: string; onPress?: () => void; variant?: 'primary' | 'ghost' | 'destructive' };
type Dialog = { id: number; title: string; message?: string; tone: Tone; buttons: DialogButton[] };
type ToastAction = { label: string; onPress: () => void };
type Toast = { id: number; message: string; tone: Tone; action?: ToastAction };

let nextId = 1;

/** File des fenêtres (une à la fois) et des notifications courtes, affichées par <DialogHost /> */
export const useDialogStore = create<{
  dialogs: Dialog[];
  toasts: Toast[];
  showDialog: (d: Omit<Dialog, 'id'>) => void;
  closeDialog: () => void;
  showToast: (message: string, tone: Tone, action?: ToastAction) => void;
  hideToast: (id: number) => void;
}>()((set) => ({
  dialogs: [],
  toasts: [],
  // Même message déjà affiché (plusieurs appuis) : pas de fenêtre en double à refermer
  showDialog: (d) => set((s) => (s.dialogs.some((x) => x.title === d.title && x.message === d.message) ? s : { dialogs: [...s.dialogs, { ...d, id: nextId++ }] })),
  closeDialog: () => set((s) => ({ dialogs: s.dialogs.slice(1) })),
  // Message avec bouton : un seul à la fois, le nouveau remplace le précédent (ajouts au panier à la suite)
  showToast: (message, tone, action) => set((s) => ({ toasts: [...(action ? s.toasts.filter((t) => !t.action) : s.toasts).slice(-2), { id: nextId++, message, tone, action }] })),
  hideToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const ICONS: Record<Tone, IconName> = { success: 'check', error: 'alert-triangle', info: 'info', danger: 'alert-circle' };

/** À placer une fois à la racine : fenêtres de confirmation et notifications aux couleurs d'Axi (jamais les alertes du système). */
export function DialogHost() {
  const dialog = useDialogStore((s) => s.dialogs[0]);
  const toasts = useDialogStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  return (
    <>
      {/* En haut à droite, étroites et semi-transparentes : le bouton retour, à gauche, reste toujours visible */}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + spacing.sm, right: spacing.md, width: '68%', maxWidth: 360, gap: spacing.sm, alignItems: 'flex-end' }}>
        {toasts.filter((t) => !t.action).map((t) => (
          <ToastView key={t.id} toast={t} />
        ))}
      </View>
      {/* Message avec bouton (« Voir le panier ») : en bas, à portée du pouce, au-dessus de la barre d'onglets */}
      <View pointerEvents="box-none" style={{ position: 'absolute', bottom: insets.bottom + 88, left: spacing.md, right: spacing.md, alignItems: 'center' }}>
        {toasts.filter((t) => t.action).map((t) => (
          <ToastView key={t.id} toast={t} />
        ))}
      </View>
      {dialog ? <DialogView key={dialog.id} dialog={dialog} /> : null}
    </>
  );
}

function DialogView({ dialog }: { dialog: Dialog }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const close = useDialogStore((s) => s.closeDialog);
  const tint = dialog.tone === 'success' ? colors.trust : dialog.tone === 'error' || dialog.tone === 'danger' ? colors.danger : colors.brand;
  const soft = dialog.tone === 'success' ? colors.trustSoft : dialog.tone === 'error' || dialog.tone === 'danger' ? colors.dangerSoft : colors.brandSoft;
  const press = (b: DialogButton) => {
    close();
    b.onPress?.();
  };
  const cancel = dialog.buttons.find((b) => b.variant === 'ghost') ?? dialog.buttons[dialog.buttons.length - 1];
  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={() => press(cancel)}>
      <Pressable style={styles.backdrop} onPress={() => dialog.buttons.length === 1 && press(cancel)} accessibilityRole="none">
        <Pressable style={styles.card} accessibilityRole="alert">
          <View style={[styles.icon, { backgroundColor: soft }]}>
            <Icon name={ICONS[dialog.tone]} size={24} color={tint} />
          </View>
          <Text style={styles.title}>{dialog.title}</Text>
          {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
          {/* Plus de deux choix : boutons empilés, « Annuler » en bas */}
          <View style={[styles.buttons, dialog.buttons.length > 2 && { flexDirection: 'column-reverse' }]}>
            {dialog.buttons.map((b) => (
              <Button key={b.label} label={b.label} variant={b.variant ?? 'primary'} onPress={() => press(b)} style={dialog.buttons.length > 2 ? undefined : { flex: 1 }} />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ToastView({ toast }: { toast: Toast }) {
  const styles = useStyles();
  const { colors, dark } = useTheme();
  const hide = useDialogStore((s) => s.hideToast);
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => hide(toast.id)), 3200);
    return () => clearTimeout(timer);
  }, [hide, opacity, toast.id]);
  const tint = toast.tone === 'success' ? colors.trust : toast.tone === 'error' ? colors.danger : colors.brand;
  return (
    <Animated.View style={[styles.toast, { opacity, backgroundColor: dark ? 'rgba(245,245,244,0.88)' : 'rgba(28,25,23,0.82)', transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>
      <Pressable onPress={() => hide(toast.id)} style={styles.toastRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <View style={[styles.toastIcon, { backgroundColor: tint }]}>
          <Icon name={ICONS[toast.tone]} size={12} color="#FFFFFF" />
        </View>
        <Text style={[styles.toastText, { color: dark ? '#1C1917' : '#FFFFFF' }]} numberOfLines={1}>{toast.message}</Text>
        {toast.action ? (
          <Pressable
            onPress={() => {
              hide(toast.id);
              toast.action?.onPress();
            }}
            hitSlop={10}
            accessibilityRole="button"
            style={styles.toastAction}
          >
            <Text style={styles.toastActionText}>{toast.action.label}</Text>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(12,10,9,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { width: '100%', maxWidth: 420, backgroundColor: c.surface, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  title: { fontSize: fontSize.title + 2, fontWeight: '700', color: c.text },
  message: { fontSize: fontSize.body, color: c.textMuted, lineHeight: 21 },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  toast: { borderRadius: radius.lg, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  toastRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  toastIcon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toastText: { flexShrink: 1, fontSize: fontSize.small, fontWeight: '600' },
  toastAction: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: c.brand },
  toastActionText: { color: '#FFFFFF', fontSize: fontSize.small, fontWeight: '700' },
}));
