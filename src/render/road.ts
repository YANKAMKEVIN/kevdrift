/**
 * Projection pseudo-3D et dessin de la route, segment par segment, du plus proche au plus loin.
 * Les projections sont rangées dans des tableaux typés réutilisés (aucune allocation par image).
 */
import { CAMD, CAMH, PZ, RW, SEG } from '../sim/config.ts';
import type { Race } from '../sim/types.ts';
import { findSeg } from '../sim/track.ts';
import { lerp } from '../sim/util.ts';
import type { Ctx } from './sprites-cars.ts';
import { MAX_DRAW, view } from './view.ts';

/** Projection de chaque segment visible, rangée par rang n (0 = sous la caméra). */
export const proj = {
  base: 0,
  cz1: new Float64Array(MAX_DRAW),
  sc1: new Float64Array(MAX_DRAW),
  sx1: new Float64Array(MAX_DRAW),
  sy1: new Float64Array(MAX_DRAW),
  sc2: new Float64Array(MAX_DRAW),
  sx2: new Float64Array(MAX_DRAW),
  sy2: new Float64Array(MAX_DRAW),
  /** Hauteur à partir de laquelle ce segment est caché par la route plus proche. */
  clip: new Float64Array(MAX_DRAW),
  vis: new Uint8Array(MAX_DRAW),
};

/** Rang n d'un segment par rapport au segment de base (peut dépasser DRAW). */
export function slotOf(r: Race, segIndex: number): number {
  const N = r.course.segs.length;
  return (segIndex - proj.base + N) % N;
}

// Lignes de la grille néon, en 4 bandes de profondeur (de plus en plus pâles).
const GRID_K = [1.55, 2.2, 3, 4, 5.3, 7, 9.5, 13];
const gridBuf = new Float32Array(MAX_DRAW * 18 * 4);
const gridBand = new Uint8Array(MAX_DRAW * 18);
let gridN = 0;
const GRID_ALPHA = [0.75, 0.45, 0.25, 0.1];

function line(band: number, x1: number, y1: number, x2: number, y2: number): void {
  const o = gridN * 4;
  gridBuf[o] = x1; gridBuf[o + 1] = y1; gridBuf[o + 2] = x2; gridBuf[o + 3] = y2;
  gridBand[gridN++] = band;
}

function quad(ctx: Ctx, x1: number, y1: number, w1a: number, w1b: number, x2: number, y2: number, w2a: number, w2b: number): void {
  ctx.beginPath();
  ctx.moveTo(x1 + w1a, y1);
  ctx.lineTo(x1 + w1b, y1);
  ctx.lineTo(x2 + w2b, y2);
  ctx.lineTo(x2 + w2a, y2);
  ctx.closePath();
  ctx.fill();
}

/** Projette et dessine la route. */
export function drawRoad(ctx: Ctx, r: Race): void {
  const { W, DRAW, PX, PY, CY } = view;
  const T = r.course.track;
  const segs = r.course.segs;
  const N = segs.length;
  const P = r.player;
  const base = findSeg(r.course, r.pos);
  const bp = (r.pos % SEG) / SEG;
  const pSeg = findSeg(r.course, r.pos + PZ);
  const pp = ((r.pos + PZ) % SEG) / SEG;
  const pY = lerp(pSeg.y1, pSeg.y2, pp);
  const camY = pY + CAMH + (P.boostT > 0 ? -60 : 0);
  let maxy = view.H;
  let x = 0;
  let dx = -(base.curve * bp);
  proj.base = base.i;
  gridN = 0;
  for (let n = 0; n < DRAW; n++) {
    const s = segs[(base.i + n) % N];
    const cz = r.pos - (s.i < base.i ? r.course.length : 0);
    proj.clip[n] = maxy;
    proj.vis[n] = 0;
    // projection des deux bords du segment
    const cx1 = P.x * RW - x, cx2 = P.x * RW - x - dx;
    const z1 = s.z1 - cz, z2 = s.z2 - cz;
    const sc1 = CAMD / z1, sc2 = CAMD / z2;
    const sx1 = W / 2 + sc1 * -cx1 * PX, sx2 = W / 2 + sc2 * -cx2 * PX;
    const sy1 = CY - sc1 * (s.y1 - camY) * PY, sy2 = CY - sc2 * (s.y2 - camY) * PY;
    proj.cz1[n] = z1; proj.sc1[n] = sc1; proj.sx1[n] = sx1; proj.sy1[n] = sy1;
    proj.sc2[n] = sc2; proj.sx2[n] = sx2; proj.sy2[n] = sy2;
    x += dx;
    dx += s.curve;
    if (z1 <= CAMD || sy2 >= sy1 || sy2 >= maxy) continue;
    proj.vis[n] = 1;
    let x1 = sx1, y1 = sy1, w1 = sc1 * RW * PX;
    const x2 = sx2, y2 = sy2, w2 = sc2 * RW * PX;
    if (y1 > maxy) {
      const t = (maxy - y2) / (y1 - y2);
      x1 = x2 + (x1 - x2) * t;
      w1 = w2 + (w1 - w2) * t;
      y1 = maxy;
    }
    ctx.fillStyle = s.stripe ? T.ground : T.ground2;
    ctx.fillRect(0, y2, W, y1 - y2 + 1);
    // halo des bords
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = T.edge;
    quad(ctx, x1, y1, -w1 * 1.28, -w1, x2, y2, -w2 * 1.28, -w2);
    quad(ctx, x1, y1, w1, w1 * 1.28, x2, y2, w2, w2 * 1.28);
    ctx.globalAlpha = 1;
    // route
    ctx.fillStyle = s.stripe ? T.road : T.road2;
    quad(ctx, x1, y1, -w1, w1, x2, y2, -w2, w2);
    // bords néon
    ctx.fillStyle = T.edge;
    quad(ctx, x1, y1, -w1 * 1.04, -w1 * 0.97, x2, y2, -w2 * 1.04, -w2 * 0.97);
    quad(ctx, x1, y1, w1 * 0.97, w1 * 1.04, x2, y2, w2 * 0.97, w2 * 1.04);
    if (s.stripe) {
      ctx.fillStyle = T.rumble;
      quad(ctx, x1, y1, -w1 * 0.95, -w1 * 0.91, x2, y2, -w2 * 0.95, -w2 * 0.91);
      quad(ctx, x1, y1, w1 * 0.91, w1 * 0.95, x2, y2, w2 * 0.91, w2 * 0.95);
      ctx.fillStyle = T.lane;
      ctx.globalAlpha = 0.55;
      quad(ctx, x1, y1, -w1 * 0.345, -w1 * 0.325, x2, y2, -w2 * 0.345, -w2 * 0.325);
      quad(ctx, x1, y1, w1 * 0.325, w1 * 0.345, x2, y2, w2 * 0.325, w2 * 0.345);
      ctx.globalAlpha = 1;
    }
    if (s.pad !== null) {
      const c = s.pad, pw = 0.2;
      const ph = (s.i + Math.floor(r.time * 12)) % 3;
      ctx.fillStyle = ph === 0 ? '#fff' : '#ffd23f';
      ctx.globalAlpha = 0.85;
      quad(ctx, x1, y1, w1 * (c - pw), w1 * (c + pw), x2, y2, w2 * (c - pw), w2 * (c + pw));
      ctx.fillStyle = '#ff6a00';
      quad(ctx, x1, y1, w1 * (c - pw * 0.4), w1 * (c + pw * 0.4), x2, y2, w2 * (c - pw * 0.15), w2 * (c + pw * 0.15));
      ctx.globalAlpha = 1;
    }
    if (s.start) {
      const cn = 10;
      for (let k = 0; k < cn; k++) {
        ctx.fillStyle = (k + s.i) % 2 ? '#fff' : '#0a0418';
        const a = -1 + (k * 2) / cn, b = a + 2 / cn;
        quad(ctx, x1, y1, w1 * a, w1 * b, x2, y2, w2 * a, w2 * b);
      }
    }
    // grille
    const band = Math.min(3, Math.floor((n / DRAW) * 5));
    for (const k of GRID_K) {
      line(band, x1 - w1 * k, y1, x2 - w2 * k, y2);
      line(band, x1 + w1 * k, y1, x2 + w2 * k, y2);
    }
    if (s.i % 4 === 0) {
      line(band, 0, y1, x1 - w1 * 1.3, y1);
      line(band, x1 + w1 * 1.3, y1, W, y1);
    }
    // brume
    const f = Math.min(1, Math.pow(n / DRAW, 1.5) * T.fogK);
    if (f > 0.02) {
      ctx.globalAlpha = f;
      ctx.fillStyle = T.fog;
      ctx.fillRect(0, y2, W, y1 - y2 + 1);
      ctx.globalAlpha = 1;
    }
    maxy = y2;
  }
  drawGrid(ctx, T.grid);
}

function drawGrid(ctx: Ctx, col: string): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.4;
  for (let b = 0; b < 4; b++) {
    ctx.globalAlpha = GRID_ALPHA[b];
    ctx.beginPath();
    for (let i = 0; i < gridN; i++) {
      if (gridBand[i] !== b) continue;
      const o = i * 4;
      ctx.moveTo(gridBuf[o], gridBuf[o + 1]);
      ctx.lineTo(gridBuf[o + 2], gridBuf[o + 3]);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
