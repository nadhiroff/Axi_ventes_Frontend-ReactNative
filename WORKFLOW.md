# Workflow de mise à jour de l'application

## ⚠️ Important : Mises à jour automatiques

Les mises à jour automatiques (EAS Update) NE fonctionnent PAS pour les APK installés manuellement.
Elles ne fonctionnent QUE si l'app est installée via Play Store/App Store.

## Types de changements

### 1. Changements JS/TS uniquement (code, composants, styles)
❌ EAS Update ne fonctionne PAS sans Play Store
✅ Doit refaire un build complet et distribuer le nouveau APK

### 2. Nouvelles dépendances natives ou modifications app.json
❌ Doit refaire un build complet
```bash
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

## Étapes avant mise à jour

1. **Tester localement**
```bash
npm run dev
# Tester sur simulateur/appareil avec Expo Go
```

2. **Vérifier le code**
```bash
npm run lint
npm run typecheck
```

3. **Commettre les changements**
```bash
git add .
git commit -m "Description des changements"
git push
```

## Distribution sans Play Store

### Option 1 : Distribution manuelle (actuelle)
1. Lancer le build
```bash
npx eas-cli@latest build --platform android --profile preview
```

2. Télécharger le APK
3. Partager par email/Drive/web
4. Les utilisateurs désinstallent l'ancienne version et installent la nouvelle

### Option 2 : Firebase App Distribution (recommandé pour mises à jour semi-automatiques)
1. Créer un projet Firebase (gratuit)
2. Configurer Firebase App Distribution
3. Intégrer le SDK Firebase dans l'app
4. Les utilisateurs reçoivent une notification quand une nouvelle version est disponible
5. Ils téléchargent et installent la nouvelle version via l'app

### Option 3 : Play Store Internal Testing (25$ unique)
1. Créer un compte Google Play Console
2. Publier en mode "Internal Testing"
3. Jusqu'à 100 testeurs
4. Mises à jour automatiques via Play Store

## Processus EAS Build

1. Lancer le build
```bash
npx eas-cli@latest build --platform android --profile production
```

2. Attendre la fin du build (10-20 min)

3. Télécharger le nouveau APK/IPA

4. Distribuer selon votre méthode choisie

## Branches recommandées

- `preview` : Pour les tests
- `production` : Pour les utilisateurs finaux
