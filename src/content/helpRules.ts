import type { IconName } from '../components/ui/Icon';
import type { Lang } from '../i18n';

/**
 * Aide et règlement d'Axi, affichés dans « Mon compte » > Aide et règlement (clients et commerçants).
 * Texte long, rangé par thème : gardé ici plutôt que dans les fichiers de traduction de l'interface.
 * fon et yoruba : le français s'affiche en attendant une traduction validée par un locuteur.
 */

export const SUPPORT_EMAIL = 'nadhiroff14@gmail.com';

export type HelpSection = {
  id: string;
  icon: IconName;
  title: string;
  /** À qui s'adresse la section : tout le monde, les clients ou les commerçants */
  audience: 'all' | 'client' | 'merchant';
  rules: string[];
};

export type HelpContent = {
  title: string;
  intro: string;
  updated: string;
  filterAll: string;
  filterClient: string;
  filterMerchant: string;
  contactTitle: string;
  contactText: string;
  contactButton: string;
  contactSubject: string;
  contactFail: string;
  sanctionNote: string;
  /** « 7 règles » */
  rulesCount: (n: number) => string;
  sections: HelpSection[];
};

const fr: HelpContent = {
  title: 'Aide et règlement',
  intro:
    'Axi met en relation les clients et les commerçants des marchés du Bénin. Ces règles protègent tout le monde : en utilisant l\'application, vous les acceptez. Touchez un thème pour le lire.',
  updated: 'Règlement en vigueur depuis novembre 2026.',
  filterAll: 'Tout',
  filterClient: 'Clients',
  filterMerchant: 'Commerçants',
  contactTitle: 'Un problème ? Écrivez-nous',
  contactText: 'Compte bloqué, paiement, litige, comportement d\'un utilisateur ou question sur ces règles : l\'équipe qui a créé Axi vous répond directement.',
  contactButton: 'Écrire à l\'équipe Axi',
  contactSubject: 'Axi : demande d\'aide',
  contactFail: 'Aucune application d\'email n\'est installée. Écrivez-nous à cette adresse :',
  rulesCount: (n) => `${n} règles`,
  sanctionNote:
    'Le non-respect de ces règles peut entraîner le retrait d\'un produit, du badge « vérifié », ou le blocage du compte, à tout moment, même sans signalement préalable. Le motif vous est toujours indiqué.',
  sections: [
    {
      id: 'identity',
      icon: 'user-check',
      title: 'Votre identité et votre profil',
      audience: 'all',
      rules: [
        'Utilisez votre vrai prénom et votre vrai nom, tels qu\'ils figurent sur votre pièce d\'identité. Les pseudonymes, surnoms et noms inventés sont interdits.',
        'Il est interdit d\'utiliser le nom, la photo, le numéro ou l\'identité d\'une autre personne, ou le nom d\'une entreprise ou d\'une marque qui ne vous appartient pas.',
        'Ne remplacez pas votre vrai nom par un pseudonyme après l\'inscription. Les modifications de nom sont enregistrées et vérifiées par l\'équipe Axi.',
        'Un seul compte par personne. Créer un autre compte pour contourner un blocage est interdit.',
        'Votre photo de profil doit vous représenter ou rester neutre : pas de photo d\'une autre personne, choquante, violente ou à caractère sexuel.',
        'Indiquez un numéro de téléphone et une adresse email qui vous appartiennent et que vous consultez.',
        'Gardez votre mot de passe secret. Si vous pensez qu\'il est connu de quelqu\'un, changez-le et déconnectez vos appareils dans Paramètres > Sécurité.',
      ],
    },
    {
      id: 'merchant-account',
      icon: 'briefcase',
      title: 'Devenir et rester commerçant',
      audience: 'merchant',
      rules: [
        'Pour vendre, vous devez fournir une pièce d\'identité valide (carte d\'identité, CIP ou passeport), un selfie, une photo de votre étal, ainsi que votre IFU et votre RCCM en PDF.',
        'Les documents doivent être les vôtres, authentiques et lisibles. Un faux document, ou celui d\'une autre personne, entraîne le refus de la demande ou le blocage du compte.',
        'Le nom de votre étal doit correspondre à votre activité réelle. N\'utilisez pas le nom d\'un autre commerçant, d\'une enseigne ou d\'une marque sans en avoir le droit.',
        'L\'emplacement indiqué (marché, allée, rangée, stand) doit être celui où se trouve vraiment votre étal. En cas de déménagement, mettez-le à jour : un agent Axi viendra le vérifier.',
        'Le badge « vérifié » signifie qu\'un agent Axi a vu votre étal sur place. Il peut être retiré si l\'étal change de place ou si une information est fausse.',
        'Les numéros de téléphone et de Mobile Money de votre étal doivent être à votre nom.',
      ],
    },
    {
      id: 'products',
      icon: 'package',
      title: 'Produits, prix et annonces',
      audience: 'merchant',
      rules: [
        'Publiez uniquement des produits que vous avez réellement en vente, avec des photos prises par vous de vos propres articles.',
        'Le prix affiché est le prix payé, en francs CFA. Pas de prix trompeur, de frais cachés, ni de prix modifié après la commande.',
        'Tenez votre stock à jour. Un produit épuisé disparaît pour les clients jusqu\'à ce que vous en remettiez.',
        'Sont interdits : les produits illégaux au Bénin, contrefaits, volés ou dangereux, les armes, les drogues, les médicaments vendus sans autorisation, et tout produit périmé.',
        'Les annonces d\'arrivage doivent décrire une vraie marchandise disponible à votre étal, jusqu\'à la date de fin indiquée.',
        'Préparez les commandes payées dans les délais et remettez exactement ce qui a été commandé.',
      ],
    },
    {
      id: 'orders',
      icon: 'shopping-bag',
      title: 'Commander et recevoir',
      audience: 'client',
      rules: [
        'Ne passez commande que si vous avez l\'intention de payer et de recevoir la marchandise. Les commandes faites pour bloquer le stock d\'un commerçant sont interdites.',
        'Indiquez un lieu de réception exact (quartier, repère, ville ou point Axi), pour que la livraison se passe bien.',
        'Touchez « J\'ai bien reçu » seulement quand vous avez réellement reçu la commande en bon état : c\'est ce qui libère l\'argent au commerçant.',
        'En cas de problème (article manquant, abîmé ou différent), signalez un litige depuis la commande au lieu de confirmer la réception.',
      ],
    },
    {
      id: 'payments',
      icon: 'shield',
      title: 'Paiements et séquestre',
      audience: 'all',
      rules: [
        'Les commandes en ligne se paient uniquement dans l\'application, par Mobile Money (MTN, Moov, Celtiis) via FedaPay ou KkiaPay. Ne payez jamais un commerçant en dehors de l\'application pour une commande passée sur Axi : vous ne seriez plus protégé.',
        'L\'argent reste gardé par Axi jusqu\'à ce que vous confirmiez la réception, ou qu\'un agent tranche un litige. Il est ensuite versé au commerçant.',
        'Vous n\'êtes débité qu\'une seule fois par commande. Si un paiement est « en cours de vérification », ne payez pas une seconde fois : le statut se met à jour seul. Un paiement fait en double est remboursé.',
        'Commerçants : il est interdit de demander à un client de payer hors de l\'application, de modifier le prix d\'une commande, ou de refuser une commande payée sans motif.',
        'Le paiement sur place (quand le commerçant l\'accepte) concerne seulement la marchandise. Les frais Axi se paient toujours en ligne.',
      ],
    },
    {
      id: 'disputes',
      icon: 'alert-circle',
      title: 'Litiges et remboursements',
      audience: 'all',
      rules: [
        'Un litige se signale depuis la commande, avant de confirmer la réception. Décrivez honnêtement le problème : un agent Axi examine chaque litige.',
        'Pendant le litige, l\'argent reste bloqué chez Axi. L\'agent décide de rembourser le client (en tout ou en partie) ou de payer le commerçant.',
        'Les faux litiges, les fausses déclarations et les pressions sur l\'autre partie sont interdits et peuvent entraîner le blocage du compte.',
      ],
    },
    {
      id: 'messages',
      icon: 'message-circle',
      title: 'Messagerie et respect',
      audience: 'all',
      rules: [
        'Restez poli et respectueux. Les insultes, menaces, propos haineux ou discriminatoires et le harcèlement sont interdits.',
        'N\'envoyez pas de messages répétés non désirés, de publicité sans rapport avec la commande, ni de liens douteux.',
        'Les photos, messages vocaux et vidéos doivent rester en lien avec les achats : aucun contenu choquant, violent ou à caractère sexuel.',
        'Ne publiez pas les informations personnelles d\'une autre personne (numéro, adresse, photos) sans son accord.',
        'Les messages s\'effacent après un délai, sauf si le client suit l\'étal. Ne comptez pas sur la messagerie pour garder des preuves importantes : les commandes et paiements restent dans l\'historique.',
      ],
    },
    {
      id: 'reports',
      icon: 'flag',
      title: 'Signalements et sanctions',
      audience: 'all',
      rules: [
        'Si un utilisateur enfreint ces règles, signalez-le depuis son profil ou son étal. Les signalements sont examinés par l\'équipe Axi.',
        'L\'équipe Axi peut retirer un contenu, retirer le badge « vérifié », suspendre un étal ou bloquer un compte à tout moment, même sans signalement, en cas de fraude, de faux profil ou de non-respect du règlement.',
        'Un compte bloqué est déconnecté de tous ses appareils. Le motif est affiché à la connexion. Pour le contester, écrivez à l\'équipe Axi.',
        'Les fraudes graves (usurpation d\'identité, faux documents, escroquerie) peuvent être signalées aux autorités compétentes.',
      ],
    },
    {
      id: 'privacy',
      icon: 'lock',
      title: 'Vos données',
      audience: 'all',
      rules: [
        'Vos pièces d\'identité, votre IFU et votre RCCM ne sont visibles que par les agents Axi. Ils ne sont jamais montrés aux clients ni aux autres commerçants.',
        'Vous choisissez qui voit votre photo de profil (tout le monde, vos contacts ou personne) dans Mon profil.',
        'Vous pouvez télécharger vos données ou supprimer votre compte dans Paramètres > Confidentialité.',
        'Axi n\'envoie jamais de SMS pour demander un mot de passe ou un code. Ne communiquez jamais vos codes à personne, même à quelqu\'un qui dit travailler pour Axi.',
      ],
    },
  ],
};

const en: HelpContent = {
  title: 'Help and rules',
  intro:
    'Axi connects customers with merchants from the markets of Benin. These rules protect everyone: by using the app, you accept them. Tap a topic to read it.',
  updated: 'Rules in force since November 2026.',
  filterAll: 'All',
  filterClient: 'Customers',
  filterMerchant: 'Merchants',
  contactTitle: 'A problem? Write to us',
  contactText: 'Blocked account, payment, dispute, a user\'s behaviour or a question about these rules: the team who built Axi answers you directly.',
  contactButton: 'Write to the Axi team',
  contactSubject: 'Axi: help request',
  contactFail: 'No email app is installed. Write to us at this address:',
  rulesCount: (n) => `${n} rules`,
  sanctionNote:
    'Breaking these rules can lead to a product or the « verified » badge being removed, or the account being blocked, at any time, even without a prior report. The reason is always given to you.',
  sections: [
    {
      id: 'identity',
      icon: 'user-check',
      title: 'Your identity and profile',
      audience: 'all',
      rules: [
        'Use your real first and last name, as shown on your ID document. Pseudonyms, nicknames and made-up names are forbidden.',
        'Using another person\'s name, photo, number or identity, or the name of a company or brand that does not belong to you, is forbidden.',
        'Do not replace your real name with a pseudonym after signing up. Name changes are recorded and checked by the Axi team.',
        'One account per person. Creating another account to get around a block is forbidden.',
        'Your profile photo must show you or stay neutral: no photo of someone else, nothing shocking, violent or sexual.',
        'Give a phone number and an email address that belong to you and that you check.',
        'Keep your password secret. If you think someone knows it, change it and sign out your devices in Settings > Security.',
      ],
    },
    {
      id: 'merchant-account',
      icon: 'briefcase',
      title: 'Becoming and staying a merchant',
      audience: 'merchant',
      rules: [
        'To sell, you must provide a valid ID document (ID card, CIP or passport), a selfie, a photo of your stall, and your IFU and RCCM as PDF files.',
        'Documents must be yours, genuine and readable. A fake document, or someone else\'s, leads to the application being refused or the account being blocked.',
        'Your stall name must match your real business. Do not use the name of another merchant, a shop or a brand without the right to do so.',
        'The location you give (market, aisle, row, stand) must be where your stall really is. If you move, update it: an Axi agent will come and check.',
        'The « verified » badge means an Axi agent saw your stall on site. It can be removed if the stall moves or if information is false.',
        'Your stall\'s phone and Mobile Money numbers must be in your name.',
      ],
    },
    {
      id: 'products',
      icon: 'package',
      title: 'Products, prices and announcements',
      audience: 'merchant',
      rules: [
        'Only publish products you really have for sale, with photos you took of your own items.',
        'The displayed price is the price paid, in CFA francs. No misleading price, hidden fees, or price changed after the order.',
        'Keep your stock up to date. A sold-out product disappears for customers until you restock it.',
        'Forbidden: products that are illegal in Benin, counterfeit, stolen or dangerous, weapons, drugs, medicines sold without authorisation, and any expired product.',
        'Arrival announcements must describe real goods available at your stall until the end date shown.',
        'Prepare paid orders on time and hand over exactly what was ordered.',
      ],
    },
    {
      id: 'orders',
      icon: 'shopping-bag',
      title: 'Ordering and receiving',
      audience: 'client',
      rules: [
        'Only order if you intend to pay and receive the goods. Orders made to block a merchant\'s stock are forbidden.',
        'Give an exact delivery place (neighbourhood, landmark, town or Axi point) so the delivery goes well.',
        'Tap « I received it » only when you have really received the order in good condition: this is what releases the money to the merchant.',
        'If there is a problem (missing, damaged or different item), open a dispute from the order instead of confirming receipt.',
      ],
    },
    {
      id: 'payments',
      icon: 'shield',
      title: 'Payments and escrow',
      audience: 'all',
      rules: [
        'Online orders are paid only in the app, by Mobile Money (MTN, Moov, Celtiis) through FedaPay or KkiaPay. Never pay a merchant outside the app for an order placed on Axi: you would no longer be protected.',
        'The money is kept by Axi until you confirm receipt, or until an agent settles a dispute. It is then paid to the merchant.',
        'You are charged only once per order. If a payment is « being verified », do not pay a second time: the status updates by itself. A payment made twice is refunded.',
        'Merchants: asking a customer to pay outside the app, changing the price of an order, or refusing a paid order without reason is forbidden.',
        'Paying on site (when the merchant accepts it) only covers the goods. Axi fees are always paid online.',
      ],
    },
    {
      id: 'disputes',
      icon: 'alert-circle',
      title: 'Disputes and refunds',
      audience: 'all',
      rules: [
        'A dispute is opened from the order, before confirming receipt. Describe the problem honestly: an Axi agent reviews every dispute.',
        'During the dispute, the money stays blocked at Axi. The agent decides to refund the customer (fully or partly) or to pay the merchant.',
        'Fake disputes, false statements and pressure on the other party are forbidden and can lead to the account being blocked.',
      ],
    },
    {
      id: 'messages',
      icon: 'message-circle',
      title: 'Messages and respect',
      audience: 'all',
      rules: [
        'Stay polite and respectful. Insults, threats, hateful or discriminatory remarks and harassment are forbidden.',
        'Do not send repeated unwanted messages, advertising unrelated to the order, or suspicious links.',
        'Photos, voice messages and videos must relate to your purchases: no shocking, violent or sexual content.',
        'Do not share another person\'s personal information (number, address, photos) without their consent.',
        'Messages are deleted after a while, unless the customer follows the stall. Do not rely on messages to keep important evidence: orders and payments stay in your history.',
      ],
    },
    {
      id: 'reports',
      icon: 'flag',
      title: 'Reports and sanctions',
      audience: 'all',
      rules: [
        'If a user breaks these rules, report them from their profile or stall. Reports are reviewed by the Axi team.',
        'The Axi team can remove content, remove the « verified » badge, suspend a stall or block an account at any time, even without a report, in case of fraud, fake profile or breach of the rules.',
        'A blocked account is signed out of all its devices. The reason is shown at sign-in. To contest it, write to the Axi team.',
        'Serious fraud (identity theft, fake documents, scams) may be reported to the competent authorities.',
      ],
    },
    {
      id: 'privacy',
      icon: 'lock',
      title: 'Your data',
      audience: 'all',
      rules: [
        'Your ID documents, IFU and RCCM are only visible to Axi agents. They are never shown to customers or other merchants.',
        'You choose who sees your profile photo (everyone, your contacts or nobody) in My profile.',
        'You can download your data or delete your account in Settings > Privacy.',
        'Axi never sends SMS asking for a password or a code. Never give your codes to anyone, even someone who says they work for Axi.',
      ],
    },
  ],
};

export function helpContent(lang: Lang): HelpContent {
  return lang === 'en' ? en : fr;
}
