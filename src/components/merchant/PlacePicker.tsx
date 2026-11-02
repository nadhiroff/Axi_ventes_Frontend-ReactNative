import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AisleIcon, StallOptions } from '../../api/types';
import { useT } from '../../i18n';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { aisleIcons } from '../client/AisleTile';
import { Field } from '../ui/Field';
import { Icon, type IconName } from '../ui/Icon';

type Choice = { id: string; other: string };
type Item = { id: string; name: string; icon?: AisleIcon };

/** Recherche sans tenir compte des accents ni des majuscules (« dantokpa » trouve « Dantokpa ») */
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Choix d'une allée ou d'un marché : un seul champ, de la même hauteur quel que soit le nombre d'allées ou de
 * marchés. Toucher le champ ouvre la liste complète, avec une recherche et « Autre » (nom libre, qu'un agent Axi
 * ajoutera ensuite à la liste pour tout le monde).
 */
export function PlacePicker({
  kind,
  options,
  value,
  onChange,
  error,
}: {
  kind: 'aisle' | 'site';
  options: StallOptions | undefined;
  value: Choice;
  onChange: (v: Choice) => void;
  error?: string;
}) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const list: Item[] = kind === 'aisle' ? (options?.aisles ?? []) : (options?.sites ?? []);
  const otherId = kind === 'aisle' ? (options?.other_aisle_id ?? 'autres') : (options?.other_site_id ?? 'autre');
  const isOther = value.id === otherId;
  const selected = list.find((item) => item.id === value.id);
  const label = kind === 'aisle' ? t('merchant.aisle') : t('merchant.site');
  const shown = selected?.name ?? (isOther ? t('merchant.other') : null);
  const iconOf = (item?: Item): IconName => (kind === 'aisle' ? (item?.icon ? (aisleIcons[item.icon] ?? 'grid') : 'grid') : 'map-pin');

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={!options}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${shown ?? t('merchant.choose')}`}
        style={({ pressed }) => [styles.select, error ? { borderColor: colors.danger } : null, pressed && { opacity: 0.85 }]}
      >
        <Icon name={selected ? iconOf(selected) : isOther ? 'plus' : iconOf()} size={18} color={shown ? colors.brand : colors.textMuted} />
        <Text style={[styles.selectText, !shown && { color: colors.textMuted }]} numberOfLines={1}>
          {shown ?? (options ? t('merchant.choose') : t('merchant.loadingPlaces'))}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      {isOther ? (
        <Field
          label={kind === 'aisle' ? t('merchant.otherAisle') : t('merchant.otherSite')}
          value={value.other}
          onChangeText={(other) => onChange({ id: otherId, other })}
          placeholder={kind === 'aisle' ? t('merchant.otherAislePlaceholder') : t('merchant.otherSitePlaceholder')}
          hint={t('merchant.otherHint')}
          maxLength={100}
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PlaceSheet
        visible={open}
        title={label}
        items={list}
        selectedId={value.id}
        otherId={otherId}
        iconOf={iconOf}
        onClose={() => setOpen(false)}
        onPick={(id) => {
          setOpen(false);
          onChange({ id, other: id === otherId ? value.other : '' });
        }}
      />
    </View>
  );
}

function PlaceSheet({
  visible,
  title,
  items,
  selectedId,
  otherId,
  iconOf,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  items: Item[];
  selectedId: string;
  otherId: string;
  iconOf: (item?: Item) => IconName;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = normalize(query);
    return q === '' ? items : items.filter((item) => normalize(item.name).includes(q));
  }, [items, query]);
  const close = () => {
    setQuery('');
    onClose();
  };
  const pick = (id: string) => {
    setQuery('');
    onPick(id);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel={t('common.close')} />
        <View style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Icon name="x" size={22} color={colors.text} />
            </Pressable>
          </View>
          {/* La recherche n'apparaît que lorsqu'elle est utile */}
          {items.length > 6 ? (
            <View style={styles.search}>
              <Icon name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('merchant.searchPlace')}
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel={t('merchant.searchPlace')}
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('merchant.clearSearch')}>
                  <Icon name="x-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={<Text style={styles.empty}>{t('merchant.noPlaceFound')}</Text>}
            renderItem={({ item }) => <Row icon={iconOf(item)} label={item.name} selected={item.id === selectedId} onPress={() => pick(item.id)} />}
            ListFooterComponent={
              <>
                <View style={styles.separator} />
                <Row icon="plus" label={t('merchant.otherNotListed')} selected={selectedId === otherId} onPress={() => pick(otherId)} />
              </>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Row({ icon, label, selected, onPress }: { icon: IconName; label: string; selected: boolean; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && { opacity: 0.7 }]}>
      <Icon name={icon} size={18} color={selected ? colors.brand : colors.textMuted} />
      <Text style={[styles.rowText, selected && { color: colors.brand, fontWeight: '700' }]} numberOfLines={2}>
        {label}
      </Text>
      {selected ? <Icon name="check" size={18} color={colors.brand} /> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  label: { fontSize: fontSize.small, fontWeight: '600', color: c.text },
  error: { color: c.danger, fontSize: fontSize.small },
  select: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: c.background },
  selectText: { flex: 1, fontSize: fontSize.body, color: c.text },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,10,9,0.5)' },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: spacing.lg, paddingHorizontal: spacing.lg, gap: spacing.md, width: '100%', maxWidth: 640, alignSelf: 'center', maxHeight: '80%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { flex: 1, fontSize: fontSize.title + 1, fontWeight: '700', color: c.text },
  search: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: c.background },
  searchInput: { flex: 1, fontSize: fontSize.body, color: c.text, paddingVertical: spacing.sm },
  list: { flexGrow: 0 },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.md },
  rowSelected: { backgroundColor: c.brandSoft },
  rowText: { flex: 1, fontSize: fontSize.body, color: c.text },
  separator: { height: 1, backgroundColor: c.border, marginHorizontal: spacing.sm },
  empty: { fontSize: fontSize.small, color: c.textMuted, paddingVertical: spacing.lg, textAlign: 'center' },
}));
