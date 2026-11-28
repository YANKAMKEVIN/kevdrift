/** Décor précalculé sur canvas pour un circuit : tours, lampadaires, panneaux, soleil, relief. */
import type { Track } from '../sim/config.ts';
import type { SpriteKey } from '../sim/track.ts';
import { rng } from '../sim/util.ts';
import { glow, mk, type Ctx } from './sprites-cars.ts';

export type DecoSprites = Record<SpriteKey, HTMLCanvasElement> & { sun: HTMLCanvasElement; mount: HTMLCanvasElement };

const BILL_TEXTS = ['KEVDRIFT', 'RADIO KEV 88.8', 'TURBO KEV', 'DRIFTE OU RIEN'];

function tower(R: () => number, k: number, E: string, C: string): HTMLCanvasElement {
  const h = [520, 680, 420][k];
  const [c, g] = mk(200, h);
  const gr = g.createLinearGradient(0, 0, 200, 0);
  gr.addColorStop(0, '#0d0620'); gr.addColorStop(0.5, '#1d0f38'); gr.addColorStop(1, '#0a0418');
  g.fillStyle = gr;
  g.fillRect(10, 30, 180, h - 30);
  const wc = [E, C, '#ffd23f'];
  for (let y = 50; y < h - 20; y += 18) {
    for (let x = 24; x < 176; x += 16) {
      if (R() < 0.42) {
        g.globalAlpha = 0.35 + R() * 0.6;
        g.fillStyle = wc[(R() * 3) | 0];
        g.fillRect(x, y, 8, 9);
      }
    }
  }
  g.globalAlpha = 1;
  glow(g, E, 14);
  g.strokeStyle = k === 1 ? C : E;
  g.lineWidth = 4;
  g.strokeRect(10, 30, 180, h - 30);
  g.fillStyle = '#ff2050';
  glow(g, '#ff2050', 16);
  g.fillRect(96, 2, 8, 28);
  return c;
}

function lamp(E: string, C: string): HTMLCanvasElement {
  const [c, g] = mk(80, 300);
  g.fillStyle = '#120a22'; g.fillRect(34, 40, 12, 260);
  glow(g, C, 18); g.fillStyle = C; g.fillRect(38, 60, 4, 240);
  g.fillStyle = '#fff'; glow(g, E, 30); g.fillRect(10, 22, 60, 12);
  g.fillStyle = E; g.fillRect(14, 34, 52, 4);
  return c;
}

function palm(E: string): HTMLCanvasElement {
  const [c, g] = mk(320, 420);
  glow(g, E, 14);
  g.strokeStyle = E; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(170, 420); g.quadraticCurveTo(140, 240, 168, 110); g.stroke();
  g.strokeStyle = '#3dff9a'; glow(g, '#3dff9a', 14); g.lineWidth = 5;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i * Math.PI) / 6 + 0.1;
    g.beginPath();
    g.moveTo(168, 110);
    g.quadraticCurveTo(168 + Math.cos(a) * 90, 110 + Math.sin(a) * 90 - 30, 168 + Math.cos(a) * 150, 110 + Math.sin(a) * 40 + 60);
    g.stroke();
  }
  return c;
}

function billboard(txt: string, k: number, E: string, C: string): HTMLCanvasElement {
  const [c, g] = mk(420, 260);
  g.fillStyle = '#120a22'; g.fillRect(70, 150, 14, 110); g.fillRect(336, 150, 14, 110);
  const bg = g.createLinearGradient(0, 0, 420, 170);
  bg.addColorStop(0, '#2a0845'); bg.addColorStop(1, '#0b0420');
  g.fillStyle = bg; g.fillRect(10, 10, 400, 150);
  glow(g, k % 2 ? C : E, 20);
  g.strokeStyle = k % 2 ? C : E; g.lineWidth = 6; g.strokeRect(10, 10, 400, 150);
  g.fillStyle = '#fff';
  g.font = (txt.length > 10 ? 40 : 62) + 'px Audiowide, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  glow(g, k % 2 ? E : C, 18);
  g.fillText(txt, 210, 86);
  return c;
}

function chevronLeft(): HTMLCanvasElement {
  const [c, g] = mk(180, 150);
  g.fillStyle = '#0a0418'; g.fillRect(10, 10, 160, 90);
  g.fillStyle = '#120a22'; g.fillRect(84, 100, 12, 50);
  glow(g, '#ffd23f', 16);
  g.strokeStyle = '#ffd23f'; g.lineWidth = 10; g.lineJoin = 'miter';
  for (let i = 0; i < 3; i++) {
    g.beginPath(); g.moveTo(130 - i * 40, 26); g.lineTo(100 - i * 40, 55); g.lineTo(130 - i * 40, 84); g.stroke();
  }
  return c;
}

function mirrored(src: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = mk(src.width, src.height);
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

function pylon(E: string, C: string): HTMLCanvasElement {
  const [c, g] = mk(300, 320);
  glow(g, E, 22); g.strokeStyle = E; g.lineWidth = 10;
  g.beginPath(); g.moveTo(20, 315); g.lineTo(150, 20); g.lineTo(280, 315); g.stroke();
  g.strokeStyle = C; g.lineWidth = 5; glow(g, C, 16);
  g.beginPath(); g.moveTo(80, 315); g.lineTo(150, 150); g.lineTo(220, 315); g.stroke();
  return c;
}

function crystal(R: () => number, E: string, C: string): HTMLCanvasElement {
  const [c, g] = mk(200, 300);
  glow(g, C, 20);
  for (let i = 0; i < 4; i++) {
    const x = 40 + i * 38, h = 120 + R() * 170, w = 22 + R() * 16;
    const gr = g.createLinearGradient(0, 300 - h, 0, 300);
    gr.addColorStop(0, '#ffffffdd'); gr.addColorStop(0.3, C + 'bb'); gr.addColorStop(1, E + '33');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x, 300); g.lineTo(x - w / 2, 300 - h * 0.75); g.lineTo(x, 300 - h); g.lineTo(x + w / 2, 300 - h * 0.75);
    g.closePath(); g.fill();
  }
  return c;
}

function ring(E: string, C: string): HTMLCanvasElement {
  const [c, g] = mk(320, 360);
  g.fillStyle = '#0a0f24'; g.fillRect(140, 300, 40, 60);
  glow(g, C, 24); g.strokeStyle = C; g.lineWidth = 12;
  g.beginPath(); g.arc(160, 160, 130, 0, 7); g.stroke();
  g.strokeStyle = E; g.lineWidth = 4; glow(g, E, 14);
  g.beginPath(); g.arc(160, 160, 108, 0, 7); g.stroke();
  return c;
}

function pillar(E: string, C: string): HTMLCanvasElement {
  const [c, g] = mk(90, 520);
  const gr = g.createLinearGradient(0, 0, 0, 520);
  gr.addColorStop(0, C + '00'); gr.addColorStop(0.6, C + '99'); gr.addColorStop(1, '#ffffff');
  g.fillStyle = gr; g.fillRect(30, 0, 30, 520);
  g.fillStyle = '#0d132c'; g.fillRect(18, 480, 54, 40);
  glow(g, E, 10); g.strokeStyle = E; g.lineWidth = 3; g.strokeRect(18, 480, 54, 40);
  return c;
}

function gate(T: Track, E: string, C: string): HTMLCanvasElement {
  const [c, g] = mk(1000, 420);
  g.fillStyle = '#120a22'; g.fillRect(30, 60, 40, 360); g.fillRect(930, 60, 40, 360);
  glow(g, E, 18); g.strokeStyle = E; g.lineWidth = 5; g.strokeRect(30, 60, 40, 360); g.strokeRect(930, 60, 40, 360);
  g.shadowBlur = 0;
  for (let x = 0; x < 28; x++) {
    for (let y = 0; y < 2; y++) {
      g.fillStyle = (x + y) % 2 ? '#fff' : '#0a0418';
      g.fillRect(70 + x * 31.4, 40 + y * 16, 31.4, 16);
    }
  }
  g.fillStyle = '#0a0418'; g.fillRect(70, 72, 860, 70);
  glow(g, C, 20); g.strokeStyle = C; g.lineWidth = 4; g.strokeRect(70, 72, 860, 70);
  g.fillStyle = '#fff'; g.font = '52px Audiowide, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  glow(g, E, 20);
  g.fillText('KEVDRIFT  ·  ' + T.name.toUpperCase(), 500, 108);
  return c;
}

function sun(T: Track): HTMLCanvasElement {
  const r = 220;
  const [c, g] = mk(r * 2 + 80, r * 2 + 80);
  const cx = r + 40;
  if (T.mount.kind === 'space') {
    const pg = g.createRadialGradient(cx - 60, cx - 70, 10, cx, cx, r);
    pg.addColorStop(0, T.sun[0]); pg.addColorStop(0.5, T.sun[1]); pg.addColorStop(1, T.sun[2]);
    glow(g, T.sun[1], 60); g.fillStyle = pg;
    g.beginPath(); g.arc(cx, cx, r * 0.8, 0, 7); g.fill();
    g.shadowBlur = 0; g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.25; g.fillStyle = '#000';
    for (let i = 0; i < 6; i++) g.fillRect(0, cx - r + i * 70 + 20, r * 3, 14);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.strokeStyle = '#ff2bd6'; g.lineWidth = 6; glow(g, '#ff2bd6', 20);
    g.save(); g.translate(cx, cx); g.rotate(-0.25); g.scale(1, 0.22);
    g.beginPath(); g.arc(0, 0, r * 1.12, 0.15, Math.PI - 0.15); g.stroke();
    g.restore();
    return c;
  }
  const sg = g.createLinearGradient(0, cx - r, 0, cx + r);
  sg.addColorStop(0, T.sun[0]); sg.addColorStop(0.5, T.sun[1]); sg.addColorStop(1, T.sun[2]);
  glow(g, T.sun[2], 70); g.fillStyle = sg;
  g.beginPath(); g.arc(cx, cx, r, 0, 7); g.fill();
  g.shadowBlur = 0; g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9; i++) {
    const y = cx + 10 + i * i * 3.2 + i * 12, h = 3 + i * 2.1;
    g.fillRect(0, y, r * 3, h);
  }
  g.globalCompositeOperation = 'source-over';
  return c;
}

function skyline(g: Ctx, R: () => number, w: number, h: number, gr: CanvasGradient, T: Track): void {
  const E = T.edge, C = T.rumble, M = T.mount;
  g.fillStyle = gr;
  let x = 0;
  const tops: [number, number, number][] = [];
  while (x < w) {
    const bw = 30 + R() * 90, bh = 60 + R() * R() * 260;
    g.fillRect(x, h - bh, bw, bh);
    tops.push([x, bw, bh]);
    for (let yy = h - bh + 10; yy < h - 6; yy += 12) {
      for (let xx = x + 6; xx < x + bw - 6; xx += 10) {
        if (R() < 0.18) { g.fillStyle = R() < 0.5 ? E + 'aa' : C + '99'; g.fillRect(xx, yy, 4, 5); }
      }
    }
    g.fillStyle = gr;
    x += bw + 2;
  }
  g.strokeStyle = M.line; g.lineWidth = 2; glow(g, M.line, 8); g.globalAlpha = 0.6;
  for (const [tx, bw, bh] of tops) {
    g.beginPath(); g.moveTo(tx, h); g.lineTo(tx, h - bh); g.lineTo(tx + bw, h - bh); g.lineTo(tx + bw, h); g.stroke();
  }
}

function mountains(R: () => number, T: Track): HTMLCanvasElement {
  const w = 2400, h = 360;
  const [c, g] = mk(w, h);
  const M = T.mount;
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, M.fill[0]); gr.addColorStop(1, M.fill[1]);
  if (M.kind === 'city') {
    skyline(g, R, w, h, gr, T);
    return c;
  }
  const pts: [number, number][] = [];
  let y = h * 0.6;
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const x = (i * w) / N;
    if (M.kind === 'mesa') { if (R() < 0.3) y = h * (0.25 + R() * 0.55); } else y = h * (0.35 + R() * 0.6);
    pts.push([x, i === 0 || i === N ? h * 0.6 : y]);
  }
  const trace = (): void => {
    pts.forEach(([px, py], i) => {
      if (i === 0) { g.moveTo(px, py); return; }
      if (M.kind === 'mesa') g.lineTo(px, pts[i - 1][1]);
      g.lineTo(px, py);
    });
  };
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(0, h);
  pts.forEach(([px, py], i) => { if (M.kind === 'mesa' && i > 0) g.lineTo(px, pts[i - 1][1]); g.lineTo(px, py); });
  g.lineTo(w, h); g.fill();
  g.strokeStyle = M.line; g.lineWidth = 3; glow(g, M.line, 14);
  g.beginPath(); trace(); g.stroke();
  g.lineWidth = 1; g.globalAlpha = 0.35; g.shadowBlur = 0;
  for (const [px, py] of pts) { g.beginPath(); g.moveTo(px, py); g.lineTo(px + (px - w / 2) * 0.05, h); g.stroke(); }
  return c;
}

/** Dessine tout le décor d'un circuit (une fois par course). */
export function buildDeco(T: Track): DecoSprites {
  const R = rng(T.seed * 7 + 3);
  const E = T.edge, C = T.rumble;
  const towers = [0, 1, 2].map(k => tower(R, k, E, C));
  const l = lamp(E, C);
  const p = palm(E);
  const bills = BILL_TEXTS.map((t, k) => billboard(t, k, E, C));
  const chevL = chevronLeft();
  const chevR = mirrored(chevL);
  const py = pylon(E, C);
  const cr = crystal(R, E, C);
  const rg = ring(E, C);
  const pi = pillar(E, C);
  const ga = gate(T, E, C);
  const su = sun(T);
  const mo = mountains(R, T);
  return {
    tower0: towers[0], tower1: towers[1], tower2: towers[2],
    bill0: bills[0], bill1: bills[1], bill2: bills[2], bill3: bills[3],
    lamp: l, palm: p, chevL, chevR, pylon: py, crystal: cr, ring: rg, pillar: pi, gate: ga, sun: su, mount: mo,
  };
}
