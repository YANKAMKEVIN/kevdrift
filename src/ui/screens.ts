/** Enchaînement des écrans : titre, grille de départ, course, pause, résultats. */
import { profile, race } from '../app.ts';
import { TRACKS } from '../sim/config.ts';
import { attract as attractRace, pause as pauseRace, resetRace, resume as resumeRace, startCountdown } from '../sim/race.ts';
import type { Settings } from '../platform/save.ts';
import { clearParticles } from '../render/particles.ts';
import { scene, useCar, useTrack } from '../render/scene.ts';
import { view } from '../render/view.ts';
import { initAudio, setMusic, setSfx } from '../audio/core.ts';
import { MENU_SONG, setSong } from '../audio/music.ts';
import { sfx } from '../audio/sfx.ts';
import { $ } from './dom.ts';
import { buildMenus, refreshSettings } from './menus.ts';
import { buildProgressDots } from './hud.ts';

const SCREENS = ['sTitle', 'sSelect', 'sPause', 'sResult'];

export function show(id: string | null): void {
  for (const s of SCREENS) $(s).classList.toggle('on', s === id);
  document.body.dataset.screen = id ?? 'race';
}

export const isShown = (id: string): boolean => $(id).classList.contains('on');

/** Course de l'écran titre, jouée seule derrière le menu. */
export function attract(): void {
  const ti = profile.trackIndex;
  useTrack(ti);
  race.car = profile.carIndex;
  useCar(race.car);
  attractRace(race, ti);
  clearParticles();
}

export function goSelect(): void {
  initAudio();
  sfx('click');
  setSong(MENU_SONG);
  buildMenus();
  show('sSelect');
}

/** Lance une course (circuit choisi, ou celui donné pour une démo). */
export function startRace(ti = profile.trackIndex): void {
  const ci = profile.carIndex;
  useTrack(ti);
  initAudio();
  sfx('click');
  resetRace(race, ti, ci);
  useCar(ci);
  clearParticles();
  show(null);
  $('hud').classList.add('on');
  $('touch').classList.toggle('on', view.touchMode);
  buildProgressDots();
  startCountdown(race);
  setSong(TRACKS[ti].song);
}

export function pause(): void {
  if (!pauseRace(race)) return;
  show('sPause');
  $('touch').classList.remove('on');
}

export function resume(): void {
  if (!resumeRace(race)) return;
  show(null);
  $('touch').classList.toggle('on', view.touchMode);
  sfx('click');
}

function quit(): void {
  $('hud').classList.remove('on');
  $('touch').classList.remove('on');
  attract();
  show('sTitle');
  setSong(MENU_SONG);
}

/** Applique un réglage au son et au rendu. */
export function applySettings(): void {
  const s = profile.settings;
  setMusic(s.music);
  setSfx(s.sfx);
  scene.shake = s.shake;
}

export function toggleSetting(k: keyof Settings): void {
  profile.setSetting(k, !profile.settings[k]);
  applySettings();
  refreshSettings();
  sfx('click');
}

export function wireButtons(): void {
  $('bPlay').onclick = goSelect;
  $('bBack').onclick = () => { sfx('click'); show('sTitle'); };
  $('bStart').onclick = () => startRace();
  $('bResume').onclick = resume;
  $('bRestart').onclick = () => startRace();
  $('bQuit').onclick = quit;
  $('pauseBtn').onclick = () => { initAudio(); pause(); };
  $('bMenu').onclick = () => { quit(); goSelect(); };
  $('bAgain').onclick = () => startRace();
  $('bNext').onclick = () => {
    profile.trackIndex = (profile.trackIndex + 1) % TRACKS.length;
    startRace();
  };
  document.querySelectorAll<HTMLButtonElement>('[data-setting]').forEach(b => {
    b.onclick = () => toggleSetting(b.dataset.setting as keyof Settings);
  });
  refreshSettings();
}
