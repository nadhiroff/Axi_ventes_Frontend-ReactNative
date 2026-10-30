import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, FlatList, PanResponder, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQueryClient } from '@tanstack/react-query';

import { errorMessage, type LocalFile } from '../../api/client';
import { api } from '../../api/endpoints';
import { queryKeys } from '../../hooks/api/queryKeys';
import type { ApiImage, ChatMessage, ConversationPayload } from '../../api/types';
import { AudioPlayerButton } from '../../components/ui/AudioPlayerButton';
import { Avatar } from '../../components/ui/Avatar';
import { CachedImage } from '../../components/ui/CachedImage';
import { Icon } from '../../components/ui/Icon';
import { ImageViewer } from '../../components/ui/ImageViewer';
import { BackButton } from '../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { VoiceRecordModal } from '../../components/ui/VoiceRecordModal';
import { useConversation, useMessageActions, useSendMessage } from '../../hooks/api/chat';
import { useFollow } from '../../hooks/api/client';
import { takeProductPhoto } from '../../hooks/useProductPhoto';
import { useT } from '../../i18n';
import { confirmAction, notify, toast } from '../../lib/confirm';
import { formatShortDate } from '../../lib/format';
import { useDialogStore } from '../../components/ui/DialogHost';
import { useKeyboardToolbarStore } from '../../store/uiStore';
import { fontSize, makeStyles, radius, spacing, useLayout, useTheme } from '../../theme';

/**
 * Conversation client ↔ commerçant : texte, photo, message vocal. Nouveaux messages toutes les 4 s.
 * Sans suivi de l'étal, les messages disparaissent 24 h après leur envoi (rappelé en haut de l'écran).
 * Comme WhatsApp : ✓ envoyé, ✓✓ reçu, ✓✓ bleu lu, « en ligne » ; appui long sur son message : modifier, supprimer ;
 * glisser un message (le mien vers la gauche, celui de l'autre vers la droite) : y répondre.
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
  const actions = useMessageActions(id);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
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
    if (editing) {
      if (!body || actions.edit.isPending) return;
      actions.edit.mutate({ id: editing.id, body }, {
        onSuccess: () => {
          setEditing(null);
          setText('');
          toast(t('chat.edited'));
        },
        onError: (e) => notify(t('chat.editTitle'), errorMessage(e), 'error'),
      });
      return;
    }
    if (!body || send.isPending) return;
    setText('');
    const reply = replyTo;
    setReplyTo(null);
    send.mutate({ text: body, replyTo: reply?.id }, {
      onError: (e) => {
        setText(body);
        setReplyTo(reply);
        notify(t('chat.notSent'), errorMessage(e), 'error');
      },
    });
  };
  const sendFile = (input: { photo: LocalFile } | { audio: LocalFile }) =>
    send.mutate({ ...input, replyTo: replyTo?.id }, {
      onSuccess: () => {
        setVoiceOpen(false);
        setReplyTo(null);
      },
      onError: (e) => notify(t('chat.notSent'), errorMessage(e), 'error'),
    });
  // Supprimer pour moi : le message disparaît de mon écran, il reste chez l'autre
  const hideForMe = (m: ChatMessage) =>
    confirmAction(t('chat.hideConfirm'), t('chat.hideText'), () =>
      api
        .hideMessage(id, m.id)
        .then(() => {
          qc.setQueryData<ConversationPayload>(queryKeys.conversation(id), (old) => (old ? { ...old, messages: old.messages.filter((x) => x.id !== m.id) } : old));
          toast(t('chat.hidden'), 'info');
        })
        .catch((e) => notify(t('chat.hideConfirm'), errorMessage(e), 'error')),
    { destructive: true, confirmLabel: t('chat.hideAction') });

  // Appui long : mes messages → modifier, supprimer pour tous ou pour moi ; ceux de l'autre → supprimer pour moi
  const openMenu = (m: ChatMessage) => {
    if (!m.mine || m.deleted) {
      useDialogStore.getState().showDialog({
        title: t('chat.menuTitleOther'),
        message: m.deleted ? t('chat.deletedText') : (m.body ?? (m.kind === 'photo' ? t('chat.photo') : t('chat.voice'))),
        tone: 'info',
        buttons: [
          { label: t('common.cancel'), variant: 'ghost' },
          { label: t('chat.hideAction'), variant: 'destructive', onPress: () => hideForMe(m) },
        ],
      });
      return;
    }
    const remove = () =>
      confirmAction(t('chat.deleteConfirm'), t('chat.deleteText'), () =>
        actions.remove.mutate(m.id, { onSuccess: () => toast(t('chat.deleted'), 'info'), onError: (e) => notify(t('chat.deleteConfirm'), errorMessage(e), 'error') }),
      { destructive: true, confirmLabel: t('common.delete') });
    useDialogStore.getState().showDialog({
      title: t('chat.menuTitle'),
      message: m.body ?? (m.kind === 'photo' ? t('chat.photo') : t('chat.voice')),
      tone: 'info',
      buttons: [
        { label: t('common.cancel'), variant: 'ghost' },
        ...(m.kind === 'text'
          ? [{ label: t('common.edit'), onPress: () => { setEditing(m); setText(m.body ?? ''); } }]
          : []),
        { label: t('chat.deleteForAll'), variant: 'destructive' as const, onPress: remove },
        { label: t('chat.hideAction'), variant: 'ghost' as const, onPress: () => hideForMe(m) },
      ],
    });
  };

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
          onPress={() => router.push({ pathname: '/profil/[id]', params: { id: conv.other_user_id, conv: conv.id } })}
          accessibilityRole="link"
          accessibilityHint={t('profile.title')}
        >
          <Avatar name={conv.other.name} image={conv.other.avatar} size={40} variant={conv.my_role === 'client' ? 'brand' : 'soft'} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>
              {conv.other.name}
            </Text>
            <Text style={[styles.headerSub, conv.other_online && { color: colors.trustText, fontWeight: '600' }]} numberOfLines={1}>
              {conv.other_online ? t('chat.online') : conv.other_last_seen_at ? lastSeen(conv.other_last_seen_at, t) : conv.my_role === 'merchant' ? conv.stall.name : ''}
            </Text>
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
        renderItem={({ item }) => (
          <SwipeToReply onReply={() => { if (!item.deleted) { setEditing(null); setReplyTo(item); } }} mine={item.mine}>
            <Bubble message={item} onImage={setViewer} onLongPress={() => openMenu(item)} otherName={conv.other.name} />
          </SwipeToReply>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{conv.my_role === 'client' ? t('chat.startClient') : t('chat.startMerchant')}</Text>
          </View>
        }
      />

      {replyTo && !editing ? (
        <View style={styles.editBar}>
          <Icon name="corner-up-left" size={16} color={colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.editTitle}>{t('chat.replyTo', { name: replyTo.mine ? t('chat.yourself') : conv.other.name })}</Text>
            <Text style={styles.editText} numberOfLines={1}>{previewOf(replyTo, t)}</Text>
          </View>
          <Pressable onPress={() => setReplyTo(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
            <Icon name="x" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
      {editing ? (
        <View style={styles.editBar}>
          <Icon name="edit-2" size={16} color={colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.editTitle}>{t('chat.editTitle')}</Text>
            <Text style={styles.editText} numberOfLines={1}>{editing.body}</Text>
          </View>
          <Pressable onPress={() => { setEditing(null); setText(''); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
            <Icon name="x" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
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
        {text.trim() || editing ? (
          <Pressable onPress={sendText} style={[styles.sendButton, (send.isPending || actions.edit.isPending) && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={editing ? t('common.update') : t('common.send')}>
            <Icon name={editing ? 'check' : 'send'} size={20} color="#FFFFFF" />
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

/** « Vu aujourd'hui à 14:05 » / « Vu le 28/10/2026 à 14:05 » */
function lastSeen(iso: string, t: ReturnType<typeof useT>): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? t('chat.seenToday', { time }) : t('chat.seenOn', { date: formatShortDate(iso), time });
}

/** Coches comme WhatsApp : ✓ envoyé, ✓✓ reçu, ✓✓ bleu lu */
function Ticks({ status }: { status: ChatMessage['status'] }) {
  if (!status) return null;
  const color = status === 'read' ? '#7DD3FC' : 'rgba(255,255,255,0.75)';
  return (
    <View style={{ flexDirection: 'row' }} accessibilityLabel={status}>
      <Icon name="check" size={14} color={color} />
      {status !== 'sent' ? (
        <View style={{ marginLeft: -9 }}>
          <Icon name="check" size={14} color={color} />
        </View>
      ) : null}
    </View>
  );
}

/** Texte court d'un message (barre « Répondre à ») */
function previewOf(m: ChatMessage, t: ReturnType<typeof useT>): string {
  if (m.kind === 'photo') return `📷 ${t('chat.photoLabel')}`;
  if (m.kind === 'voice') return `🎤 ${t('chat.voice')}`;
  return m.body ?? '';
}

/**
 * Glisser un message vers la droite pour y répondre (comme WhatsApp). Le geste ne démarre que
 * s'il est nettement horizontal : le défilement vertical de la conversation reste normal.
 */
function SwipeToReply({ children, onReply, mine }: { children: React.ReactNode; onReply: () => void; mine: boolean }) {
  const { colors } = useTheme();
  const [x] = useState(() => new Animated.Value(0));
  // Dernière version du rappel, sans recréer le geste à chaque rendu
  const onReplyRef = useLatest(onReply);
  // Le geste est créé une seule fois ; onReplyRef n'est lu que dans le rappel de fin de geste, jamais pendant le rendu
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      // Mes messages (à droite) : glisser vers la gauche ; ceux de l'autre (à gauche) : vers la droite
      onMoveShouldSetPanResponder: (_, g) => (mine ? g.dx < -12 : g.dx > 12) && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      // Capture : le glissement l'emporte sur l'appui de la bulle (la bulle reste touchable sinon)
      onMoveShouldSetPanResponderCapture: (_, g) => (mine ? g.dx < -12 : g.dx > 12) && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => x.setValue(mine ? Math.max(-90, Math.min(g.dx, 0)) : Math.max(0, Math.min(g.dx, 90))),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > 60) onReplyRef.current();
        Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
    }),
  );
  return (
    <View style={{ alignSelf: 'stretch', alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <Animated.View
        style={{
          position: 'absolute',
          ...(mine ? { right: 4 } : { left: 4 }),
          top: 0,
          bottom: 0,
          justifyContent: 'center',
          opacity: x.interpolate({ inputRange: mine ? [-60, 0] : [0, 60], outputRange: mine ? [1, 0] : [0, 1], extrapolate: 'clamp' }),
        }}
      >
        <Icon name="corner-up-left" size={20} color={colors.textMuted} />
      </Animated.View>
      <Animated.View {...responder.panHandlers} style={{ maxWidth: '82%', transform: [{ translateX: x }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

function Bubble({ message, onImage, onLongPress, otherName }: { message: ChatMessage; onImage: (image: ApiImage) => void; onLongPress: () => void; otherName: string }) {
  const styles = useStyles();
  const t = useT();
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={350} style={[styles.bubble, message.mine ? styles.mine : styles.theirs]}>
      {message.reply && !message.deleted ? (
        <View style={[styles.quote, message.mine && styles.quoteMine]}>
          <Text style={[styles.quoteName, message.mine && styles.bodyMine]} numberOfLines={1}>{message.reply.mine ? t('chat.yourself') : otherName}</Text>
          <Text style={[styles.quoteText, message.mine && styles.bodyMine]} numberOfLines={2}>{message.reply.preview}</Text>
        </View>
      ) : null}
      {message.deleted ? (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Icon name="slash" size={14} color={message.mine ? 'rgba(255,255,255,0.85)' : styles.time.color} />
          <Text style={[styles.body, styles.deleted, message.mine && styles.bodyMine]}>{t('chat.deletedText')}</Text>
        </View>
      ) : (
        <>
          {message.kind === 'photo' && message.image ? (
            <Pressable onPress={() => onImage(message.image!)} onLongPress={onLongPress} accessibilityRole="imagebutton">
              <CachedImage image={message.image} variant="medium" style={styles.photo} contentFit="cover" />
            </Pressable>
          ) : null}
          {message.kind === 'voice' && message.audio_url ? <AudioPlayerButton url={message.audio_url} /> : null}
          {message.body ? <Text style={[styles.body, message.mine && styles.bodyMine]}>{message.body}</Text> : null}
        </>
      )}
      <View style={styles.meta}>
        {message.edited ? <Text style={[styles.time, message.mine && styles.timeMine]}>{t('chat.editedLabel')}</Text> : null}
        <Text style={[styles.time, message.mine && styles.timeMine]}>{time}</Text>
        {message.mine && !message.deleted ? <Ticks status={message.status} /> : null}
      </View>
    </Pressable>
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
  quote: { borderLeftWidth: 3, borderLeftColor: c.brand, backgroundColor: c.surfaceAlt, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4, marginBottom: 2 },
  quoteMine: { borderLeftColor: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.15)' },
  quoteName: { fontSize: fontSize.caption, fontWeight: '700', color: c.brand },
  quoteText: { fontSize: fontSize.small, color: c.textMuted },
  bubble: { maxWidth: '100%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: c.brand, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderBottomLeftRadius: 4 },
  body: { fontSize: fontSize.body, color: c.text, lineHeight: 21 },
  bodyMine: { color: '#FFFFFF' },
  time: { fontSize: 11, color: c.textMuted },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  deleted: { fontStyle: 'italic', opacity: 0.85 },
  editBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: c.surfaceAlt, borderTopWidth: 1, borderTopColor: c.border },
  editTitle: { fontSize: fontSize.small, fontWeight: '700', color: c.brand },
  editText: { fontSize: fontSize.small, color: c.textMuted },
  timeMine: { color: 'rgba(255,255,255,0.8)' },
  photo: { width: 220, height: 220, borderRadius: radius.md },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border },
  iconButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.background, paddingHorizontal: spacing.md, paddingTop: 11, paddingBottom: 11, fontSize: fontSize.body, color: c.text },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
}));
