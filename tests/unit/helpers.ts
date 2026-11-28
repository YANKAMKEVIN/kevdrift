import { createRace, update } from '../../src/sim/race.ts';
import type { Race, RaceEvents, Sfx } from '../../src/sim/types.ts';
import { STEP } from '../../src/sim/config.ts';

/** Événements enregistrés, pour vérifier ce que la course annonce. */
export interface Recorder extends RaceEvents {
  log: string[];
  sounds: Sfx[];
  toasts: string[];
  big: string[];
  finishedCount: number;
  resultsCount: number;
}

export function recorder(): Recorder {
  const r: Recorder = {
    log: [], sounds: [], toasts: [], big: [], finishedCount: 0, resultsCount: 0,
    bigMsg(t) { r.big.push(t); r.log.push('big:' + t); },
    toast(t) { r.toasts.push(t); r.log.push('toast:' + t); },
    flash() {},
    sfx(k) { r.sounds.push(k); },
    finished() { r.finishedCount++; },
    results() { r.resultsCount++; },
    resultsShown: () => r.resultsCount > 0,
  };
  return r;
}

/** Grille de départ prête, course lancée (le compte à rebours est sauté). */
export function startOn(track = 0, car = 0, events?: RaceEvents): Race {
  const r = createRace(track, car, events);
  r.phase = 'race';
  r.lastRank = 8;
  return r;
}

/** Fait tourner la simulation pendant `secs` secondes. */
export function run(r: Race, secs: number, each?: (r: Race) => void): void {
  for (let t = 0; t < secs; t += STEP) {
    each?.(r);
    update(r, STEP);
  }
}

/** Arrondi au millionième (et -0 ramené à 0, comme le fait JSON). */
export const r6 = (v: number): number => Math.round(v * 1e6) / 1e6 || 0;
