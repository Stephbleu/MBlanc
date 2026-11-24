# MONSIEUR BLANC — V3.2

Jeu Undercover local, installable comme PWA (Android, tablette, ordinateur). Un seul téléphone, sans compte ni serveur.

## Nouveautés de la v3.2
- **1 000 paires de mots** (500 nouvelles, sans aucun mot en commun avec les anciennes), 25 catégories × 40 paires.
- **Composer la partie** : on ne choisit plus que le nombre de joueurs ; chacun saisit son prénom à la première distribution.
- **Rôles cachés** : civils et undercover ne voient que leur mot et ignorent leur rôle ; il est révélé à l'élimination ou à la victoire. Monsieur Blanc, lui, sait qu'il l'est.
- **Monsieur Blanc ne commence jamais** la discussion.
- **Page de victoire** : gagnants avec leur rôle, rôles de tous les autres, mots de la manche, puis bouton « Voir les scores ».

## Nouveautés de la v3.1
**Corrections**
- La fenêtre « J'ai oublié mon rôle » existe enfin dans `index.html` (son absence faisait planter le script : catégories vides, pas de hors-ligne, pas de bibliothèque).
- Plus de partie bloquée : Monsieur Blanc seul face à un civil gagne ; une égalité sans votants n'existe plus.
- Égalité : revote avec tous les joueurs ; nouvelle égalité (ou revote désactivé) → tirage au sort.
- Reprise de partie après fermeture de l'app (bouton « Reprendre la partie » sur l'accueil).
- Export JSON limité aux paires personnelles ; import CSV robuste (guillemets, `;`, doublons ignorés).
- La devinette de Monsieur Blanc impose de révéler les rôles (plus de fuite).
- Minuteur, message d'erreur, limites de joueurs et de rôles corrigés ; une paire n'est pas rejouée avant d'avoir fait le tour.
- Accueil : accès aux Règles, Mots et Réglages.

**Apparence** — tous les écrans reprennent le style de l'accueil : fond blanc, sans cadres, boutons sombres, une touche de rouge.

## Publication GitHub Pages
Déposez le contenu à la racine du dépôt, Settings → Pages → branche `main`, dossier `/ (root)`. Le cache est passé à `monsieur-blanc-v5` : les données locales sont conservées.

## Tests
`node tests/game.test.js`
