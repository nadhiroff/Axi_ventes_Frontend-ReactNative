# axi : application mobile

Application React Native (Expo SDK 58, TypeScript, Expo Router) d'Axi,
« tout le marché sans se déplacer ». Elle reproduit les maquettes de la note de cadrage :
trois écrans client et trois écrans commerçant.

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
| `/compte` | Compte client, accès à l'espace commerçant |
| `/commercant` | Ma journée : ventes, commandes, connexion active, nouvelle adresse, photo, vocal |
| `/commercant/etal` | Mon étal : produits du jour et stock en un geste |
| `/commercant/clients` | Mes clients : filtres, relances, arrivage aux fidèles |
| `/commercant/argent` | Mon argent : à recevoir, abonnement, offre fournisseur, crédit, partage d'historique |
| `/commercant/nouveau-produit` | Ajout d'un produit en photo |

## Structure

```
src/
  app/                      Routes Expo Router (un fichier = un écran)
    (client)/               Onglets client : Accueil, Allées, Panier, Compte
    commercant/(tabs)/      Onglets commerçant : Ma journée, Mon étal, Mes clients, Mon argent
  api/
    client.ts               fetch + ETag/304 + envoi de fichiers + erreurs
    endpoints.ts            Une fonction par route du backend (ou du faux serveur)
    types/                  Contrat JSON typé, miroir de docs/API_CONTRACT.md
    mocks/                  Faux serveur en mémoire pour développer sans backend
  hooks/
    api/                    Requêtes et actions TanStack Query (client.ts, merchant.ts)
    useVoiceRecorder.ts     Enregistrement vocal léger (AAC 24 kbit/s)
    useProductPhoto.ts      Photo réduite à 1080 px en WebP avant l'envoi
  store/                    Panier et espace choisi (Zustand, gardés sur le téléphone)
  components/
    ui/                     Briques communes (Button, Tag, Card, Avatar, VoiceRecordModal…)
    client/                 StallCard, ProductTile, AisleTile, SearchBar, PaymentSheet…
  theme/                    Couleurs relevées sur les maquettes, espacements, tailles
  lib/                      Cache des requêtes, formats (FCFA, initiales, dates, WhatsApp)
docs/API_CONTRACT.md        Contrat partagé avec le backend PHP
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

## Reste à faire

- Authentification par numéro de téléphone (OTP) : le passage client/commerçant se
  fait pour l'instant depuis l'onglet Compte et l'écran Mon étal.
- Traductions fon, yoruba et anglais des textes de l'interface.
- Axi Pro (espace web partenaires), hors application mobile.
