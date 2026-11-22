# MONSIEUR BLANC — V2.0

Jeu Undercover local, installable comme PWA sur Android, tablette et ordinateur.

## Fonctionnalités
- Mode local sur un seul téléphone, sans compte ni serveur.
- 500 paires intégrées (1 000 entrées de mots), classées par catégorie et difficulté.
- Rôles Civil, Undercover et Monsieur Blanc illustrés.
- Distribution secrète, discussions, votes, revotes, éliminations et victoire.
- Scores cumulés entre les manches et réinitialisés lors d'une nouvelle partie.
- Bibliothèque personnalisable avec import/export JSON et CSV.
- Sauvegarde locale IndexedDB et fonctionnement hors ligne après le premier chargement.
- Bouton d'installation PWA : sur Android, Chrome propose l'installation si le site est servi en HTTPS.

## Publication GitHub Pages
1. Déposez le contenu du projet à la racine du dépôt GitHub.
2. Ouvrez **Settings → Pages**.
3. Choisissez **Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
4. Ouvrez l'URL GitHub Pages sur Android avec Chrome.
5. Utilisez **Télécharger / installer sur cet appareil** ou le menu Chrome ⋮ → **Installer l'application** / **Ajouter à l'écran d'accueil**.

## Utilisation hors ligne
La première ouverture nécessite une connexion pour charger les ressources et enregistrer le Service Worker. Ensuite, l'application et les données intégrées sont mises en cache. Les données personnalisées et la partie sauvegardée sont stockées localement sur l'appareil.

## Bibliothèque de mots
Le fichier `data/word-pairs.json` contient exactement 500 paires. Chaque ligne possède `id`, `civil`, `undercover`, `category` et `difficulty`. Le total est contrôlé dans l'écran Bibliothèque.

## Mise à jour
Remplacez les fichiers du dépôt par ceux de la nouvelle version. Le cache a été renommé `monsieur-blanc-v2` afin de forcer le rechargement des ressources. Les données locales IndexedDB sont conservées.

## Tests
Ouvrir `tests/game.test.js` avec un environnement JavaScript prenant en charge les scripts du navigateur ou exécuter les contrôles manuels décrits dans l'application.
