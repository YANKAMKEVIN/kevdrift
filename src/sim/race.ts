/** Course : état, compte à rebours, pas de simulation, tours, arrivée. Pur et déterministe : testé sous Node. */
import { ACC, CARS, LAPS, MAXS, PZ } from './config.ts';
import type { Input, Phase, Player, Race, RaceEvents } from './types.ts';
import { buildTrack, findSeg, type Course } from './track.ts';
import { clamp, wrap } from './util.ts';
import { autoSteer, createRivals, progress, rankOf, updateRivals } from './ai.ts';
import { checkPad, moveLateral, offroadDrag, speedCap, startBoost, updateDrift, updateSpeed } from './physics.ts';
import { hitRivals, hitScenery } from './collision.ts';

/** Événements muets : la simulation tourne seule (tests, robot). */
export function silentEvents(): RaceEvents {
  return {
    bigMsg() {}, toast() {}, flash() {}, sfx() {}, finished() {}, results() {},
    resultsShown: () => false,
  };
}

const courses = new Map<number, Course>();
/** Circuit construit une seule fois par numéro (il n'est jamais modifié ensuite). */
export function courseFor(ti: number): Course {
  let c = courses.get(ti);
  if (!c) courses.set(ti, (c = buildTrack(ti)));
  return c;
}

export function emptyInput(): Input {
  return { up: false, down: false, left: false, right: false, drift: false };
}

function newPlayer(): Player {
  return { x: 0.5, speed: 0, drift: false, dDir: 0, charge: 0, boostT: 0, boostLvl: 0, padCD: 0, lean: 0, hitCD: 0, finalRank: 0, finalT: 0 };
}

export function createRace(track = 0, car = 0, events: RaceEvents = silentEvents()): Race {
  const course = courseFor(track);
  const r: Race = {
    course, car, phase: 'title', prevPhase: 'race', pos: 0, raceT: 0, lapT: 0, bestLap: Infinity, lap: 0,
    cd: 0, lastCd: 4, finishT: 0, shake: 0, skyX: 0, time: 0, lastRank: 8, rivals: [], lapTimes: [],
    player: newPlayer(), input: emptyInput(), autopilot: false, autoThrottle: false, events,
  };
  resetRace(r, track, car);
  return r;
}

/** Remet la grille de départ en place sur le circuit et avec la voiture donnés. */
export function resetRace(r: Race, track: number, car: number): void {
  r.course = courseFor(track);
  r.car = car;
  r.pos = 0; r.raceT = 0; r.lapT = 0; r.lap = 0; r.bestLap = Infinity; r.lapTimes = []; r.shake = 0;
  const P = r.player;
  P.x = 0.5; P.speed = 0; P.drift = false; P.charge = 0; P.boostT = 0; P.boostLvl = 0; P.padCD = 0; P.lean = 0; P.hitCD = 0;
  r.rivals = createRivals(r.course);
}

/** Lance le compte à rebours (3, 2, 1, GO). */
export function startCountdown(r: Race): void {
  r.phase = 'countdown';
  r.cd = 3.999;
  r.lastCd = 4;
  r.lastRank = 8;
}

/** Mode attraction de l'écran titre : la course se joue seule derrière le menu. */
export function attract(r: Race, track: number): void {
  resetRace(r, track, r.car);
  r.player.x = 0;
  r.player.speed = MAXS * 0.8;
  for (const o of r.rivals) o.speed = o.top * 0.8;
  r.phase = 'title';
}

export function pause(r: Race): boolean {
  if (r.phase !== 'race' && r.phase !== 'countdown') return false;
  r.prevPhase = r.phase;
  r.phase = 'pause';
  const inp = r.input;
  inp.up = inp.down = inp.left = inp.right = inp.drift = false;
  return true;
}

export function resume(r: Race): boolean {
  if (r.phase !== 'pause') return false;
  r.phase = r.prevPhase;
  return true;
}

function countdown(r: Race, dt: number): void {
  r.cd -= dt;
  const n = Math.ceil(r.cd);
  if (n !== r.lastCd && n > 0) {
    r.lastCd = n;
    r.events.bigMsg(String(n), n === 1 ? '#ffd23f' : '#fff');
    r.events.sfx('beep');
  }
  if (r.cd <= 0) {
    r.phase = 'race';
    r.events.bigMsg('GO!', '#19f0ff');
    r.events.sfx('go');
    // départ parfait : accélérateur enfoncé au GO
    if (r.input.up) startBoost(r, 1, 0.6);
  }
}

function finish(r: Race): void {
  r.phase = 'finish';
  r.finishT = 0;
  const rank = rankOf(r);
  const P = r.player;
  P.finalRank = rank;
  P.finalT = r.raceT;
  P.drift = false;
  r.events.bigMsg(rank === 1 ? 'VICTOIRE' : 'ARRIVÉE', rank === 1 ? '#ffd23f' : '#19f0ff');
  r.events.sfx(rank <= 3 ? 'win' : 'lap');
  r.events.flash(0.3);
  r.events.finished();
}

function crossLine(r: Race): void {
  r.lap++;
  r.lapTimes.push(r.lapT);
  r.bestLap = Math.min(r.bestLap, r.lapT);
  r.lapT = 0;
  if (r.lap >= LAPS) finish(r);
  else {
    const last = r.lap === LAPS - 1;
    r.events.sfx('lap');
    r.events.bigMsg(last ? 'DERNIER TOUR' : 'TOUR ' + (r.lap + 1), last ? '#ffd23f' : '#19f0ff');
  }
}

/** Un pas de simulation de durée dt (STEP en jeu). */
export function update(r: Race, dt: number): void {
  r.time += dt;
  const phase: Phase = r.phase;
  if (phase === 'pause') return;
  const racing = phase === 'race';
  const auto = phase === 'title' || phase === 'finish' || (r.autopilot && racing);
  if (phase === 'countdown') countdown(r, dt);
  const P = r.player;
  const pSeg = findSeg(r.course, r.pos + PZ);
  const sp = P.speed / MAXS;
  // `racing` garde la phase du début du pas : la voiture ne répond aux commandes qu'au pas qui suit le GO.
  let steer = 0;
  if (auto) steer = autoSteer(r, pSeg);
  else if (racing) {
    if (r.input.left) steer -= 1;
    if (r.input.right) steer += 1;
  }
  updateDrift(r, dt, steer, sp, racing);
  moveLateral(r, dt, steer, sp, pSeg, racing || auto);
  const cap = speedCap(r);
  updateSpeed(r, dt, sp, racing, auto);
  if (offroadDrag(r, dt)) hitScenery(r, pSeg);
  P.hitCD -= dt;
  P.padCD -= dt;
  checkPad(r, pSeg, racing);
  if (P.speed > cap) P.speed = Math.max(cap, P.speed - ACC * 1.4 * dt);
  P.speed = Math.max(0, P.speed);
  P.x = clamp(P.x, -2.1, 2.1);
  hitRivals(r);
  // avance
  const old = r.pos;
  r.pos = wrap(r.pos + dt * P.speed, r.course.length);
  if (r.phase !== 'countdown' && r.phase !== 'title') {
    r.raceT += dt;
    r.lapT += dt;
  }
  if (r.pos < old && r.phase !== 'title' && P.speed > 0 && racing) crossLine(r);
  r.skyX += dt * sp * pSeg.curve * 0.002 * (P.speed > 0 ? 1 : 0);
  if (r.phase !== 'countdown') updateRivals(r, dt);
  if (r.phase === 'finish') {
    r.finishT += dt;
    if (r.finishT > 2.2 && !r.events.resultsShown()) r.events.results();
  }
  if (racing) {
    const rank = rankOf(r);
    if (rank < r.lastRank && r.lap > 0) r.events.toast('+1 PLACE', '#3dff9a');
    r.lastRank = rank;
  }
  r.shake = Math.max(0, r.shake - dt * 1.8);
}

export { progress, rankOf, autoSteer };
export const carOf = (r: Race) => CARS[r.car];
