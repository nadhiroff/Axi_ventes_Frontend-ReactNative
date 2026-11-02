import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { SUPPORT_EMAIL, helpContent, type HelpSection } from '../../content/helpRules';
import { useLangStore } from '../../i18n';
import { notify } from '../../lib/confirm';
import { useAuthStore } from '../../store/authStore';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../theme';

type Filter = 'all' | 'client' | 'merchant';

/**
 * Aide et règlement (clients et commerçants) : contact direct de l'équipe Axi en haut, puis les règles rangées
 * par thème, repliées pour que la page reste courte. Un filtre montre seulement ce qui concerne les clients ou
 * les commerçants (le commerçant voit tout par défaut, le client voit d'abord ce qui le concerne).
 */
export default function HelpScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const lang = useLangStore((s) => s.lang);
  const role = useAuthStore((s) => s.user?.role);
  const c = helpContent(lang);
  const [filter, setFilter] = useState<Filter>(role === 'merchant' ? 'all' : 'client');
  const [open, setOpen] = useState<string | null>(null);
  const sections = c.sections.filter((s) => filter === 'all' || s.audience === 'all' || s.audience === filter);

  const writeToUs = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(c.contactSubject)}`;
    try {
      await Linking.openURL(url);
    } catch {
      notify(c.contactTitle, `${c.contactFail}\n${SUPPORT_EMAIL}`, 'info');
    }
  };

  return (
    <>
      <ScreenHeader title={c.title} />
      <Screen>
        <View style={styles.column}>
          <Card style={{ gap: spacing.sm }}>
            <Text style={styles.text}>{c.intro}</Text>
            <Text style={styles.muted}>{c.updated}</Text>
          </Card>

          {/* Contact en premier : c'est ce que cherche la personne qui a un problème */}
          <Card style={[styles.contact, { borderColor: colors.brand }]}>
            <View style={styles.contactHead}>
              <View style={[styles.badge, { backgroundColor: colors.brandSoft }]}>
                <Icon name="mail" size={20} color={colors.brand} />
              </View>
              <Text style={[styles.title, { flex: 1 }]}>{c.contactTitle}</Text>
            </View>
            <Text style={styles.muted}>{c.contactText}</Text>
            <Text selectable style={[styles.email, { color: colors.brand }]}>
              {SUPPORT_EMAIL}
            </Text>
            <Button label={c.contactButton} icon="send" onPress={writeToUs} />
          </Card>

          <View style={styles.filters} accessibilityRole="radiogroup">
            <Chip label={c.filterAll} selected={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label={c.filterClient} selected={filter === 'client'} onPress={() => setFilter('client')} />
            <Chip label={c.filterMerchant} selected={filter === 'merchant'} onPress={() => setFilter('merchant')} />
          </View>

          <Card style={{ paddingVertical: spacing.xs }}>
            {sections.map((section, i) => (
              <Topic key={section.id} section={section} count={c.rulesCount(section.rules.length)} first={i === 0} expanded={open === section.id} onToggle={() => setOpen((o) => (o === section.id ? null : section.id))} />
            ))}
          </Card>

          <View style={[styles.note, { backgroundColor: colors.dangerSoft }]}>
            <Icon name="alert-triangle" size={18} color={colors.danger} />
            <Text style={[styles.small, { flex: 1, color: colors.text }]}>{c.sanctionNote}</Text>
          </View>
        </View>
      </Screen>
    </>
  );
}

/** Un thème replié : titre et nombre de règles ; déplié : règles numérotées */
function Topic({ section, count, first, expanded, onToggle }: { section: HelpSection; count: string; first: boolean; expanded: boolean; onToggle: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[!first && styles.divider]}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded }} style={({ pressed }) => [styles.topicHead, pressed && { opacity: 0.7 }]}>
        <View style={[styles.badge, { backgroundColor: expanded ? colors.brandSoft : colors.surfaceAlt }]}>
          <Icon name={section.icon} size={18} color={expanded ? colors.brand : colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.topicTitle}>{section.title}</Text>
          <Text style={styles.muted}>{count}</Text>
        </View>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </Pressable>
      {expanded ? (
        <View style={styles.rules}>
          {section.rules.map((rule, i) => (
            <View key={i} style={styles.rule}>
              <View style={[styles.number, { backgroundColor: colors.brandSoft }]}>
                <Text style={[styles.numberText, { color: colors.brandDark }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.text, { flex: 1 }]}>{rule}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  column: { gap: spacing.md, maxWidth: 680, width: '100%', alignSelf: 'center' },
  text: { fontSize: fontSize.body, color: c.text, lineHeight: 22 },
  muted: { fontSize: fontSize.small, color: c.textMuted },
  small: { fontSize: fontSize.small, lineHeight: 19 },
  title: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  contact: { gap: spacing.sm, borderWidth: 1.5 },
  contactHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  email: { fontSize: fontSize.title, fontWeight: '700' },
  badge: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  divider: { borderTopWidth: 1, borderTopColor: c.border },
  topicHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 56 },
  topicTitle: { fontSize: fontSize.body, fontWeight: '700', color: c.text },
  rules: { gap: spacing.md, paddingBottom: spacing.lg, paddingLeft: spacing.xs },
  rule: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  number: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  numberText: { fontSize: fontSize.caption, fontWeight: '700' },
  note: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', padding: spacing.lg, borderRadius: radius.lg },
}));
