import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { LocalFile } from '../../api/client';
import { api } from '../../api/endpoints';
import type { ChatMessage, ConversationPayload, ConversationSummary, MerchantClients } from '../../api/types';
import { useAuthStore } from '../../store/authStore';
import { queryKeys } from './queryKeys';

const useSignedIn = () => useAuthStore((s) => s.status === 'signedIn');

/** Pastilles (messages et notifications non lus) : interrogées toutes les 15 s, 304 si rien n'a changé */
export const useBadges = () => useQuery({ queryKey: queryKeys.badges, queryFn: api.badges, enabled: useSignedIn(), refetchInterval: 15_000, staleTime: 5_000 });

/**
 * Liste des conversations : relue dès que l'écran revient au premier plan (retour d'une discussion), puis toutes les
 * 5 s tant qu'il est affiché, pour que le dernier message et ses coches (✓ envoyé, ✓✓ reçu, ✓✓ bleu vu) suivent vite.
 */
export function useConversations() {
  const focused = useIsFocused();
  const query = useQuery({ queryKey: queryKeys.conversations, queryFn: api.conversations, enabled: useSignedIn(), refetchInterval: focused ? 5_000 : false, staleTime: 0 });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  return query;
}

/** Aperçu d'un message, identique à celui du serveur (sinon le texte changerait à la relecture de la liste) */
function previewOf(m: ChatMessage): string {
  if (m.deleted) return '🚫 Message supprimé';
  return m.kind === 'photo' ? '📷 Photo' : m.kind === 'voice' ? '🎤 Message vocal' : m.kind === 'video' ? '🎥 Vidéo' : (m.body ?? '').slice(0, 80);
}

/** Conversation ouverte : nouveaux messages toutes les 4 s (réponse vide 304 si rien de neuf) */
export function useConversation(conversationId: string) {
  const focused = useIsFocused();
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.conversation(conversationId),
    queryFn: async () => {
      const data = await api.messages(conversationId);
      // Conversation ouverte = lue : son compteur disparaît tout de suite de la liste, et les pastilles se mettent à jour
      qc.setQueryData<{ conversations: ConversationSummary[]; ttl_hours: number }>(queryKeys.conversations, (old) =>
        old ? { ...old, conversations: old.conversations.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)) } : old,
      );
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
    mutationFn: ({ replyTo, caption, ...input }: ({ text: string } | { photo: LocalFile } | { audio: LocalFile } | { video: LocalFile }) & { replyTo?: string; caption?: string }) =>
      'text' in input ? api.sendText(conversationId, input.text, replyTo) : api.sendMedia(conversationId, input as { photo: LocalFile } | { audio: LocalFile } | { video: LocalFile }, replyTo, caption),
    onSuccess: (message) => {
      append(message);
      // Les listes montrent tout de suite mon dernier message et sa coche, sans attendre leur prochain rafraîchissement
      const last = { kind: message.kind, preview: previewOf(message), mine: true, status: message.status ?? 'sent', created_at: message.created_at };
      qc.setQueryData<{ conversations: ConversationSummary[]; ttl_hours: number }>(queryKeys.conversations, (old) => {
        if (!old) return old;
        const current = old.conversations.find((c) => c.id === conversationId);
        if (!current) return old;
        return { ...old, conversations: [{ ...current, last_message: last }, ...old.conversations.filter((c) => c.id !== conversationId)] };
      });
      // Commerçant : la ligne du client dans « Mes clients » (toutes les listes filtrées en mémoire)
      const otherUserId = qc.getQueryData<ConversationPayload>(key)?.conversation.other_user_id;
      if (otherUserId) {
        qc.setQueriesData<MerchantClients>({ queryKey: ['merchant', 'clients'] }, (old) =>
          old ? { ...old, clients: old.clients.map((c) => (c.user_id === otherUserId ? { ...c, last_message: { preview: last.preview, mine: true, status: last.status, created_at: last.created_at } } : c)) } : old,
        );
      }
      qc.invalidateQueries({ queryKey: queryKeys.conversations });
      qc.invalidateQueries({ queryKey: ['merchant', 'clients'] });
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
