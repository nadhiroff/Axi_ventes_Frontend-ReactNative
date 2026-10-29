import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage, type LocalFile } from '../../api/client';
import type { ApiImage, ChatMessage } from '../../api/types';
import { AudioPlayerButton } from '../../components/ui/AudioPlayerButton';
import { Avatar } from '../../components/ui/Avatar';
import { CachedImage } from '../../components/ui/CachedImage';
import { Icon } from '../../components/ui/Icon';
import { ImageViewer } from '../../components/ui/ImageViewer';
import { BackButton } from '../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { VoiceRecordModal } from '../../components/ui/VoiceRecordModal';
import { useConversation, useSendMessage } from '../../hooks/api/chat';
import { useFollow } from '../../hooks/api/client';
import { takeProductPhoto } from '../../hooks/useProductPhoto';
import { useT } from '../../i18n';
import { notify, toast } from '../../lib/confirm';
import { useKeyboardToolbarStore } from '../../store/uiStore';
import { fontSize, makeStyles, radius, spacing, useLayout, useTheme } from '../../theme';

/**
 * Conversation client ↔ commerçant : texte, photo, message vocal. Nouveaux messages toutes les 4 s.
 * Sans suivi de l'étal, les messages disparaissent 24 h après leur envoi (rappelé en haut de l'écran).
 */
export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const t = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useLayout();
  const query = useConversation(id);
  const send = useSendMessage(id);
  const conv = query.data?.conversation;
  const follow = useFollow(conv?.stall.id ?? '');
  const [text, setText] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [viewer, setViewer] = useState<ApiImage | null>(null);
  const setToolbar = useKeyboardToolbarStore((s) => s.setEnabled);

  // La barre d'envoi remplace la barre « précédent / suivant » au-dessus du clavier
  useFocusEffect(
    useCallback(() => {
      setToolbar(false);
      return () => setToolbar(true);
    }, [setToolbar]),
  );

  if (query.isPending) return <LoadingView />;
  if (!conv) return <ErrorView error={query.error} onRetry={() => query.refetch()} />;

  const messages = [...(query.data?.messages ?? [])].reverse();

  const sendText = () => {
    const body = text.trim();
    if (!body || send.isPending) return;
    setText('');
    send.mutate({ text: body }, {
      onError: (e) => {
        setText(body);
        notify(t('chat.notSent'), errorMessage(e), 'error');
      },
    });
  };
  const sendFile = (input: { photo: LocalFile } | { audio: LocalFile }) =>
    send.mutate(input, { onSuccess: () => setVoiceOpen(false), onError: (e) => notify(t('chat.notSent'), errorMessage(e), 'error') });
  const pickPhoto = async (source: 'camera' | 'library') => {
    const photo = await takeProductPhoto(source, false);
    if (photo) sendFile({ photo });
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton />
        <Pressable
          style={styles.headerMain}
          onPress={() => conv.my_role === 'client' && router.push(`/etal/${conv.stall.id}`)}
          accessibilityRole={conv.my_role === 'client' ? 'link' : 'header'}
        >
          <Avatar name={conv.other.name} image={conv.other.avatar} size={40} variant={conv.my_role === 'client' ? 'brand' : 'soft'} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>
              {conv.other.name}
            </Text>
            {conv.my_role === 'merchant' ? <Text style={styles.headerSub}>{conv.stall.name}</Text> : null}
          </View>
        </Pressable>
      </View>

      <View style={[styles.notice, conv.kept && { backgroundColor: colors.trustSoft }]}>
        <Icon name={conv.kept ? 'bookmark' : 'clock'} size={16} color={conv.kept ? colors.trustText : colors.brandDark} />
        <Text style={[styles.noticeText, conv.kept && { color: colors.trustText }]}>{conv.retention_note}</Text>
        {conv.my_role === 'client' && !conv.kept ? (
          <Pressable
            onPress={() => follow.mutate(true, { onSuccess: () => { toast(t('chat.kept')); query.refetch(); } })}
            style={styles.keepButton}
            accessibilityRole="button"
          >
            <Text style={styles.keepText}>{t('stall.follow')}</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        inverted
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        renderItem={({ item }) => <Bubble message={item} onImage={setViewer} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{conv.my_role === 'client' ? t('chat.startClient') : t('chat.startMerchant')}</Text>
          </View>
        }
      />

      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <Pressable onPress={() => pickPhoto('library')} onLongPress={() => pickPhoto('camera')} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('chat.photo')} hitSlop={6}>
          <Icon name="image" size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => pickPhoto('camera')} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('common.camera')} hitSlop={6}>
          <Icon name="camera" size={22} color={colors.text} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('chat.placeholder')}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          maxLength={2000}
          accessibilityLabel={t('chat.placeholder')}
        />
        {text.trim() ? (
          <Pressable onPress={sendText} style={[styles.sendButton, send.isPending && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={t('common.send')}>
            <Icon name="send" size={20} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable onPress={() => setVoiceOpen(true)} style={styles.sendButton} accessibilityRole="button" accessibilityLabel={t('chat.voice')}>
            <Icon name="mic" size={20} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      <VoiceRecordModal visible={voiceOpen} title={t('chat.voice')} hint={t('chat.voiceHint')} sending={send.isPending} onClose={() => setVoiceOpen(false)} onSend={(audio) => sendFile({ audio })} />
      <ImageViewer images={viewer ? [viewer] : []} visible={!!viewer} onClose={() => setViewer(null)} />
    </KeyboardAvoidingView>
  );
}

function Bubble({ message, onImage }: { message: ChatMessage; onImage: (image: ApiImage) => void }) {
  const styles = useStyles();
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[styles.bubble, message.mine ? styles.mine : styles.theirs]}>
      {message.kind === 'photo' && message.image ? (
        <Pressable onPress={() => onImage(message.image!)} accessibilityRole="imagebutton">
          <CachedImage image={message.image} variant="medium" style={styles.photo} contentFit="cover" />
        </Pressable>
      ) : null}
      {message.kind === 'voice' && message.audio_url ? <AudioPlayerButton url={message.audio_url} /> : null}
      {message.body ? <Text style={[styles.body, message.mine && styles.bodyMine]}>{message.body}</Text> : null}
      <Text style={[styles.time, message.mine && styles.timeMine]}>{time}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
  headerMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerName: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  headerSub: { fontSize: fontSize.caption, color: c.textMuted },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: c.brandSoft },
  noticeText: { flex: 1, fontSize: fontSize.small, color: c.brandDark },
  keepButton: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: c.brand },
  keepText: { color: '#FFFFFF', fontWeight: '700', fontSize: fontSize.small },
  empty: { padding: spacing.xl, transform: [{ scaleY: -1 }] },
  emptyText: { textAlign: 'center', color: c.textMuted, fontSize: fontSize.body },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: c.brand, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderBottomLeftRadius: 4 },
  body: { fontSize: fontSize.body, color: c.text, lineHeight: 21 },
  bodyMine: { color: '#FFFFFF' },
  time: { fontSize: 11, color: c.textMuted, alignSelf: 'flex-end' },
  timeMine: { color: 'rgba(255,255,255,0.8)' },
  photo: { width: 220, height: 220, borderRadius: radius.md },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border },
  iconButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.background, paddingHorizontal: spacing.md, paddingTop: 11, paddingBottom: 11, fontSize: fontSize.body, color: c.text },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
}));
