import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { VERSION } from '../../src/version.ts';
import { mf, SONGS } from '../../src/audio/music.ts';
import { BOOSTC, CARS, RIVALS, TRACKS } from '../../src/sim/config.ts';
import { ART_FILES, CAR_ART, SKY_ART } from '../../src/render/art.ts';

test('le numéro de version suit package.json', () => {
  expect(VERSION).toBe(JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version);
});

test('musique : le la est à 440 Hz, une chanson par circuit plus celle des menus', () => {
  expect(mf(69)).toBe(440);
  expect(mf(81)).toBeCloseTo(880);
  expect(SONGS).toHaveLength(TRACKS.length + 1);
  for (const t of TRACKS) expect(SONGS[t.song].menu).toBeFalsy();
  expect(SONGS[3].menu).toBe(true);
});

test('musique : mélodie composée une fois, 4 mesures de 16 pas', () => {
  for (const s of SONGS) {
    expect(s.lead).toHaveLength(4);
    for (const bar of s.lead) expect(bar).toHaveLength(16);
  }
});

test('données : couleurs valides, statistiques sur 5', () => {
  const hex = /^#[0-9a-f]{6}$/i;
  for (const c of CARS) {
    expect(c.col).toMatch(hex);
    expect(c.stats.every(v => v >= 1 && v <= 5)).toBe(true);
  }
  for (const r of RIVALS) expect(r[1]).toMatch(hex);
  for (const b of BOOSTC) expect(b).toMatch(hex);
});

test('visuels : un ciel par circuit, une image par machine, tous les fichiers présents', () => {
  expect(SKY_ART).toHaveLength(TRACKS.length);
  expect(CAR_ART).toHaveLength(CARS.length);
  for (const f of ART_FILES) expect(readFileSync(new URL(`../../public/art/${f}.webp`, import.meta.url)).length).toBeGreaterThan(1000);
});
