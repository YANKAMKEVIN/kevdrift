/** Musique synthwave générée en direct : nappes, basse, arpège, mélodie, batterie. */
import { rng } from '../sim/util.ts';
import { audio, noise, voice } from './core.ts';

type Chord = 'm' | 'M' | 'm7' | 'M7';
interface Song {
  bpm: number;
  prog: readonly (readonly [number, Chord])[];
  scale: readonly number[];
  key: number;
  seed: number;
  menu?: boolean;
  lead: number[][];
}

const CH: Record<Chord, number[]> = { m: [0, 3, 7], M: [0, 4, 7], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11] };
const MINOR = [0, 2, 3, 5, 7, 8, 10];
/** Note MIDI -> fréquence. */
export const mf = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Une chanson par circuit, puis celle des menus (n° 3). */
export const SONGS: Song[] = [
  { bpm: 112, prog: [[57, 'm'], [53, 'M'], [60, 'M'], [55, 'M']], scale: MINOR, key: 57, seed: 5, lead: [] },
  { bpm: 120, prog: [[52, 'm'], [48, 'M7'], [55, 'M'], [50, 'M']], scale: MINOR, key: 52, seed: 9, lead: [] },
  { bpm: 128, prog: [[54, 'm'], [50, 'M'], [57, 'M'], [52, 'M']], scale: MINOR, key: 54, seed: 13, lead: [] },
  { bpm: 90, prog: [[57, 'm7'], [53, 'M7'], [50, 'm7'], [52, 'M']], scale: MINOR, key: 57, seed: 21, menu: true, lead: [] },
];
export const MENU_SONG = 3;

const RHYTHMS = [[0, 3, 6, 8, 10, 12, 14], [0, 2, 4, 7, 10, 12], [0, 3, 6, 10, 11, 12, 14], [0, 4, 6, 8, 12, 14]];
// mélodie composée une fois par chanson, à graine (toujours la même)
for (const s of SONGS) {
  const R = rng(s.seed);
  for (let b = 0; b < 4; b++) {
    const bar: number[] = [];
    const ch = s.prog[b];
    const tones = CH[ch[1]].map(x => ch[0] + x + 12);
    const rh = RHYTHMS[b];
    for (let i = 0; i < 16; i++) {
      if (rh.includes(i)) {
        const useScale = R() < 0.3;
        bar.push(useScale ? s.key + 12 + s.scale[(R() * 7) | 0] + (R() < 0.3 ? 12 : 0) : tones[(R() * tones.length) | 0] + (R() < 0.35 ? 12 : 0));
      } else bar.push(-1);
    }
    s.lead.push(bar);
  }
}

const seq = { song: null as Song | null, idx: -1, step: 0, nextT: 0, timer: 0 as ReturnType<typeof setInterval> | 0 };
const ARP = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5];

export function setSong(i: number): void {
  if (i === seq.idx) return;
  seq.idx = i;
  seq.song = SONGS[i];
  seq.step = 0;
  if (audio.AC) seq.nextT = audio.AC.currentTime + 0.08;
}

export const currentSong = (): number => seq.idx;

/** Programme les notes des 140 prochaines millisecondes (appelé toutes les 25 ms). */
function sched(): void {
  const AC = audio.AC, s = seq.song;
  if (!AC || !s) return;
  if (seq.nextT < AC.currentTime - 0.2) seq.nextT = AC.currentTime + 0.05;
  const sd = 60 / s.bpm / 4;
  if (audio.dly) audio.dly.delayTime.value = sd * 3;
  while (seq.nextT < AC.currentTime + 0.14) {
    playStep(seq.step, seq.nextT, sd);
    seq.nextT += sd;
    seq.step++;
  }
}

export function startSequencer(): void {
  if (!seq.timer) seq.timer = setInterval(sched, 25);
}

function playStep(st: number, t: number, sd: number): void {
  const AC = audio.AC, s = seq.song, M = audio.musicG, phase = audio.race?.phase;
  if (!AC || !s || !M || !audio.musicOn || phase === 'pause') return;
  const bar = Math.floor(st / 16) % 8, i = st % 16, ch = s.prog[bar % 4], root = ch[0], ct = CH[ch[1]];
  const intense = !s.menu && (phase === 'race' || phase === 'countdown' || phase === 'finish');
  // nappe
  if (i === 0) for (const iv of ct) for (const det of [-9, 9]) voice('sawtooth', mf(root + iv), t, sd * 16, 0.035, M, { det, cut: 1300, a: 0.35, r: 0.6, send: 0.4 });
  // basse
  if (s.menu) {
    if (i % 4 === 0) voice('sawtooth', mf(root - 24), t, sd * 3.6, 0.16, M, { cut: 500, cutTo: 180, q: 5 });
  } else {
    const oct = i === 6 || i === 14 ? 12 : 0;
    voice('sawtooth', mf(root - 24 + oct), t, sd * 0.92, i % 2 ? 0.1 : 0.17, M, { cut: 900, cutTo: 160, q: 6, r: 0.04 });
  }
  // arpège
  const ar = [...ct.map(x => root + x + 12), ...ct.map(x => root + x + 24)];
  if (s.menu ? i % 2 === 0 : true) {
    const k = s.menu ? (i / 2) % ar.length : ARP[i] % ar.length;
    voice('square', mf(ar[k | 0]), t, sd * 0.85, 0.035, M, { cut: 3200, cutTo: 900, r: 0.05, send: 0.15, sendTo: audio.dly });
  }
  // mélodie, à partir de la 5e mesure
  if (intense && bar >= 4) {
    const n = s.lead[bar % 4][i];
    if (n > 0) {
      voice('sawtooth', mf(n), t, sd * 1.8, 0.06, M, { det: 6, cut: 2600, q: 2, r: 0.12, send: 0.3, sendTo: audio.dly });
      voice('sawtooth', mf(n), t, sd * 1.8, 0.04, M, { det: -8, cut: 2200, r: 0.12 });
    }
  }
  // batterie
  if (intense) {
    if (i % 4 === 0) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      o.connect(g); g.connect(M);
      o.start(t); o.stop(t + 0.4);
    }
    if (i === 4 || i === 12) { noise(t, 0.22, 0.42, M, { f: 1400, send: 0.9 }); voice('triangle', 190, t, 0.1, 0.25, M, { to: 120 }); }
    if (bar === 7 && i >= 12) noise(t, 0.12, 0.25, M, { f: 1600, send: 0.5 });
    if (i % 2 === 1) noise(t, 0.045, 0.12, M, { f: 8000 });
    else if (i % 4 === 2) noise(t, 0.03, 0.06, M, { f: 9000 });
  } else if (s.menu && i % 4 === 2) noise(t, 0.05, 0.04, M, { f: 9000 });
}
