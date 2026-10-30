import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import type { Currency, NotificationType, Operator, UserSettings } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip, OptionTile } from '../../components/ui/Chip';
import { MenuRow, SwitchRow } from '../../components/ui/Field';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useSettings, useUpdateSettings } from '../../hooks/api/account';
import { LANG_LABELS, useLangStore, useT, type Lang } from '../../i18n';
import { notify, toast } from '../../lib/confirm';
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

  const toggleNotif = (type: NotificationType, channel: 'app' | 'email', value: boolean) =>
    save({ notifications: { [type]: { ...(s?.notifications[type] ?? { app: true, email: true }), [channel]: value } } as Partial<UserSettings['notifications']> });

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
            <Card style={{ gap: spacing.xs }}>
              {NOTIF_TYPES.map((type) => (
                <View key={type} style={styles.notifRow}>
                  <Text style={[styles.label, { flex: 1 }]}>{t(`settings.notifTypes.${type}`)}</Text>
                  <View style={{ flexDirection: 'row', gap: spacing.md }}>
                    <View style={{ width: 120 }}>
                      <SwitchRow label={t('settings.inApp')} value={s.notifications[type].app} onChange={(v) => toggleNotif(type, 'app', v)} />
                    </View>
                    <View style={{ width: 120 }}>
                      <SwitchRow label={t('settings.byEmail')} value={s.notifications[type].email} onChange={(v) => toggleNotif(type, 'email', v)} />
                    </View>
                  </View>
                </View>
              ))}
              <Text style={styles.muted}>{t('settings.reminders')}</Text>
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
                <View style={[styles.barFill, { width: `${s.data.used_pct}%`, backgroundColor: s.data.used_pct >= 90 ? colors.danger : colors.trust }]} />
              </View>
              {s.data.used_pct >= 90 ? <Text style={[styles.muted, { color: colors.danger }]}>{t('settings.dataWarning')}</Text> : null}
              <Text style={styles.label}>{t('settings.dataCap')}</Text>
              <SavedText initial={String(s.data.cap_mb)} label={t('settings.dataCap')} keyboard="number-pad" onSave={(v) => save({ data_cap_mb: Math.max(100, Number(v.replace(/\D/g, '')) || 1500) })} />
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

/** Champ enregistré en base quand on le quitte (initialisé depuis les réglages) */
function SavedText({ initial, label, placeholder, keyboard, onSave }: { initial: string; label: string; placeholder?: string; keyboard?: 'phone-pad' | 'number-pad'; onSave: (value: string) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [value, setValue] = useState(initial);
  return (
    <TextInput
      value={value}
      onChangeText={setValue}
      onBlur={() => value.trim() !== initial && onSave(value.trim())}
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
  notifRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: spacing.xs },
  input: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 48, fontSize: fontSize.body, color: c.text },
  bar: { height: 10, borderRadius: 5, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
}));
