import { describe, expect, test } from 'vitest';
import { recorder, run, startOn } from './helpers.ts';
import { update } from '../../src/sim/race.ts';
import { driftLevel, OFFROAD_X, speedCap } from '../../src/sim/physics.ts';
import { BOOST_TIME, CARS, DRIFT, MAXS, OFFLIM, PZ, STEP } from '../../src/sim/config.ts';
import { findSeg } from '../../src/sim/track.ts';
import type { Race } from '../../src/sim/types.ts';

/** Place la voiture sur une longue ligne droite sans plaque turbo. */
function onStraight(r: Race): void {
  const segs = r.course.segs;
  for (let i = 300; i < segs.length - 100; i++) {
    if (segs.slice(i - 10, i + 120).every(s => s.curve === 0 && s.pad === null)) {
      r.pos = i * 200 - PZ;
      for (const o of r.rivals) { o.d = -1e6; o.z = 0; }
      return;
    }
  }
  throw new Error('pas de ligne droite');
}

describe('niveaux de boost du drift', () => {
  test('seuils', () => {
    expect(driftLevel(0)).toBe(0);
    expect(driftLevel(DRIFT[0] - 0.01)).toBe(0);
    expect(driftLevel(DRIFT[0])).toBe(1);
    expect(driftLevel(DRIFT[1])).toBe(2);
    expect(driftLevel(DRIFT[2])).toBe(3);
    expect(driftLevel(DRIFT[2] + 5)).toBe(3);
  });
  test('durées croissantes', () => {
    expect(BOOST_TIME[1]).toBeLessThan(BOOST_TIME[2]);
    expect(BOOST_TIME[2]).toBeLessThan(BOOST_TIME[3]);
  });
});

describe('accélération et vitesse', () => {
  test('accélérer depuis l\'arrêt fait monter la vitesse', () => {
    const r = startOn(0); onStraight(r);
    r.player.speed = 0; r.input.up = true;
    run(r, 1);
    expect(r.player.speed).toBeGreaterThan(MAXS * 0.15);
  });
  test('la vitesse plafonne à la pointe de la machine', () => {
    for (let c = 0; c < CARS.length; c++) {
      const r = startOn(0, c); onStraight(r); r.player.x = 0;
      r.input.up = true;
      run(r, 12, rr => { rr.player.x = 0; rr.player.boostT = 0; });
      expect(r.player.speed).toBeLessThanOrEqual(MAXS * CARS[c].top + 1);
      expect(r.player.speed).toBeGreaterThan(MAXS * CARS[c].top * 0.9);
    }
  });
  test('la Comète Or va plus vite en pointe que le Spectre Cyan', () => {
    expect(CARS[2].top).toBeGreaterThan(CARS[1].top);
  });
  test('sans accélérateur, la voiture ralentit', () => {
    const r = startOn(0); onStraight(r);
    r.player.speed = MAXS * 0.8; r.player.x = 0;
    run(r, 1);
    expect(r.player.speed).toBeLessThan(MAXS * 0.7);
  });
  test('freiner ralentit beaucoup plus vite', () => {
    const r = startOn(0); onStraight(r);
    r.player.speed = MAXS; r.input.down = true;
    run(r, 0.5);
    expect(r.player.speed).toBeLessThan(MAXS * 0.6);
  });
  test('la vitesse n\'est jamais négative', () => {
    const r = startOn(0); onStraight(r);
    r.player.speed = 100; r.input.down = true;
    run(r, 2);
    expect(r.player.speed).toBe(0);
  });
  test('hors piste : on ralentit jusqu\'à un plancher', () => {
    const r = startOn(0); onStraight(r);
    r.player.speed = MAXS; r.input.up = true;
    run(r, 2, rr => { rr.player.x = 1.6; rr.player.hitCD = 1; });
    expect(r.player.speed).toBeLessThan(MAXS * 0.4);
    expect(r.player.speed).toBeGreaterThan(OFFLIM * 0.8);
  });
  test('le plafond tient compte du boost et de l\'arrivée', () => {
    const r = startOn(0);
    const base = speedCap(r);
    r.player.boostT = 1;
    expect(speedCap(r)).toBeCloseTo(base * 1.32);
    r.player.boostT = 0; r.phase = 'finish';
    expect(speedCap(r)).toBeCloseTo(base * 0.55);
  });
  test('mode tactile : accélération automatique, sauf en freinant', () => {
    const r = startOn(0); onStraight(r);
    r.autoThrottle = true;
    run(r, 1);
    expect(r.player.speed).toBeGreaterThan(MAXS * 0.15);
    const s = r.player.speed;
    r.input.down = true;
    run(r, 0.3);
    expect(r.player.speed).toBeLessThan(s);
  });
});

describe('direction', () => {
  test('gauche et droite déplacent la voiture', () => {
    const r = startOn(0); onStraight(r);
    r.player.speed = MAXS * 0.6; r.player.x = 0; r.input.left = true;
    run(r, 0.3);
    expect(r.player.x).toBeLessThan(-0.1);
    const r2 = startOn(0); onStraight(r2);
    r2.player.speed = MAXS * 0.6; r2.player.x = 0; r2.input.right = true;
    run(r2, 0.3);
    expect(r2.player.x).toBeGreaterThan(0.1);
  });
  test('à l\'arrêt, le volant ne déplace presque pas la voiture', () => {
    const r = startOn(0); onStraight(r);
    r.player.x = 0; r.input.left = true;
    update(r, STEP);
    expect(Math.abs(r.player.x)).toBeLessThan(0.01);
  });
  test('la Spectre Cyan tourne plus vite que la Comète Or', () => {
    const turn = (c: number) => {
      const r = startOn(0, c); onStraight(r);
      r.player.speed = MAXS * 0.6; r.player.x = 0; r.input.right = true;
      run(r, 0.2, rr => { rr.player.speed = MAXS * 0.6; });
      return r.player.x;
    };
    expect(turn(1)).toBeGreaterThan(turn(2));
  });
  test('les virages poussent la voiture vers l\'extérieur', () => {
    const r = startOn(0);
    const i = r.course.segs.findIndex(s => s.curve >= 4);
    r.pos = i * 200 - PZ + 1; r.player.x = 0; r.player.speed = MAXS;
    for (let k = 0; k < 10; k++) update(r, STEP);
    expect(r.player.x).toBeLessThan(0);
  });
  test('la voiture reste dans les limites latérales', () => {
    const r = startOn(0);
    r.player.speed = MAXS; r.input.left = true;
    run(r, 5);
    expect(r.player.x).toBeGreaterThanOrEqual(-2.1);
  });
  test('inclinaison qui suit le volant', () => {
    const r = startOn(0); onStraight(r);
    r.player.speed = MAXS * 0.5; r.input.right = true;
    run(r, 0.5);
    expect(r.player.lean).toBeGreaterThan(0.8);
  });
});

describe('drift et boosts', () => {
  test('un drift tenu longtemps puis relâché donne un ULTRA BOOST', () => {
    const ev = recorder();
    const r = startOn(0, 0, ev);
    const P = r.player;
    P.speed = MAXS * 0.9; r.input.up = true; r.input.left = true; r.input.drift = true;
    run(r, 3, rr => { rr.player.x = 0; rr.player.speed = Math.max(rr.player.speed, MAXS * 0.8); });
    expect(P.drift).toBe(true);
    expect(driftLevel(P.charge)).toBe(3);
    r.input.drift = false;
    update(r, STEP);
    expect(P.drift).toBe(false);
    expect(P.boostT).toBeGreaterThan(BOOST_TIME[3] - 0.1);
    expect(P.boostLvl).toBe(3);
    expect(ev.toasts).toContain('ULTRA BOOST !');
    expect(ev.sounds).toContain('hop');
    expect(ev.sounds).toContain('boost');
  });
  test('un drift court donne un petit BOOST', () => {
    const ev = recorder();
    const r = startOn(0, 0, ev);
    r.player.speed = MAXS * 0.9; r.input.up = true; r.input.left = true; r.input.drift = true;
    run(r, 0.62, rr => { rr.player.x = 0; });
    r.input.drift = false;
    update(r, STEP);
    expect(ev.toasts).toContain('BOOST !');
    expect(r.player.boostLvl).toBe(1);
  });
  test('un drift trop court ne donne rien', () => {
    const ev = recorder();
    const r = startOn(0, 0, ev);
    r.player.speed = MAXS * 0.9; r.input.left = true; r.input.drift = true;
    run(r, 0.2, rr => { rr.player.x = 0; });
    r.input.drift = false;
    update(r, STEP);
    expect(r.player.boostT).toBe(0);
    expect(ev.toasts).toHaveLength(0);
  });
  test('pas de drift à l\'arrêt ni sans tourner', () => {
    const r = startOn(0);
    r.input.left = true; r.input.drift = true;
    run(r, 1);
    expect(r.player.drift).toBe(false);
    const r2 = startOn(0);
    r2.player.speed = MAXS; r2.input.drift = true; r2.input.up = true;
    run(r2, 0.5);
    expect(r2.player.drift).toBe(false);
  });
  test('le drift s\'arrête si la voiture ralentit trop', () => {
    const r = startOn(0); onStraight(r);
    r.player.speed = MAXS * 0.9; r.input.left = true; r.input.drift = true;
    update(r, STEP);
    expect(r.player.drift).toBe(true);
    r.player.speed = MAXS * 0.2;
    update(r, STEP);
    expect(r.player.drift).toBe(false);
  });
  test('contre-braquer charge moins vite', () => {
    const charge = (counter: boolean) => {
      const r = startOn(0); onStraight(r);
      r.player.speed = MAXS * 0.9; r.input.up = true; r.input.left = true; r.input.drift = true;
      update(r, STEP);
      r.input.left = !counter; r.input.right = counter;
      run(r, 0.5, rr => { rr.player.x = 0; rr.player.speed = MAXS * 0.9; });
      return r.player.charge;
    };
    expect(charge(true)).toBeLessThan(charge(false));
  });
  test('la maniabilité accélère la charge du drift', () => {
    const charge = (c: number) => {
      const r = startOn(0, c); onStraight(r);
      r.player.speed = MAXS * 0.9; r.input.left = true; r.input.drift = true;
      run(r, 0.5, rr => { rr.player.x = 0; rr.player.speed = MAXS * 0.9; });
      return r.player.charge;
    };
    expect(charge(1)).toBeGreaterThan(charge(2));
  });
  test('le boost pousse au-delà de la pointe normale', () => {
    const r = startOn(0); onStraight(r);
    r.player.x = 0; r.player.speed = MAXS * CARS[0].top; r.player.boostT = 1; r.input.up = true;
    run(r, 0.5, rr => { rr.player.x = 0; });
    expect(r.player.speed).toBeGreaterThan(MAXS * CARS[0].top * 1.05);
  });
});

describe('plaques turbo', () => {
  test('rouler sur une plaque donne un TURBO, une seule fois par plaque', () => {
    const ev = recorder();
    const r = startOn(0, 0, ev);
    const i = r.course.segs.findIndex(s => s.pad !== null);
    const lane = r.course.segs[i].pad as number;
    r.pos = i * 200 - PZ + 1; r.player.x = lane; r.player.speed = MAXS * 0.5;
    update(r, STEP);
    expect(r.player.boostT).toBeGreaterThan(0.9);
    expect(r.player.boostLvl).toBe(2);
    expect(ev.toasts.filter(t => t === 'TURBO !')).toHaveLength(1);
    run(r, 0.3, rr => { rr.player.x = lane; });
    expect(ev.toasts.filter(t => t === 'TURBO !')).toHaveLength(1);
  });
  test('à côté de la plaque, pas de turbo', () => {
    const r = startOn(0);
    const i = r.course.segs.findIndex(s => s.pad !== null);
    const lane = r.course.segs[i].pad as number;
    r.pos = i * 200 - PZ + 1; r.player.x = lane + 0.6; r.player.speed = MAXS * 0.5;
    update(r, STEP);
    expect(r.player.boostT).toBe(0);
  });
  test('le segment sous la voiture est bien celui de la plaque', () => {
    const r = startOn(0);
    const i = r.course.segs.findIndex(s => s.pad !== null);
    r.pos = i * 200 - PZ + 1;
    expect(findSeg(r.course, r.pos + PZ).i).toBe(i);
  });
});

test('OFFROAD_X : la route s\'arrête un peu après les bords', () => {
  expect(OFFROAD_X).toBeGreaterThan(1);
  expect(OFFROAD_X).toBeLessThan(1.2);
});
