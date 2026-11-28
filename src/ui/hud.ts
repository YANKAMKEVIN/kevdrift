/** Tableau de bord : place, tour, chronos, compteur, jauge de drift, positions sur le tour. */
import { race } from '../app.ts';
import { BOOSTC, CARS, DRIFT, FIELD, LAPS, MAXS } from '../sim/config.ts';
import { progress, rankOf } from '../sim/ai.ts';
import { driftLevel } from '../sim/physics.ts';
import { fmt, wrap } from '../sim/util.ts';
import { $, el } from './dom.ts';

const GAUGE_N = 16;
const cache = new Map<string, string>();
let gaugeCells: HTMLElement[] = [];
const gaugeCols: string[] = [];
let dots: HTMLElement[] = [];
let driftBar: HTMLElement | null = null;
let lastDriftW = '';
let lastDriftC = '';

/** Change un texte seulement s'il a changé (pas de travail inutile pour le navigateur). */
function setT(id: string, v: string, html = false): void {
  if (cache.get(id) === v) return;
  cache.set(id, v);
  if (html) $(id).innerHTML = v;
  else $(id).textContent = v;
}

export function initHud(): void {
  const g = $('hGauge');
  g.replaceChildren();
  gaugeCells = Array.from({ length: GAUGE_N }, () => g.appendChild(el('i')));
  gaugeCols.length = 0;
  driftBar = $('hDrift');
}

/** Points de couleur des voitures sur la barre de progression (au départ de chaque course). */
export function buildProgressDots(): void {
  const pg = $('hProg');
  pg.replaceChildren();
  const cols = [...race.rivals.map(r => r.col), CARS[race.car].col];
  dots = cols.map((c, k) => {
    const d = el('i');
    d.style.background = c;
    d.style.color = c;
    if (k === cols.length - 1) d.className = 'me';
    return pg.appendChild(d);
  });
  cache.clear();
}

export function hud(): void {
  const r = race;
  if (r.phase !== 'race' && r.phase !== 'countdown' && r.phase !== 'finish') return;
  const P = r.player;
  const rank = r.phase === 'finish' ? P.finalRank : rankOf(r);
  setT('hPos', `${rank}<small>/${FIELD}</small>`, true);
  setT('hLap', 'TOUR ' + Math.min(r.lap + 1, LAPS) + '/' + LAPS);
  setT('hTime', fmt(r.raceT));
  setT('hLapT', 'Tour ' + fmt(r.lapT));
  setT('hBest', 'Meilleur tour ' + fmt(r.bestLap));
  setT('hKmh', Math.round((P.speed / MAXS) * 290) + '<small>KM/H</small>', true);
  const on = Math.round((P.speed / (MAXS * 1.35)) * GAUGE_N);
  for (let i = 0; i < gaugeCells.length; i++) {
    const c = i < on ? (i >= 12 ? '#ffd23f' : i >= 8 ? '#ff2bd6' : '#19f0ff') : 'rgba(255,255,255,.1)';
    if (gaugeCols[i] !== c) { gaugeCells[i].style.background = c; gaugeCols[i] = c; }
  }
  const ch = P.drift ? P.charge : 0, lvl = driftLevel(ch);
  const w = Math.min(100, (ch / DRIFT[2]) * 100).toFixed(1) + '%';
  const col = lvl ? BOOSTC[lvl] : '#8a7ab8';
  if (driftBar && (w !== lastDriftW || col !== lastDriftC)) {
    driftBar.style.width = w;
    driftBar.style.background = col;
    lastDriftW = w;
    lastDriftC = col;
  }
  document.body.classList.toggle('boosting', P.boostT > 0);
  const L = r.course.length;
  for (let i = 0; i < r.rivals.length && i < dots.length; i++) dots[i].style.left = (wrap(r.rivals[i].d, L) / L) * 100 + '%';
  const me = dots[r.rivals.length];
  if (me) me.style.left = (wrap(progress(r), L) / L) * 100 + '%';
}
