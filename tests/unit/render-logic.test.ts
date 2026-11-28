// Parties du rendu testables sans navigateur : vue (densité de pixels plafonnée), particules.
import { describe, expect, test } from 'vitest';
import { cappedDpr, carBase, layout, MAX_DPR, MAX_DRAW, PIXEL_BUDGET, view } from '../../src/render/view.ts';
import { clearParticles, MAX_PARTICLES, particleCount, stepParticles } from '../../src/render/particles.ts';
import { startOn } from './helpers.ts';
import { MAXS, STEP } from '../../src/sim/config.ts';

describe('vue', () => {
  test('densité de pixels plafonnée à 1,5', () => {
    expect(cappedDpr(3, 390, 844)).toBe(MAX_DPR);
    expect(cappedDpr(1, 1280, 800)).toBe(1);
    expect(cappedDpr(0, 1280, 800)).toBe(1);
  });
  test('budget de pixels respecté sur grand écran', () => {
    const d = cappedDpr(2, 2560, 1440);
    expect(2560 * 1440 * d * d).toBeLessThanOrEqual(PIXEL_BUDGET + 1);
  });
  test('petit écran : moins de segments dessinés', () => {
    layout(390, 844, 3);
    expect(view.DRAW).toBeLessThan(MAX_DRAW);
    layout(1280, 800, 1);
    expect(view.DRAW).toBe(MAX_DRAW);
  });
  test('portrait : horizon plus haut qu\'en paysage', () => {
    layout(390, 844, 1);
    expect(view.CY / view.H).toBeLessThan(0.5);
    layout(844, 390, 1);
    expect(view.CY / view.H).toBe(0.5);
  });
  test('portrait tactile : la voiture remonte pour laisser la place aux boutons', () => {
    layout(390, 844, 1);
    view.touchMode = false;
    const a = carBase();
    view.touchMode = true;
    const b = carBase();
    view.touchMode = false;
    expect(b).toBeLessThan(a - 100);
  });
});

describe('particules', () => {
  test('le drift fait jaillir des étincelles qui retombent puis meurent', () => {
    layout(1280, 800, 1);
    clearParticles();
    const r = startOn(0);
    r.player.drift = true; r.player.speed = MAXS;
    for (let k = 0; k < 10; k++) stepParticles(r, STEP);
    expect(particleCount()).toBeGreaterThan(5);
    r.player.drift = false;
    for (let k = 0; k < 120; k++) stepParticles(r, STEP);
    expect(particleCount()).toBe(0);
  });
  test('jamais plus de 500 particules', () => {
    clearParticles();
    const r = startOn(0);
    r.player.drift = true; r.player.boostT = 100; r.player.x = 1.5; r.player.speed = MAXS;
    for (let k = 0; k < 2000; k++) stepParticles(r, 0.0001, () => 0);
    expect(particleCount()).toBe(MAX_PARTICLES);
  });
  test('aucune particule à l\'arrêt sur la route', () => {
    clearParticles();
    const r = startOn(0);
    for (let k = 0; k < 60; k++) stepParticles(r, STEP);
    expect(particleCount()).toBe(0);
  });
  test('les particules ne modifient pas la course', () => {
    const r = startOn(0);
    r.player.drift = true; r.player.boostT = 1;
    const snap = JSON.stringify(r.player);
    for (let k = 0; k < 30; k++) stepParticles(r, STEP);
    expect(JSON.stringify(r.player)).toBe(snap);
  });
});
