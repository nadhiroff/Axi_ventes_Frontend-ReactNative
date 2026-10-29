# axi : application mobile

Application React Native (Expo, TypeScript) d'Axi, « tout le marché sans se déplacer ».
Elle consomme l'API REST JSON du backend PHP décrite dans
[`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).

## Démarrer

```bash
npm install
echo "EXPO_PUBLIC_API_URL=http://<ip-du-backend>:8000" > .env.local
npx expo start
```

Puis scanner le QR code avec Expo Go (Android) ou lancer `npx expo start --android`.

Vérification des types : `npx tsc --noEmit`.

## Structure

```
App.tsx                     Point d'entrée : cache persistant + navigation
src/
  api/
    client.ts               fetch + ETag/304 + jeton d'authentification
    etagCache.ts            Copie locale des réponses par URL
    endpoints.ts            Une fonction par route (fetchHome, fetchStall…)
    types/                  Contrat JSON typé (miroir de docs/API_CONTRACT.md)
  hooks/api/                Hooks TanStack Query par écran (useHome, useStall…)
  store/                    État local Zustand persisté (panier, session)
  lib/                      queryClient (cache), formatage FCFA
  theme/                    Couleurs de la charte, espacements, tailles
  components/ui/            Briques réutilisables (AxiLogo, VerifiedBadge, CachedImage)
  navigation/               Onglets client et commerçant
  screens/
    client/                 Accueil, Page d'un étal, Panier
    merchant/               Ma journée, Mes clients, Mon argent
docs/API_CONTRACT.md        Contrat partagé avec le backend
```

Règle de dépendance : `screens` → `hooks` → `api`. Un écran n'appelle jamais `fetch`
directement, et seuls les fichiers de `api/` connaissent les URL.

## Stratégie data (objectif < 1,5 Go / mois)

| Couche | Mécanisme |
|---|---|
| Réponses JSON | TanStack Query : `staleTime` 5 min, cache persisté 7 jours sur le téléphone, affichage immédiat hors ligne |
| Revalidation | `If-None-Match` / `304` : un catalogue inchangé ne coûte que les en-têtes |
| Images | `expo-image` en cache mémoire + disque, WebP en 2 tailles (miniature < 15 Ko), URL immuables, blurhash pendant le chargement |
| Réseau | Requêtes mises en pause hors connexion (NetInfo), reprise au retour du réseau |
| Panier | Stocké localement, aucun appel avant le paiement |
