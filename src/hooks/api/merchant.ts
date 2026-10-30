import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { LocalFile } from '../../api/client';
import { api } from '../../api/endpoints';
import type { ClientInput, ClientSegment, ProductPatch, StallInput } from '../../api/types';
import { queryKeys } from './queryKeys';

export const useStallOptions = () => useQuery({ queryKey: queryKeys.stallOptions, queryFn: api.stallOptions, staleTime: 3600_000 });
export const useMerchantToday = () => useQuery({ queryKey: queryKeys.merchantToday, queryFn: api.merchantToday, refetchInterval: 60_000 });
// Relu à chaque ouverture ; visible : toutes les 30 s sur Mon étal (vérification par un agent, nouvelle adresse)
export const useMerchantStall = (visible = false) => useQuery({ queryKey: queryKeys.merchantStall, queryFn: api.merchantStall, staleTime: 0, refetchInterval: visible ? 30_000 : false });
// Relue toutes les 30 s, SEULEMENT quand l'onglet est affiché (réponse 304 sans corps si rien n'a changé)
export const useMerchantClients = (segment: ClientSegment, search: string, visible = true) =>
  useQuery({ queryKey: queryKeys.merchantClients(segment, search), queryFn: () => api.merchantClients(segment, search || undefined), staleTime: 15_000, refetchInterval: visible ? 30_000 : false });
// Fiche relue à chaque ouverture : jamais une ancienne copie (compteurs, commandes) gardée sur le téléphone
export const useMerchantClient = (clientId: string) => useQuery({ queryKey: queryKeys.merchantClient(clientId), queryFn: () => api.merchantClient(clientId), staleTime: 0 });
// Relu à chaque ouverture, et toutes les 20 s quand l'écran est affiché : la réponse à un crédit ou un versement apparaît seule
export const useMerchantMoney = (visible = true) => useQuery({ queryKey: queryKeys.merchantMoney, queryFn: api.merchantMoney, staleTime: 0, refetchInterval: visible ? 20_000 : false });
export const useVoiceMessages = () => useQuery({ queryKey: queryKeys.voiceMessages, queryFn: api.voiceMessages });

/** Invalide tout l'espace commerçant après une modification */
function useRefreshMerchant() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['merchant'] });
}

export function useStallMutations() {
  const refresh = useRefreshMerchant();
  const qc = useQueryClient();
  const onSuccess = () => {
    refresh();
    qc.invalidateQueries({ queryKey: queryKeys.me });
  };
  return {
    update: useMutation({ mutationFn: (input: StallInput) => api.updateStall(input), onSuccess }),
    photo: useMutation({ mutationFn: (photo: LocalFile) => api.stallPhoto(photo), onSuccess }),
    addGallery: useMutation({ mutationFn: (photos: LocalFile[]) => api.addStallPhotos(photos), onSuccess }),
    removeGallery: useMutation({ mutationFn: (index: number) => api.removeStallPhoto(index), onSuccess }),
    requestVerification: useMutation({ mutationFn: api.requestVerification, onSuccess }),
  };
}

export function useProductMutations() {
  const onSuccess = useRefreshMerchant();
  return {
    create: useMutation({
      mutationFn: (v: { fields: { name: string; description: string; price: string; price_max: string; is_today: string; stock_quantity: string }; photos: LocalFile[] }) => api.createProduct(v.fields, v.photos),
      onSuccess,
    }),
    update: useMutation({ mutationFn: (v: { id: string; patch: ProductPatch }) => api.updateProduct(v.id, v.patch), onSuccess }),
    addPhotos: useMutation({ mutationFn: (v: { id: string; photos: LocalFile[] }) => api.addProductPhotos(v.id, v.photos), onSuccess }),
    removePhoto: useMutation({ mutationFn: (v: { id: string; index: number }) => api.removeProductPhoto(v.id, v.index), onSuccess }),
    remove: useMutation({ mutationFn: (productId: string) => api.deleteProduct(productId), onSuccess }),
  };
}

export function useMerchantActions() {
  const onSuccess = useRefreshMerchant();
  return {
    ready: useMutation({ mutationFn: (orderId: string) => api.markOrderReady(orderId), onSuccess }),
    relocation: useMutation({ mutationFn: api.broadcastRelocation, onSuccess }),
    arrival: useMutation({ mutationFn: (v: { text: string; endsOn: string; photos: LocalFile[] }) => api.announceArrival(v.text, v.endsOn, v.photos), onSuccess }),
    updateAnnouncement: useMutation({ mutationFn: (v: { id: string; text?: string; ends_on?: string }) => api.updateAnnouncement(v.id, { text: v.text, ends_on: v.ends_on }), onSuccess }),
    addAnnouncementPhotos: useMutation({ mutationFn: (v: { id: string; photos: LocalFile[] }) => api.addAnnouncementPhotos(v.id, v.photos), onSuccess }),
    removeAnnouncementPhoto: useMutation({ mutationFn: (v: { id: string; index: number }) => api.removeAnnouncementPhoto(v.id, v.index), onSuccess }),
    deleteAnnouncement: useMutation({ mutationFn: (announcementId: string) => api.deleteAnnouncement(announcementId), onSuccess }),
    deleteVoiceMessage: useMutation({ mutationFn: (messageId: string) => api.deleteVoiceMessage(messageId), onSuccess }),
    addClient: useMutation({ mutationFn: (input: ClientInput) => api.addClient(input), onSuccess }),
    updateClient: useMutation({ mutationFn: (v: { id: string; input: Partial<ClientInput> }) => api.updateClient(v.id, v.input), onSuccess }),
    deleteClient: useMutation({ mutationFn: (clientId: string) => api.deleteClient(clientId), onSuccess }),
    followUp: useMutation({ mutationFn: (clientId: string) => api.followUpClient(clientId), onSuccess }),
    broadcast: useMutation({ mutationFn: (v: { segment: ClientSegment; text?: string }) => api.broadcastToSegment(v.segment, v.text), onSuccess }),
    listened: useMutation({ mutationFn: (messageId: string) => api.markListened(messageId), onSuccess }),
    requestCredit: useMutation({ mutationFn: (amount?: number) => api.requestCredit(amount), onSuccess }),
    answerCreditOffer: useMutation({ mutationFn: (accept: boolean) => api.answerCreditOffer(accept), onSuccess }),
    dataSharing: useMutation({ mutationFn: (enabled: boolean) => api.setDataSharing(enabled), onSuccess }),
  };
}
