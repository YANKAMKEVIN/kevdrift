/** Décor et voitures : du plus loin au plus proche, puis la voiture du joueur. */
import { BOOSTC, CAMD, CAMH, CARW, MAXS, PZ, RW, SEG } from '../sim/config.ts';
import { relZ } from '../sim/ai.ts';
import { driftLevel } from '../sim/physics.ts';
import type { Race, Rival } from '../sim/types.ts';
import { findSeg } from '../sim/track.ts';
import { clamp, lerp } from '../sim/util.ts';
import { proj, slotOf } from './road.ts';
import { scene } from './scene.ts';
import type { Ctx, Img } from './sprites-cars.ts';
import { carBase, portrait, view } from './view.ts';

/** Rang de projection de chaque rival pour cette image, et rivaux juste derrière la caméra. */
const rivalSlot = new Int32Array(16);
const behind: Rival[] = [];

function drawSprite(ctx: Ctx, img: Img, ww: number, sc: number, sx: number, sy: number, clipY: number): void {
  const dw = ww * sc * view.PX;
  if (dw < 1.5 || dw > view.W * 6) return;
  const dh = (dw * img.height) / img.width;
  const dx = sx - dw / 2, dy = sy - dh;
  const ch = clipY ? Math.max(0, dy + dh - clipY) : 0;
  if (ch >= dh) return;
  ctx.drawImage(img, 0, 0, img.width, img.height * (1 - ch / dh), dx, dy, dw, dh - ch);
}

function drawRival(ctx: Ctx, r: Race, o: Rival, n: number, fa: number, noClip: boolean): void {
  if (!proj.vis[n] && !noClip) return;
  const s = findSeg(r.course, o.z);
  const pc = (o.z % SEG) / SEG;
  const sc = lerp(proj.sc1[n], proj.sc2[n], pc);
  if (!(sc > 0)) return;
  const x = lerp(proj.sx1[n], proj.sx2[n], pc) + sc * o.x * RW * view.PX;
  const y = lerp(proj.sy1[n], proj.sy2[n], pc) + Math.sin(r.time * 6 + o.d * 0.01) * sc * 20 * view.PY;
  const li = clamp(Math.round((o.steer - s.curve * 0.15) * 2) + 2, 0, 4);
  const imgs = scene.rivalImgs[o.k];
  if (!imgs) return;
  ctx.globalAlpha = fa;
  drawSprite(ctx, imgs[li], CARW, sc, x, y, noClip ? 0 : proj.clip[n]);
  ctx.globalAlpha = 1;
}

function drawPlayer(ctx: Ctx, r: Race): void {
  const P = r.player;
  const img = scene.carImgs[clamp(Math.round(P.lean * 2) + 2, 0, 4)];
  if (!img) return;
  const cw = ((CARW * view.PX) / CAMH) * (portrait() ? 1.3 : 1);
  const ch = (cw * img.height) / img.width;
  const bob = Math.sin(r.time * 7) * 2 * (0.4 + P.speed / MAXS) + (P.boostT > 0 ? (Math.random() - 0.5) * 3 : 0);
  ctx.save();
  ctx.translate(view.W / 2, carBase() + bob);
  ctx.rotate(P.drift ? P.dDir * 0.09 : P.lean * 0.025);
  if (P.boostT > 0) {
    // flammes des tuyères
    ctx.globalCompositeOperation = 'lighter';
    const c = BOOSTC[P.boostLvl || 1];
    for (const ex of [-0.19, 0.19]) {
      const fl = ctx.createRadialGradient(ex * cw, -ch * 0.26, 0, ex * cw, -ch * 0.26, cw * 0.16 + Math.random() * cw * 0.05);
      fl.addColorStop(0, '#fff');
      fl.addColorStop(0.3, c);
      fl.addColorStop(1, c + '00');
      ctx.fillStyle = fl;
      ctx.beginPath();
      ctx.ellipse(ex * cw, -ch * 0.2, cw * 0.1, cw * 0.22 + Math.random() * cw * 0.05, 0, 0, 7);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(img, -cw / 2, -ch, cw, ch);
  if (P.drift && P.charge >= 0.7) {
    // halo de charge du drift, à la couleur du boost qui sera gagné
    const lvl = Math.max(1, driftLevel(P.charge));
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(r.time * 30);
    ctx.fillStyle = BOOSTC[lvl];
    ctx.beginPath();
    ctx.ellipse(0, -ch * 0.08, cw * 0.52, ch * 0.1, 0, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

/** Décor, rivaux et voiture du joueur, dans l'ordre de profondeur. */
export function drawObjects(ctx: Ctx, r: Race): void {
  const { DRAW } = view;
  const T = r.course.track;
  const segs = r.course.segs;
  const N = segs.length;
  const deco = scene.deco;
  for (let k = 0; k < r.rivals.length; k++) rivalSlot[k] = slotOf(r, findSeg(r.course, r.rivals[k].z).i);
  behind.length = 0;
  const gateSlots = Math.floor(PZ / SEG) + 2;
  for (let n = DRAW - 1; n > 0; n--) {
    if (proj.cz1[n] <= CAMD) continue;
    const s = segs[(proj.base + n) % N];
    const fa = 1 - Math.min(1, Math.pow(n / DRAW, 1.5) * T.fogK * 0.9);
    for (let k = 0; k < r.rivals.length; k++) {
      if (rivalSlot[k] !== n) continue;
      const o = r.rivals[k];
      if (relZ(r, o.z) < -20) { behind.push(o); continue; }
      drawRival(ctx, r, o, n, fa, false);
    }
    if (!s.sprites.length || !deco) continue;
    ctx.globalAlpha = fa;
    const sc = proj.sc1[n];
    for (const sp of s.sprites) {
      // portiques et anneaux au-dessus de la route : pas quand la caméra passe dessous
      if (!sp.col && n <= gateSlots) continue;
      drawSprite(ctx, deco[sp.key], sp.w, sc, proj.sx1[n] + sc * sp.off * RW * view.PX, proj.sy1[n], proj.clip[n]);
    }
    ctx.globalAlpha = 1;
  }
  drawPlayer(ctx, r);
  for (const o of behind) {
    if (relZ(r, o.z) > -500) drawRival(ctx, r, o, slotOf(r, findSeg(r.course, o.z).i), 1, true);
  }
}
