/** Point d'entrée : démarrage, boucle à pas fixe, pause quand l'onglet est caché. */
import './style.css';
import { profile, race } from './app.ts';
import { STEP } from './sim/config.ts';
import { rankOf, update } from './sim/race.ts';
import { DEMO, ROBOT, TURBO } from './platform/params.ts';
import { loadArt } from './render/art.ts';
import { stepParticles } from './render/particles.ts';
import { attachCanvas, render, resize } from './render/renderer.ts';
import { buildRivalImgs } from './render/scene.ts';
import { audio, suspendAudio } from './audio/core.ts';
import { startSequencer } from './audio/music.ts';
import { engineUpdate } from './audio/sfx.ts';
import { initInput, releaseAll } from './input.ts';
import { $ } from './ui/dom.ts';
import { wireEvents } from './ui/feedback.ts';
import { hud, initHud } from './ui/hud.ts';
import { applySettings, attract, pause, startRace, wireButtons } from './ui/screens.ts';
import { buildTitleRecords } from './ui/menus.ts';
import { VERSION } from './version.ts';

const loop = { last: 0, acc: 0, raf: 0, fps: 0, frames: 0, ft: 0, steps: 0 };
/** Au plus 0,1 s rattrapé d'un coup (onglet lent) : jamais d'avalanche de pas. */
const MAX_FRAME = 0.1;

function frame(now: number): void {
  const dt = Math.min(MAX_FRAME, (now - loop.last) / 1000);
  loop.last = now;
  loop.acc += dt * TURBO;
  loop.frames++;
  loop.ft += dt;
  if (loop.ft > 1) { loop.fps = loop.frames; loop.frames = 0; loop.ft = 0; }
  while (loop.acc >= STEP) {
    update(race, STEP);
    stepParticles(race, STEP);
    loop.acc -= STEP;
    loop.steps++;
  }
  render(race);
  hud();
  if (audio.AC) engineUpdate();
  loop.raf = requestAnimationFrame(frame);
}

function startLoop(): void {
  if (loop.raf) return;
  loop.last = performance.now();
  loop.acc = 0;
  loop.raf = requestAnimationFrame(frame);
}

function stopLoop(): void {
  if (loop.raf) cancelAnimationFrame(loop.raf);
  loop.raf = 0;
}

/** Onglet caché : course en pause, boucle arrêtée, son coupé (batterie des téléphones). */
function onVisibility(): void {
  if (document.hidden) {
    releaseAll();
    if (race.phase === 'race' || race.phase === 'countdown') pause();
    stopLoop();
    suspendAudio(true);
  } else {
    suspendAudio(false);
    startLoop();
  }
}

/** Sonde pour les tests de bout en bout (lecture seule). */
const w = window as unknown as Record<string, unknown>;
w.__kd = () => ({
  state: race.phase, pos: race.pos, lap: race.lap, raceT: race.raceT, speed: Math.round(race.player.speed),
  x: race.player.x, rank: rankOf(race), boost: race.player.boostT, charge: race.player.charge, drift: race.player.drift,
  fps: loop.fps, running: loop.raf !== 0, steps: loop.steps, saveStatus: profile.status,
});

function boot(): void {
  attract();
  buildTitleRecords();
  if (DEMO >= 0) {
    // démo : course pilotée seule, sur le circuit demandé, sans toucher à la sauvegarde
    race.autopilot = true;
    startRace(DEMO);
    if (DEMO === 0) race.player.x = 0;
  }
  startLoop();
}

race.autopilot = ROBOT;
audio.race = race;
audio.onReady.push(startSequencer);
attachCanvas($('c') as HTMLCanvasElement);
resize();
addEventListener('resize', resize);
document.addEventListener('visibilitychange', onVisibility);
wireEvents();
wireButtons();
initInput();
initHud();
applySettings();
buildRivalImgs();
$('ver').textContent = 'v' + VERSION;
const artReady = loadArt().then(n => {
  buildRivalImgs();
  w.__kdArt = n;
});
const fonts = document.fonts?.ready ?? Promise.resolve();
Promise.all([fonts, artReady]).then(boot, boot);
