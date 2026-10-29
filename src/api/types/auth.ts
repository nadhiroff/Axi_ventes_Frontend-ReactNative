export type Role = 'client' | 'merchant' | 'pro' | 'agent' | 'admin';

export type Lang = 'fr' | 'fon' | 'yo' | 'en';

export type OrganizationType = 'anagem' | 'advertiser' | 'mfi' | 'research';

/** GET /v1/me : miroir de la table users (+ organisation pour les comptes pro). */
export type User = {
  id: string;
  name: string; // vide tant que le profil n'est pas complété (nouveau compte)
  phone: string; // E.164
  role: Role;
  lang: Lang;
  organization: { id: string; name: string; type: OrganizationType } | null;
};

/** POST /v1/auth/otp */
export type OtpRequest = { phone: string };

export type OtpSent = {
  channel: 'sms' | 'whatsapp'; // WhatsApp pour les numéros hors Bénin
  code_length: number; // 6
  expires_in: number; // secondes (300)
  resend_in: number; // secondes avant de pouvoir redemander (60)
};

/** POST /v1/auth/verify */
export type OtpVerify = { phone: string; code: string; device: string };

export type Session = {
  token: string; // à garder secret, envoyé ensuite en Authorization: Bearer
  is_new: boolean; // true : demander le nom
  user: User;
};

/** PATCH /v1/me */
export type ProfilePatch = Partial<Pick<User, 'name' | 'lang'>>;
