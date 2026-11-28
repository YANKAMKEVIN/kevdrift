/** Bruitages et moteur. */
import { MAXS } from '../sim/config.ts';
import type { Sfx } from '../sim/types.ts';
import { audio, noise, voice } from './core.ts';
import { mf } from './music.ts';

export function sfx(kind: Sfx): void {
  const AC = audio.AC, G = audio.sfxG;
  if (!AC || !G) return;
  const t = AC.currentTime;
  switch (kind) {
    case 'beep': voice('square', 660, t, 0.18, 0.18, G, { cut: 3000 }); break;
    case 'go':
      voice('square', 1320, t, 0.5, 0.2, G, { cut: 4000 });
      voice('sawtooth', 660, t, 0.5, 0.12, G, { cut: 3000 });
      break;
    case 'click': voice('square', 880, t, 0.05, 0.08, G, { to: 1400 }); break;
    case 'boost':
      noise(t, 0.6, 0.35, G, { ft: 'bandpass', f: 400, fTo: 5000, q: 1.5 });
      voice('sawtooth', 120, t, 0.6, 0.12, G, { to: 480, cut: 1800 });
      break;
    case 'bump':
      voice('sine', 110, t, 0.25, 0.6, G, { to: 40 });
      noise(t, 0.18, 0.35, G, { ft: 'lowpass', f: 900 });
      break;
    case 'hop': voice('triangle', 300, t, 0.12, 0.15, G, { to: 600 }); break;
    case 'lap': [0, 4, 7, 12].forEach((n, k) => voice('square', mf(76 + n), t + k * 0.08, 0.22, 0.1, G, { cut: 4000, send: 0.3 })); break;
    case 'win': [0, 4, 7, 12, 16, 19, 24].forEach((n, k) => voice('sawtooth', mf(64 + n), t + k * 0.09, 0.4, 0.09, G, { cut: 3500, send: 0.4 })); break;
  }
}

/** Régime du moteur et souffle du drift, suivant la vitesse (appelé à chaque image). */
export function engineUpdate(): void {
  const AC = audio.AC, e = audio.eng, r = audio.race;
  if (!AC || !e || !r) return;
  const P = r.player;
  const t = AC.currentTime, sp = P.speed / MAXS;
  const active = r.phase === 'race' || r.phase === 'countdown' || r.phase === 'finish';
  const gear = Math.min(4, Math.floor(sp * 4.2)), rpm = sp * 4.2 - gear;
  const f = 55 + rpm * 95 + gear * 18 + (r.phase === 'countdown' && r.input.up ? 60 : 0);
  e.o1.frequency.setTargetAtTime(f, t, 0.05);
  e.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
  e.o3.frequency.setTargetAtTime(f * 4 + (P.boostT > 0 ? 400 : 0), t, 0.05);
  e.ef.frequency.setTargetAtTime(400 + sp * 1600 + (P.boostT > 0 ? 1500 : 0), t, 0.05);
  e.eg.gain.setTargetAtTime(active ? 0.07 + sp * 0.06 : 0, t, 0.1);
  e.sg.gain.setTargetAtTime(active && P.drift ? 0.12 : 0, t, 0.04);
  e.bp.frequency.setTargetAtTime(1800 + P.charge * 500, t, 0.05);
}
