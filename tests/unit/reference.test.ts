// Non-régression du pilotage : la simulation réécrite en TypeScript doit reproduire
// exactement les courses de la version 1.1.0 (JavaScript d'origine), enregistrées dans
// fixtures/reference-1.1.0.json : robot sur chaque circuit et chaque machine, et
// commandes pseudo-aléatoires (drift, frein, chocs, sorties de route).
import { describe, expect, test } from 'vitest';
import ref from './fixtures/reference-1.1.0.json' with { type: 'json' };
import { r6, startOn } from './helpers.ts';
import { botInput } from '../../src/sim/bot.ts';
import { update } from '../../src/sim/race.ts';
import { STEP } from '../../src/sim/config.ts';
import { rng } from '../../src/sim/util.ts';

describe('courses du robot identiques à la version 1.1.0', () => {
  for (const g of ref.bot) {
    test(`circuit ${g.track}, voiture ${g.car}, drift ${g.drift}`, () => {
      const r = startOn(g.track, g.car);
      let t = 0;
      while (r.phase === 'race' && t < 600) {
        botInput(r, g.drift);
        update(r, STEP);
        t += STEP;
      }
      expect(r.phase).toBe(g.state);
      expect(r6(r.raceT)).toBe(g.raceT);
      expect(r.lapTimes.map(r6)).toEqual(g.laps);
      expect(r.player.finalRank).toBe(g.rank);
      expect(r6(r.pos)).toBe(g.pos);
      expect(r.rivals.map(o => r6(o.d))).toEqual(g.rivals);
    });
  }
});

describe('commandes pseudo-aléatoires identiques à la version 1.1.0', () => {
  for (const g of ref.random) {
    test(`circuit ${g.track}`, () => {
      const R = rng(100 + g.track);
      const r = startOn(g.track, g.track % 3);
      const snaps: number[][] = [];
      let hold = { up: false, down: false, left: false, right: false, drift: false };
      for (let i = 0; i < 60 * 90; i++) {
        if (i % 20 === 0) hold = { up: R() < 0.85, down: R() < 0.1, left: R() < 0.3, right: R() < 0.3, drift: R() < 0.3 };
        Object.assign(r.input, hold);
        update(r, STEP);
        const P = r.player;
        if (i % 300 === 0) snaps.push([r6(r.pos), r6(P.x), r6(P.speed), r6(P.charge), r6(P.boostT), r.lap, ...r.rivals.map(o => r6(o.x))]);
      }
      expect(snaps).toEqual(g.snaps);
    });
  }
});
