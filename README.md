# KEVDRIFT — Néon Overdrive

Jeu de course arcade rétro-futuriste, jouable directement dans le navigateur (ordinateur et téléphone).

## Le jeu
- **3 circuits** : Néon Boulevard (facile), Dunes de Chrome (moyen), Anneau Orbital (difficile), chacun avec ses décors et sa musique.
- **3 machines** : Lame Rose (équilibrée), Spectre Cyan (agile), Comète Or (rapide).
- **Course** de 3 tours contre 7 rivaux, classement en direct, chrono, meilleur tour et record sauvegardé par circuit.
- **Drift** : maintiens le drift dans un virage puis relâche pour un turbo bleu, rose ou or. Des plaques turbo jalonnent les lignes droites.
- **Musique synthwave et bruitages** générés en direct par le jeu (aucun fichier audio).

## Visuels
L'affiche de l'écran titre, le panorama de chaque circuit et les bolides (les trois machines et le bolide des rivaux, repeint à la couleur de chacun) sont peints avec Codex (`public/art/`, WebP). Les prompts sont dans `tools/art/prompts.json` ; `tools/art/generer.sh` les génère et `tools/art/finir.py` recadre, raccorde les panoramas, détoure et exporte. Le jeu reste jouable si une image manque : le dessin procédural d'origine prend le relais (`src/render/art.ts`).

## Commandes
| Action | Clavier | Tactile |
|---|---|---|
| Accélérer | ↑ / Z (W) | automatique |
| Freiner | ↓ / S | bouton FREIN |
| Tourner | ← → / Q D (A D) | boutons ◀ ▶ |
| Drifter | Espace ou Maj | bouton DRIFT |
| Pause | Échap / P | bouton pause |
| Musique on/off | M | menu |

## Réglages
Sur la grille de départ et dans la pause : **Musique**, **Sons** (bruitages et moteur) et **Secousses** (tremblements et flashs de l'écran). Ils sont sauvegardés.

## Lancer le jeu
En ligne : https://yankamkevin.github.io/kevdrift/ (construit et publié par GitHub Actions à chaque fusion dans `main` ; réglage du dépôt : *Settings > Pages > Source = GitHub Actions*).

En local (Node 22.18 ou plus) :
```bash
npm ci
npm run dev        # serveur de développement Vite, rechargement à chaud
npm run build      # jeu construit dans dist/
npm run preview    # sert dist/
```

## Technique
TypeScript strict, construit par Vite, sans dépendance à l'exécution ; rendu pseudo-3D sur canvas, son par la Web Audio API. La simulation est pure (aucun DOM, aucun hasard) et tourne à pas fixe de 1/60 s ; le rendu, le son et l'interface la lisent sans la modifier.

| Dossier | Rôle |
|---|---|
| `src/sim/` | Simulation pure : données (`config.ts`), circuit (`track.ts`), pilotage, drift et boosts (`physics.ts`), collisions (`collision.ts`), rivaux et pilote automatique (`ai.ts`), course, tours et arrivée (`race.ts`), robot (`bot.ts`) |
| `src/platform/` | Sauvegarde versionnée (`save.ts`), profil du joueur (`profile.ts`), paramètres d'adresse (`params.ts`) |
| `src/render/` | Vue et densité de pixels (`view.ts`), route (`road.ts`), ciel (`background.ts`), décor et voitures (`cars.ts`), particules, images dessinées et peintes |
| `src/audio/` | Web Audio : bus et voix (`core.ts`), musique (`music.ts`), bruitages et moteur (`sfx.ts`) |
| `src/ui/` | Écrans (`screens.ts`), grille de départ (`menus.ts`), tableau de bord (`hud.ts`), annonces et résultats (`feedback.ts`) |
| `src/main.ts` | Démarrage, boucle à pas fixe, pause quand l'onglet est caché |

Mobile : densité de pixels plafonnée à 1,5 et budget de 2,4 millions de pixels, moins de segments dessinés sur petit écran, aucune allocation par image pendant la course (projection dans des tableaux typés, particules réutilisées), boucle et son arrêtés quand l'onglet est caché, boutons tactiles et accélération automatique au premier toucher.

## Sauvegarde
Circuit et machine choisis, réglages, et pour chaque circuit le record de course et le meilleur tour sont gardés dans le navigateur (`localStorage`, clé `kevdrift.sauvegarde`, format version 2, `src/platform/save.ts`). Toute modification du format ajoute une étape à `migrate()` : la version 1 (jeu 1.1.0) et les toutes premières clés séparées (`kevdrift.best0`…) sont reprises automatiquement. Un champ abîmé est remplacé par sa valeur par défaut sans perdre le reste ; une sauvegarde illisible ou venant d'une version plus récente est mise de côté sous `kevdrift.sauvegarde.abimee`, jamais écrasée en silence. Sans `localStorage` (navigation privée stricte), le jeu marche, simplement sans mémoire.

## Tests
```bash
npm run typecheck     # TypeScript strict
npm test              # Vitest : physique, drift, plaques, collisions, IA, tours, sauvegarde, robot… (188 tests)
npm run bot           # robot sans navigateur : 9 courses complètes (3 circuits × 3 machines)
npm run build         # puis, sur le jeu construit :
npm run smoke         # fumée : ordinateur, iPhone SE, Pixel 7 couché
npm run partie        # parcours complet piloté par le robot : course, records, pause, réglages, rechargement, onglet caché, anciennes sauvegardes
npm run check         # tout, dans l'ordre de la CI
```
Les tests navigateur utilisent Playwright (`npx playwright install chromium` la première fois). `?robot` fait piloter la voiture par le jeu, `?turbo=N` accélère la course, `#demo`, `#demo2`, `#demo3` lancent une démo. La CI (`.github/workflows/tests.yml`) lance tout sur chaque PR et bloque en cas d'échec.

Non-régression : `tests/unit/fixtures/reference-1.1.0.json` contient 21 courses jouées avec le JavaScript d'origine ; la simulation TypeScript doit les reproduire au millionième près.

Correction trouvée par les tests (1.1.0) : certaines plaques de boost débordaient d'une ligne droite sur le début d'un virage ; elles sont maintenant entièrement sur le droit.
