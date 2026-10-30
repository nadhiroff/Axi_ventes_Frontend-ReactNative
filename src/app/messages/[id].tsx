import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Animated, FlatList, PanResponder, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
import { Tag } from '../../components/ui/Tag';
import { SubscriberTag } from '../../components/ui/VerifiedIcon';
import { ImageViewer } from '../../components/ui/ImageViewer';
import { BackButton } from '../../components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { VoiceRecordModal } from '../../components/ui/VoiceRecordModal';
import { useConversation, useMessageActions, useSendMessage } from '../../hooks/api/chat';
import { useFollow } from '../../hooks/api/client';
import { pickChatMedia, type ChatAttachment } from '../../hooks/useProductPhoto';
import { VideoMessage } from '../../components/chat/VideoMessage';
import { useT } from '../../i18n';
import { confirmAction, notify, toast } from '../../lib/confirm';
import { formatShortDate } from '../../lib/format';
import { useDialogStore } from '../../components/ui/DialogHost';
import { Ticks } from '../../components/chat/Ticks';
import { useKeyboardToolbarStore } from '../../store/uiStore';
import { fontSize, makeStyles, radius, spacing, useLayout, useTheme } from '../../theme';

// Photos et vidéos envoyées d'un coup (chacune devient un message)
const MAX_ATTACHMENTS = 10;

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
  // Photos et vidéos choisies, montrées au-dessus de la saisie avant l'envoi (on peut en retirer)
  const [tray, setTray] = useState<ChatAttachment[]>([]);
  const [sendingTray, setSendingTray] = useState(false);
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
        message: m.deleted ? t('chat.deletedText') : (m.body ?? (m.kind === 'photo' ? t('chat.photo') : m.kind === 'video' ? t('chat.video') : t('chat.voice'))),
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
      message: m.body ?? (m.kind === 'photo' ? t('chat.photo') : m.kind === 'video' ? t('chat.video') : t('chat.voice')),
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

  // Bouton en haut à droite : réglages et actions de la discussion (commerçant et client)
  const dialog = useDialogStore.getState().showDialog;
  const chooseRetention = () => {
    if (!conv?.retention_options) return;
    dialog({
      title: t('chat.retentionTitle'),
      message: t('chat.retentionText'),
      tone: 'info',
      buttons: [
        ...conv.retention_options.map((o) => ({
          label: `${o.hours === conv.retention_hours ? '✓ ' : ''}${o.label}${o.locked ? ` · ${t('chat.subscribersOnly')}` : ''}`,
          variant: (o.hours === conv.retention_hours ? 'primary' : 'ghost') as 'primary' | 'ghost',
          onPress: () => {
            if (o.locked) return router.push('/commercant/abonnement');
            if (o.hours === conv.retention_hours) return;
            api
              .conversationSettings(id, o.hours)
              .then(({ conversation }) => {
                qc.setQueryData<ConversationPayload>(queryKeys.conversation(id), (old) => (old ? { ...old, conversation } : old));
                qc.invalidateQueries({ queryKey: queryKeys.conversations });
                toast(t('chat.retentionSaved', { label: o.label }));
              })
              .catch((e) => notify(t('chat.retentionTitle'), errorMessage(e), 'error'));
          },
        })),
        { label: t('common.cancel'), variant: 'ghost' as const },
      ],
    });
  };
  const clearChat = () =>
    confirmAction(t('chat.clearConfirm', { name: conv?.other.name ?? '' }), t('chat.clearText'), () =>
      api
        .clearConversation(id)
        .then(() => {
          qc.invalidateQueries({ queryKey: queryKeys.conversations });
          qc.invalidateQueries({ queryKey: queryKeys.badges });
          toast(t('chat.cleared'), 'info');
          router.back();
        })
        .catch((e) => notify(t('chat.title'), errorMessage(e), 'error')),
      { destructive: true, confirmLabel: t('common.delete') },
    );
  const openSettings = () => {
    if (!conv) return;
    const merchant = conv.my_role === 'merchant';
    dialog({
      title: conv.other.name,
      message: conv.retention_note,
      tone: 'info',
      buttons: [
        // Compte bloqué : ni profil ni étal à ouvrir
        ...(conv.other_unavailable
          ? []
          : [
              ...(merchant ? [{ label: t('chat.retentionTitle'), onPress: chooseRetention }] : [{ label: t('chat.seeStall'), onPress: () => router.push(`/etal/${conv.stall.id}`) }]),
              { label: merchant ? t('chat.seeClient') : t('chat.seeMerchant'), variant: 'ghost' as const, onPress: () => router.push({ pathname: '/profil/[id]', params: { id: conv.other_user_id, conv: conv.id } }) },
            ]),
        { label: t('chat.clearAction'), variant: 'destructive' as const, onPress: clearChat },
        { label: t('common.cancel'), variant: 'ghost' as const },
      ],
    });
  };

  const addMedia = async (source: 'camera' | 'library') => {
    const left = MAX_ATTACHMENTS - tray.length;
    if (left <= 0) return;
    const picked = await pickChatMedia(source, left);
    if (picked.length) setTray((current) => [...current, ...picked].slice(0, MAX_ATTACHMENTS));
  };
  // Envoi dans l'ordre choisi ; le texte tapé devient la légende de la première
  const sendTray = async () => {
    if (!tray.length || sendingTray) return;
    setSendingTray(true);
    const caption = text.trim();
    const reply = replyTo?.id;
    const items = tray;
    let sent = 0;
    try {
      for (const [i, a] of items.entries()) {
        await send.mutateAsync({ ...(a.kind === 'photo' ? { photo: a.file } : { video: a.file }), replyTo: i === 0 ? reply : undefined, caption: i === 0 && caption ? caption : undefined });
        sent++;
      }
      setText('');
      setReplyTo(null);
    } catch (e) {
      notify(t('chat.notSent'), errorMessage(e), 'error');
    } finally {
      // Ce qui n'est pas parti reste prêt à renvoyer
      setTray(items.slice(sent));
      setSendingTray(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton />
        <Pressable
          style={styles.headerMain}
          disabled={conv.other_unavailable}
          onPress={() => router.push({ pathname: '/profil/[id]', params: { id: conv.other_user_id, conv: conv.id } })}
          accessibilityRole="link"
          accessibilityHint={t('profile.title')}
        >
          <Avatar name={conv.other.name} image={conv.other.avatar} size={40} variant={conv.my_role === 'client' ? 'brand' : 'soft'} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={[styles.headerName, { flexShrink: 1 }]} numberOfLines={1}>
                {conv.other.name}
              </Text>
              {conv.my_role === 'client' && !conv.other_unavailable ? <Tag label={t('chat.merchantBadge')} tone="brand" icon="shopping-bag" /> : null}
              {conv.my_role === 'client' && conv.stall.subscribed && !conv.other_unavailable ? <SubscriberTag /> : null}
            </View>
            <Text style={[styles.headerSub, conv.other_online && { color: colors.trustText, fontWeight: '600' }]} numberOfLines={1}>
              {conv.other_online ? t('chat.online') : conv.other_last_seen_at ? lastSeen(conv.other_last_seen_at, t) : conv.my_role === 'merchant' ? conv.stall.name : ''}
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={openSettings} style={styles.more} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('chat.settings')}>
          <Icon name="more-vertical" size={22} color={colors.text} />
        </Pressable>
      </View>


      {/* Discussion vide : texte HORS de la liste inversée (dedans, il s'affichait à l'envers selon la version de React Native) */}
      {!messages.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{conv.my_role === 'client' ? t('chat.startClient') : t('chat.startMerchant')}</Text>
        </View>
      ) : (
      <FlatList
        inverted
        showsVerticalScrollIndicator={false}
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
      />
      )}

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
      {tray.length && !editing ? (
        <View style={styles.tray}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}>
            {tray.map((a, i) => (
              <View key={a.file.uri} style={styles.trayItem}>
                {a.kind === 'photo' ? (
                  <Image source={{ uri: a.file.uri }} style={styles.trayImage} contentFit="cover" />
                ) : (
                  <View style={[styles.trayImage, styles.trayVideo]}>
                    <Icon name="video" size={22} color="#FFFFFF" />
                    {a.durationMs ? <Text style={styles.trayDuration}>{`0:${String(Math.round(a.durationMs / 1000)).padStart(2, '0')}`}</Text> : null}
                  </View>
                )}
                {sendingTray ? null : (
                  <Pressable onPress={() => setTray((current) => current.filter((_, k) => k !== i))} style={styles.trayRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('cart.remove')}>
                    <Icon name="x" size={14} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>
            ))}
          </ScrollView>
          <Text style={styles.trayHint}>{sendingTray ? t('chat.sending') : t('chat.trayHint', { n: tray.length, max: MAX_ATTACHMENTS })}</Text>
        </View>
      ) : null}
      {conv.other_unavailable ? (
        <View style={[styles.followBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <Icon name="slash" size={18} color={colors.textMuted} />
          <Text style={styles.followText}>{t('chat.unavailable')}</Text>
        </View>
      ) : !conv.can_write ? (
        // Le client écrit seulement aux étals qu'il suit : un geste pour suivre, puis la saisie apparaît
        <View style={[styles.followBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <Text style={styles.followText}>{t('chat.followToWrite', { name: conv.stall.name })}</Text>
          <Pressable
            onPress={() => follow.mutate(true, { onSuccess: () => query.refetch(), onError: (e) => notify(t('stall.follow'), errorMessage(e), 'error') })}
            disabled={follow.isPending}
            style={[styles.followButton, follow.isPending && { opacity: 0.6 }]}
            accessibilityRole="button"
          >
            <Icon name="user-plus" size={18} color="#FFFFFF" />
            <Text style={styles.followButtonText}>{t('stall.follow')}</Text>
          </Pressable>
        </View>
      ) : (
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <Pressable onPress={() => addMedia('library')} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('chat.photosVideos')} hitSlop={6}>
          <Icon name="image" size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => addMedia('camera')} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('common.camera')} hitSlop={6}>
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
        {tray.length && !editing ? (
          <Pressable onPress={sendTray} disabled={sendingTray} style={[styles.sendButton, sendingTray && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={t('chat.sendCount', { n: tray.length })}>
            <Icon name="send" size={20} color="#FFFFFF" />
          </Pressable>
        ) : text.trim() || editing ? (
          <Pressable onPress={sendText} style={[styles.sendButton, (send.isPending || actions.edit.isPending) && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={editing ? t('common.update') : t('common.send')}>
            <Icon name={editing ? 'check' : 'send'} size={20} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable onPress={() => setVoiceOpen(true)} style={styles.sendButton} accessibilityRole="button" accessibilityLabel={t('chat.voice')}>
            <Icon name="mic" size={20} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      )}

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

/** Texte court d'un message (barre « Répondre à ») */
function previewOf(m: ChatMessage, t: ReturnType<typeof useT>): string {
  if (m.kind === 'photo') return `📷 ${t('chat.photoLabel')}`;
  if (m.kind === 'voice') return `🎤 ${t('chat.voice')}`;
  if (m.kind === 'video') return `🎥 ${t('chat.video')}`;
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
          {message.kind === 'video' && message.video_url ? <VideoMessage url={message.video_url} onLongPress={onLongPress} /> : null}
          {message.body ? <Text style={[styles.body, message.mine && styles.bodyMine]}>{message.body}</Text> : null}
        </>
      )}
      <View style={styles.meta}>
        {message.edited ? <Text style={[styles.time, message.mine && styles.timeMine]}>{t('chat.editedLabel')}</Text> : null}
        <Text style={[styles.time, message.mine && styles.timeMine]}>{time}</Text>
        {message.mine && !message.deleted ? <Ticks status={message.status} onBrand /> : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
  headerMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerName: { fontSize: fontSize.title, fontWeight: '700', color: c.text },
  headerSub: { fontSize: fontSize.caption, color: c.textMuted },
  followBar: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border },
  followText: { fontSize: fontSize.small, color: c.textMuted, textAlign: 'center' },
  followButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, minHeight: 44, borderRadius: radius.pill, backgroundColor: c.brand },
  followButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: fontSize.body },
  more: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, justifyContent: 'center', padding: spacing.xl },
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
  tray: { backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, paddingTop: spacing.sm, gap: 4 },
  trayItem: { width: 72, height: 72 },
  trayImage: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: c.surfaceAlt },
  trayVideo: { backgroundColor: '#1C1917', alignItems: 'center', justifyContent: 'center', gap: 2 },
  trayDuration: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  trayRemove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  trayHint: { fontSize: fontSize.caption, color: c.textMuted, paddingHorizontal: spacing.md },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.background, paddingHorizontal: spacing.md, paddingTop: 11, paddingBottom: 11, fontSize: fontSize.body, color: c.text },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
}));
