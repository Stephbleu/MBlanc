# MONSIEUR BLANC — prototype jouable local (v1.0)

Application web mobile-first de type PWA, hébergeable sur GitHub Pages. Le mode local fonctionne sans serveur et les ressources principales sont mises en cache pour un usage hors ligne après le premier chargement.

## État réel de cette livraison

Cette archive contient une première version jouable du **mode local** : création de joueurs, attribution aléatoire des rôles, découverte individuelle des secrets, discussion avec minuterie, vote individuel, revote en cas d'égalité, élimination, tentative de devinette de Monsieur Blanc, points cumulés entre manches, classement final, bibliothèque personnalisée, import/export JSON et CSV, IndexedDB et PWA.

**Cette version n'est pas encore la livraison intégrale du cahier des charges.** La bibliothèque intégrée contient actuellement **150 paires**, pas 1 000 paires / 2 000 mots. Le mode multitéléphone Firebase n'est pas implémenté et son bouton est volontairement désactivé. La reprise automatique d'une partie après fermeture et les tests sur appareils Android réels restent à finaliser. Le compteur de la bibliothèque affiche les chiffres réellement présents et ne simule pas le seuil demandé.

## Arborescence

```text
monsieur-blanc/
├── index.html
├── manifest.json
├── service-worker.js
├── README.md
├── css/style.css
├── js/
│   ├── words.js
│   ├── storage.js
│   ├── game.js
│   └── app.js
├── data/word-pairs.json
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Publication sur GitHub Pages

1. Créer un dépôt GitHub public, par exemple `monsieur-blanc`.
2. Décompresser l'archive sur le téléphone ou l'ordinateur.
3. Envoyer **le contenu** du dossier `monsieur-blanc` à la racine du dépôt (pas le dossier parent).
4. Dans GitHub : **Settings → Pages**.
5. Dans **Build and deployment**, choisir **Deploy from a branch**, puis `main` et `/ (root)`.
6. Attendre la publication. L'adresse sera de la forme `https://VOTRE-PSEUDO.github.io/monsieur-blanc/`.

Les chemins de ressources et le scope PWA sont relatifs afin de fonctionner dans un sous-répertoire GitHub Pages.

## Installation Android

1. Ouvrir l'adresse HTTPS du site dans Chrome Android.
2. Attendre le premier chargement complet (nécessaire au cache hors ligne).
3. Ouvrir le menu ⋮ de Chrome.
4. Choisir **Installer l'application** ou **Ajouter à l'écran d'accueil** selon la version de Chrome.
5. Lancer Monsieur Blanc depuis l'icône installée.

Une connexion est nécessaire pour le premier chargement. Après mise en cache, le mode local peut être utilisé hors ligne. Lors d'une mise à jour, le nouveau Service Worker remplace le cache précédent.

## Bibliothèque de mots

La source lisible et indépendante est `data/word-pairs.json`. La copie embarquée utilisée par l'application est `js/words.js` (pour éviter une dépendance au chemin de base GitHub Pages). Lors d'une modification manuelle du JSON, régénérer également `js/words.js` en conservant la forme `window.DEFAULT_WORD_PAIRS = [...]`.

Le panneau Bibliothèque affiche le nombre réel de paires, de mots uniques normalisés et de doublons. Les paires ajoutées ou importées sont conservées localement dans IndexedDB. Exporter régulièrement sa bibliothèque personnalisée pour la sauvegarder.

Format JSON attendu :

```json
[
  {"id":"exemple-1","civil":"Chien","undercover":"Chat","category":"Animaux","difficulty":"facile"}
]
```

Format CSV : colonnes `civil,undercover,category,difficulty`.

## Données et confidentialité

Le mode local ne transmet aucune donnée à un serveur. Les rôles et les mots sont conservés dans l'état local du navigateur pour permettre le déroulement de la partie. Le téléphone doit donc rester physiquement sous le contrôle du groupe pendant les passages de main.

## Limites et prochaines étapes nécessaires

- Enrichir et contrôler éditorialement la bibliothèque jusqu'à 1 000 paires réellement distinctes.
- Ajouter une synchronisation Firebase Realtime Database avec séparation stricte des données publiques et des secrets privés par joueur, règles de sécurité et validation côté serveur.
- Ajouter la reprise de session robuste (étape courante, joueur en cours, votes et minuterie).
- Tester les scénarios de victoire, les égalités et les cycles de manches sur appareils réels.
- Valider l'installation PWA et le fonctionnement hors ligne sur plusieurs versions d'Android.

Ne pas activer un multijoueur en ligne en exposant les mots secrets dans un nœud Firebase lisible par tous les participants.
