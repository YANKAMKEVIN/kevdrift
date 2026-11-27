// @ts-check
/** Clavier, boutons tactiles, perte de focus. */
import { $ } from './util.js';
import { etat, inp } from './state.js';
import { initAudio } from './audio.js';
import { goSelect, pause, resume, startRace, toggleMusic } from './ui.js';
import { resize } from './render.js';

// ================== ENTRÉES ==================
const KEYS={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'drift',ShiftLeft:'drift',ShiftRight:'drift'};
addEventListener('keydown',e=>{
 const k=KEYS[e.code];if(k){inp[k]=true;e.preventDefault()}
 if(e.code==='Escape'||e.code==='KeyP'){if(etat.state==='race'||etat.state==='countdown')pause();else if(etat.state==='pause')resume()}
 if(e.code==='KeyM')toggleMusic();
 if((e.code==='Enter'||e.code==='Space')&&etat.state==='title'){e.preventDefault();
  // sur la grille de départ, Entrée lance la course (sauf si un bouton a le focus)
  if($('sSelect').classList.contains('on')){if(e.code==='Enter'&&!(document.activeElement&&document.activeElement.tagName==='BUTTON'))startRace()}
  else if($('sTitle').classList.contains('on'))goSelect()}
});
addEventListener('keyup',e=>{const k=KEYS[e.code];if(k)inp[k]=false});
document.querySelectorAll('.tb').forEach(el=>{const b=/** @type {HTMLElement} */(el),k=/** @type {string} */(b.dataset.k);
 const on=e=>{e.preventDefault();inp[k]=true;b.classList.add('dn');initAudio()},off=e=>{inp[k]=false;b.classList.remove('dn')};
 b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off)});
addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!etat.touchMode){etat.touchMode=true;document.body.classList.add('touch');resize();$('titleHint').innerHTML='Boutons <b>◀ ▶</b> pour tourner · <b>DRIFT</b> à maintenir dans les virages · l’accélération est automatique';}},true);
addEventListener('blur',()=>{for(const k in inp)inp[k]=false;if(etat.state==='race'||etat.state==='countdown')pause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(etat.state==='race'||etat.state==='countdown'))pause()});
