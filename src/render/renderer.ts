/** Une image : ciel, route, décor et voitures, particules. */
import type { Race } from '../sim/types.ts';
import { drawBackground } from './background.ts';
import { drawObjects } from './cars.ts';
import { drawParticles } from './particles.ts';
import { drawRoad } from './road.ts';
import { scene } from './scene.ts';
import { layout, view } from './view.ts';

let canvas: HTMLCanvasElement | null = null;

export function attachCanvas(cv: HTMLCanvasElement): void {
  canvas = cv;
  scene.ctx = cv.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
}

/** Adapte le canvas à la fenêtre (densité de pixels plafonnée). */
export function resize(): void {
  if (!canvas || !scene.ctx) return;
  layout(innerWidth, innerHeight, devicePixelRatio);
  canvas.width = Math.round(view.W * view.DPR);
  canvas.height = Math.round(view.H * view.DPR);
  scene.ctx.setTransform(view.DPR, 0, 0, view.DPR, 0, 0);
}

export function render(r: Race): void {
  const ctx = scene.ctx;
  if (!ctx || !r.course.segs.length) return;
  ctx.save();
  if (r.shake > 0 && scene.shake) ctx.translate((Math.random() - 0.5) * r.shake * 14, (Math.random() - 0.5) * r.shake * 10);
  drawBackground(ctx, r);
  drawRoad(ctx, r);
  drawObjects(ctx, r);
  drawParticles(ctx);
  ctx.restore();
}
