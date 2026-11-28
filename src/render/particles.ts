/**
 * Particules (étincelles de drift, gerbes hors piste, traits de vitesse du boost).
 * Purement visuelles : elles lisent l'état de la course sans jamais le modifier.
 * Réserve fixe de 500 particules réutilisées : aucune allocation pendant la course.
 */
import { BOOSTC, CAMH, CARW, MAXS } from '../sim/config.ts';
import { driftLevel, OFFROAD_X } from '../sim/physics.ts';
import type { Race } from '../sim/types.ts';
import { carBase, view } from './view.ts';
import type { Ctx } from './sprites-cars.ts';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  c: string;
  l: number;
  ml: number;
  s: number;
  line: boolean;
}

export const MAX_PARTICLES = 500;
const pool: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({ x: 0, y: 0, vx: 0, vy: 0, c: '', l: 0, ml: 1, s: 0, line: false }));
let alive = 0;
const SIDES = [-0.38, 0.38];

/** Nombre de particules vivantes (tests, mesures). */
export const particleCount = (): number => alive;

export function clearParticles(): void {
  alive = 0;
}

function part(x: number, y: number, vx: number, vy: number, c: string, l: number, s: number, line = false): void {
  if (alive >= MAX_PARTICLES) return;
  const p = pool[alive++];
  p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.c = c; p.l = l; p.ml = l; p.s = s; p.line = line;
}

/** Fait naître les particules de ce pas de simulation, puis les fait vivre (appelé à chaque pas fixe). */
export function stepParticles(r: Race, dt: number, rand: () => number = Math.random): void {
  const P = r.player;
  const { W, H } = view;
  const sp = P.speed / MAXS;
  if (r.phase === 'race' && Math.abs(P.x) > OFFROAD_X && rand() < sp * 0.8) {
    part(W / 2 + (rand() - 0.5) * W * 0.25, H - 20, (rand() - 0.5) * 200, -80 - rand() * 120, '#a080ff', 0.5, 3);
  }
  if (P.drift) {
    const lvl = driftLevel(P.charge);
    const col = lvl ? BOOSTC[lvl] : '#ffb070';
    const cw = (CARW * view.PX) / CAMH;
    const base = carBase();
    for (const sx of SIDES) {
      if (rand() < 0.9) {
        part(W / 2 + sx * cw + P.dDir * cw * 0.12, base - cw * 0.05, (rand() - 0.5) * 160 - P.dDir * 160, -60 - rand() * 160, col, 0.35 + rand() * 0.3, 2 + lvl);
      }
    }
  }
  if (P.boostT > 0) {
    for (let k = 0; k < 2; k++) part(W / 2 + (rand() - 0.5) * W * 1.2, H * 0.2 + rand() * H * 0.6, 0, 0, '#ffffff', 0.25, 0, true);
  }
  // vie et mouvement ; les mortes sont remplacées par la dernière vivante
  for (let i = 0; i < alive; ) {
    const p = pool[i];
    p.l -= dt;
    if (p.l <= 0) {
      pool[i] = pool[alive - 1];
      pool[alive - 1] = p;
      alive--;
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 380 * dt;
    i++;
  }
}

/** Dessine les particules en mode additif (lumineux). */
export function drawParticles(ctx: Ctx): void {
  if (!alive) return;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < alive; i++) {
    const p = pool[i];
    ctx.globalAlpha = p.l / p.ml;
    if (p.line) {
      ctx.strokeStyle = p.c;
      ctx.lineWidth = 2;
      const dx = p.x - view.W / 2, dy = p.y - view.H * 0.45;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + dx * 0.25, p.y + dy * 0.25);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
