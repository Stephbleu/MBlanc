# MONSIEUR BLANC — V3.3

Jeu Undercover local, installable comme PWA (Android, tablette, ordinateur). Un seul téléphone, sans compte ni serveur.

## Nouveautés de la v3.3
- **M. Blanc complice** : quand les undercover gagnent, chaque Monsieur Blanc encore en jeu marque 1 point (réglable).
- **Se dévoiler** : Monsieur Blanc peut, à tout moment (discussion ou vote), donner le mot des civils. Bon mot : il gagne. Mauvais mot : il est éliminé.
- **Chronomètre supprimé.** Le joueur qui commence s'affiche en grand : tiré au sort hors M. Blanc au premier tour, puis celui qui suit l'éliminé.
- **Composition publique** : « Parmi vous : 1 undercover et 1 Monsieur Blanc ».
- **Rôles tirés à la validation de chaque pseudo**, dans un paquet caché, avec l'aléa cryptographique du navigateur ; contrôle du hasard dans Réglages.
- **« Reprendre la partie »** n'apparaît plus une fois la partie terminée.
- **Mises à jour fiables** : le service worker charge toujours la dernière version quand on est en ligne (le cache ne sert que hors ligne) et recharge l'app à l'accueil quand une nouvelle version est publiée. Le numéro de version est dans Réglages (`js/version.js`).

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
Déposez le contenu à la racine du dépôt, Settings → Pages → branche `main`, dossier `/ (root)`. Le cache porte le numéro de version (`monsieur-blanc-3.3.0`) : les données locales sont conservées.

## Tests
`node tests/game.test.js`

## Si un appareil montre encore une ancienne version
Réglages → numéro de version en bas. S'il n'est pas « 3.3.0 » : Chrome → ⋮ → Paramètres → Paramètres des sites → Stockage → rechercher l'adresse du jeu → Effacer les données (les paires personnelles sont perdues), puis rouvrir la page deux fois. Pour l'app installée : la rouvrir en ligne, ou la désinstaller puis la réinstaller.


## Version 3.4.0
- **Appui long pour voir son mot** : le mot (et l'illustration de Monsieur Blanc) n'apparaît que tant que le doigt reste sur la carte ; il se masque au relâchement ou si l'application passe en arrière-plan. Même principe dans « J'ai oublié mon mot ». Réglage « Appui long pour voir le mot » (désactivé = toucher pour afficher / masquer).
- **Retours tactiles et animations** : vibrations (premier affichage du mot, élimination, victoire — réglage « Vibrations », non disponible sur iPhone), retournement de carte, zoom du rôle à l'élimination, confettis sobres à chaque victoire. Tout dépend du réglage « Animations » et de `prefers-reduced-motion`.
- **Mémoire des joueurs** : pseudos enregistrés sur l'appareil (30 max) et proposés à la saisie ; groupes enregistrables depuis le classement final, sélectionnables à la composition ; gestion dans Réglages › Joueurs et groupes. Tout reste local.
- 1re manche : le pseudo est validé d'abord, le rôle est tiré à cet instant.
