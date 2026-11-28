import { describe, expect, test } from 'vitest';
import { run, startOn } from './helpers.ts';
import { autoSteer, createRivals, progress, rankOf, updateRivals } from '../../src/sim/ai.ts';
import { courseFor, createRace, update } from '../../src/sim/race.ts';
import { CARU, FIELD, MAXS, PZ, RIVALS, STEP } from '../../src/sim/config.ts';
import { findSeg } from '../../src/sim/track.ts';

describe('grille de départ', () => {
  test('7 rivaux devant le joueur, en quinconce', () => {
    const rv = createRivals(courseFor(0));
    expect(rv).toHaveLength(RIVALS.length);
    expect(rv.length + 1).toBe(FIELD);
    rv.forEach((o, k) => {
      expect(o.d).toBe((7 - k) * 300);
      expect(Math.abs(o.x)).toBe(0.5);
      expect(o.speed).toBe(0);
      expect(o.name).toBe(RIVALS[k][0]);
    });
    expect(rv[0].x).toBe(-rv[1].x);
  });
  test('les rivaux sont plus rapides sur les circuits difficiles', () => {
    const easy = createRivals(courseFor(0))[0].top, hard = createRivals(courseFor(2))[0].top;
    expect(hard).toBeGreaterThan(easy);
  });
  test('le premier rival est le plus rapide', () => {
    const rv = createRivals(courseFor(1));
    for (let k = 1; k < rv.length; k++) expect(rv[k].top).toBeLessThan(rv[k - 1].top);
  });
  test('au départ, le joueur est dernier', () => {
    expect(rankOf(startOn(0))).toBe(FIELD);
  });
});

describe('conduite des rivaux', () => {
  test('ils accélèrent vers leur vitesse cible', () => {
    const r = startOn(0);
    run(r, 5);
    for (const o of r.rivals) expect(o.speed).toBeGreaterThan(o.top * 0.5);
  });
  test('ils avancent et restent sur la route', () => {
    const r = startOn(1);
    const d0 = r.rivals.map(o => o.d);
    run(r, 30, rr => { rr.input.up = true; });
    r.rivals.forEach((o, k) => {
      expect(o.d).toBeGreaterThan(d0[k] + 10000);
      expect(Math.abs(o.x)).toBeLessThanOrEqual(0.9);
    });
  });
  test('élastique : un rival loin devant ralentit', () => {
    const r = startOn(0);
    const o = r.rivals[0];
    o.speed = o.top; o.d = progress(r) + 10000; o.z = (o.d + PZ) % r.course.length;
    const seg = findSeg(r.course, o.z);
    updateRivals(r, STEP);
    expect(o.speed).toBeLessThan(o.top * (1 - Math.abs(seg.curve) * 0.018));
  });
  test('élastique : un rival loin derrière accélère au-delà de sa pointe', () => {
    const r = startOn(0);
    r.pos = 50000;
    const o = r.rivals[0];
    o.d = 0; o.z = PZ; o.speed = o.top;
    for (let k = 0; k < 200; k++) { o.d = 0; o.z = PZ; updateRivals(r, STEP); }
    expect(o.speed).toBeGreaterThan(o.top);
  });
  test('ils contournent une voiture plus lente devant eux', () => {
    const r = startOn(0);
    const [a, b] = r.rivals;
    b.z = 20000; b.d = b.z - PZ; b.x = 0; b.speed = 1000; b.lane = 0;
    a.z = 19500; a.d = a.z - PZ; a.x = 0; a.speed = MAXS; a.lane = 0;
    for (const o of r.rivals.slice(2)) { o.z = 60000; o.d = o.z - PZ; }
    for (let k = 0; k < 30; k++) {
      a.z = 19500; a.d = a.z - PZ; b.z = 20000; b.d = b.z - PZ; b.speed = 1000;
      updateRivals(r, STEP);
    }
    expect(Math.abs(a.x - b.x)).toBeGreaterThan(CARU);
  });
  test('ils contournent aussi le joueur', () => {
    const r = startOn(0);
    r.pos = 10000; r.player.x = 0; r.player.speed = 0;
    const a = r.rivals[0];
    a.z = r.pos + PZ - 800; a.d = a.z - PZ; a.x = 0; a.lane = 0; a.speed = MAXS;
    for (const o of r.rivals.slice(1)) { o.z = 60000; o.d = o.z - PZ; }
    for (let k = 0; k < 30; k++) {
      a.z = r.pos + PZ - 800; a.d = a.z - PZ;
      updateRivals(r, STEP);
    }
    expect(Math.abs(a.x)).toBeGreaterThan(CARU);
  });
  test('à l\'écran titre, ils roulent un peu moins vite', () => {
    const r = createRace(0, 0);
    r.phase = 'title';
    const o = r.rivals[0];
    for (let k = 0; k < 2000; k++) updateRivals(r, STEP);
    expect(o.speed).toBeLessThan(o.top * 0.93);
  });
});

describe('pilote automatique', () => {
  test('le volant reste dans [-1, 1]', () => {
    const r = startOn(2);
    for (const s of r.course.segs) {
      const v = autoSteer(r, s);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
  test('il vise l\'intérieur du virage', () => {
    const r = startOn(0);
    r.player.x = 0;
    for (const o of r.rivals) o.z = 0;
    expect(autoSteer(r, { ...r.course.segs[0], curve: 5 })).toBeLessThan(0);
    expect(autoSteer(r, { ...r.course.segs[0], curve: -5 })).toBeGreaterThan(0);
  });
  test('il évite un rival juste devant sur sa trajectoire', () => {
    const r = startOn(0);
    r.pos = 10000; r.player.x = 0;
    const seg = { ...r.course.segs[0], curve: 0 };
    for (const o of r.rivals) { o.z = 0; o.x = 0.9; }
    const free = autoSteer(r, seg);
    r.rivals[0].z = r.pos + PZ + 500; r.rivals[0].x = 0;
    expect(autoSteer(r, seg)).not.toBe(free);
  });
  test('en démo ou avec ?robot, la voiture roule seule jusqu\'à l\'arrivée', () => {
    const r = startOn(0);
    r.autopilot = true;
    for (let t = 0; t < 400 && r.phase === 'race'; t += STEP) update(r, STEP);
    expect(r.phase).toBe('finish');
  });
});

describe('classement', () => {
  test('le rang suit la progression', () => {
    const r = startOn(0);
    for (const o of r.rivals) o.d = -1;
    expect(rankOf(r)).toBe(1);
    r.rivals[3].d = progress(r) + 10;
    expect(rankOf(r)).toBe(2);
  });
  test('progress compte les tours', () => {
    const r = startOn(0);
    r.lap = 2; r.pos = 100;
    expect(progress(r)).toBe(2 * r.course.length + 100);
  });
  test('rang toujours entre 1 et 8 pendant une course', () => {
    const r = startOn(1);
    run(r, 60, rr => {
      rr.input.up = true;
      const k = rankOf(rr);
      expect(k).toBeGreaterThanOrEqual(1);
      expect(k).toBeLessThanOrEqual(FIELD);
    });
    update(r, STEP);
  });
});
