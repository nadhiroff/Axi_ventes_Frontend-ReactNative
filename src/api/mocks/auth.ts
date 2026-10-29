// Faux service de connexion. Code de démonstration : 123456.
// Le jeton contient le numéro ("mock.+229…") pour survivre au rechargement de l'application.
import { ApiError, getAuthToken } from '../client';
import type { OtpSent, ProfilePatch, Session, User } from '../types';

export const DEMO_CODE = '123456';

/** Comptes de démonstration ; tout autre numéro crée un nouveau client. */
const knownUsers: Record<string, Omit<User, 'phone'>> = {
  '+22997000001': { id: 'usr_1', name: 'Maman Afi', role: 'merchant', lang: 'fr', organization: null },
  '+22990000000': { id: 'usr_2', name: 'Équipe Axi', role: 'admin', lang: 'fr', organization: null },
  '+22990000001': {
    id: 'usr_3',
    name: 'Service des marchés',
    role: 'pro',
    lang: 'fr',
    organization: { id: 'org_1', name: 'ANaGeM', type: 'anagem' },
  },
  '+22990000002': {
    id: 'usr_4',
    name: 'Crédit Marché',
    role: 'pro',
    lang: 'fr',
    organization: { id: 'org_2', name: '[IMF partenaire]', type: 'mfi' },
  },
};

const profiles = new Map<string, User>();
const attempts = new Map<string, number>();

const delay = <T>(value: T, ms = 500) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

function userFor(phone: string): { user: User; isNew: boolean } {
  const saved = profiles.get(phone);
  if (saved) return { user: saved, isNew: false };
  const known = knownUsers[phone];
  if (known) return { user: { ...known, phone }, isNew: false };
  return { user: { id: `usr_${phone.slice(-6)}`, name: '', phone, role: 'client', lang: 'fr', organization: null }, isNew: true };
}

function currentPhone(): string {
  const token = getAuthToken();
  if (!token?.startsWith('mock.')) throw new ApiError('UNAUTHENTICATED', 'Connectez-vous pour continuer.', 401);
  return token.slice(5);
}

export const mockAuth = {
  requestOtp: (phone: string): Promise<OtpSent> => {
    if (!/^\+\d{8,15}$/.test(phone)) {
      return Promise.reject(new ApiError('INVALID_PHONE', 'Ce numéro ne semble pas valide.', 422));
    }
    attempts.set(phone, 0);
    return delay({ channel: phone.startsWith('+229') ? 'sms' : 'whatsapp', code_length: 6, expires_in: 300, resend_in: 60 });
  },

  verifyOtp: ({ phone, code }: { phone: string; code: string }): Promise<Session> => {
    const tries = (attempts.get(phone) ?? 0) + 1;
    attempts.set(phone, tries);
    if (tries > 5) {
      return Promise.reject(new ApiError('OTP_TOO_MANY_ATTEMPTS', 'Trop d’essais. Demandez un nouveau code.', 429));
    }
    if (code !== DEMO_CODE) {
      return Promise.reject(new ApiError('OTP_INVALID', `Code incorrect. Encore ${5 - tries} essai(s).`, 422));
    }
    const { user, isNew } = userFor(phone);
    return delay({ token: `mock.${phone}`, is_new: isNew, user });
  },

  me: (): Promise<User> => {
    try {
      return delay(userFor(currentPhone()).user, 200);
    } catch (e) {
      return Promise.reject(e);
    }
  },

  updateMe: (patch: ProfilePatch): Promise<User> => {
    try {
      const phone = currentPhone();
      const user = { ...userFor(phone).user, ...patch };
      profiles.set(phone, user);
      return delay(user);
    } catch (e) {
      return Promise.reject(e);
    }
  },

  logout: () => delay({ logged_out: true as const }, 200),

  requestAgentVisit: () =>
    delay({ message: 'Demande enregistrée. Un agent Axi vous appelle pour fixer sa visite à votre étal.' }),
};

/** Les actions qui exigent un compte refusent sans jeton, comme le vrai serveur. */
export function requireSession(): void {
  currentPhone();
}
