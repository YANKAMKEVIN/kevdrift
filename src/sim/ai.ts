/** Rivaux : grille de départ, vitesse cible, élastique, évitement ; pilote automatique du joueur. */
import { CARU, MAXS, PZ, RIVALS } from './config.ts';
import type { Race, Rival } from './types.ts';
import { findSeg, type Course, type Seg } from './track.ts';
import { clamp, wrap } from './util.ts';

/** Grille de départ : les rivaux devant le joueur, en quinconce, du plus rapide au plus lent. */
export function createRivals(c: Course): Rival[] {
  return RIVALS.map((rv, k) => {
    const d = (7 - k) * 300;
    return {
      k, name: rv[0], col: rv[1], d, z: wrap(d + PZ, c.length),
      x: k % 2 ? 0.5 : -0.5, lane: k % 2 ? 0.5 : -0.5,
      speed: 0, top: MAXS * (c.track.diff - k * 0.022), steer: 0,
    };
  });
}

/** Profondeur relative à la voiture du joueur, dans (-L/2, L/2]. */
export function relZ(r: Race, z: number): number {
  let d = z - (r.pos + PZ);
  d = wrap(d, r.course.length);
  if (d > r.course.length / 2) d -= r.course.length;
  return d;
}

/** Distance totale parcourue par le joueur. */
export function progress(r: Race): number {
  return r.lap * r.course.length + r.pos;
}

/** Rang actuel du joueur (1 à 8). */
export function rankOf(r: Race): number {
  const p = progress(r);
  let n = 1;
  for (const o of r.rivals) if (o.d > p) n++;
  return n;
}

/** Pilote automatique : suit la corde du virage et contourne les rivaux devant. Renvoie le volant dans [-1, 1]. */
export function autoSteer(r: Race, seg: Seg): number {
  let target = clamp(-seg.curve * 0.1, -0.6, 0.6);
  for (const o of r.rivals) {
    const rz = relZ(r, o.z);
    if (rz > 0 && rz < 2400 && Math.abs(o.x - target) < CARU * 1.3) target = o.x > 0 ? o.x - CARU * 1.8 : o.x + CARU * 1.8;
  }
  return clamp((target - r.player.x) * 4, -1, 1);
}

/** Nouvelle trajectoire si une voiture plus lente est juste devant ; null sinon. */
function evade(r: Race, me: Rival, oz: number, ox: number, os: number): number | null {
  const d = wrap(oz - me.z, r.course.length);
  if (d < 1600 && os < me.speed && Math.abs(ox - me.x) < CARU * 1.4) {
    let goal = ox > me.x ? ox - CARU * 2 : ox + CARU * 2;
    if (goal < -0.85) goal = ox + CARU * 2;
    if (goal > 0.85) goal = ox - CARU * 2;
    return goal;
  }
  return null;
}

/** Un pas de simulation pour tous les rivaux (sans allocation). */
export function updateRivals(r: Race, dt: number): void {
  const p = progress(r);
  const playerZ = wrap(r.pos + PZ, r.course.length);
  for (const me of r.rivals) {
    const seg = findSeg(r.course, me.z);
    let tgt = me.top * (1 - Math.abs(seg.curve) * 0.018);
    if (r.phase === 'title') tgt *= 0.92;
    else {
      // élastique : attend un joueur distancé, rattrape un joueur trop loin devant
      const gap = me.d - p;
      if (gap > 3000) tgt *= 0.9;
      else if (gap < -4000) tgt *= 1.07;
    }
    me.speed += (tgt - me.speed) * dt * (me.speed < tgt ? 0.55 : 1.5);
    let goal = me.lane - seg.curve * 0.06;
    let found: number | null = null;
    for (const o of r.rivals) {
      if (o === me) continue;
      found = evade(r, me, o.z, o.x, o.speed);
      if (found !== null) break;
    }
    if (found === null) found = evade(r, me, playerZ, r.player.x, r.player.speed);
    if (found !== null) goal = found;
    me.steer = clamp((goal - me.x) * 3, -1, 1);
    me.x = clamp(me.x + me.steer * dt * 0.9, -0.9, 0.9);
    me.d += me.speed * dt;
    me.z = wrap(me.d + PZ, r.course.length);
  }
}
