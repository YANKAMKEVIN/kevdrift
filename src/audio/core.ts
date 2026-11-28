/** Contexte Web Audio, bus (musique, bruitages, réverbération, écho) et voix de synthèse. */
import type { Race } from '../sim/types.ts';

interface Engine {
  o1: OscillatorNode;
  o2: OscillatorNode;
  o3: OscillatorNode;
  ef: BiquadFilterNode;
  eg: GainNode;
  sg: GainNode;
  bp: BiquadFilterNode;
}

export const audio = {
  AC: null as AudioContext | null,
  master: null as GainNode | null,
  musicG: null as GainNode | null,
  sfxG: null as GainNode | null,
  rev: null as ConvolverNode | null,
  dly: null as DelayNode | null,
  noiseB: null as AudioBuffer | null,
  eng: null as Engine | null,
  musicOn: true,
  sfxOn: true,
  /** Course écoutée (moteur, intensité de la musique). */
  race: null as Race | null,
  onReady: [] as (() => void)[],
};

export const MUSIC_GAIN = 0.55;
export const SFX_GAIN = 0.8;

export interface VoiceOpts {
  det?: number;
  to?: number;
  cut?: number;
  cutTo?: number;
  ft?: BiquadFilterType;
  q?: number;
  a?: number;
  r?: number;
  send?: number;
  sendTo?: AudioNode | null;
}

/** Une note : oscillateur, filtre facultatif, enveloppe, envoi vers la réverbération ou l'écho. */
export function voice(type: OscillatorType, f: number, t: number, dur: number, vol: number, dest: AudioNode, o: VoiceOpts = {}): void {
  const AC = audio.AC;
  if (!AC) return;
  const os = AC.createOscillator(), g = AC.createGain();
  os.type = type;
  os.frequency.setValueAtTime(f, t);
  if (o.det) os.detune.value = o.det;
  if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  let n: AudioNode = os;
  if (o.cut) {
    const fl = AC.createBiquadFilter();
    fl.type = o.ft || 'lowpass';
    fl.frequency.setValueAtTime(o.cut, t);
    if (o.cutTo) fl.frequency.exponentialRampToValueAtTime(o.cutTo, t + dur);
    fl.Q.value = o.q || 1;
    os.connect(fl);
    n = fl;
  }
  const a = o.a || 0.005, r = o.r || 0.08;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.setValueAtTime(vol, t + Math.max(a, dur - r));
  g.gain.linearRampToValueAtTime(0, t + dur);
  n.connect(g);
  g.connect(dest);
  const sendTo = o.sendTo || audio.rev;
  if (o.send && sendTo) {
    const s = AC.createGain();
    s.gain.value = o.send;
    g.connect(s);
    s.connect(sendTo);
  }
  os.start(t);
  os.stop(t + dur + 0.05);
}

export interface NoiseOpts {
  ft?: BiquadFilterType;
  f?: number;
  fTo?: number;
  q?: number;
  send?: number;
}

/** Un souffle de bruit filtré (caisse claire, charleston, turbo). */
export function noise(t: number, dur: number, vol: number, dest: AudioNode, o: NoiseOpts = {}): void {
  const AC = audio.AC;
  if (!AC || !audio.noiseB) return;
  const s = AC.createBufferSource();
  s.buffer = audio.noiseB;
  const f = AC.createBiquadFilter();
  f.type = o.ft || 'highpass';
  f.frequency.setValueAtTime(o.f || 1000, t);
  if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
  f.Q.value = o.q || 0.7;
  const g = AC.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(dest);
  if (o.send && audio.rev) {
    const sg = AC.createGain();
    sg.gain.value = o.send;
    g.connect(sg);
    sg.connect(audio.rev);
  }
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

/** Crée le contexte au premier geste du joueur (les navigateurs l'exigent). */
export function initAudio(): void {
  if (audio.AC) {
    if (audio.AC.state === 'suspended') void audio.AC.resume();
    return;
  }
  let AC: AudioContext;
  try {
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctor = W.AudioContext || W.webkitAudioContext;
    if (!Ctor) return;
    AC = new Ctor();
  } catch { return; }
  audio.AC = AC;
  const master = AC.createGain();
  master.gain.value = 0.85;
  const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master.connect(comp);
  comp.connect(AC.destination);
  audio.master = master;
  audio.musicG = AC.createGain();
  audio.musicG.gain.value = audio.musicOn ? MUSIC_GAIN : 0;
  audio.musicG.connect(master);
  audio.sfxG = AC.createGain();
  audio.sfxG.gain.value = audio.sfxOn ? SFX_GAIN : 0;
  audio.sfxG.connect(master);
  const nb = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
  const d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  audio.noiseB = nb;
  // réverbération : réponse impulsionnelle synthétique
  const rev = AC.createConvolver();
  const L = AC.sampleRate * 2.4, ib = AC.createBuffer(2, L, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const x = ib.getChannelData(ch);
    for (let i = 0; i < L; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 2.6);
  }
  rev.buffer = ib;
  const rg = AC.createGain();
  rg.gain.value = 0.35;
  rev.connect(rg);
  rg.connect(audio.musicG);
  audio.rev = rev;
  // écho filtré
  const dly = AC.createDelay(1);
  const fb = AC.createGain();
  fb.gain.value = 0.36;
  const lp = AC.createBiquadFilter();
  lp.frequency.value = 2600;
  dly.connect(lp); lp.connect(fb); fb.connect(dly);
  const dg = AC.createGain();
  dg.gain.value = 0.45;
  lp.connect(dg);
  dg.connect(audio.musicG);
  audio.dly = dly;
  initEngine(AC, audio.sfxG, nb);
  for (const f of audio.onReady) f();
}

/** Moteur : trois oscillateurs filtrés et un souffle de pneus pour le drift. */
function initEngine(AC: AudioContext, out: AudioNode, nb: AudioBuffer): void {
  const o1 = AC.createOscillator(), o2 = AC.createOscillator(), o3 = AC.createOscillator();
  o1.type = 'sawtooth'; o2.type = 'square'; o3.type = 'sine';
  const ef = AC.createBiquadFilter();
  ef.type = 'lowpass'; ef.frequency.value = 600; ef.Q.value = 4;
  const eg = AC.createGain();
  eg.gain.value = 0;
  const wg = AC.createGain();
  wg.gain.value = 0.12;
  o1.connect(ef); o2.connect(ef); o3.connect(wg); wg.connect(eg); ef.connect(eg); eg.connect(out);
  const nz = AC.createBufferSource();
  nz.buffer = nb;
  nz.loop = true;
  const bp = AC.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 2.5;
  const sg = AC.createGain();
  sg.gain.value = 0;
  nz.connect(bp); bp.connect(sg); sg.connect(out);
  for (const o of [o1, o2, o3, nz]) o.start();
  audio.eng = { o1, o2, o3, ef, eg, sg, bp };
}

/** Musique et bruitages on/off (réglages). */
export function setMusic(on: boolean): void {
  audio.musicOn = on;
  if (audio.musicG && audio.AC) audio.musicG.gain.setTargetAtTime(on ? MUSIC_GAIN : 0, audio.AC.currentTime, 0.1);
}

export function setSfx(on: boolean): void {
  audio.sfxOn = on;
  if (audio.sfxG && audio.AC) audio.sfxG.gain.setTargetAtTime(on ? SFX_GAIN : 0, audio.AC.currentTime, 0.1);
}

/** Onglet caché : on coupe tout le son ; revenu : on le relance. */
export function suspendAudio(hidden: boolean): void {
  const AC = audio.AC;
  if (!AC) return;
  if (hidden && AC.state === 'running') void AC.suspend();
  else if (!hidden && AC.state === 'suspended') void AC.resume();
}
