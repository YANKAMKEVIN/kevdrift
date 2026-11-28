import { describe, expect, test } from 'vitest';
import { Profile } from '../../src/platform/profile.ts';
import { KEY, type Storage } from '../../src/platform/save.ts';

function mem(): Storage & { m: Map<string, string> } {
  const m = new Map<string, string>();
  return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } };
}

describe('profil', () => {
  test('choix du circuit et de la voiture sauvegardés aussitôt', () => {
    const st = mem();
    const p = new Profile(st);
    expect(p.status).toBe('new');
    p.trackIndex = 2;
    p.carIndex = 1;
    const again = new Profile(st);
    expect(again.trackIndex).toBe(2);
    expect(again.carIndex).toBe(1);
    expect(JSON.parse(st.m.get(KEY)!).track).toBe('orbital');
  });
  test('réglages', () => {
    const st = mem();
    const p = new Profile(st);
    p.setSetting('sfx', false);
    expect(new Profile(st).settings.sfx).toBe(false);
  });
  test('records : course et tour séparés, seulement s\'ils sont meilleurs', () => {
    const p = new Profile(mem());
    expect(p.recordResult(0, 120, 40)).toEqual({ race: true, lap: true });
    expect(p.recordResult(0, 125, 39)).toEqual({ race: false, lap: true });
    expect(p.recordResult(0, 110, 45)).toEqual({ race: true, lap: false });
    expect(p.recordResult(0, 130, 50)).toEqual({ race: false, lap: false });
    expect(p.bestRace(0)).toBe(110);
    expect(p.bestLap(0)).toBe(39);
    expect(p.bestRace(1)).toBeNull();
  });
  test('un temps absurde n\'est jamais un record', () => {
    const p = new Profile(mem());
    expect(p.recordResult(1, Infinity, NaN)).toEqual({ race: false, lap: false });
    expect(p.recordResult(1, 2, 1)).toEqual({ race: false, lap: false });
  });
  test('sans stockage, le jeu garde tout en mémoire', () => {
    const p = new Profile(null);
    expect(p.status).toBe('unavailable');
    p.trackIndex = 1;
    expect(p.recordResult(1, 100, 30).race).toBe(true);
    expect(p.trackIndex).toBe(1);
    expect(p.persist()).toBe(false);
  });
});
