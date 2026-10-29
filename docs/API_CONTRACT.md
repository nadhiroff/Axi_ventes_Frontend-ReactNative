# Contrat d'API Axi (frontend React Native ↔ backend PHP)

Ce document est la référence partagée entre l'application mobile et le backend PHP.
Les types TypeScript correspondants sont dans `src/api/types/`, et un faux serveur qui
respecte exactement ce contrat est dans `src/api/mocks/server.ts` (exemples complets
de réponses). Toute modification du JSON se fait des deux côtés en même temps.

Sommaire :

1. [Conventions générales](#1-conventions-générales)
2. [Objets communs](#2-objets-communs)
3. [Client : Accueil, allées, recherche](#3-client--accueil-allées-recherche)
4. [Client : Page d'un étal](#4-client--page-dun-étal)
5. [Client : Panier multi-étals et paiement](#5-client--panier-multi-étals-et-paiement)
6. [Commerçant : Ma journée](#6-commerçant--ma-journée)
7. [Commerçant : Mon étal](#7-commerçant--mon-étal)
8. [Commerçant : Mes clients](#8-commerçant--mes-clients)
9. [Commerçant : Mon argent](#9-commerçant--mon-argent)
10. [Récapitulatif des routes](#10-récapitulatif-des-routes)

## 1. Conventions générales

| Règle | Valeur |
|---|---|
| Préfixe | `/v1/` |
| Format | JSON UTF-8 (`Content-Type: application/json; charset=utf-8`), `json_encode($x, JSON_UNESCAPED_UNICODE)` |
| Clés | `snake_case` |
| Identifiants | chaînes préfixées (`stl_…`, `prd_…`, `cmd_…`, `cli_…`), jamais d'entier brut |
| Montants | entiers en francs CFA (`15000`), jamais de décimales ni de chaîne |
| Dates | ISO 8601 UTC (`2026-10-29T08:15:00Z`) ; date seule `2026-11-30` quand l'heure n'a pas de sens |
| Valeur absente | `null` (la clé est toujours présente) |
| Listes vides | `[]`, jamais `null` |
| Textes affichés | en français, prêts à afficher tels quels (le serveur choisit l'accord : « installée », « Nouvelle »…) |
| Authentification | `Authorization: Bearer <token>`. Facultative pour l'accueil, l'étal et la recherche ; obligatoire pour les commandes et toutes les routes `/v1/merchant/…` |
| Envoi de fichiers | `multipart/form-data` (photo WebP ~100 Ko, audio AAC/M4A mono 16 kHz, 60 s max) |

### Enveloppe de réponse

Succès :

```json
{
  "ok": true,
  "data": { },
  "meta": { "server_time": "2026-10-29T08:15:00Z", "max_age_s": 300 }
}
```

Erreur, avec le code HTTP adapté (400, 401, 403, 404, 422, 500) :

```json
{
  "ok": false,
  "error": { "code": "STALL_NOT_FOUND", "message": "Cet étal n'existe pas ou a été fermé." }
}
```

`message` est affiché tel quel à l'utilisateur. `code` sert au frontend pour réagir
(ex. `DATA_SHARING_REQUIRED` ouvre la demande d'accord avant un crédit).

### Cache et économie de data (obligatoire)

Objectif : moins de 1,5 Go par mois et par commerçant. L'application garde une copie
locale de chaque réponse ; le backend doit permettre de ne pas la retélécharger.

1. **ETag** sur chaque `GET` : `ETag: "<hash>"` (par exemple `md5` du JSON produit).
2. Si la requête contient `If-None-Match` égal à l'ETag courant, répondre
   **`304 Not Modified` sans corps**.
3. `Cache-Control: private, max-age=<meta.max_age_s>`.
4. Compression `gzip` activée (Apache `mod_deflate` / Nginx `gzip on`).

```php
function respond(array $data, int $maxAge = 300): void {
    $json = json_encode([
        'ok' => true,
        'data' => $data,
        'meta' => ['server_time' => gmdate('Y-m-d\TH:i:s\Z'), 'max_age_s' => $maxAge],
    ], JSON_UNESCAPED_UNICODE);
    // L'ETag ignore server_time, sinon il changerait à chaque appel.
    $etag = '"' . md5(json_encode($data, JSON_UNESCAPED_UNICODE)) . '"';
    header('ETag: ' . $etag);
    header('Cache-Control: private, max-age=' . $maxAge);
    if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
        http_response_code(304);
        exit;
    }
    header('Content-Type: application/json; charset=utf-8');
    echo $json;
}
```

## 2. Objets communs

### Image

Stockée en **WebP**, en deux tailles générées à l'upload ; l'application ne charge
jamais l'original. Tous les champs `image` / `avatar` peuvent valoir `null` :
l'application affiche alors des initiales ou un aplat de couleur, sans rien télécharger.

```json
{
  "thumb_url": "https://cdn.axi.bj/p/prd_88/a1f3/thumb.webp",
  "medium_url": "https://cdn.axi.bj/p/prd_88/a1f3/medium.webp",
  "width": 600,
  "height": 600,
  "blurhash": "LKO2?U%2Tw=w]~RBVZRi};RPxuwH"
}
```

| Champ | Contrainte |
|---|---|
| `thumb_url` | ~200 px de large, < 15 Ko, pour les listes |
| `medium_url` | ~600 px de large, < 60 Ko, pour le détail |
| URL | **immuable** : si l'image change, l'URL change (hash ou version dans le chemin). Servir avec `Cache-Control: public, max-age=31536000, immutable` |
| `blurhash` | facultatif (`null` accepté) |

### Prix

`price: null` signifie **« Prix à débattre »** : le produit ne peut pas être mis au
panier, le client est invité à négocier par WhatsApp ou par téléphone.

```json
{ "amount": 18000, "amount_max": null, "currency": "XOF" }
```

`amount_max` est `null` pour un prix fixe, renseigné pour une fourchette
(affichée « 12 000 – 15 000 FCFA »). Au panier, c'est `amount` qui sert de prix indicatif.

### Emplacement d'un étal

```json
{
  "site": "Tokpa Yôyô",
  "row": "Allée B",
  "stand": "214",
  "label": "Tokpa Yôyô · Allée B, stand 214",
  "map_url": "https://maps.google.com/?q=6.3703,2.4339",
  "moved_at": "2026-07-01T00:00:00Z"
}
```

`label` est affiché tel quel. `map_url` (`null` possible) alimente le lien « Plan ».
`moved_at` non nul affiche « Nouvel emplacement » (déménagement de Dantokpa).

### Résumé d'étal (`StallSummary`)

```json
{
  "id": "stl_214",
  "name": "Chez Maman Afi",
  "tagline": "Pagnes wax, bazin et tissus de cérémonie",
  "avatar": null,
  "aisle_id": "tissus",
  "verified": true,
  "is_open": true,
  "location": { "...objet emplacement..." },
  "has_new_products": true
}
```

### Produit (`Product`)

```json
{
  "id": "prd_88",
  "name": "Wax hollandais, 6 yards",
  "image": null,
  "price": { "amount": 18000, "amount_max": null, "currency": "XOF" },
  "in_stock": true,
  "is_today": true,
  "updated_at": "2026-10-29T06:40:00Z"
}
```

`name` contient la quantité ou la taille vendue (« Sac de riz, 25 kg »).
`is_today` place le produit dans « Disponible aujourd'hui ».

## 3. Client : Accueil, allées, recherche

### `GET /v1/home`

Un seul appel charge tout l'accueil. Avec un token, `followed_stalls` contient les
étals suivis (20 max, du plus récemment actif au moins actif) ; sans token, `[]`.

```json
{
  "ok": true,
  "data": {
    "city": { "id": "cotonou", "name": "Cotonou" },
    "market_notice": { "text": "Service en ligne des marchés", "partner": "ANaGeM" },
    "sponsored": {
      "id": "spn_1",
      "label": "Sponsorisé",
      "title": "[Marque] : la promo de la semaine",
      "text": "Chez les étals cosmétiques de Tokpa Yôyô",
      "image": null,
      "target": { "type": "aisle", "id": "cosmetiques" }
    },
    "aisles": [
      { "id": "tissus", "name": "Tissus et pagnes", "icon": "fabric", "stall_count": 412 },
      { "id": "vivriers", "name": "Vivriers en gros", "icon": "grain", "stall_count": 655 },
      { "id": "cosmetiques", "name": "Cosmétiques", "icon": "beauty", "stall_count": 203 },
      { "id": "quincaillerie", "name": "Quincaillerie", "icon": "hardware", "stall_count": 187 },
      { "id": "pieces", "name": "Pièces détachées", "icon": "parts", "stall_count": 240 },
      { "id": "bijoux", "name": "Bijoux et sacs", "icon": "jewelry", "stall_count": 158 }
    ],
    "followed_stalls": [ { "...StallSummary..." } ]
  },
  "meta": { "server_time": "2026-10-29T08:15:00Z", "max_age_s": 300 }
}
```

| Champ | Règle |
|---|---|
| `market_notice` | `null` tant qu'il n'y a pas d'accord ANaGeM ; `partner` peut être `null` |
| `sponsored` | `null` sans campagne ; `target.type` ∈ `stall`, `aisle` |
| `aisles` | dans l'ordre d'affichage ; l'accueil montre les 6 premières, « Tout voir » les montre toutes |
| `aisles[].icon` | icône **embarquée dans l'application** : `fabric`, `grain`, `beauty`, `hardware`, `parts`, `jewelry`, `electronics`, `other` |

### `GET /v1/aisles/{id}/stalls?cursor=`

```json
{
  "aisle": { "id": "tissus", "name": "Tissus et pagnes", "icon": "fabric", "stall_count": 412 },
  "stalls": [ { "...StallSummary..." } ],
  "next_cursor": null
}
```

Erreur : 404 `AISLE_NOT_FOUND`.

### `GET /v1/search?q=wax`

`q` fait au moins 2 caractères.

```json
{
  "query": "wax",
  "stalls": [ { "...StallSummary..." } ],
  "products": [
    { "...Product...", "stall": { "id": "stl_214", "name": "Chez Maman Afi", "verified": true } }
  ]
}
```

### `POST /v1/search/voice` (multipart)

Champ `audio` (M4A/AAC mono 16 kHz, 60 s max). Le serveur transcrit (français, fon,
yoruba, anglais) et renvoie la **même réponse que la recherche texte** ;
`query` contient la transcription, que l'application réutilise pour afficher les résultats.

## 4. Client : Page d'un étal

### `GET /v1/stalls/{id}?cursor=`

30 produits par page ; `stall` est renvoyé à chaque page, l'application utilise celui
de la première.

```json
{
  "stall": {
    "...tous les champs de StallSummary...",
    "owner_display_name": "Maman Afi",
    "verification": { "by": "agent", "verified_at": "2026-09-12T10:00:00Z" },
    "pay_on_delivery": true,
    "delivery_note": "Livraison Cotonou et Calavi",
    "contacts": {
      "phone": "+22997000001",
      "whatsapp": "+22997000001",
      "accepts_voice_messages": true
    },
    "is_followed": true
  },
  "products": [ { "...Product..." } ],
  "products_updated_at": "2026-10-29T06:40:00Z",
  "next_cursor": null
}
```

| Champ | Règle |
|---|---|
| `verification` | `null` si aucun agent n'est encore passé (alors `verified: false`) ; sinon affiche « Vérifié par un agent Axi » |
| `pay_on_delivery` | affiche « Payez à la réception » |
| `delivery_note` | `null` ou texte libre affiché en étiquette |
| `contacts.phone` / `whatsapp` | E.164 ; `null` masque le bouton « Appeler » ou « WhatsApp » |
| `contacts.accepts_voice_messages` | affiche « Message vocal » |
| `products` | `is_today: true` **en premier**, puis le reste par `updated_at` décroissant |
| `products_updated_at` | date de la dernière mise à jour du catalogue, pour « Mis à jour ce matin » |

Erreur : 404 `STALL_NOT_FOUND`.

### `POST /v1/stalls/{id}/follow` et `DELETE /v1/stalls/{id}/follow`

Bouton « Suivre l'étal ». Réponse : `{ "is_followed": true }`.

### `POST /v1/stalls/{id}/voice-messages` (multipart)

Champ `audio`. Réponse : `{ "message": "Message vocal envoyé. Le commerçant vous répondra ici ou par téléphone." }`.

## 5. Client : Panier multi-étals et paiement

Le panier est gardé **sur le téléphone** : aucun appel tant que le client ne regarde
pas le récapitulatif. Les prix et frais font foi **côté serveur** (devis).

### `POST /v1/orders/quote`

Appelé à chaque changement du panier ou du mode de réception.

```json
{
  "lines": [
    { "product_id": "prd_88", "quantity": 2 },
    { "product_id": "prd_201", "quantity": 3 }
  ],
  "reception": { "mode": "delivery", "detail": "Akpakpa, près de la pharmacie" }
}
```

| `reception.mode` | Libellé | `detail` |
|---|---|---|
| `delivery` | Livraison Cotonou | quartier et repère |
| `bus` | Expédition car | ville de destination |
| `axi_point` | Point Axi | identifiant du point choisi dans `axi_points` |

Réponse :

```json
{
  "stall_count": 3,
  "items_total": 88000,
  "grouping_fee": 900,
  "reception_fee": 1500,
  "reception_fee_label": "Livraison",
  "total": 90400,
  "axi_points": [
    { "id": "pt_1", "name": "Point Axi Tokpa Yôyô", "address": "Entrée principale, à côté de la pharmacie" }
  ],
  "unavailable_product_ids": []
}
```

`grouping_fee` (« Regroupement de N étals ») vaut `0` pour un seul étal.
`unavailable_product_ids` liste les produits épuisés, supprimés ou à prix débattu :
l'application les signale et bloque le paiement. `detail` peut être vide pour un devis.

### `POST /v1/orders`

Même corps que le devis, plus le paiement :

```json
{
  "lines": [ "..." ],
  "reception": { "mode": "delivery", "detail": "Akpakpa, près de la pharmacie" },
  "payment": { "operator": "mtn", "phone": "+22997000000" }
}
```

`operator` ∈ `mtn`, `moov`, `celtiis`. Le serveur déclenche la demande de paiement
Mobile Money (un seul paiement pour tous les étals) et répond tout de suite avec la
commande :

```json
{
  "id": "cmd_7781",
  "status": "awaiting_payment",
  "status_label": "En attente de votre validation Mobile Money",
  "total": 90400,
  "payment_instructions": "Un message de validation arrive sur votre téléphone. Entrez votre code secret Mobile Money pour confirmer.",
  "stalls": [
    { "id": "stl_214", "name": "Chez Maman Afi", "status_label": "En attente du paiement" }
  ],
  "created_at": "2026-10-29T09:12:00Z"
}
```

Erreurs : 422 `INVALID_PHONE`, `RECEPTION_DETAIL_REQUIRED`, `PRODUCT_UNAVAILABLE`.

### `GET /v1/orders/{id}`

Même objet. L'application l'interroge toutes les 4 secondes tant que
`status = awaiting_payment`. Statuts : `awaiting_payment`, `paid`, `preparing`,
`on_the_way`, `delivered`, `cancelled`. **L'argent reste chez Axi jusqu'à `delivered`** ;
chaque commerçant est payé à la réception.

## 6. Commerçant : Ma journée

### `GET /v1/merchant/today`

```json
{
  "greeting_name": "Maman Afi",
  "stall_open": true,
  "sales_today": 54000,
  "orders_to_prepare": 2,
  "connection": { "active": true, "included_until": "2026-11-30" },
  "relocation": {
    "title": "Vous êtes installée à Tokpa Yôyô",
    "text": "Prévenez vos clients : votre nouvelle adresse et votre plan d'accès leur sont envoyés en un message.",
    "already_sent": false,
    "client_count": 4
  },
  "orders": [
    {
      "id": "cmd_501",
      "customer_name": "Madame Hounsou",
      "customer_phone": "+22996000010",
      "summary": "2 × Wax hollandais · Livraison Akpakpa",
      "status": "to_prepare",
      "status_label": "À préparer"
    }
  ]
}
```

| Champ | Règle |
|---|---|
| `connection` | « Connexion Axi active » (zero-rating inclus dans l'abonnement) ; `active: false` affiche l'état suspendu |
| `relocation` | `null` si pas de déménagement récent ; `already_sent: true` remplace le bouton par « Adresse envoyée » |
| `orders[].status` | `to_prepare`, `ready`, `picked_up` |
| `max_age_s` | 60 conseillé : les commandes arrivent dans la journée |

### `POST /v1/merchant/relocation/broadcast`

« Envoyer ma nouvelle adresse ». Réponse (`BroadcastResult`) :
`{ "recipients": 4, "message": "Nouvelle adresse envoyée à 4 clients." }`.

### `POST /v1/merchant/orders/{id}/ready`

« Prêt pour le coursier ». Réponse : `{ "status": "ready" }`.

### `POST /v1/merchant/arrivals` (multipart)

« Annoncer un arrivage en vocal ». Champ `audio`. Le message est diffusé aux clients
fidèles. Réponse : `BroadcastResult`.

### `POST /v1/merchant/products` (multipart)

« Ajouter un produit en photo ». Champs : `photo` (WebP déjà réduit à 1080 px par le
téléphone), `name`, `price` (entier, ou chaîne vide pour « Prix à débattre »),
`is_today` (`"1"` ou `"0"`). Réponse : le `Product` créé.

## 7. Commerçant : Mon étal

### `GET /v1/merchant/stall`

```json
{ "stall": { "...StallDetail (comme /v1/stalls/{id})..." }, "products": [ { "...Product..." } ] }
```

Tous les produits du commerçant, épuisés compris.

### `PATCH /v1/merchant/products/{id}`

Corps : `{ "is_today": true }` ou `{ "in_stock": false }`. Réponse : le `Product` à jour.

## 8. Commerçant : Mes clients

### `GET /v1/merchant/clients?segment=all`

`segment` ∈ `all` (Tous), `resellers` (Revendeurs), `loyal` (Fidèles), `to_follow_up` (À relancer).

```json
{
  "arrival_prompt": {
    "title": "Nouvel arrivage de wax ?",
    "text": "Prévenez vos clients fidèles en un message, par Axi ou par WhatsApp.",
    "button_label": "Envoyer à mes clients fidèles"
  },
  "clients": [
    {
      "id": "cli_1",
      "display_name": "Boutique Sena, Lomé",
      "description": "Revendeuse · dernier achat hier",
      "phone": "+22890000011",
      "badge": { "kind": "loyal", "label": "Fidèle" }
    },
    {
      "id": "cli_3",
      "display_name": "Alhaji Tanko, Kano",
      "description": "Grossiste · dernier achat il y a 6 semaines",
      "phone": "+2348030000012",
      "badge": { "kind": "follow_up", "label": "Relancer" }
    }
  ]
}
```

`badge.kind` ∈ `loyal`, `new`, `follow_up` (ce dernier s'affiche en bouton orange) ;
`badge` peut être `null`. `arrival_prompt` peut être `null`.

### `POST /v1/merchant/clients`

Bouton « + ». Corps : `{ "display_name": "…", "phone": "+229…", "kind": "individual" | "reseller" }`.
Réponse : le client créé.

### `POST /v1/merchant/clients/{id}/follow-up`

Bouton « Relancer ». Réponse : `BroadcastResult`.

### `POST /v1/merchant/broadcasts`

« Envoyer à mes clients fidèles ». Corps : `{ "segment": "loyal", "channel": "axi" | "whatsapp" }`.
Avec `whatsapp`, l'application ouvre ensuite WhatsApp avec le message prêt.
Réponse : `BroadcastResult`.

## 9. Commerçant : Mon argent

### `GET /v1/merchant/money`

```json
{
  "pending_amount": 126500,
  "subscription": {
    "status": "active",
    "status_label": "Actif",
    "plan_label": "Formule Étal · 2 000 F par mois · connexion incluse",
    "note": "Inclus dans votre place à Tokpa Yôyô"
  },
  "supplier_offer": {
    "id": "off_1",
    "label": "Sponsorisé",
    "title": "[Fournisseur] : 20 pièces de wax livrées à votre stand",
    "text": "Payables en 4 semaines avec le crédit stock de [IMF partenaire], prélevé sur vos ventes Axi.",
    "url": null
  },
  "credit": {
    "title": "Votre historique ouvre l'accès au crédit",
    "text": "7 mois de ventes enregistrées sur Axi. Demandez un crédit à [IMF partenaire] sans garantie à fournir.",
    "can_request": true,
    "request_pending": false
  },
  "data_sharing": {
    "partner_name": "[IMF partenaire]",
    "enabled": false,
    "text": "Seulement si vous le décidez. Axi ne vend jamais vos données ni celles de vos clients."
  }
}
```

| Champ | Règle |
|---|---|
| `pending_amount` | « À recevoir, libéré à la réception des colis » |
| `subscription.status` | `active` ou `expired` ; `note` peut être `null` |
| `supplier_offer` | `null` sans campagne ; `url` `null` = détail affiché dans l'application |
| `credit.request_pending` | `true` remplace le bouton par « Demande en cours d'étude » |

### `POST /v1/merchant/credit-requests`

« Demander un crédit ». **Refusé tant que le partage d'historique n'est pas accepté** :
422 `DATA_SHARING_REQUIRED` ; l'application propose alors d'accepter puis renvoie la demande.
Réponse : `{ "message": "Demande envoyée. [IMF partenaire] vous appellera sous 48 h." }`.

### `PUT /v1/merchant/data-sharing`

Case « Partager mon historique ». Corps : `{ "enabled": true }`. Réponse : `{ "enabled": true }`.
Accord explicite, révocable à tout moment.

## 10. Récapitulatif des routes

| Méthode | Route | Écran |
|---|---|---|
| GET | `/v1/home` | Accueil, Allées |
| GET | `/v1/aisles/{id}/stalls` | Une allée |
| GET | `/v1/search?q=` | Recherche |
| POST | `/v1/search/voice` | Recherche vocale |
| GET | `/v1/stalls/{id}` | Page d'un étal |
| POST / DELETE | `/v1/stalls/{id}/follow` | Suivre l'étal |
| POST | `/v1/stalls/{id}/voice-messages` | Message vocal |
| POST | `/v1/orders/quote` | Panier |
| POST | `/v1/orders` | Payer une fois en Mobile Money |
| GET | `/v1/orders/{id}` | Suivi de commande |
| GET | `/v1/merchant/today` | Ma journée |
| POST | `/v1/merchant/relocation/broadcast` | Envoyer ma nouvelle adresse |
| POST | `/v1/merchant/orders/{id}/ready` | Prêt pour le coursier |
| POST | `/v1/merchant/arrivals` | Annoncer un arrivage en vocal |
| POST | `/v1/merchant/products` | Ajouter un produit en photo |
| GET | `/v1/merchant/stall` | Mon étal |
| PATCH | `/v1/merchant/products/{id}` | Aujourd'hui / En stock |
| GET | `/v1/merchant/clients?segment=` | Mes clients |
| POST | `/v1/merchant/clients` | Ajouter un client |
| POST | `/v1/merchant/clients/{id}/follow-up` | Relancer |
| POST | `/v1/merchant/broadcasts` | Envoyer à mes clients fidèles |
| GET | `/v1/merchant/money` | Mon argent |
| POST | `/v1/merchant/credit-requests` | Demander un crédit |
| PUT | `/v1/merchant/data-sharing` | Partager mon historique |

À définir ensuite : authentification par numéro de téléphone (OTP), Axi Pro (espace
web partenaires).
