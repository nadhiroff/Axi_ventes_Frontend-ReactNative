import { useIsFocused } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { LocalFile } from '../../api/client';
import { api } from '../../api/endpoints';
import type { ChatMessage, ConversationPayload } from '../../api/types';
import { useAuthStore } from '../../store/authStore';
import { queryKeys } from './queryKeys';

const useSignedIn = () => useAuthStore((s) => s.status === 'signedIn');

/** Pastilles (messages et notifications non lus) : interrogées toutes les 15 s, 304 si rien n'a changé */
export const useBadges = () => useQuery({ queryKey: queryKeys.badges, queryFn: api.badges, enabled: useSignedIn(), refetchInterval: 15_000, staleTime: 5_000 });

/** Liste des conversations, rafraîchie toutes les 10 s tant que l'écran est affiché */
export function useConversations() {
  const focused = useIsFocused();
  return useQuery({ queryKey: queryKeys.conversations, queryFn: api.conversations, enabled: useSignedIn(), refetchInterval: focused ? 10_000 : false });
}

/** Conversation ouverte : nouveaux messages toutes les 4 s (réponse vide 304 si rien de neuf) */
export function useConversation(conversationId: string) {
  const focused = useIsFocused();
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.conversation(conversationId),
    queryFn: async () => {
      const data = await api.messages(conversationId);
      // Lue : les pastilles se mettent à jour
      qc.invalidateQueries({ queryKey: queryKeys.badges });
      return data;
    },
    refetchInterval: focused ? 4_000 : false,
    staleTime: 0,
  });
}

/** Envoi d'un message : affiché tout de suite, puis remplacé par la version du serveur */
export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  const key = queryKeys.conversation(conversationId);
  const append = (message: ChatMessage) =>
    qc.setQueryData<ConversationPayload>(key, (old) => (old ? { ...old, messages: [...old.messages.filter((m) => m.id !== message.id), message] } : old));
  return useMutation({
    mutationFn: ({ replyTo, ...input }: ({ text: string } | { photo: LocalFile } | { audio: LocalFile }) & { replyTo?: string }) =>
      'text' in input ? api.sendText(conversationId, input.text, replyTo) : api.sendMedia(conversationId, input as { photo: LocalFile } | { audio: LocalFile }, replyTo),
    onSuccess: (message) => {
      append(message);
      qc.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

/** Modifier ou supprimer son propre message : la bulle change tout de suite */
export function useMessageActions(conversationId: string) {
  const qc = useQueryClient();
  const key = queryKeys.conversation(conversationId);
  const replace = (message: ChatMessage) => {
    qc.setQueryData<ConversationPayload>(key, (old) => (old ? { ...old, messages: old.messages.map((m) => (m.id === message.id ? message : m)) } : old));
    qc.invalidateQueries({ queryKey: queryKeys.conversations });
  };
  return {
    edit: useMutation({ mutationFn: (v: { id: string; body: string }) => api.editMessage(conversationId, v.id, v.body), onSuccess: replace }),
    remove: useMutation({ mutationFn: (messageId: string) => api.deleteMessage(conversationId, messageId), onSuccess: replace }),
  };
}
