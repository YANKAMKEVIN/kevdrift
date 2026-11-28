import { describe, expect, test } from 'vitest';
import { clamp, easeIn, easeInOut, fmt, lerp, rng, wrap } from '../../src/sim/util.ts';

describe('outils', () => {
  test('clamp borne des deux côtés', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.3, 0, 1)).toBe(0.3);
  });
  test('interpolations aux extrémités et au milieu', () => {
    expect(lerp(2, 4, 0.5)).toBe(3);
    expect(easeIn(0, 10, 0.5)).toBe(2.5);
    expect(easeInOut(0, 10, 0)).toBeCloseTo(0);
    expect(easeInOut(0, 10, 1)).toBeCloseTo(10);
    expect(easeInOut(0, 10, 0.5)).toBeCloseTo(5);
  });
  test('wrap ramène dans [0, max)', () => {
    expect(wrap(12, 10)).toBe(2);
    expect(wrap(-3, 10)).toBe(7);
    expect(wrap(0, 10)).toBe(0);
    expect(wrap(10, 10)).toBe(0);
  });
  test('rng : même graine, même suite ; valeurs dans [0, 1)', () => {
    const a = rng(42), b = rng(42), c = rng(43);
    const sa = Array.from({ length: 50 }, a), sb = Array.from({ length: 50 }, b), sc = Array.from({ length: 50 }, c);
    expect(sa).toEqual(sb);
    expect(sa).not.toEqual(sc);
    expect(sa.every(v => v >= 0 && v < 1)).toBe(true);
  });
  test('rng est à peu près uniforme', () => {
    const r = rng(7);
    let sum = 0;
    for (let i = 0; i < 10000; i++) sum += r();
    expect(sum / 10000).toBeGreaterThan(0.48);
    expect(sum / 10000).toBeLessThan(0.52);
  });
  test('fmt écrit m:ss.cc, et un tiret sans temps', () => {
    expect(fmt(88.5)).toBe('1:28.50');
    expect(fmt(5.25)).toBe('0:05.25');
    expect(fmt(600)).toBe('10:00.00');
    expect(fmt(Infinity)).toBe('—');
    expect(fmt(null)).toBe('—');
    expect(fmt(undefined)).toBe('—');
  });
});
