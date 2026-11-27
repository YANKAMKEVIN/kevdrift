// Robot sans navigateur : joue une course complète sur chaque circuit avec chaque machine
// et affiche le classement. Échoue si une course ne se termine pas.
// Lancer : npm run bot   (Node 22.18+ lit le TypeScript directement)
import { CARS, TRACKS } from '../src/sim/config.ts';
import { runRace } from '../src/sim/bot.ts';
import { fmt } from '../src/sim/util.ts';

let fails = 0;
const t0 = performance.now();
for (let t = 0; t < TRACKS.length; t++) {
  for (let c = 0; c < CARS.length; c++) {
    const res = runRace(t, c, { drift: true });
    if (!res.finished) fails++;
    console.log(
      `${res.finished ? 'OK   ' : 'ÉCHEC'} ${TRACKS[t].name.padEnd(16)} ${CARS[c].name.padEnd(13)} ` +
        `${res.rank}e  total ${fmt(res.total)}  meilleur tour ${fmt(res.bestLap)}`,
    );
  }
}
console.log(`\n${TRACKS.length * CARS.length} courses simulées en ${Math.round(performance.now() - t0)} ms.`);
process.exit(fails ? 1 : 0);
