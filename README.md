# MONSIEUR BLANC — V3.1

Jeu Undercover local, installable comme PWA (Android, tablette, ordinateur). Un seul téléphone, sans compte ni serveur.

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
Déposez le contenu à la racine du dépôt, Settings → Pages → branche `main`, dossier `/ (root)`. Le cache est passé à `monsieur-blanc-v4` : les données locales sont conservées.

## Tests
`node tests/game.test.js`
