import { useQuery } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useT } from '../../i18n';
import { notify } from '../../lib/confirm';
import { myDataPdf } from '../../lib/myDataPdf';
import { formatFcfa, formatShortDate } from '../../lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '../../theme';

/** Nombre de lignes montrées par section ; le reste est dans le fichier */
const SHOWN = 5;

/** Date MySQL UTC (« 2026-11-02 09:51:36 ») → date courte affichée */
const day = (value: string | null | undefined) => (value ? formatShortDate(value.replace(' ', 'T') + 'Z') : '—');

/**
 * Mes données : tout ce qu'Axi garde sur le compte, lisible dans l'application (avant, un lien ouvrait le
 * navigateur du téléphone qui téléchargeait un fichier sans rien montrer). Le fichier complet s'enregistre ou se
 * partage ensuite (Fichiers, Drive, WhatsApp, email).
 */
export default function MyDataScreen() {
  const styles = useStyles();
  const t = useT();
  const query = useQuery({ queryKey: ['me', 'data'], queryFn: api.myData, staleTime: 0 });
  const [saving, setSaving] = useState<'pdf' | 'json' | null>(null);
  const d = query.data;

  /** Document PDF lisible par tout le monde (par défaut) ou fichier technique JSON */
  const saveFile = async (kind: 'pdf' | 'json') => {
    if (!d) return;
    setSaving(kind);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        notify(t('myData.title'), t('myData.shareUnavailable'), 'error');
        return;
      }
      const name = kind === 'pdf' ? 'Mes-donnees-Axi.pdf' : 'mes-donnees-axi.json';
      const file = new File(Paths.cache, name);
      if (file.exists) file.delete();
      if (kind === 'pdf') {
        // Le PDF est créé sous un nom au hasard : renommé pour que la personne le reconnaisse dans ses fichiers
        new File(await myDataPdf(d)).move(file);
      } else {
        file.create();
        await file.write(JSON.stringify(d, null, 2));
      }
      await Sharing.shareAsync(file.uri, kind === 'pdf'
        ? { mimeType: 'application/pdf', dialogTitle: t('myData.title'), UTI: 'com.adobe.pdf' }
        : { mimeType: 'application/json', dialogTitle: t('myData.title'), UTI: 'public.json' });
    } catch (e) {
      notify(t('myData.title'), errorMessage(e), 'error');
    } finally {
      setSaving(null);
    }
  };

  if (query.isPending) return <LoadingView />;
  if (!d) return <ErrorView error={query.error} onRetry={() => query.refetch()} />;
  const a = d.account;

  return (
    <>
      <ScreenHeader title={t('myData.title')} />
      <Screen>
        <View style={styles.column}>
          <Text style={styles.muted}>{t('myData.intro')}</Text>
          <Card style={{ gap: spacing.sm }}>
            <Button label={t('myData.save')} icon="file-text" onPress={() => saveFile('pdf')} loading={saving === 'pdf'} disabled={saving !== null} />
            <Text style={styles.small}>{t('myData.saveHint')}</Text>
            {/* Pour un service ou un logiciel qui lit les données brutes : discret, sous le document lisible */}
            <Button label={t('myData.saveJson')} icon="code" variant="ghost" size="sm" onPress={() => saveFile('json')} loading={saving === 'json'} disabled={saving !== null} style={{ alignSelf: 'flex-start' }} />
          </Card>

          {a ? (
            <Section icon="user" title={t('myData.account')}>
              <Row label={t('myData.name')} value={`${a.first_name} ${a.last_name}`} />
              <Row label={t('myData.email')} value={a.email} />
              <Row label={t('myData.phone')} value={a.phone ?? '—'} />
              <Row label={t('myData.role')} value={a.role === 'merchant' ? t('block.merchant') : t('block.client')} />
              <Row label={t('myData.language')} value={a.lang} />
              <Row label={t('myData.memberSince')} value={day(a.created_at)} />
              {a.bio ? <Row label={t('myData.bio')} value={a.bio} /> : null}
            </Section>
          ) : null}

          {d.stall ? (
            <Section icon="shopping-bag" title={t('myData.stall')}>
              <Row label={t('myData.name')} value={d.stall.name} />
              <Row label={t('myData.phone')} value={d.stall.phone ?? '—'} />
              <Row label="WhatsApp" value={d.stall.whatsapp ?? '—'} />
              <Row label={t('myData.memberSince')} value={day(d.stall.created_at)} />
            </Section>
          ) : null}

          <ListSection icon="package" title={t('myData.orders')} items={d.orders.map((o) => [`n° ${o.id} · ${formatFcfa(o.total)}`, day(o.created_at)])} />
          <ListSection icon="credit-card" title={t('myData.payments')} items={d.payments.map((p) => [`${formatFcfa(p.amount)} · ${p.status}`, day(p.created_at)])} />
          <ListSection icon="heart" title={t('myData.favorites')} items={d.favorites.map((f) => [f.name, day(f.created_at)])} />
          <ListSection icon="star" title={t('myData.followed')} items={d.followed_stalls.map((f) => [f.name, day(f.created_at)])} />
          <ListSection
            icon="shield"
            title={t('myData.consents')}
            items={d.consents.map((c) => [c.partner, c.revoked_at ? t('myData.revoked', { date: day(c.revoked_at) }) : day(c.granted_at)])}
          />
          <ListSection icon="slash" title={t('myData.blocked')} items={d.blocked_users.map((b) => [b.name, day(b.created_at)])} />
          <ListSection
            icon="log-in"
            title={t('myData.logins')}
            items={d.logins.map((l) => [`${l.success ? t('myData.loginOk') : t('myData.loginFailed')}${l.device ? ` · ${l.device}` : ''}`, day(l.created_at)])}
          />
        </View>
      </Screen>
    </>
  );
}

function Section({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.head}>
        <Icon name={icon} size={18} color={colors.brand} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

/** Liste courte (5 lignes) avec le nombre total ; le détail complet est dans le fichier */
function ListSection({ icon, title, items }: { icon: IconName; title: string; items: [string, string][] }) {
  const styles = useStyles();
  const t = useT();
  return (
    <Section icon={icon} title={`${title} (${items.length})`}>
      {items.length === 0 ? <Text style={styles.muted}>{t('myData.none')}</Text> : null}
      {items.slice(0, SHOWN).map(([label, date], i) => (
        <Row key={i} label={label} value={date} />
      ))}
      {items.length > SHOWN ? <Text style={styles.small}>{t('myData.more', { n: items.length - SHOWN })}</Text> : null}
    </Section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
      <Text style={styles.value} numberOfLines={3}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  column: { gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  small: { fontSize: fontSize.caption, color: c.textMuted },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  title: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 4 },
  label: { flex: 1, fontSize: fontSize.small, color: c.text },
  value: { flexShrink: 1, maxWidth: '55%', fontSize: fontSize.small, color: c.textMuted, textAlign: 'right' },
}));
