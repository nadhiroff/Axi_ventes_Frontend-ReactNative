import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { ApiError, errorMessage } from '../../../api/client';
import { api } from '../../../api/endpoints';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Field } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import { Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Tag } from '../../../components/ui/Tag';
import { useMerchantActions } from '../../../hooks/api/merchant';
import { useT } from '../../../i18n';
import { notify, toast } from '../../../lib/confirm';
import { fontSize, makeStyles, spacing, useTheme } from '../../../theme';

/**
 * Ajouter un client : on tape son email ou son téléphone, l'application cherche tout de suite s'il a un compte Axi.
 * Trouvé : sa présentation s'affiche, on l'ajoute en un geste (nom et type repris : un commerçant = revendeur).
 * Pas de compte : on indique seulement son nom.
 */
export default function NewClientScreen() {
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const actions = useMerchantActions();
  const [contact, setContact] = useState('');
  const [debounced, setDebounced] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(contact.trim()), 450);
    return () => clearTimeout(timer);
  }, [contact]);

  const lookup = useQuery({ queryKey: ['client-lookup', debounced], queryFn: () => api.lookupClient(debounced), enabled: debounced.length >= 6, staleTime: 60_000 });
  const found = lookup.data?.found ? lookup.data : null;
  const searching = debounced.length >= 6 && (lookup.isFetching || contact.trim() !== debounced);
  const invalid = lookup.data && !lookup.data.valid && contact.trim() === debounced;

  const add = () => {
    if (!contact.trim()) return setErrors({ contact: t('merchant.phoneOrEmail') });
    if (!found && !name.trim()) return setErrors({ display_name: t('merchant.clientNameRequired') });
    setErrors({});
    actions.addClient.mutate(
      { contact: contact.trim(), ...(found ? {} : { display_name: name.trim() }) },
      {
        onSuccess: (c) => {
          toast(t('merchant.clientAdded', { name: c.display_name }));
          router.replace(`/commercant/client/${c.id}`);
        },
        onError: (e) => {
          if (e instanceof ApiError) setErrors({ ...e.fields, ...(e.fields.phone || e.fields.email ? { contact: e.fields.phone ?? e.fields.email } : {}) });
          notify(t('merchant.addClient'), errorMessage(e), 'error');
        },
      },
    );
  };

  return (
    <>
      <ScreenHeader title={t('merchant.addClient')} />
      <Screen
        footer={
          found?.existing_client_id ? (
            <Button label={t('merchant.openClient')} size="lg" icon="user" onPress={() => router.replace(`/commercant/client/${found.existing_client_id}`)} />
          ) : (
            <Button label={found ? t('merchant.addFound', { name: found.user!.display_name }) : t('merchant.addClient')} size="lg" icon="user-plus" onPress={add} loading={actions.addClient.isPending} disabled={searching} />
          )
        }
      >
        <View style={styles.column}>
          <Field
            label={t('merchant.contactLabel')}
            value={contact}
            onChangeText={setContact}
            placeholder={t('merchant.contactPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoFocus
            hint={t('merchant.contactHint')}
            error={errors.contact ?? (invalid ? t('merchant.contactInvalid') : null)}
          />

          {searching ? (
            <View style={styles.row}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.muted}>{t('merchant.searching')}</Text>
            </View>
          ) : found ? (
            <Card style={styles.found}>
              <Avatar name={found.user!.display_name} image={found.user!.avatar} size={56} variant="soft" />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.row}>
                  <Icon name="check-circle" size={16} color={colors.trustText} />
                  <Text style={styles.foundTitle}>{t('merchant.accountFound')}</Text>
                </View>
                <Text style={styles.name}>{found.user!.display_name}</Text>
                {found.user!.stall_name ? <Text style={styles.muted}>{t('merchant.foundStall', { name: found.user!.stall_name })}</Text> : null}
                <View style={styles.row}>
                  <Tag label={found.kind_detected === 'reseller' ? t('merchant.reseller') : t('merchant.individual')} tone={found.kind_detected === 'reseller' ? 'brand' : 'neutral'} />
                  {found.existing_client_id ? <Tag label={t('merchant.alreadyClient')} tone="trust" icon="check" /> : null}
                </View>
              </View>
            </Card>
          ) : debounced.length >= 6 && lookup.data?.valid ? (
            <>
              <Card style={{ gap: spacing.xs }}>
                <Text style={styles.foundTitle}>{t('merchant.noAccountTitle')}</Text>
                <Text style={styles.muted}>{t('merchant.noAccountText')}</Text>
              </Card>
              <Field label={t('merchant.clientName')} value={name} onChangeText={setName} error={errors.display_name} autoCapitalize="words" />
            </>
          ) : null}
        </View>
      </Screen>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  column: { gap: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  found: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1.5, borderColor: c.trust },
  foundTitle: { fontSize: fontSize.small, fontWeight: '700', color: c.trustText },
  name: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  muted: { fontSize: fontSize.small, color: c.textMuted },
}));
