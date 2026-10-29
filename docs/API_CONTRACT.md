# Contrat d'API Axi : écrans Accueil et Page d'un étal

Ce document est la référence partagée entre le frontend React Native et le backend PHP.
Les types TypeScript correspondants sont dans `src/api/types/`. Toute modification
du JSON doit être faite des deux côtés en même temps.

## 1. Conventions générales

| Règle | Valeur |
|---|---|
| Préfixe | `/v1/` |
| Format | JSON UTF-8 (`Content-Type: application/json; charset=utf-8`), `json_encode($x, JSON_UNESCAPED_UNICODE)` |
| Clés | `snake_case` |
| Identifiants | chaînes préfixées (`stl_…`, `prd_…`), jamais d'entier brut |
| Montants | entiers en francs CFA (`15000`), jamais de décimales ni de chaîne |
| Dates | ISO 8601 UTC (`2026-10-29T08:15:00Z`) |
| Valeur absente | `null` (la clé est toujours présente) |
| Listes vides | `[]`, jamais `null` |
| Authentification | `Authorization: Bearer <token>` (facultatif pour l'accueil public) |

### Enveloppe de réponse

Succès :

```json
{
  "ok": true,
  "data": { },
  "meta": { "server_time": "2026-10-29T08:15:00Z", "max_age_s": 300 }
}
```

Erreur (avec le code HTTP adapté : 400, 401, 404, 422, 500) :

```json
{
  "ok": false,
  "error": { "code": "STALL_NOT_FOUND", "message": "Cet étal n'existe pas ou a été fermé." }
}
```

`message` est affichable tel quel à l'utilisateur, en français.

### Cache et économie de data (obligatoire)

L'objectif est de rester sous 1,5 Go par mois et par commerçant. Le frontend garde
déjà une copie locale de chaque réponse ; le backend doit permettre de ne pas la
retélécharger quand rien n'a changé.

1. **ETag** sur chaque `GET` : `ETag: "<hash>"` (par exemple `md5` du JSON produit).
2. Si la requête contient `If-None-Match` égal à l'ETag courant, répondre
   **`304 Not Modified` sans corps**.
3. `Cache-Control: private, max-age=<meta.max_age_s>`.
4. Compression : `gzip` activé (Apache `mod_deflate` / Nginx `gzip on`).

Exemple PHP :

```php
$json = json_encode($response, JSON_UNESCAPED_UNICODE);
$etag = '"' . md5($json) . '"';
header('ETag: ' . $etag);
header('Cache-Control: private, max-age=300');
if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
    http_response_code(304);
    exit;
}
header('Content-Type: application/json; charset=utf-8');
echo $json;
```

### Images

Toutes les images suivent le même objet. Le backend les stocke en **WebP**, en deux
tailles générées à l'upload ; l'application ne charge jamais l'original.

```json
{
  "thumb_url": "https://cdn.axi.bj/p/prd_88/thumb.webp",
  "medium_url": "https://cdn.axi.bj/p/prd_88/medium.webp",
  "width": 600,
  "height": 600,
  "blurhash": "LKO2?U%2Tw=w]~RBVZRi};RPxuwH"
}
```

| Champ | Contrainte |
|---|---|
| `thumb_url` | ~200 px de large, < 15 Ko, pour les listes |
| `medium_url` | ~600 px de large, < 60 Ko, pour le détail |
| URL | **immuable** : si l'image change, l'URL change (ajouter un hash ou une version). Le cache disque du téléphone n'est alors jamais périmé. Servir avec `Cache-Control: public, max-age=31536000, immutable`. |
| `blurhash` | facultatif (`null` accepté), quelques octets affichés pendant le chargement |

### Objets communs

**Prix** (`null` = prix sur demande) :

```json
{ "amount": 15000, "amount_max": 18000, "currency": "XOF", "negotiable": true }
```

`amount_max` est `null` pour un prix fixe et renseigné pour une fourchette.
`negotiable` préserve la négociation, au cœur du commerce au marché.

**Emplacement d'un étal** :

```json
{
  "site": "Tokpa Yôyô",
  "row": "Allée B",
  "stand": "214",
  "label": "Tokpa Yôyô, Allée B, stand 214",
  "moved_at": "2026-07-01T00:00:00Z"
}
```

`label` est la phrase affichée telle quelle. `moved_at` est renseigné si l'étal a
déménagé récemment (affichage « nouvel emplacement »), sinon `null`.

**Résumé d'étal** (`StallSummary`, utilisé dans les listes) :

```json
{
  "id": "stl_214",
  "name": "Chez Maman Afi",
  "avatar": { "...objet image..." },
  "aisle_id": "tissus",
  "verified": true,
  "location": { "...objet emplacement..." },
  "has_new_products": true
}
```

## 2. Écran Accueil : `GET /v1/home`

Un seul appel charge tout l'écran. Pas d'authentification obligatoire ; avec un
token, `followed_stalls` contient les étals suivis par l'utilisateur, sinon `[]`.

```json
{
  "ok": true,
  "data": {
    "market_notice": {
      "text": "Service en ligne des marchés de Cotonou",
      "partner": "ANaGeM"
    },
    "aisles": [
      { "id": "tissus", "name": "Tissus et pagnes", "icon": "fabric", "stall_count": 412 },
      { "id": "vivriers", "name": "Vivriers", "icon": "grain", "stall_count": 655 },
      { "id": "cosmetiques", "name": "Cosmétiques", "icon": "beauty", "stall_count": 203 }
    ],
    "followed_stalls": [
      {
        "id": "stl_214",
        "name": "Chez Maman Afi",
        "avatar": {
          "thumb_url": "https://cdn.axi.bj/s/stl_214/a1f3/thumb.webp",
          "medium_url": "https://cdn.axi.bj/s/stl_214/a1f3/medium.webp",
          "width": 600,
          "height": 600,
          "blurhash": null
        },
        "aisle_id": "tissus",
        "verified": true,
        "location": {
          "site": "Tokpa Yôyô",
          "row": "Allée B",
          "stand": "214",
          "label": "Tokpa Yôyô, Allée B, stand 214",
          "moved_at": "2026-07-01T00:00:00Z"
        },
        "has_new_products": true
      }
    ],
    "sponsored": {
      "id": "spn_12",
      "brand": "[MARQUE]",
      "title": "[ACCROCHE]",
      "image": { "...objet image..." },
      "target": { "type": "aisle", "id": "cosmetiques" }
    }
  },
  "meta": { "server_time": "2026-10-29T08:15:00Z", "max_age_s": 300 }
}
```

| Champ | Règle |
|---|---|
| `market_notice` | `null` tant qu'il n'y a pas d'accord ANaGeM |
| `aisles[].icon` | clé d'une icône **embarquée dans l'application** (pas d'image à télécharger). Valeurs connues : `fabric`, `grain`, `beauty`, `hardware`, `parts`, `electronics`, `other` |
| `aisles` | triées dans l'ordre d'affichage |
| `followed_stalls` | 20 maximum, du plus récemment actif au moins actif |
| `sponsored` | `null` s'il n'y a pas de campagne ; `target.type` ∈ `stall`, `aisle`, `url` |

### Recherche (barre texte et vocale)

Appelée depuis l'accueil, documentée ici pour réserver les routes :

- `GET /v1/search?q=wax&aisle_id=tissus&cursor=` → `{ "stalls": StallSummary[], "products": Product[], "next_cursor": string|null }`
- `POST /v1/search/voice` (multipart, champ `audio`, AAC/M4A mono 16 kHz, 10 s max) → même réponse, plus `"transcript": "wax hollandais"`.

## 3. Page d'un étal : `GET /v1/stalls/{id}`

Paramètre facultatif `?cursor=` pour la page suivante de produits (30 par page).
`stall` est renvoyé à chaque page ; le frontend utilise celui de la première.

```json
{
  "ok": true,
  "data": {
    "stall": {
      "id": "stl_214",
      "name": "Chez Maman Afi",
      "avatar": { "...objet image..." },
      "aisle_id": "tissus",
      "verified": true,
      "location": {
        "site": "Tokpa Yôyô",
        "row": "Allée B",
        "stand": "214",
        "label": "Tokpa Yôyô, Allée B, stand 214",
        "moved_at": null
      },
      "has_new_products": true,
      "owner_display_name": "Maman Afi",
      "description": "Wax, bazin et pagnes tissés. Gros et détail.",
      "verification": {
        "by": "agent",
        "agent_name": "Koffi D.",
        "verified_at": "2026-09-12T10:00:00Z"
      },
      "pay_on_delivery": true,
      "languages": ["fr", "fon"],
      "contacts": {
        "phone": "+22997000000",
        "whatsapp": "+22997000000",
        "accepts_voice_messages": true
      },
      "is_followed": true
    },
    "products": [
      {
        "id": "prd_88",
        "name": "Wax hollandais",
        "image": { "...objet image..." },
        "price": { "amount": 15000, "amount_max": null, "currency": "XOF", "negotiable": true },
        "unit": "pagne de 6 yards",
        "in_stock": true,
        "is_today": true,
        "updated_at": "2026-10-29T06:40:00Z"
      },
      {
        "id": "prd_91",
        "name": "Bazin riche",
        "image": null,
        "price": null,
        "unit": "mètre",
        "in_stock": true,
        "is_today": false,
        "updated_at": "2026-10-27T12:00:00Z"
      }
    ],
    "next_cursor": "eyJvZmZzZXQiOjMwfQ"
  },
  "meta": { "server_time": "2026-10-29T08:15:00Z", "max_age_s": 120 }
}
```

| Champ | Règle |
|---|---|
| `verification` | `null` si l'étal n'a pas encore été vérifié par un agent (alors `verified: false`) |
| `contacts.phone` / `whatsapp` | format E.164 ; `null` si le commerçant ne veut pas l'afficher. Le bouton correspondant est alors masqué |
| `contacts.accepts_voice_messages` | affiche le bouton « Message vocal » |
| `languages` | sous-ensemble de `fr`, `fon`, `yo`, `en` |
| `products` | produits du jour (`is_today: true`) **en premier**, puis le reste par `updated_at` décroissant ; produits hors stock exclus de la première page |
| `next_cursor` | chaîne opaque, `null` s'il n'y a plus de page |
| Étal inexistant | HTTP 404, `error.code = "STALL_NOT_FOUND"` |

## 4. À venir

Contrats à définir ensuite, dans ce même fichier : panier et paiement Mobile Money
(`POST /v1/orders`), Ma journée, Mes clients, Mon argent.
