/** Ciel : panorama peint, ou dégradé, étoiles, soleil et relief dessinés. */
import { TRACKS } from '../sim/config.ts';
import type { Race } from '../sim/types.ts';
import { rng, wrap } from '../sim/util.ts';
import { art, SKY_ART } from './art.ts';
import { scene } from './scene.ts';
import type { Ctx } from './sprites-cars.ts';
import { view } from './view.ts';

/** Sol sous l'horizon : brume puis couleur du sol. */
function ground(ctx: Ctx, r: Race, hz: number): void {
  const T = r.course.track;
  const gg = ctx.createLinearGradient(0, hz, 0, view.H);
  gg.addColorStop(0, T.fog);
  gg.addColorStop(0.25, T.ground);
  ctx.fillStyle = gg;
  ctx.fillRect(0, hz, view.W, view.H - hz);
}

/** Panorama peint du circuit, répété à l'horizontale et décalé avec les virages ; faux s'il n'est pas prêt. */
function paintedSky(ctx: Ctx, r: Race, hz: number): boolean {
  const im = art(SKY_ART[TRACKS.indexOf(r.course.track)]);
  if (!im) return false;
  const h = hz + 2;
  const w = (im.width * h) / im.height;
  const ox = -wrap(r.skyX * view.W * 0.3, w);
  for (let x = ox; x < view.W; x += w) ctx.drawImage(im, x, 0, w, h);
  ground(ctx, r, hz);
  return true;
}

export function drawBackground(ctx: Ctx, r: Race): void {
  const { W, H } = view;
  const hz = view.CY;
  const T = r.course.track;
  if (paintedSky(ctx, r, hz)) return;
  const g = ctx.createLinearGradient(0, 0, 0, hz);
  T.sky.forEach((c, i) => g.addColorStop(i / (T.sky.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, hz + 2);
  // étoiles (même graine à chaque image : elles ne sautent pas)
  ctx.fillStyle = '#fff';
  const R = rng(99);
  const ns = T.mount.kind === 'space' ? 180 : 70;
  for (let i = 0; i < ns; i++) {
    const x = wrap(R() * W * 2 - r.skyX * W * 0.15, W * 2) - W * 0.5;
    const y = R() * hz * 0.8;
    ctx.globalAlpha = (0.3 + R() * 0.7) * (0.6 + 0.4 * Math.sin(r.time * 2 + i));
    ctx.fillRect(x, y, R() < 0.1 ? 2 : 1.2, R() < 0.1 ? 2 : 1.2);
  }
  ctx.globalAlpha = 1;
  if (T.mount.kind === 'space') {
    const ng = ctx.createRadialGradient(W * 0.25, hz * 0.35, 0, W * 0.25, hz * 0.35, W * 0.4);
    ng.addColorStop(0, 'rgba(122,31,255,.35)');
    ng.addColorStop(1, 'rgba(122,31,255,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(0, 0, W, hz);
  }
  const deco = scene.deco;
  if (deco) {
    const sun = deco.sun;
    const ss = (Math.min(W, H * 1.4) * T.sunR * 2) / 440;
    const sx = W / 2 - wrap(r.skyX * W * 0.3 + W, W * 2) + W;
    ctx.drawImage(sun, sx - (sun.width * ss) / 2, hz - sun.height * ss * (T.mount.kind === 'space' ? 0.75 : 0.62), sun.width * ss, sun.height * ss);
    const m = deco.mount;
    const ms = Math.max(0.5, H / 900) * 0.9;
    const mw = m.width * ms, mh = m.height * ms;
    const ox = -wrap(r.skyX * W * 0.6, mw);
    for (let x = ox; x < W; x += mw) ctx.drawImage(m, x, hz - mh + 2, mw, mh);
  }
  ground(ctx, r, hz);
}
