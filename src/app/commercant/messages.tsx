import { Linking, Text, View } from 'react-native';

import { AudioPlayerButton } from '../../components/ui/AudioPlayerButton';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyView, LoadingView } from '../../components/ui/StateViews';
import { Tag } from '../../components/ui/Tag';
import { useSettings } from '../../hooks/api/account';
import { useMerchantActions, useVoiceMessages } from '../../hooks/api/merchant';
import { useT } from '../../i18n';
import { formatShortDate, whatsappUrl } from '../../lib/format';
import { fontSize, spacing, useTheme } from '../../theme';

/** Messages vocaux laissés par les clients sur la page de l'étal */
export default function VoiceMessagesScreen() {
  const t = useT();
  const { colors } = useTheme();
  const messages = useVoiceMessages();
  const actions = useMerchantActions();
  const dateFormat = useSettings().data?.date_format;
  return (
    <>
      <ScreenHeader title={t('merchant.messages')} />
      {messages.isPending ? (
        <LoadingView />
      ) : !messages.data?.messages.length ? (
        <EmptyView icon="mic" title={t('merchant.noMessages')} />
      ) : (
        <Screen refreshing={messages.isRefetching} onRefresh={() => messages.refetch()}>
          {messages.data.messages.map((m) => (
            <Card key={m.id} style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text style={{ flex: 1, color: colors.text, fontWeight: '700', fontSize: fontSize.body }}>{m.client_name}</Text>
                {!m.listened ? <Tag label="•" tone="brand" /> : null}
              </View>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.small }}>{formatShortDate(m.created_at, dateFormat, true)}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <AudioPlayerButton url={m.audio_url} onPlayed={() => !m.listened && actions.listened.mutate(m.id)} />
                {m.client_phone ? <Button label={t('common.whatsapp')} icon="message-circle" size="sm" variant="ghost" onPress={() => Linking.openURL(whatsappUrl(m.client_phone!))} /> : null}
                {m.client_phone ? <Button label={t('common.call')} icon="phone" size="sm" variant="ghost" onPress={() => Linking.openURL(`tel:${m.client_phone}`)} /> : null}
              </View>
            </Card>
          ))}
        </Screen>
      )}
    </>
  );
}
