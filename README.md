# KEVDRIFT — Néon Overdrive

Jeu de course arcade rétro-futuriste, jouable directement dans le navigateur (ordinateur et téléphone).

## Le jeu
- **3 circuits** : Néon Boulevard (facile), Dunes de Chrome (moyen), Anneau Orbital (difficile), chacun avec ses décors et sa musique.
- **3 machines** : Lame Rose (équilibrée), Spectre Cyan (agile), Comète Or (rapide).
- **Course** de 3 tours contre 7 rivaux, classement en direct, chrono, meilleur tour et record sauvegardé par circuit.
- **Drift** : maintiens le drift dans un virage puis relâche pour un turbo bleu, rose ou or. Des plaques turbo jalonnent les lignes droites.
- **Musique synthwave et bruitages** générés en direct par le jeu (aucun fichier audio).

## Commandes
| Action | Clavier | Tactile |
|---|---|---|
| Accélérer | ↑ / Z (W) | automatique |
| Freiner | ↓ / S | bouton FREIN |
| Tourner | ← → / Q D (A D) | boutons ◀ ▶ |
| Drifter | Espace ou Maj | bouton DRIFT |
| Pause | Échap / P | bouton pause |
| Musique on/off | M | menu |

## Lancer le jeu
En ligne : https://yankamkevin.github.io/kevdrift/ (publié automatiquement à chaque fusion dans `main`).

Hors ligne : `npm start`, puis http://localhost:8000. Le jeu est découpé en modules JavaScript, que les navigateurs refusent d'ouvrir directement en `file://`.

## Technique
HTML, CSS et JavaScript sans dépendance ni étape de construction ; rendu pseudo-3D sur canvas, son par la Web Audio API. Code typé (JSDoc vérifié par TypeScript en mode strict) et découpé par rôle :

| Fichier | Rôle |
|---|---|
| `src/config.js` | Données : circuits, voitures, rivaux, seuils de drift et de boost, version |
| `src/track.js` | Construction du circuit en segments (sans DOM) |
| `src/race.js` | Course : pilotage, drift et boosts, rivaux, tours, arrivée (sans DOM) |
| `src/state.js` | État partagé de la course |
| `src/save.js` | Sauvegarde versionnée |
| `src/sprites.js` | Images précalculées (voitures, décors) |
| `src/render.js` | Rendu de la route et des voitures |
| `src/ui.js` | Écrans et tableau de bord |
| `src/input.js` | Clavier et boutons tactiles |
| `src/audio.js` | Musique et sons |
| `src/main.js` | Démarrage et boucle |

## Sauvegarde
Circuit et voiture choisis, musique et record de chaque circuit sont gardés dans le navigateur (`localStorage`, clé `kevdrift.sauvegarde`). Le format est versionné (`migrate()` dans `src/save.js`). Les records de l'ancienne version (clés `kevdrift.best0`…) sont repris automatiquement une fois. Une sauvegarde abîmée ou venant d'une version plus récente est mise de côté sous `kevdrift.sauvegarde.abimee`, jamais écrasée en silence.

## Tests
```bash
npm install
npx playwright install chromium
npm test              # tout ce que lance la CI
npm run types         # vérification des types
npm run unit          # circuits, drift, freinage, sauvegarde et 3 courses complètes simulées (Node)
npm run smoke         # fumée : ordinateur, iPhone SE, Pixel 7 couché
npm run partie        # course complète dans Chromium, pilotée par le robot, puis sauvegarde et rechargement
```
`?robot` fait piloter la voiture par le jeu, `?turbo=N` accélère la course (utilisés par `npm run partie`). La CI (`.github/workflows/tests.yml`) lance tout sur chaque PR ; `pages.yml` publie le jeu à chaque fusion dans `main`.

Correction trouvée par les tests : certaines plaques de boost débordaient d'une ligne droite sur le début d'un virage ; elles sont maintenant entièrement sur le droit.
