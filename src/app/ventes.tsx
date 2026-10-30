import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { errorMessage } from '../api/client';
import { api } from '../api/endpoints';
import type { SalesStatus } from '../api/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { useDialogStore } from '../components/ui/DialogHost';
import { Icon } from '../components/ui/Icon';
import { Grid, Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { EmptyView, LoadingView } from '../components/ui/StateViews';
import { useSettings } from '../hooks/api/account';
import { useSales } from '../hooks/api/client';
import { queryKeys } from '../hooks/api/queryKeys';
import { useT } from '../i18n';
import { confirmAction, notify, toast } from '../lib/confirm';
import { formatFcfa, formatShortDate, orderNumber } from '../lib/format';
import { useAuthStore } from '../store/authStore';
import { fontSize, makeStyles, radius, spacing, useLayout, useTheme } from '../theme';

type Period = '7' | '30' | '90' | 'all';
const STATUSES: SalesStatus[] = ['all', 'pending', 'held', 'released', 'refunded', 'disputed', 'cancelled'];

const isoDay = (daysAgo: number) => {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** « Ventes et paiements » : achats du client ou ventes du commerçant, filtres, totaux, export CSV. */
export default function SalesScreen() {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const { listColumns } = useLayout();
  const qc = useQueryClient();
  const merchant = useAuthStore((s) => s.user?.role === 'merchant' && s.mode === 'merchant');
  const dateFormat = useSettings().data?.date_format;
  const [period, setPeriod] = useState<Period>('30');
  const [status, setStatus] = useState<SalesStatus>('all');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 400);
    return () => clearTimeout(timer);
  }, [text]);

  const filters = useMemo(() => ({ from: period === 'all' ? undefined : isoDay(Number(period)), status, q: search || undefined }), [period, status, search]);
  const sales = useSales(filters);
  const data = sales.data;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { url } = await api.salesExport(filters);
      await Linking.openURL(url);
    } catch (e) {
      notify(t('sales.export'), errorMessage(e), 'error');
    } finally {
      setExporting(false);
    }
  };

  const hide = (target: { order_id: string } | { all: true }) =>
    api
      .salesHide(target)
      .then(({ hidden }) => {
        qc.invalidateQueries({ queryKey: ['sales'] });
        qc.invalidateQueries({ queryKey: queryKeys.orders });
        if ('all' in target) toast(t('sales.cleared', { n: hidden }), 'info');
      })
      .catch((e) => notify(t('sales.clear'), errorMessage(e), 'error'));
  const hideOne = (orderId: string) => confirmAction(t('sales.removeConfirm'), t('sales.removeText'), () => hide({ order_id: orderId }), { destructive: true, confirmLabel: t('sales.remove') });
  // Vider : proposer d'exporter d'abord (le CSV du client ne contient plus ce qui a été retiré)
  const clearAll = () => {
    if (!data?.rows.some((r) => r.hideable)) return notify(t('sales.clear'), t('sales.nothingToClear'), 'info');
    useDialogStore.getState().showDialog({
      title: t('sales.clearConfirm'),
      message: t(merchant ? 'sales.clearTextMerchant' : 'sales.clearText'),
      tone: 'info',
      buttons: [
        { label: t('sales.clearNow'), variant: 'destructive', onPress: () => hide({ all: true }) },
        { label: t('sales.exportFirst'), onPress: exportCsv },
        { label: t('common.cancel'), variant: 'ghost' },
      ],
    });
  };

  return (
    <>
      <ScreenHeader title={merchant ? t('sales.title') : t('sales.buyTitle')} right={<Button label="CSV" icon="download" size="sm" variant="ghost" onPress={exportCsv} loading={exporting} />} />
      <Screen refreshing={sales.isRefetching} onRefresh={() => sales.refetch()}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {(['7', '30', '90', 'all'] as Period[]).map((p) => (
            <Chip key={p} label={t(p === 'all' ? 'sales.pAll' : p === '7' ? 'sales.p7' : p === '30' ? 'sales.p30' : 'sales.p90')} selected={period === p} onPress={() => setPeriod(p)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {STATUSES.map((s) => (
            <Chip key={s} label={t(`sales.status.${s}`)} selected={status === s} onPress={() => setStatus(s)} />
          ))}
        </ScrollView>
        <TextInput value={text} onChangeText={setText} placeholder={t('sales.search')} placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel={t('sales.search')} />
        {data ? (
          <Card tone="trustSoft" style={styles.totals}>
            <Text style={styles.totalsLabel}>{t('sales.totals', { n: data.totals.count })}</Text>
            <Text style={styles.totalsValue}>{formatFcfa(data.totals.amount)}</Text>
            {merchant ? <Text style={styles.totalsLabel}>{`${t('sales.net')} : ${formatFcfa(data.totals.net_amount)} · ${t('sales.commission')} : ${formatFcfa(data.totals.commission)}`}</Text> : null}
          </Card>
        ) : null}
        {/* Seules les commandes terminées se retirent : le reste (en cours, litige, remboursement) reste affiché */}
        {data?.rows.length ? <Button label={t('sales.clear')} icon="trash-2" variant="ghost" size="sm" onPress={clearAll} style={{ alignSelf: 'flex-start' }} /> : null}
        {sales.isPending ? (
          <LoadingView />
        ) : !data?.rows.length ? (
          <EmptyView icon="bar-chart-2" title={t('sales.empty')} />
        ) : (
          <Grid columns={listColumns}>
            {data.rows.map((r) => (
              <Pressable key={`${r.order_id}-${r.counterpart}`} onPress={() => !merchant && router.push(`/commande/${r.order_id}`)} style={styles.row} accessibilityRole={merchant ? undefined : 'button'}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.title}>{r.counterpart || t('orders.order', { id: orderNumber(r.order_id) })}</Text>
                  <Text style={styles.muted}>{`${formatShortDate(r.date, dateFormat, true)} · ${t('orders.order', { id: orderNumber(r.order_id) })}`}</Text>
                  <Text style={styles.status}>{r.status_label}</Text>
                  <Text style={styles.muted}>{r.payment_method}{r.gateway_ref ? ` · ${t('sales.ref', { ref: r.gateway_ref })}` : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.amount}>{formatFcfa(r.amount)}</Text>
                  {merchant ? <Text style={styles.muted}>{`${t('sales.net')} ${formatFcfa(r.net_amount)}`}</Text> : null}
                  {r.hideable ? (
                    <Pressable onPress={() => hideOne(r.order_id)} hitSlop={10} style={styles.hide} accessibilityRole="button" accessibilityLabel={t('sales.remove')}>
                      <Icon name="x" size={16} color={colors.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </Grid>
        )}
      </Screen>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  input: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 48, fontSize: fontSize.body, color: c.text },
  totals: { gap: 2 },
  totalsLabel: { fontSize: fontSize.small, color: c.trustText, fontWeight: '600' },
  totalsValue: { fontSize: fontSize.display, color: c.trustText, fontWeight: '800' },
  row: { flex: 1, flexDirection: 'row', gap: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg },
  title: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  status: { fontSize: fontSize.small, color: c.brandDark, fontWeight: '600' },
  muted: { fontSize: fontSize.caption, color: c.textMuted },
  amount: { fontSize: fontSize.title, fontWeight: '800', color: c.text },
  hide: { marginTop: spacing.sm, padding: 2 },
}));
