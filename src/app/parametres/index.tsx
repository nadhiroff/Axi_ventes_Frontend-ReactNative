import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import type { Currency, NotificationType, Operator, UserSettings } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { Chip, OptionTile } from '../../components/ui/Chip';
import { MenuRow } from '../../components/ui/Field';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useAccountActions, useSettings, useUpdateSettings } from '../../hooks/api/account';
import { LANG_LABELS, useLangStore, useT, type Lang } from '../../i18n';
import { confirmAction, notify, toast } from '../../lib/confirm';
import { useCurrencyStore } from '../../store/currencyStore';
import { formatBytes } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { fontSize, makeStyles, radius, spacing, useTheme, useThemeStore, type ThemePreference } from '../../theme';

const NOTIF_TYPES: NotificationType[] = ['order', 'payment', 'reminder', 'promotion', 'arrival', 'account'];

/** Paramètres : tout est enregistré en base (sauf pour un visiteur, qui garde thème et langue sur l'appareil). */
export default function SettingsScreen() {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const merchant = user?.role === 'merchant';
  const application = user?.merchant_application;
  const settings = useSettings();
  const update = useUpdateSettings();
  const { resetDataUsage } = useAccountActions();
  const { preference, setPreference } = useThemeStore();
  const { lang, setLang } = useLangStore();
  const s = settings.data;
  const points = s?.axi_points;

  const save = (patch: Parameters<typeof api.updateSettings>[0]) => {
    if (!signedIn) return;
    update.mutate(patch, { onError: (e) => notify(t('settings.title'), errorMessage(e), 'error') });
  };

  const chooseTheme = (theme: ThemePreference) => {
    setPreference(theme);
    save({ theme });
  };

  const { currency, rates, setCurrency } = useCurrencyStore();
  const chooseCurrency = (c: Currency) => {
    setCurrency(c);
    save({ currency: c });
    toast(t('settings.currencySaved'));
  };

  const chooseLang = async (next: Lang) => {
    setLang(next);
    if (signedIn) {
      try {
        setUser(await api.updateMe({ lang: next }));
      } catch (e) {
        notify(t('settings.language'), errorMessage(e), 'error');
      }
    }
  };

  // Plafond borné de 100 Mo à 20 Go ; le champ affiche la valeur réellement enregistrée
  const saveDataCap = (v: string) => {
    const cap = Math.min(20000, Math.max(100, Number(v.replace(/\D/g, '')) || 1500));
    save({ data_cap_mb: cap });
    return String(cap);
  };

  // Seul le canal changé est envoyé : le serveur garde l'autre tel quel
  const toggleNotif = (type: NotificationType, channel: 'app' | 'email', value: boolean) =>
    save({ notifications: { [type]: { [channel]: value } } as Partial<UserSettings['notifications']> });

  return (
    <>
      <ScreenHeader title={t('settings.title')} />
      <Screen>
        {!signedIn ? (
          // Visiteur : revenir à la connexion, à la création de compte ou à la page d'accueil
          <Card style={{ gap: spacing.md }}>
            <Text style={styles.label}>{t('account.visitorTitle')}</Text>
            <Text style={styles.muted}>{t('account.visitorText')}</Text>
            <Button label={t('auth.signIn')} icon="log-in" onPress={() => router.push('/auth/connexion')} />
            <Button label={t('auth.createAccount')} icon="user-plus" variant="ghost" onPress={() => router.push('/auth/inscription')} />
            <Button label={t('account.backHome')} icon="home" variant="ghost" onPress={() => router.replace('/bienvenue')} />
          </Card>
        ) : null}
        {signedIn && merchant ? (
          <>
            {/* Paramètres propres au commerçant : sa boutique, son abonnement, son argent */}
            <Text style={styles.section}>{t('settings.shop')}</Text>
            <Card style={{ paddingVertical: 0 }}>
              <MenuRow icon="edit-3" label={t('merchant.editStall')} onPress={() => router.push('/commercant/modifier-etal')} />
              <MenuRow icon="star" label={t('merchant.subscription')} onPress={() => router.push('/commercant/abonnement')} />
              <MenuRow icon="dollar-sign" label={t('settings.payouts')} onPress={() => router.push('/commercant/argent')} />
              <MenuRow icon="message-circle" label={t('chat.title')} onPress={() => router.push('/messages')} />
              <MenuRow icon="bar-chart-2" label={t('merchant.sales')} onPress={() => router.push('/ventes')} />
            </Card>
          </>
        ) : signedIn ? (
          <>
            <Text style={styles.section}>{t('settings.sell')}</Text>
            <Card style={{ paddingVertical: 0 }}>
              <MenuRow
                icon="briefcase"
                label={t('apply.title')}
                value={application ? t(`apply.status.${application.status}`) : undefined}
                onPress={() => router.push('/parametres/devenir-commercant')}
              />
            </Card>
          </>
        ) : null}
        <Text style={styles.section}>{t('settings.appearance')}</Text>
        <Card style={{ gap: spacing.md }}>
          <Text style={styles.label}>{t('settings.theme')}</Text>
          <View style={styles.row}>
            {(['system', 'light', 'dark'] as ThemePreference[]).map((theme) => (
              <OptionTile key={theme} label={t(`settings.themes.${theme}`)} selected={preference === theme} onPress={() => chooseTheme(theme)} />
            ))}
          </View>
          <Text style={styles.label}>{t('settings.language')}</Text>
          <View style={styles.wrap}>
            {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
              <Chip key={l} label={LANG_LABELS[l]} selected={lang === l} onPress={() => chooseLang(l)} />
            ))}
          </View>
          <Text style={styles.muted}>{t('settings.langNote')}</Text>
          <Text style={styles.label}>{t('settings.currency')}</Text>
          <View style={styles.wrap}>
            {(['XOF', 'EUR', 'USD'] as Currency[]).map((c) => (
              <Chip key={c} label={t(`settings.currencies.${c}`)} selected={currency === c} onPress={() => chooseCurrency(c)} />
            ))}
          </View>
          <Text style={styles.muted}>{currency === 'XOF' ? t('settings.currencyNoteXof') : t('settings.currencyNote', { rate: Math.round(rates[currency]).toString() })}</Text>
          {signedIn && s ? (
            <>

              <Text style={styles.label}>{t('settings.dateFormat')}</Text>
              <View style={styles.row}>
                {(['dd/mm/yyyy', 'yyyy-mm-dd'] as const).map((f) => (
                  <OptionTile key={f} label={f === 'dd/mm/yyyy' ? '29/10/2026' : '2026-10-29'} selected={s.date_format === f} onPress={() => save({ date_format: f })} />
                ))}
              </View>
            </>
          ) : null}
        </Card>

        {signedIn && s ? (
          <>
            <Text style={styles.section}>{t('settings.notifications')}</Text>
            {/* Un titre par canal (« Dans l'app », puis « Par email »), puis une case par type : le texte garde toute la largeur */}
            <Card style={{ gap: spacing.md }}>
              {(['app', 'email'] as const).map((channel) => (
                <View key={channel}>
                  <Text style={styles.notifHead}>{t(channel === 'app' ? 'settings.inApp' : 'settings.byEmail')}</Text>
                  {NOTIF_TYPES.map((type) => (
                    <CheckRow
                      key={type}
                      label={t(`settings.notifTypes.${type}`)}
                      checked={s.notifications[type][channel]}
                      onChange={(v) => toggleNotif(type, channel, v)}
                    />
                  ))}
                </View>
              ))}
            </Card>
            <Text style={styles.muted}>{t('settings.reminders')}</Text>

            {/* Historique : seulement caché sur mon compte, les commandes terminées uniquement */}
            <Text style={styles.section}>{t('settings.historyTitle')}</Text>
            <Card style={{ gap: spacing.md }}>
              <Text style={styles.label}>{t('settings.historyAuto')}</Text>
              <View style={styles.wrap}>
                {([0, 3, 6, 12] as const).map((m) => (
                  <Chip key={m} label={m === 0 ? t('settings.historyNever') : t('settings.historyMonths', { n: m })} selected={s.history_months === m} onPress={() => save({ history_months: m })} />
                ))}
              </View>
              <Text style={styles.muted}>{t('settings.historyHint')}</Text>
            </Card>

            <Text style={styles.section}>{merchant ? t('settings.savedBuyer') : t('settings.saved')}</Text>
            <Card style={{ gap: spacing.md }}>
              <Text style={styles.muted}>{t('settings.savedHint')}</Text>
              <Text style={styles.label}>{t('settings.address')}</Text>
              <SavedText initial={s.default_address ?? ''} placeholder={t('cart.detailDelivery')} label={t('settings.address')} onSave={(v) => save({ default_address: v || null })} />
              <Text style={styles.label}>{t('settings.point')}</Text>
              <View style={styles.wrap}>
                <Chip label={t('settings.none')} selected={!s.preferred_point_id} onPress={() => save({ preferred_point_id: null })} />
                {(points ?? []).map((p) => (
                  <Chip key={p.id} label={p.name} selected={s.preferred_point_id === p.id} onPress={() => save({ preferred_point_id: p.id })} />
                ))}
              </View>
              <Text style={styles.label}>{t('settings.operator')}</Text>
              <View style={styles.wrap}>
                {(['mtn', 'moov', 'celtiis'] as Operator[]).map((op) => (
                  <Chip key={op} label={op.toUpperCase()} selected={s.preferred_operator === op} onPress={() => save({ preferred_operator: s.preferred_operator === op ? null : op })} />
                ))}
              </View>
              <Text style={styles.label}>{t('settings.paymentPhone')}</Text>
              <SavedText initial={s.preferred_payment_phone ?? ''} label={t('settings.paymentPhone')} keyboard="phone-pad" onSave={(v) => save({ preferred_payment_phone: v || null })} />
            </Card>

            <Text style={styles.section}>{t('settings.data')}</Text>
            <Card style={{ gap: spacing.md }}>
              <Text style={styles.label}>{t('settings.dataUsed', { used: formatBytes(s.data.used_bytes), cap: s.data.cap_mb })}</Text>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${Math.min(100, s.data.used_pct)}%`, backgroundColor: s.data.used_pct >= 90 ? colors.danger : colors.trust }]} />
              </View>
              {s.data.used_pct >= 90 ? <Text style={[styles.muted, { color: colors.danger }]}>{t('settings.dataWarning')}</Text> : null}
              <Button
                label={t('settings.dataReset')}
                icon="rotate-ccw"
                variant="ghost"
                size="sm"
                disabled={s.data.used_bytes === 0}
                loading={resetDataUsage.isPending}
                onPress={() =>
                  confirmAction(t('settings.dataResetConfirm'), t('settings.dataResetText'), () =>
                    resetDataUsage.mutate(undefined, { onSuccess: () => toast(t('settings.dataResetDone')), onError: (e) => notify(t('settings.data'), errorMessage(e), 'error') }),
                  )
                }
              />
              <Text style={styles.label}>{t('settings.dataCap')}</Text>
              <SavedText initial={String(s.data.cap_mb)} label={t('settings.dataCap')} keyboard="number-pad" onSave={saveDataCap} />
            </Card>

            <Text style={styles.section}>{t('settings.security')}</Text>
            <MenuRow icon="lock" label={t('settings.security')} onPress={() => router.push('/parametres/securite')} />
            <MenuRow icon="shield" label={t('settings.privacy')} onPress={() => router.push('/parametres/confidentialite')} />
            <MenuRow icon="user" label={t('settings.profilePhoto')} onPress={() => router.push('/parametres/profil')} />
          </>
        ) : null}
      </Screen>
    </>
  );
}

/** Ligne à cocher : la case et son texte, toute la ligne se touche */
function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.notifRow, pressed && { opacity: 0.6 }]}
    >
      <View style={[styles.box, checked && styles.boxOn]}>{checked ? <Icon name="check" size={18} color="#FFFFFF" /> : null}</View>
      <Text style={[styles.label, { flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

/** Champ enregistré en base quand on le quitte (initialisé depuis les réglages) */
function SavedText({ initial, label, placeholder, keyboard, onSave }: { initial: string; label: string; placeholder?: string; keyboard?: 'phone-pad' | 'number-pad'; onSave: (value: string) => string | void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [value, setValue] = useState(initial);
  // Valeur changée par le serveur (numéro remis au format, plafond borné…) : le champ la reprend
  const [shown, setShown] = useState(initial);
  if (shown !== initial) {
    setShown(initial);
    setValue(initial);
  }
  return (
    <TextInput
      value={value}
      onChangeText={setValue}
      onBlur={() => {
        if (value.trim() === initial) return;
        const saved = onSave(value.trim());
        if (typeof saved === 'string') setValue(saved);
      }}
      keyboardType={keyboard}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      style={styles.input}
      accessibilityLabel={label}
    />
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontSize: fontSize.heading - 2, fontWeight: '700', color: c.text, marginTop: spacing.md },
  label: { fontSize: fontSize.body, fontWeight: '600', color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  notifHead: { fontSize: fontSize.small, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: c.border },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, paddingVertical: spacing.xs },
  box: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: c.trust, borderColor: c.trust },
  input: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 48, fontSize: fontSize.body, color: c.text },
  bar: { height: 10, borderRadius: 5, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
}));
