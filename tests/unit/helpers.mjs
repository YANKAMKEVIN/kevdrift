import { etat, P, inp } from '../../src/state.js';
import { sel } from '../../src/save.js';
import { resetRace, update, autoSteer } from '../../src/race.js';
import { findSeg } from '../../src/track.js';
import { STEP, PZ } from '../../src/config.js';

// sous Node, pas de canvas : des images factices suffisent pour placer le décor
etat.SP = { tower: [{}, {}, {}], bill: [{}, {}, {}, {}], lamp: {}, palm: {}, chevL: {}, chevR: {}, pylon: {}, crystal: {}, ring: {}, pillar: {}, gate: {}, sun: {}, mount: {} };

/** Grille de départ prête, course lancée (le compte à rebours est sauté). */
export function startOn(track = 0, car = 0) {
  sel.track = track; sel.car = car;
  for (const k in inp) inp[k] = false;
  resetRace(); etat.state = 'race'; etat.lastRank = 8;
  return etat;
}

/** Pilote simple : accélère et suit la route ; drift dans les grands virages si demandé.
 * @returns {number} secondes de course jusqu'à l'arrivée (Infinity si pas d'arrivée). */
export function drive({ drift = false, limit = 600 } = {}) {
  let t = 0;
  while (etat.state === 'race' && t < limit) {
    const seg = findSeg(etat.pos + PZ), s = autoSteer(seg);
    inp.up = true; inp.left = s < -.15; inp.right = s > .15;
    inp.drift = drift && Math.abs(seg.curve) >= 3;
    update(STEP); t += STEP;
  }
  return t;
}
export { etat, P, inp };
