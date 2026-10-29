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
type Toast = { id: number; message: string; tone: Tone };

let nextId = 1;

/** File des fenêtres (une à la fois) et des notifications courtes, affichées par <DialogHost /> */
export const useDialogStore = create<{
  dialogs: Dialog[];
  toasts: Toast[];
  showDialog: (d: Omit<Dialog, 'id'>) => void;
  closeDialog: () => void;
  showToast: (message: string, tone: Tone) => void;
  hideToast: (id: number) => void;
}>()((set) => ({
  dialogs: [],
  toasts: [],
  showDialog: (d) => set((s) => ({ dialogs: [...s.dialogs, { ...d, id: nextId++ }] })),
  closeDialog: () => set((s) => ({ dialogs: s.dialogs.slice(1) })),
  showToast: (message, tone) => set((s) => ({ toasts: [...s.toasts.slice(-2), { id: nextId++, message, tone }] })),
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
      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + spacing.sm, left: spacing.lg, right: spacing.lg, gap: spacing.sm, alignItems: 'center' }}>
        {toasts.map((t) => (
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
          <View style={styles.buttons}>
            {dialog.buttons.map((b) => (
              <Button key={b.label} label={b.label} variant={b.variant ?? 'primary'} onPress={() => press(b)} style={{ flex: 1 }} />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ToastView({ toast }: { toast: Toast }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const hide = useDialogStore((s) => s.hideToast);
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => hide(toast.id)), 3200);
    return () => clearTimeout(timer);
  }, [hide, opacity, toast.id]);
  const tint = toast.tone === 'success' ? colors.trust : toast.tone === 'error' ? colors.danger : colors.brand;
  return (
    <Animated.View style={[styles.toast, { opacity, borderLeftColor: tint, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>
      <Pressable onPress={() => hide(toast.id)} style={styles.toastRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <View style={[styles.toastIcon, { backgroundColor: tint }]}>
          <Icon name={ICONS[toast.tone]} size={14} color="#FFFFFF" />
        </View>
        <Text style={styles.toastText}>{toast.message}</Text>
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
  toast: { width: '100%', maxWidth: 460, backgroundColor: c.surface, borderRadius: radius.lg, borderLeftWidth: 5, borderWidth: 1, borderColor: c.border, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  toastRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  toastIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toastText: { flex: 1, fontSize: fontSize.body, color: c.text, fontWeight: '600' },
}));
