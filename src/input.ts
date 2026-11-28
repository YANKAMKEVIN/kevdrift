/** Clavier, boutons tactiles, perte de focus. */
import { race } from './app.ts';
import type { Input } from './sim/types.ts';
import { initAudio } from './audio/core.ts';
import { resize } from './render/renderer.ts';
import { view } from './render/view.ts';
import { $ } from './ui/dom.ts';
import { goSelect, isShown, pause, resume, startRace, toggleSetting } from './ui/screens.ts';

const KEYS: Record<string, keyof Input> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'drift', ShiftLeft: 'drift', ShiftRight: 'drift',
};

function releaseAll(): void {
  const inp = race.input;
  inp.up = inp.down = inp.left = inp.right = inp.drift = false;
  document.querySelectorAll('.tb.dn').forEach(b => b.classList.remove('dn'));
}

function onKeyDown(e: KeyboardEvent): void {
  const k = KEYS[e.code];
  if (k) {
    race.input[k] = true;
    e.preventDefault();
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (race.phase === 'race' || race.phase === 'countdown') pause();
    else if (race.phase === 'pause') resume();
  }
  if (e.code === 'KeyM') toggleSetting('music');
  if ((e.code === 'Enter' || e.code === 'Space') && race.phase === 'title') {
    e.preventDefault();
    // sur la grille de départ, Entrée lance la course (sauf si un bouton a le focus)
    if (isShown('sSelect')) {
      if (e.code === 'Enter' && !(document.activeElement && document.activeElement.tagName === 'BUTTON')) startRace();
    } else if (isShown('sTitle')) goSelect();
  }
}

/** Passe en mode tactile au premier toucher : boutons à l'écran, accélération automatique. */
function enterTouchMode(): void {
  if (view.touchMode) return;
  view.touchMode = true;
  race.autoThrottle = true;
  document.body.classList.add('touch');
  resize();
  $('titleHint').innerHTML = 'Boutons <b>◀ ▶</b> pour tourner · <b>DRIFT</b> à maintenir dans les virages · l’accélération est automatique';
}

export function initInput(): void {
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', e => {
    const k = KEYS[e.code];
    if (k) race.input[k] = false;
  });
  document.querySelectorAll<HTMLElement>('.tb').forEach(b => {
    const k = b.dataset.k as keyof Input;
    const on = (e: PointerEvent): void => {
      e.preventDefault();
      race.input[k] = true;
      b.classList.add('dn');
      initAudio();
    };
    const off = (): void => {
      race.input[k] = false;
      b.classList.remove('dn');
    };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('pointerleave', off);
  });
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch') enterTouchMode(); }, true);
  addEventListener('blur', () => {
    releaseAll();
    if (race.phase === 'race' || race.phase === 'countdown') pause();
  });
}

export { releaseAll };
