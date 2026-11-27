import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etat, P, inp, startOn, drive } from './helpers.mjs';
import { update, driftLevel, progress } from '../../src/race.js';
import { buildTrack } from '../../src/track.js';
import { TRACKS, SEG, STEP, LAPS, MAXS, DRIFT, BOOST_TIME } from '../../src/config.js';
import { fx } from '../../src/state.js';

test('chaque circuit se referme (retour à l\'altitude de départ) et a une ligne de départ', () => {
  TRACKS.forEach((_, i) => {
    buildTrack(i);
    const segs = etat.segs;
    assert.ok(segs.length > 1000, `circuit ${i} trop court`);
    assert.equal(etat.trackLen, segs.length * SEG);
    assert.ok(Math.abs(segs[segs.length - 1].p2.w.y) < 1, `circuit ${i} ne se referme pas`);
    assert.ok(segs.some(s => s.start));
    const pads = segs.filter(s => s.pad !== null);
    assert.ok(pads.length >= 6, `circuit ${i} : plaques de boost`);
    assert.ok(pads.every(s => s.curve === 0), 'les plaques sont en ligne droite');
  });
});

test('même circuit, même construction (graine)', () => {
  buildTrack(1); const a = etat.segs.map(s => s.curve + ':' + s.pad).join();
  buildTrack(1); const b = etat.segs.map(s => s.curve + ':' + s.pad).join();
  assert.equal(a, b);
});

test('niveaux de boost du drift', () => {
  assert.equal(driftLevel(0), 0); assert.equal(driftLevel(DRIFT[0] - .01), 0);
  assert.equal(driftLevel(DRIFT[0]), 1); assert.equal(driftLevel(DRIFT[1]), 2); assert.equal(driftLevel(DRIFT[2] + 5), 3);
});

test('un drift tenu longtemps puis relâché donne un ULTRA BOOST', () => {
  startOn(0);
  const msgs = []; fx.toast = t => msgs.push(t);
  P.speed = MAXS * .9; inp.up = true; inp.left = true; inp.drift = true;
  for (let t = 0; t < 3; t += STEP) { P.x = 0; P.speed = Math.max(P.speed, MAXS * .8); update(STEP); }
  assert.ok(P.drift); assert.equal(driftLevel(P.charge), 3);
  inp.drift = false; update(STEP);
  assert.equal(P.drift, false);
  assert.ok(P.boostT > BOOST_TIME[3] - .1, 'boost long');
  assert.ok(msgs.includes('ULTRA BOOST !'));
  fx.toast = () => {};
});

test('pas de drift à l\'arrêt', () => {
  startOn(0);
  inp.left = true; inp.drift = true;
  for (let t = 0; t < 1; t += STEP) update(STEP);
  assert.equal(P.drift, false);
});

test('freiner ralentit, sortir de la route ralentit', () => {
  startOn(0); P.speed = MAXS; inp.down = true;
  for (let t = 0; t < .5; t += STEP) update(STEP);
  assert.ok(P.speed < MAXS * .6);
  startOn(0); P.speed = MAXS; P.x = 1.6; inp.up = true;
  for (let t = 0; t < 1; t += STEP) { P.x = 1.6; update(STEP); }
  assert.ok(P.speed < MAXS * .5, 'hors piste');
});

for (let ti = 0; ti < TRACKS.length; ti++) {
  test(`course complète sur ${TRACKS[ti].name} : 3 tours, arrivée, classement`, () => {
    let results = 0; fx.results = () => { results++; }; fx.resultsShown = () => results > 0;
    startOn(ti);
    const t = drive({ drift: true });
    assert.equal(etat.state, 'finish', `pas d'arrivée en ${t.toFixed(0)} s`);
    assert.equal(etat.lap, LAPS);
    assert.equal(etat.lapTimes.length, LAPS);
    assert.ok(etat.raceT > 60 && etat.raceT < 400, `temps ${etat.raceT}`);
    assert.ok(P.finalRank >= 1 && P.finalRank <= 8);
    assert.ok(Math.abs(etat.lapTimes.reduce((a, b) => a + b, 0) - etat.raceT) < .1, 'somme des tours = temps total');
    for (let k = 0; k < 200; k++) update(STEP);
    assert.equal(results, 1, 'écran des résultats montré une fois');
  });
}

test('le classement suit la progression', () => {
  startOn(0);
  drive({ limit: 20 });
  const rank = 1 + etat.rivals.filter(r => r.d > progress()).length;
  assert.ok(rank >= 1 && rank <= 8);
});
