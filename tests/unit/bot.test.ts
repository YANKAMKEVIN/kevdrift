// Le robot joue des courses complètes sans navigateur, sur chaque circuit et avec chaque machine.
import { describe, expect, test } from 'vitest';
import { runRace } from '../../src/sim/bot.ts';
import { recorder } from './helpers.ts';
import { CARS, LAPS, TRACKS } from '../../src/sim/config.ts';

describe.each(TRACKS.map((t, i) => [t.name, i] as const))('%s', (_n, ti) => {
  test.each(CARS.map((c, i) => [c.name, i] as const))('course complète avec %s', (_c, ci) => {
    const ev = recorder();
    const res = runRace(ti, ci, { drift: true, events: ev });
    expect(res.finished).toBe(true);
    expect(res.lapTimes).toHaveLength(LAPS);
    expect(res.rank).toBeGreaterThanOrEqual(1);
    expect(res.rank).toBeLessThanOrEqual(8);
    expect(res.total).toBeGreaterThan(60);
    expect(res.total).toBeLessThan(400);
    expect(Math.abs(res.lapTimes.reduce((a, b) => a + b, 0) - res.total)).toBeLessThan(0.1);
    expect(res.bestLap).toBe(Math.min(...res.lapTimes));
    expect(ev.finishedCount).toBe(1);
    expect(ev.big).toContain('GO!');
    expect(ev.big).toContain('DERNIER TOUR');
  });
});

test('drifter dans les virages fait gagner du temps', () => {
  for (let ti = 0; ti < TRACKS.length; ti++) {
    expect(runRace(ti, 0, { drift: true }).total).toBeLessThan(runRace(ti, 0, { drift: false }).total);
  }
});

test('la limite de temps arrête la simulation avant l\'arrivée', () => {
  const res = runRace(0, 0, { limit: 30 });
  expect(res.finished).toBe(false);
  expect(res.simulated).toBeLessThanOrEqual(30.02);
});

test('le robot gagne sur le circuit facile', () => {
  expect(runRace(0, 0, { drift: true }).rank).toBe(1);
});
