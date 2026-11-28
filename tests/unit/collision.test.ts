import { describe, expect, test } from 'vitest';
import { recorder, startOn } from './helpers.ts';
import { hitRivals, hitScenery } from '../../src/sim/collision.ts';
import { update } from '../../src/sim/race.ts';
import { CARU, MAXS, PZ, SEG, STEP } from '../../src/sim/config.ts';
import { relZ } from '../../src/sim/ai.ts';
import type { Race } from '../../src/sim/types.ts';

/** Segment avec un élément de décor solide ; la voiture est posée dessus, au bord. */
function nearSolid(r: Race) {
  const i = r.course.segs.findIndex((s, k) => k > 50 && s.sprites.some(sp => sp.col));
  const sp = r.course.segs[i].sprites.find(x => x.col)!;
  r.pos = i * SEG - PZ + 1;
  return { seg: r.course.segs[i], sp };
}

/** Un rival juste devant le joueur, même voie. */
function rivalAhead(r: Race, dz: number, speed: number) {
  const o = r.rivals[0];
  r.pos = 5000;
  o.z = r.pos + PZ + dz;
  o.d = o.z - PZ;
  o.x = r.player.x;
  o.speed = speed;
  for (const other of r.rivals.slice(1)) { other.z = (r.pos + 40000) % r.course.length; other.x = -0.9; }
  return o;
}

describe('décor', () => {
  test('foncer dans un obstacle : choc, ralentissement, recul, son, secousse', () => {
    const ev = recorder();
    const r = startOn(0, 0, ev);
    const { seg, sp } = nearSolid(r);
    r.player.x = sp.off; r.player.speed = MAXS; r.player.drift = true; r.player.charge = 2;
    const pos = r.pos;
    expect(hitScenery(r, seg)).toBe(true);
    expect(r.player.speed).toBeLessThanOrEqual(MAXS / 5);
    expect(r.pos).toBeLessThan(pos);
    expect(r.player.drift).toBe(false);
    expect(r.player.charge).toBe(0);
    expect(r.shake).toBeGreaterThan(0.5);
    expect(ev.sounds).toContain('bump');
  });
  test('après un choc, un court répit sans nouveau choc', () => {
    const r = startOn(0);
    const { seg, sp } = nearSolid(r);
    r.player.x = sp.off;
    expect(hitScenery(r, seg)).toBe(true);
    r.player.x = sp.off;
    expect(hitScenery(r, seg)).toBe(false);
  });
  test('le choc écarte la voiture de l\'obstacle', () => {
    const r = startOn(0);
    const { seg, sp } = nearSolid(r);
    r.player.x = sp.off - 0.05;
    hitScenery(r, seg);
    expect(r.player.x).toBeCloseTo(sp.off - 0.2);
  });
  test('loin de l\'obstacle, pas de choc', () => {
    const r = startOn(0);
    const { seg, sp } = nearSolid(r);
    r.player.x = sp.off > 0 ? sp.off - 0.8 : sp.off + 0.8;
    expect(hitScenery(r, seg)).toBe(false);
  });
  test('sur la route, le décor ne gêne jamais', () => {
    const r = startOn(0);
    nearSolid(r);
    r.player.x = 0; r.player.speed = MAXS;
    update(r, STEP);
    expect(r.player.speed).toBeGreaterThan(MAXS * 0.9);
  });
});

describe('rivaux', () => {
  test('rattraper un rival plus lent : on ne le traverse pas', () => {
    const ev = recorder();
    const r = startOn(0, 0, ev);
    r.player.x = 0; r.player.speed = MAXS;
    const o = rivalAhead(r, 100, MAXS * 0.5);
    hitRivals(r);
    expect(r.player.speed).toBeCloseTo(o.speed * 0.88);
    expect(ev.sounds).toContain('bump');
  });
  test('le contact écarte les deux voitures', () => {
    const r = startOn(0);
    r.player.x = 0; r.player.speed = MAXS;
    const o = rivalAhead(r, 100, MAXS * 0.5);
    o.x = 0.05;
    hitRivals(r);
    expect(r.player.x).toBeLessThan(0);
    expect(o.x).toBeGreaterThan(0.05);
  });
  test('rival sur une autre voie : aucun contact', () => {
    const r = startOn(0);
    r.player.x = -0.5; r.player.speed = MAXS;
    const o = rivalAhead(r, 100, MAXS * 0.5);
    o.x = 0.5;
    hitRivals(r);
    expect(r.player.speed).toBe(MAXS);
  });
  test('rival trop loin devant : aucun contact', () => {
    const r = startOn(0);
    r.player.x = 0; r.player.speed = MAXS;
    rivalAhead(r, 2000, MAXS * 0.5);
    hitRivals(r);
    expect(r.player.speed).toBe(MAXS);
  });
  test('un rival plus rapide juste derrière freine au lieu de traverser', () => {
    const r = startOn(0);
    r.player.x = 0; r.player.speed = MAXS * 0.5;
    const o = rivalAhead(r, -100, MAXS);
    hitRivals(r);
    expect(o.speed).toBeCloseTo(MAXS * 0.5 * 0.92);
  });
  test('relZ : devant positif, derrière négatif', () => {
    const r = startOn(0);
    r.pos = 5000;
    expect(relZ(r, r.pos + PZ + 300)).toBeCloseTo(300);
    expect(relZ(r, r.pos + PZ - 300)).toBeCloseTo(-300);
    expect(Math.abs(relZ(r, r.pos + PZ + r.course.length))).toBeLessThan(1e-6);
  });
  test('la largeur de contact est celle d\'une voiture', () => {
    expect(CARU).toBeGreaterThan(0.2);
    expect(CARU).toBeLessThan(0.3);
  });
});
