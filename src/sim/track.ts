/** Construction du circuit en segments (pseudo-3D). Pur : aucune image, aucun DOM. */
import { PZ, SEG, TRACKS, type Track } from './config.ts';
import { easeIn, easeInOut, lerp, rng, wrap } from './util.ts';

/** Clés des images de décor ; le rendu les traduit en images (render/sprites-deco.ts). */
export type SpriteKey =
  | 'tower0' | 'tower1' | 'tower2' | 'bill0' | 'bill1' | 'bill2' | 'bill3'
  | 'lamp' | 'palm' | 'chevL' | 'chevR' | 'pylon' | 'crystal' | 'ring' | 'pillar' | 'gate';

/** Un élément de décor posé sur un segment : décalage latéral (en demi-largeurs de route), largeur, collision. */
export interface SpriteRef {
  key: SpriteKey;
  off: number;
  w: number;
  col: boolean;
}

/** Un segment de route : altitude et profondeur à ses deux bords, courbure, décor. */
export interface Seg {
  i: number;
  y1: number;
  y2: number;
  z1: number;
  z2: number;
  curve: number;
  sprites: SpriteRef[];
  /** Position latérale de la plaque turbo, ou null. */
  pad: number | null;
  stripe: number;
  start: boolean;
}

export interface Course {
  index: number;
  track: Track;
  segs: Seg[];
  length: number;
}

const TOWERS: readonly SpriteKey[] = ['tower0', 'tower1', 'tower2'];
const BILLS: readonly SpriteKey[] = ['bill0', 'bill1', 'bill2', 'bill3'];
/** Longueur d'une plaque turbo (segments). */
export const PAD_LEN = 6;

function lastY(segs: Seg[]): number {
  return segs.length ? segs[segs.length - 1].y2 : 0;
}

function addSeg(segs: Seg[], curve: number, y: number): void {
  const n = segs.length;
  segs.push({
    i: n, y1: lastY(segs), y2: y, z1: n * SEG, z2: (n + 1) * SEG, curve,
    sprites: [], pad: null, stripe: Math.floor(n / 3) % 2, start: false,
  });
}

/** Entrée progressive, tenue, puis sortie d'une courbe, avec dénivelé lissé. */
function addRoad(segs: Seg[], e: number, h: number, l: number, curve: number, y: number): void {
  const sy = lastY(segs);
  const ey = sy + y * SEG;
  const tot = e + h + l;
  for (let n = 0; n < e; n++) addSeg(segs, easeIn(0, curve, n / e), easeInOut(sy, ey, n / tot));
  for (let n = 0; n < h; n++) addSeg(segs, curve, easeInOut(sy, ey, (e + n) / tot));
  for (let n = 0; n < l; n++) addSeg(segs, lerp(curve, 0, n / l), easeInOut(sy, ey, (e + h + n) / tot));
}

/** Index du segment de départ (sous la voiture du joueur au départ). */
export const START_SEG = Math.floor(PZ / SEG);

/** Construit le circuit n° ti : même numéro, même circuit (graine). */
export function buildTrack(ti: number): Course {
  const track = TRACKS[ti];
  const segs: Seg[] = [];
  for (const [n, c, hh] of track.layout) {
    const e = Math.round(n * 0.25);
    addRoad(segs, e, n - 2 * e, e, c, hh);
  }
  // retour à l'altitude de départ
  addRoad(segs, 30, 40, 30, 0, -lastY(segs) / SEG);
  const N = segs.length;
  const R = rng(track.seed);
  const add = (i: number, key: SpriteKey, off: number, w: number, col = true): void => {
    segs[wrap(i, N)].sprites.push({ key, off, w, col });
  };
  segs[START_SEG].start = true;
  segs[START_SEG + 1].start = true;
  add(START_SEG + 1, 'gate', 0, 4900, false);
  // L'ordre des tirages R() est celui de la version d'origine : le décor reste identique.
  for (let i = 20; i < N - 10; i++) {
    const s = segs[i];
    if (track.deco === 'city') {
      if (i % 8 === 0) { add(i, 'lamp', -1.18, 260); add(i, 'lamp', 1.18, 260); }
      if (i % 14 === 3) { const k = TOWERS[(R() * 3) | 0]; add(i, k, -(2.6 + R() * 2.4), 1700); }
      if (i % 14 === 10) { const k = TOWERS[(R() * 3) | 0]; add(i, k, 2.6 + R() * 2.4, 1700); }
      if (i % 90 === 45) { const k = BILLS[(R() * 4) | 0]; add(i, k, R() < 0.5 ? -1.9 : 1.9, 1800); }
      if (i % 22 === 11) add(i, 'palm', R() < 0.5 ? -1.6 : 1.6, 1300);
    } else if (track.deco === 'desert') {
      if (i % 30 === 0) { add(i, 'pylon', -1.5, 1500); add(i, 'pylon', 1.5, 1500); }
      if (i % 11 === 5) add(i, 'crystal', (R() < 0.5 ? -1 : 1) * (1.8 + R() * 3), 900);
      if (i % 17 === 8) add(i, 'palm', (R() < 0.5 ? -1 : 1) * (2 + R() * 2.5), 1300);
      if (i % 100 === 60) { const k = BILLS[(R() * 4) | 0]; add(i, k, R() < 0.5 ? -2 : 2, 1800); }
    } else {
      if (i % 10 === 0) { add(i, 'pillar', -1.2, 380); add(i, 'pillar', 1.2, 380); }
      if (i % 40 === 20) add(i, 'ring', 0, 4600, false);
      if (i % 13 === 6) add(i, 'crystal', (R() < 0.5 ? -1 : 1) * (2.2 + R() * 3), 1000);
      if (i % 110 === 70) { const k = BILLS[(R() * 4) | 0]; add(i, k, R() < 0.5 ? -2.1 : 2.1, 1800); }
    }
    if (Math.abs(s.curve) >= 2.5 && i % 7 === 0) add(i, s.curve > 0 ? 'chevR' : 'chevL', s.curve > 0 ? -1.32 : 1.32, 620);
  }
  // plaques turbo, entièrement sur les lignes droites
  const straight = (j: number): boolean => {
    for (let k = j; k < Math.min(N, j + PAD_LEN); k++) if (segs[k].curve !== 0) return false;
    return true;
  };
  for (let i = 260; i < N - 60; i += 230) {
    let j = i;
    while (j < N - 60 && !straight(j)) j++;
    if (j >= N - 60) break;
    const lane = [-0.55, 0, 0.55][(R() * 3) | 0];
    for (let k = 0; k < PAD_LEN; k++) segs[j + k].pad = lane;
    i = j;
  }
  return { index: ti, track, segs, length: N * SEG };
}

/** Segment à la profondeur z (bouclée sur le circuit). */
export function findSeg(c: Course, z: number): Seg {
  return c.segs[Math.floor(z / SEG) % c.segs.length];
}
