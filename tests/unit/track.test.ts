import { describe, expect, test } from 'vitest';
import { buildTrack, findSeg, PAD_LEN, START_SEG } from '../../src/sim/track.ts';
import { SEG, TRACKS } from '../../src/sim/config.ts';

const KEYS = new Set(['tower0', 'tower1', 'tower2', 'bill0', 'bill1', 'bill2', 'bill3', 'lamp', 'palm', 'chevL', 'chevR', 'pylon', 'crystal', 'ring', 'pillar', 'gate']);

describe.each(TRACKS.map((t, i) => [t.name, i] as const))('circuit %s', (_name, i) => {
  const c = buildTrack(i);
  test('assez long, longueur cohérente', () => {
    expect(c.segs.length).toBeGreaterThan(1000);
    expect(c.length).toBe(c.segs.length * SEG);
  });
  test('se referme : retour à l\'altitude de départ', () => {
    expect(Math.abs(c.segs[c.segs.length - 1].y2)).toBeLessThan(1);
    expect(c.segs[0].y1).toBe(0);
  });
  test('segments continus (pas de marche)', () => {
    for (let k = 1; k < c.segs.length; k++) {
      expect(c.segs[k].y1).toBe(c.segs[k - 1].y2);
      expect(c.segs[k].z1).toBe(c.segs[k - 1].z2);
    }
  });
  test('ligne de départ sous la voiture et portique', () => {
    expect(c.segs[START_SEG].start && c.segs[START_SEG + 1].start).toBe(true);
    expect(c.segs.filter(s => s.start)).toHaveLength(2);
    expect(c.segs[START_SEG + 1].sprites.some(s => s.key === 'gate' && !s.col)).toBe(true);
  });
  test('plaques turbo : au moins 3, entières, sur des lignes droites', () => {
    const pads = c.segs.filter(s => s.pad !== null);
    expect(pads.length).toBeGreaterThanOrEqual(3 * PAD_LEN);
    expect(pads.length % PAD_LEN).toBe(0);
    expect(pads.every(s => s.curve === 0)).toBe(true);
    expect(pads.every(s => [-0.55, 0, 0.55].includes(s.pad as number))).toBe(true);
  });
  test('décor : clés connues, jamais d\'obstacle solide sur la route', () => {
    for (const s of c.segs) {
      for (const sp of s.sprites) {
        expect(KEYS.has(sp.key)).toBe(true);
        if (sp.col) expect(Math.abs(sp.off)).toBeGreaterThan(1);
      }
    }
  });
  test('flèches de virage du côté extérieur', () => {
    for (const s of c.segs) for (const sp of s.sprites) {
      if (sp.key === 'chevR') expect(sp.off).toBeLessThan(0);
      if (sp.key === 'chevL') expect(sp.off).toBeGreaterThan(0);
    }
  });
  test('findSeg boucle sur le circuit', () => {
    expect(findSeg(c, 0)).toBe(c.segs[0]);
    expect(findSeg(c, SEG * 3 + 1)).toBe(c.segs[3]);
    expect(findSeg(c, c.length + SEG)).toBe(c.segs[1]);
  });
});

test('même numéro, même circuit (graine)', () => {
  const a = buildTrack(1), b = buildTrack(1);
  expect(a.segs.map(s => `${s.curve}:${s.pad}:${s.sprites.length}`)).toEqual(b.segs.map(s => `${s.curve}:${s.pad}:${s.sprites.length}`));
});

test('les trois circuits sont différents', () => {
  const sig = TRACKS.map((_, i) => buildTrack(i).segs.length);
  expect(new Set(sig).size).toBeGreaterThan(1);
});

test('chaque circuit a son décor propre', () => {
  const has = (i: number, k: string) => buildTrack(i).segs.some(s => s.sprites.some(sp => sp.key === k));
  expect(has(0, 'lamp') && has(0, 'tower0')).toBe(true);
  expect(has(1, 'pylon') && !has(1, 'lamp')).toBe(true);
  expect(has(2, 'ring') && has(2, 'pillar')).toBe(true);
});
