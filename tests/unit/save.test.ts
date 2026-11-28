import { describe, expect, test } from 'vitest';
import { browserStorage, defaults, fromLegacy, isTime, KEY, load, migrate, parse, sanitize, save, SAVE_VERSION, STASH, v1ToV2, type Storage } from '../../src/platform/save.ts';
import { TRACKS } from '../../src/sim/config.ts';

/** Faux localStorage en mémoire. */
function mem(init: Record<string, string> = {}): Storage & { m: Map<string, string> } {
  const m = new Map(Object.entries(init));
  return {
    m,
    getItem: k => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
  };
}
const v1 = (o: object = {}) => JSON.stringify({ version: 1, track: 1, car: 2, music: false, best: [95.5, null, 140.25], ...o });

describe('format', () => {
  test('version 2 par défaut, un record vide par circuit', () => {
    const d = defaults();
    expect(d.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(2);
    expect(Object.keys(d.records)).toEqual(TRACKS.map(t => t.id));
    expect(d.settings).toEqual({ music: true, sfx: true, shake: true });
    expect(sanitize(d as unknown as Record<string, unknown>).repaired).toBe(false);
  });
  test('identifiants de circuit uniques', () => {
    expect(new Set(TRACKS.map(t => t.id)).size).toBe(TRACKS.length);
  });
  test('temps plausibles', () => {
    expect(isTime(95.5)).toBe(true);
    for (const t of [0, -3, 4, 4000, NaN, Infinity, '95', null]) expect(isTime(t)).toBe(false);
  });
});

describe('aller-retour', () => {
  test('sauver puis relire donne la même chose', () => {
    const st = mem(), d = defaults();
    d.track = 'orbital'; d.car = 'cyan'; d.settings.music = false; d.records.neon = { race: 95.5, lap: 30.1 };
    expect(save(st, d)).toBe(true);
    expect(load(st)).toEqual({ data: d, status: 'ok' });
  });
  test('rien de stocké : valeurs par défaut, statut new', () => {
    expect(load(mem())).toEqual({ data: defaults(), status: 'new' });
  });
});

describe('migration', () => {
  test('v1 -> v2 : numéros en identifiants, musique en réglage, records gardés', () => {
    const d = migrate(JSON.parse(v1()))!;
    expect(d.version).toBe(2);
    expect(d.track).toBe('dunes');
    expect(d.car).toBe('or');
    expect(sanitize(d).data.settings).toEqual({ music: false, sfx: true, shake: true });
    expect(sanitize(d).data.records).toEqual({ neon: { race: 95.5, lap: null }, dunes: { race: null, lap: null }, orbital: { race: 140.25, lap: null } });
  });
  test('v1 relue depuis le stockage est réécrite en v2', () => {
    const st = mem({ [KEY]: v1() });
    const l = load(st);
    expect(l.status).toBe('migrated');
    expect(JSON.parse(st.getItem(KEY)!).version).toBe(2);
    expect(l.data.records.orbital.race).toBe(140.25);
    expect(st.getItem(STASH)).toBeNull();
  });
  test('v1 avec un record absurde : on garde les autres', () => {
    const d = sanitize(v1ToV2(JSON.parse(v1({ best: [-1, 99, 'x'] })))).data;
    expect(d.records.neon.race).toBeNull();
    expect(d.records.dunes.race).toBe(99);
  });
  test('version plus récente refusée', () => {
    expect(migrate({ ...defaults(), version: SAVE_VERSION + 1 })).toBeNull();
    expect(parse(JSON.stringify({ ...defaults(), version: SAVE_VERSION + 1 }))).toBeNull();
  });
  test('version plus récente : mise de côté, jamais écrasée en silence', () => {
    const text = JSON.stringify({ ...defaults(), version: 9 });
    const st = mem({ [KEY]: text });
    expect(load(st).status).toBe('newer');
    expect(st.getItem(STASH)).toBe(text);
  });
  test('pas une sauvegarde : null', () => {
    for (const x of [null, 3, 'a', [], {}, { version: 0 }, { version: 1.5 }]) expect(migrate(x)).toBeNull();
  });
  test('migrate ne modifie pas l\'objet lu', () => {
    const raw = JSON.parse(v1());
    migrate(raw);
    expect(raw.version).toBe(1);
  });
});

describe('sauvegarde abîmée', () => {
  test('JSON illisible : mis de côté, valeurs par défaut', () => {
    for (const bad of ['{x', '[]', '"texte"', '42', 'null']) {
      const st = mem({ [KEY]: bad });
      const l = load(st);
      expect(l.data).toEqual(defaults());
      expect(l.status).toBe('corrupt');
      expect(st.getItem(STASH)).toBe(bad);
      expect(st.getItem(KEY)).toBeNull();
    }
  });
  test('un champ abîmé est réparé, les records sont gardés, l\'original mis de côté', () => {
    const d = defaults();
    d.records.dunes = { race: 120, lap: 40 };
    const bad = JSON.stringify({ ...d, track: 'inconnu', settings: { music: 'oui', sfx: false, shake: true } });
    const st = mem({ [KEY]: bad });
    const l = load(st);
    expect(l.status).toBe('repaired');
    expect(l.data.track).toBe('neon');
    expect(l.data.settings).toEqual({ music: true, sfx: false, shake: true });
    expect(l.data.records.dunes).toEqual({ race: 120, lap: 40 });
    expect(st.getItem(STASH)).toBe(bad);
    expect(JSON.parse(st.getItem(KEY)!)).toEqual(l.data);
  });
  test('record négatif ou absurde : effacé, le reste gardé', () => {
    const d = defaults() as unknown as Record<string, unknown>;
    d.records = { neon: { race: -5, lap: 30 }, dunes: 'x', orbital: { race: 100, lap: 1e9 } };
    const s = sanitize(d);
    expect(s.repaired).toBe(true);
    expect(s.data.records).toEqual({ neon: { race: null, lap: 30 }, dunes: { race: null, lap: null }, orbital: { race: 100, lap: null } });
  });
  test('records d\'un circuit inconnu : ignorés', () => {
    const d = defaults() as unknown as Record<string, unknown>;
    d.records = { lune: { race: 50, lap: 20 } };
    expect(Object.keys(sanitize(d).data.records)).toEqual(TRACKS.map(t => t.id));
  });
  test('settings ou records manquants : réparés', () => {
    const d = defaults() as unknown as Record<string, unknown>;
    delete d.settings;
    expect(sanitize(d).repaired).toBe(true);
    const e = defaults() as unknown as Record<string, unknown>;
    e.records = [];
    expect(sanitize(e).repaired).toBe(true);
  });
});

describe('anciennes clés séparées (avant la sauvegarde versionnée)', () => {
  test('reprises, puis nettoyées', () => {
    const st = mem({ 'kevdrift.track': '1', 'kevdrift.car': '2', 'kevdrift.music': 'false', 'kevdrift.best0': '101.5', 'kevdrift.best2': 'null' });
    const l = load(st);
    expect(l.status).toBe('legacy');
    expect(l.data.track).toBe('dunes');
    expect(l.data.car).toBe('or');
    expect(l.data.settings.music).toBe(false);
    expect(l.data.records.neon.race).toBe(101.5);
    expect(l.data.records.orbital.race).toBeNull();
    expect(st.getItem('kevdrift.track')).toBeNull();
    expect(st.getItem('kevdrift.best0')).toBeNull();
    expect(JSON.parse(st.getItem(KEY)!)).toEqual(l.data);
  });
  test('en partie abîmées : on garde le reste', () => {
    const d = fromLegacy(mem({ 'kevdrift.track': '9', 'kevdrift.car': '{x', 'kevdrift.best1': '77.7' }))!;
    expect(d.track).toBe('neon');
    expect(d.car).toBe('rose');
    expect(d.records.dunes.race).toBe(77.7);
    expect(fromLegacy(mem())).toBeNull();
  });
  test('si l\'écriture échoue, les anciennes clés restent', () => {
    const st = mem({ 'kevdrift.best0': '88.5' });
    st.setItem = () => { throw new Error('plein'); };
    expect(load(st).data.records.neon.race).toBe(88.5);
    expect(st.getItem('kevdrift.best0')).toBe('88.5');
  });
});

describe('stockage indisponible', () => {
  test('lecture qui plante, écriture qui plante, pas de stockage', () => {
    const b: Storage = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() {} };
    expect(load(b)).toEqual({ data: defaults(), status: 'unavailable' });
    expect(save(b, defaults())).toBe(false);
    expect(load(null).status).toBe('unavailable');
    expect(save(null, defaults())).toBe(false);
  });
  test('stockage plein au moment de mettre de côté : pas de plantage', () => {
    const st = mem({ [KEY]: '{x' });
    st.setItem = () => { throw new Error('plein'); };
    expect(load(st).status).toBe('corrupt');
  });
  test('browserStorage sans localStorage (Node) : null', () => {
    expect(browserStorage()).toBeNull();
  });
  test('browserStorage avec un localStorage qui plante : null', () => {
    const g = globalThis as { localStorage?: unknown };
    g.localStorage = { getItem() { throw new Error('bloqué'); } };
    try { expect(browserStorage()).toBeNull(); } finally { delete g.localStorage; }
  });
});
