import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEY, SAVE_VERSION, defaults, load, save, parse, migrate, isValid, fromLegacy } from '../../src/save.js';

function mem(init = {}) { const m = new Map(Object.entries(init)); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; }

test('valeurs par défaut valides', () => assert.ok(isValid(defaults())));

test('aller-retour', () => {
  const st = mem(), d = defaults(); d.track = 2; d.car = 1; d.music = false; d.best = [95.5, null, 140.25];
  assert.ok(save(st, d)); assert.deepEqual(load(st), d);
});

test('reprise des anciennes clés séparées, puis nettoyage', () => {
  const st = mem({ 'kevdrift.track': '1', 'kevdrift.car': '2', 'kevdrift.music': 'false', 'kevdrift.best0': '101.5', 'kevdrift.best2': 'null' });
  const d = load(st);
  assert.equal(d.track, 1); assert.equal(d.car, 2); assert.equal(d.music, false); assert.deepEqual(d.best, [101.5, null, null]);
  assert.equal(st.getItem('kevdrift.track'), null, 'anciennes clés retirées');
  assert.deepEqual(JSON.parse(st.getItem(KEY)), d);
});

test('anciennes clés en partie abîmées : on garde le reste', () => {
  const d = fromLegacy(mem({ 'kevdrift.track': '9', 'kevdrift.car': '{x', 'kevdrift.best1': '77.7' }));
  assert.equal(d.track, 0); assert.equal(d.car, 0); assert.deepEqual(d.best, [null, 77.7, null]);
  assert.equal(fromLegacy(mem()), null);
});

test('sauvegarde abîmée mise de côté', () => {
  for (const bad of ['{x', '[]', JSON.stringify({ ...defaults(), track: 7 }), JSON.stringify({ ...defaults(), best: [1, null, null] })]) {
    const st = mem({ [KEY]: bad });
    assert.deepEqual(load(st), defaults()); assert.equal(st.getItem(KEY + '.abimee'), bad);
  }
});

test('version plus récente refusée', () => {
  assert.equal(migrate({ ...defaults(), version: SAVE_VERSION + 1 }), null);
  assert.equal(parse(JSON.stringify({ ...defaults(), version: SAVE_VERSION + 1 })), null);
});

test('stockage bloqué', () => {
  const b = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() {} };
  assert.deepEqual(load(b), defaults()); assert.equal(save(b, defaults()), false); assert.deepEqual(load(null), defaults());
});
