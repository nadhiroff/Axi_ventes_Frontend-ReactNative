# axi : application mobile

Application React Native (Expo SDK 58, TypeScript, Expo Router) d'Axi, « tout le marché sans se déplacer ».
Clients et commerçants utilisent l'application ; les **partenaires** (agents Axi, ANaGeM, annonceurs, IMF)
utilisent l'**espace web Axi Pro** servi par le backend PHP (`/pro`).

API : backend PHP `Axi_ventes_backend-php`, routes décrites dans son `docs/POUR_LE_FRONTEND.md`.

## Démarrer (Expo Go)

```bash
npm install
cp .env.example .env.local      # rien à modifier en développement
npx expo start --clear
```

L'adresse de l'API est trouvée **automatiquement** en développement : c'est l'IP du PC qui lance `npx expo start`
(la même qu'Expo Go utilise), avec le port `EXPO_PUBLIC_API_PORT` (8000). Changer de Wi-Fi ne demande rien :
relancer. Le plus simple : `npm run dev` lance l'API PHP (sur `0.0.0.0`, donc valable pour toutes les IP) **et** Expo d'un coup
(dossier du backend : `AXI_BACKEND_DIR`, par défaut `/var/www/html/Axi_ventes_backend-php`).
Pour un serveur en ligne : `EXPO_PUBLIC_API_URL=https://…` dans `.env.local`.
Tous les modules utilisés sont inclus dans Expo Go (WebView du paiement, photo, micro).

## Ce que fait l'application

- **Premier lancement** : Créer un compte / Se connecter / Continuer en visiteur. Connexion par **email et mot
  de passe uniquement** (code de confirmation par email, mot de passe oublié). Le téléphone n'est qu'un contact.
- **Visiteur** : allées, étals, produits ; ajouter au panier, suivre, favoris ou payer demandent un compte,
  puis l'action reprend.
- **Client** : accueil, allées, recherche, étals (photo, emplacement, badge « vérifié », contacts),
  fiche produit avec galerie plein écran (zoom), panier multi-étals, **paiement unique FedaPay / KkiaPay**
  (page de paiement dans l'application, statut vérifié par le serveur, jamais deux débits grâce à
  `Idempotency-Key`), suivi de commande, « J'ai bien reçu », litige, historique, ventes et paiements (CSV).
- **Commerçant** : création de l'étal, Ma journée, Mon étal (produits en photo ou en vocal), Mes clients
  (fiche, relances par notification / email / WhatsApp, aucun SMS), Mon argent (séquestre, versements,
  abonnement payable, crédit, consentement IMF), messages vocaux reçus.
- **Paramètres** : thème clair / sombre / système, langue (français et anglais complets ; fon et yoruba :
  structure prête, traductions à faire valider par des locuteurs), format de date, notifications par type,
  sécurité (mot de passe, appareils, historique), infos mémorisées, plafond de données, consentements,
  export et suppression du compte. Tout est enregistré en base.
- **Téléphones, tablettes et iPad**, portrait et paysage : contenu centré et lisible, grilles de 2 à 4 colonnes.

## Vérifications

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

## Structure

```
src/app/            écrans (Expo Router) : (client)/, commercant/, auth/, parametres/, paiement, commande…
src/api/            client HTTP (ETag, Idempotency-Key, mesure des données), types, une fonction par route
src/components/     ui/ (thème, visionneuse d'images…), client/, merchant/, account/
src/hooks/api/      requêtes et mutations (React Query)
src/i18n/           fr.ts (référence), en.ts (complet, imposé par le typage), fon.ts, yo.ts (à compléter)
src/theme/          palettes claire et sombre, makeStyles, useLayout (téléphone / tablette)
src/store/          session (visiteur, connecté), panier (gardé sur le téléphone)
```
