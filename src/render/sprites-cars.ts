/** Bolides dessinés sur canvas (repli quand les images peintes ne sont pas chargées). */

export type Img = HTMLCanvasElement | HTMLImageElement;
export type Ctx = CanvasRenderingContext2D;

/** Canvas hors écran et son contexte. */
export function mk(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d') as Ctx];
}

export function glow(g: Ctx, col: string, b: number): void {
  g.shadowColor = col;
  g.shadowBlur = b;
}

/** Un bolide vu de l'arrière, penché de `lean` (-1 à 1). */
export function carSprite(col: string, col2: string, lean: number): HTMLCanvasElement {
  const [c, g] = mk(320, 190);
  const L = lean * 16;
  // halo de lévitation
  const hg = g.createRadialGradient(160, 172, 4, 160, 172, 150);
  hg.addColorStop(0, col + 'cc');
  hg.addColorStop(1, col + '00');
  g.fillStyle = hg;
  g.save();
  g.scale(1, 0.16);
  g.beginPath();
  g.arc(160, 172 / 0.16, 150, 0, 7);
  g.fill();
  g.restore();
  // carrosserie
  const bg = g.createLinearGradient(0, 80, 0, 150);
  bg.addColorStop(0, '#3a2f63');
  bg.addColorStop(0.5, '#1c1636');
  bg.addColorStop(1, '#0a0718');
  g.fillStyle = bg;
  g.beginPath();
  g.moveTo(14, 150); g.lineTo(306, 150); g.lineTo(300, 108); g.lineTo(256 + L * 0.6, 88); g.lineTo(64 + L * 0.6, 88); g.lineTo(20, 108);
  g.closePath();
  g.fill();
  // ailerons latéraux
  g.fillStyle = '#120d26';
  g.beginPath(); g.moveTo(8, 150); g.lineTo(30, 150); g.lineTo(34, 112); g.lineTo(14, 118); g.fill();
  g.beginPath(); g.moveTo(312, 150); g.lineTo(290, 150); g.lineTo(286, 112); g.lineTo(306, 118); g.fill();
  // cockpit
  const cg = g.createLinearGradient(0, 50, 0, 90);
  cg.addColorStop(0, '#8fe9ff');
  cg.addColorStop(0.25, '#3a3a8a');
  cg.addColorStop(1, '#0b0820');
  g.fillStyle = cg;
  g.beginPath();
  g.moveTo(92 + L, 88); g.lineTo(228 + L, 88); g.lineTo(206 + L * 1.2, 54); g.lineTo(114 + L * 1.2, 54);
  g.closePath();
  g.fill();
  g.strokeStyle = col;
  g.lineWidth = 2;
  glow(g, col, 10);
  g.stroke();
  // liserés néon
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(20, 108); g.lineTo(64 + L * 0.6, 88); g.lineTo(256 + L * 0.6, 88); g.lineTo(300, 108); g.stroke();
  g.strokeStyle = col2;
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(16, 140); g.lineTo(304, 140); g.stroke();
  // barre de feux arrière
  glow(g, '#ff1f5a', 22);
  const tg = g.createLinearGradient(30, 0, 290, 0);
  tg.addColorStop(0, '#ff1f5a');
  tg.addColorStop(0.5, '#ff7aa0');
  tg.addColorStop(1, '#ff1f5a');
  g.fillStyle = tg;
  g.fillRect(30, 110, 260, 9);
  g.fillStyle = '#fff';
  g.globalAlpha = 0.7;
  g.fillRect(40, 113, 240, 2);
  g.globalAlpha = 1;
  // diffuseur et tuyères
  g.shadowBlur = 0;
  g.fillStyle = '#07040f';
  g.fillRect(60, 126, 200, 20);
  g.strokeStyle = '#2a2250';
  g.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    g.beginPath(); g.moveTo(72 + i * 22, 128); g.lineTo(72 + i * 22, 144); g.stroke();
  }
  glow(g, col, 16);
  g.fillStyle = col;
  for (const x of [110, 210]) { g.beginPath(); g.ellipse(x, 136, 16, 7, 0, 0, 7); g.fill(); }
  g.fillStyle = '#fff';
  for (const x of [110, 210]) { g.beginPath(); g.ellipse(x, 136, 7, 3, 0, 0, 7); g.fill(); }
  // emblème
  g.shadowBlur = 8;
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(160 + L * 0.6, 92); g.lineTo(168 + L * 0.6, 100); g.lineTo(160 + L * 0.6, 108); g.lineTo(152 + L * 0.6, 100);
  g.fill();
  return c;
}

/** Les 5 inclinaisons d'un bolide (gauche franche à droite franche). */
export function carSet(col: string, col2: string): Img[] {
  return [-1, -0.5, 0, 0.5, 1].map(l => carSprite(col, col2, l));
}
