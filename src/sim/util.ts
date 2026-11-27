/** Petits outils purs : bornes, interpolations, hasard à graine, format des temps. */

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const easeIn = (a: number, b: number, p: number): number => a + (b - a) * p * p;
export const easeInOut = (a: number, b: number, p: number): number => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);

/** Ramène s dans [0, max). */
export const wrap = (s: number, max: number): number => {
  s %= max;
  return s < 0 ? s + max : s;
};

/** Générateur pseudo-aléatoire à graine (mulberry32) : même graine, même suite. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Temps en secondes -> « m:ss.cc » ; « — » si pas de temps. */
export const fmt = (t: number | null | undefined): string => {
  if (t == null || !isFinite(t)) return '—';
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
};
