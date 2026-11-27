/** Pilotage du joueur : direction, drift et boosts, vitesse, plaques turbo. */
import { ACC, BOOST_TIME, BOOSTC, BRAKE, CARS, DECEL, DRIFT, MAXS, OFFDECEL, OFFLIM } from './config.ts';
import type { Race } from './types.ts';
import type { Seg } from './track.ts';

/** Limite latérale au-delà de laquelle la voiture roule hors de la route. */
export const OFFROAD_X = 1.08;
const BOOST_NAMES = ['', 'BOOST !', 'SUPER BOOST !', 'ULTRA BOOST !'];

/** Niveau de boost gagné par une charge de drift (0 rien, 1 BOOST, 2 SUPER, 3 ULTRA). */
export function driftLevel(c: number): number {
  return c >= DRIFT[2] ? 3 : c >= DRIFT[1] ? 2 : c >= DRIFT[0] ? 1 : 0;
}

export function startBoost(r: Race, lvl: number, dur: number): void {
  const P = r.player;
  P.boostT = Math.max(P.boostT, dur);
  P.boostLvl = lvl;
  P.speed = Math.min(P.speed + MAXS * 0.05 * lvl, MAXS * 1.45);
  r.events.sfx('boost');
  r.events.flash(0.12 + lvl * 0.05);
  r.shake = Math.max(r.shake, 0.25);
}

/** Drift : démarrage, charge, et boost au relâchement. */
export function updateDrift(r: Race, dt: number, steer: number, sp: number, racing: boolean): void {
  const P = r.player;
  const C = CARS[r.car];
  const driftKey = racing && r.input.drift;
  if (driftKey && !P.drift && steer !== 0 && sp > 0.35) {
    P.drift = true;
    P.dDir = Math.sign(steer);
    P.charge = 0;
    r.events.sfx('hop');
  }
  if (!P.drift) return;
  if (!driftKey || sp < 0.25) {
    const lvl = driftLevel(P.charge);
    P.drift = false;
    if (lvl && racing) {
      startBoost(r, lvl, BOOST_TIME[lvl]);
      r.events.toast(BOOST_NAMES[lvl], BOOSTC[lvl]);
    }
    P.charge = 0;
  } else {
    P.charge += dt * (steer === P.dDir ? 1.3 : 0.6) * C.hand;
  }
}

/** Déplacement latéral : volant, glisse du drift, force centrifuge des virages. */
export function moveLateral(r: Race, dt: number, steer: number, sp: number, seg: Seg, active: boolean): void {
  const P = r.player;
  const C = CARS[r.car];
  const dx = dt * 2.1 * Math.min(1, sp + 0.05);
  if (active) {
    if (P.drift) P.x += (P.dDir * 0.32 + steer * 0.6) * dx * 1.15 * C.hand;
    else P.x += steer * dx * C.hand;
    P.x -= dx * sp * seg.curve * (P.drift ? 0.17 : 0.3);
  }
  P.lean = P.lean + ((P.drift ? P.dDir * 1.2 : steer) - P.lean) * 0.18;
}

/** Vitesse : boost, frein, accélérateur, roue libre, frottement du drift. */
export function updateSpeed(r: Race, dt: number, sp: number, racing: boolean, auto: boolean): void {
  const P = r.player;
  const C = CARS[r.car];
  const inp = r.input;
  const thr = r.phase === 'countdown' ? 0 : auto ? 1 : inp.up || (r.autoThrottle && !inp.down) ? 1 : 0;
  if (P.boostT > 0) {
    P.boostT -= dt;
    P.speed += ACC * 2.4 * dt;
  } else if (racing && inp.down) P.speed -= BRAKE * dt;
  else if (thr) P.speed += ACC * C.accel * dt * (1 - 0.45 * sp);
  else P.speed -= DECEL * dt;
  if (P.drift) P.speed -= ACC * 0.1 * dt;
}

/** Hors de la route : la voiture ralentit jusqu'à un plancher. */
export function offroadDrag(r: Race, dt: number): boolean {
  const P = r.player;
  if (Math.abs(P.x) <= OFFROAD_X) return false;
  if (P.speed > OFFLIM) P.speed -= OFFDECEL * dt;
  return true;
}

/** Plaque turbo sous la voiture. */
export function checkPad(r: Race, seg: Seg, racing: boolean): void {
  const P = r.player;
  if (seg.pad !== null && Math.abs(P.x - seg.pad) < 0.3 && P.padCD <= 0 && r.phase !== 'countdown') {
    startBoost(r, 2, 1.1);
    P.padCD = 1;
    if (racing) r.events.toast('TURBO !', '#ffd23f');
  }
}

/** Plafond de vitesse : machine, boost, ralenti après l'arrivée. */
export function speedCap(r: Race): number {
  const P = r.player;
  return MAXS * CARS[r.car].top * (P.boostT > 0 ? 1.32 : 1) * (r.phase === 'finish' ? 0.55 : 1);
}
