/** Robot pilote : joue une course complète avec de vraies commandes (clavier simulé), sans navigateur. */
import { PZ, STEP } from './config.ts';
import type { Race, RaceEvents } from './types.ts';
import { findSeg } from './track.ts';
import { autoSteer, createRace, startCountdown, update } from './race.ts';

export interface BotOptions {
  /** Drifte dans les grands virages pour charger des boosts. */
  drift?: boolean;
  /** Durée maximale de simulation (s). */
  limit?: number;
  events?: RaceEvents;
}

export interface RaceResult {
  finished: boolean;
  rank: number;
  total: number;
  lapTimes: number[];
  bestLap: number;
  /** Secondes simulées, compte à rebours compris. */
  simulated: number;
}

/** Commandes du robot pour ce pas : accélère, suit la route, drifte si demandé. */
export function botInput(r: Race, drift: boolean): void {
  const seg = findSeg(r.course, r.pos + PZ);
  const s = autoSteer(r, seg);
  const inp = r.input;
  inp.up = true;
  inp.down = false;
  inp.left = s < -0.15;
  inp.right = s > 0.15;
  inp.drift = drift && Math.abs(seg.curve) >= 3;
}

/** Pilote la course jusqu'à l'arrivée (ou la limite). */
export function drive(r: Race, { drift = false, limit = 600 }: BotOptions = {}): number {
  let t = 0;
  while ((r.phase === 'race' || r.phase === 'countdown') && t < limit) {
    botInput(r, drift);
    update(r, STEP);
    t += STEP;
  }
  return t;
}

/** Course complète du départ (compte à rebours compris) à l'arrivée. */
export function runRace(track: number, car: number, opts: BotOptions = {}): RaceResult {
  const r = createRace(track, car, opts.events);
  startCountdown(r);
  const simulated = drive(r, opts);
  return {
    finished: r.phase === 'finish',
    rank: r.player.finalRank,
    total: r.player.finalT,
    lapTimes: [...r.lapTimes],
    bestLap: r.bestLap,
    simulated,
  };
}
