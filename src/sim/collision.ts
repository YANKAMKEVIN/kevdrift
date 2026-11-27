/** Collisions : décor en bord de route et voitures rivales. */
import { CARU, CARW, MAXS, RW, SEG } from './config.ts';
import type { Race } from './types.ts';
import type { Seg } from './track.ts';
import { wrap } from './util.ts';
import { relZ } from './ai.ts';

/** Choc contre un élément de décor (seulement hors de la route). Vrai s'il y a eu choc. */
export function hitScenery(r: Race, seg: Seg): boolean {
  const P = r.player;
  if (P.hitCD > 0) return false;
  for (const s of seg.sprites) {
    if (!s.col) continue;
    const sw = s.w / RW;
    if (Math.abs(P.x - s.off) < (CARU + sw * 0.5) * 0.5) {
      P.speed = Math.min(P.speed, MAXS / 5);
      r.pos = wrap(r.pos - SEG * 0.6, r.course.length);
      P.x += s.off > P.x ? -0.15 : 0.15;
      r.events.sfx('bump');
      r.shake = 0.6;
      P.hitCD = 0.5;
      P.drift = false;
      P.charge = 0;
      return true;
    }
  }
  return false;
}

/** Contacts avec les rivaux : on ne traverse pas une voiture plus lente, on la pousse un peu. */
export function hitRivals(r: Race): void {
  const P = r.player;
  for (const o of r.rivals) {
    const rz = relZ(r, o.z);
    if (Math.abs(P.x - o.x) >= CARU * 0.85) continue;
    if (rz > -60 && rz < CARW * 0.75 && P.speed > o.speed) {
      P.speed = o.speed * 0.88;
      P.x += P.x < o.x ? -0.06 : 0.06;
      o.x += P.x < o.x ? 0.05 : -0.05;
      if (P.hitCD <= 0) {
        r.events.sfx('bump');
        r.shake = 0.4;
        P.hitCD = 0.35;
      }
    } else if (rz < 0 && rz > -CARW * 0.6 && o.speed > P.speed) {
      o.speed = P.speed * 0.92;
    }
  }
}
