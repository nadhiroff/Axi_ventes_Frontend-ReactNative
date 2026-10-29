# axi : application mobile

Application React Native (Expo SDK 58, TypeScript, Expo Router) d'Axi,
« tout le marché sans se déplacer ». Elle reproduit les maquettes de la note de cadrage :
trois écrans client, trois écrans commerçant, et **Axi Pro**, l'espace web des partenaires,
produit par le même projet (Expo web).

Elle consomme l'API REST JSON du backend PHP décrite dans
[`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).

## Démarrer

```bash
npm install
npx expo start
```

Sans configuration, l'application tourne sur des **données de démonstration**
(`src/api/mocks/`), avec les commerçants fictifs des maquettes. Pour brancher le backend PHP :

```bash
echo "EXPO_PUBLIC_API_URL=http://<ip-du-backend>:8000" > .env.local
npx expo start --clear
```

L'enregistrement vocal et la photo demandent un vrai téléphone. Expo Go suffit pour
tester, car tous les modules utilisés sont inclus dans Expo Go.

### Comptes de démonstration (code : `123456`)

| Numéro (indicatif +229) | Compte |
|---|---|
| `97000001` | Commerçant (Chez Maman Afi) : ouvre directement l'espace commerçant |
| `90000000` | Administrateur Axi : tous les onglets d'Axi Pro |
| `90000001` | Partenaire ANaGeM : Tendances et Recensement |
| `90000002` | Partenaire IMF : Tendances et Financement |
| tout autre numéro | Nouveau client : le nom est demandé après le code |

### Axi Pro (site web des partenaires)

```bash
npx expo start --web
```

Ouvrir ensuite `http://localhost:8081/pro` dans le navigateur. Pour la mise en ligne :

```bash
npx expo export --platform web
```

Le dossier `dist/` produit est à déposer sur le serveur (par exemple `pro.axi.bj`), avec
une règle qui renvoie toutes les adresses vers `index.html`. Sur téléphone, `/pro`
renvoie à l'accueil.

Vérifications avant chaque commit :

```bash
npm run typecheck
npm run lint
```

## Écrans

| Route | Écran |
|---|---|
| `/` | Accueil : recherche texte et vocale, bannière marché, promotion, allées, étals suivis |
| `/allees`, `/allee/[id]` | Toutes les allées, les étals d'une allée |
| `/recherche?q=` | Résultats (étals et produits) |
| `/etal/[id]` | Page d'un étal : suivre, Appeler, WhatsApp, Message vocal, vérifié, produits du jour, ajout au panier |
| `/panier` | Panier multi-étals : groupé par étal, réception (livraison, car, point Axi), paiement Mobile Money unique |
| `/commande/[id]` | Suivi du paiement puis de la commande |
| `/connexion` | Connexion sans mot de passe : numéro, code SMS (WhatsApp hors Bénin), nom si nouveau compte |
| `/compte` | Profil, déconnexion, espace commerçant ou demande de visite d'un agent |
| `/commercant` | Ma journée : ventes, commandes, connexion active, nouvelle adresse, photo, vocal |
| `/commercant/etal` | Mon étal : produits du jour et stock en un geste |
| `/commercant/clients` | Mes clients : filtres, relances, arrivage aux fidèles |
| `/commercant/argent` | Mon argent : à recevoir, abonnement, offre fournisseur, crédit, partage d'historique |
| `/commercant/nouveau-produit` | Ajout d'un produit en photo |
| `/pro` | Axi Pro (web) : Tendances du marché, prix médians, nouvelle campagne |
| `/pro/campagnes` | Axi Pro : campagnes lancées et création |
| `/pro/recensement` | Axi Pro : recensement des étals par site et par allée, export CSV |
| `/pro/financement` | Axi Pro : crédits accordés, dossiers partagés avec l'accord des commerçants |

## Structure

```
src/
  app/                      Routes Expo Router (un fichier = un écran)
    (client)/               Onglets client : Accueil, Allées, Panier, Compte
    commercant/(tabs)/      Onglets commerçant : Ma journée, Mon étal, Mes clients, Mon argent
    pro/                    Axi Pro, web uniquement : Tendances, Campagnes, Recensement, Financement
    connexion.tsx           Connexion par code
  api/
    client.ts               fetch + ETag/304 + envoi de fichiers + erreurs
    endpoints.ts            Une fonction par route du backend (ou du faux serveur)
    types/                  Contrat JSON typé, miroir de docs/API_CONTRACT.md
    mocks/                  Faux serveur en mémoire pour développer sans backend
  hooks/
    api/                    Requêtes et actions TanStack Query (client.ts, merchant.ts)
    useVoiceRecorder.ts     Enregistrement vocal léger (AAC 24 kbit/s)
    useProductPhoto.ts      Photo réduite à 1080 px en WebP avant l'envoi
  store/                    Panier et session de connexion (Zustand)
  components/
    ui/                     Briques communes (Button, Tag, Card, Avatar, VoiceRecordModal…)
    client/                 StallCard, ProductTile, AisleTile, SearchBar, PaymentSheet…
    pro/                    Mise en page bureau, tableau, liste déroulante web, formulaire de campagne
  theme/                    Couleurs relevées sur les maquettes, espacements, tailles
  lib/                      Cache des requêtes, jeton sécurisé, formats, export CSV
docs/API_CONTRACT.md        Contrat partagé avec le backend PHP
docs/sql/                   Tables à ajouter à la base (connexion, Axi Pro)
```

Règle de dépendance : `app` → `hooks` → `api`. Un écran n'appelle jamais `fetch`
directement, et seuls les fichiers de `api/` connaissent les URL.

## Charte

- Orange terre cuite `#C2410C` : logo, boutons principaux, en-tête d'étal.
- Vert `#166534` : argent, confiance (« Vérifié par un agent Axi ») et connexion active.
- Le nom s'écrit toujours **axi**, en minuscules.

## Stratégie data (objectif < 1,5 Go / mois)

| Couche | Mécanisme |
|---|---|
| Réponses JSON | Cache persisté 7 jours sur le téléphone ; écran affiché tout de suite, même hors ligne |
| Revalidation | `If-None-Match` / `304` : un catalogue inchangé ne coûte que les en-têtes |
| Images | `expo-image` en cache mémoire et disque ; WebP en 2 tailles (miniature < 15 Ko), URL immuables |
| Avatars | Initiales plutôt que des photos : rien à télécharger |
| Photos envoyées | Réduites à 1080 px en WebP sur le téléphone (~100 Ko au lieu de 3 à 5 Mo) |
| Vocal | AAC mono 16 kHz à 24 kbit/s : environ 3 Ko par seconde |
| Réseau | Requêtes en pause hors connexion, reprise au retour du réseau |
| Panier | Gardé sur le téléphone, aucun appel avant le récapitulatif |

## Connexion

- Pas de mot de passe : numéro, puis code à 6 chiffres reçu par SMS (WhatsApp hors Bénin).
- On reste connecté 90 jours, prolongés à chaque utilisation : très peu de SMS envoyés.
- Visite libre sans compte ; la connexion est demandée pour payer, suivre un étal,
  envoyer un message vocal, ouvrir l'espace commerçant ou Axi Pro.
- Le jeton est gardé dans le coffre chiffré du téléphone (`expo-secure-store`).
- Le rôle commerçant est donné par un agent après vérification de l'étal ; le rôle
  partenaire par un administrateur.

## Reste à faire

- Code secret à 4 chiffres (option) pour réduire encore les SMS et protéger l'argent
  des commerçants contre le vol de puce.
- Traductions fon, yoruba et anglais des textes de l'interface (en dernier).
