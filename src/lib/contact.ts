import { Linking } from 'react-native';

import { useLangStore } from '../i18n';
import { notify } from './confirm';
import { whatsappUrl } from './format';

const en = () => useLangStore.getState().lang === 'en';

async function open(url: string, failTitle: string, failText: string) {
  try {
    await Linking.openURL(url);
  } catch {
    notify(failTitle, failText, 'error');
  }
}

/** Ouvre le téléphone sur ce numéro (espaces retirés) ; message clair si l'appareil ne peut pas appeler. */
export function callPhone(phone: string | null) {
  if (!phone) return;
  return open(
    `tel:${phone.replace(/[^\d+]/g, '')}`,
    en() ? 'Call unavailable' : 'Appel impossible',
    en() ? `This device cannot make calls. Number: ${phone}` : `Cet appareil ne peut pas passer d’appel. Numéro : ${phone}`,
  );
}

export function openWhatsapp(phone: string, text?: string) {
  return open(whatsappUrl(phone, text), 'WhatsApp', en() ? 'WhatsApp could not be opened.' : 'Impossible d’ouvrir WhatsApp.');
}

export function openLink(url: string) {
  return open(url, en() ? 'Link unavailable' : 'Lien indisponible', url);
}
