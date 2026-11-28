/** Grille de départ : cartes des circuits (avec records) et des machines, réglages. */
import { profile } from '../app.ts';
import { CARS, TRACKS } from '../sim/config.ts';
import { fmt } from '../sim/util.ts';
import type { Settings } from '../platform/save.ts';
import { art, CAR_ART, SKY_ART } from '../render/art.ts';
import { carSprite, mk } from '../render/sprites-cars.ts';
import { sfx } from '../audio/sfx.ts';
import { $, el } from './dom.ts';

/** Vignette d'un circuit : ciel peint (ou dégradé), soleil, grille et route en perspective. */
function thumb(ti: number): HTMLCanvasElement {
  const t = TRACKS[ti];
  const [c, g] = mk(300, 130);
  const gr = g.createLinearGradient(0, 0, 0, 70);
  t.sky.forEach((col, i) => gr.addColorStop(i / (t.sky.length - 1), col));
  g.fillStyle = gr;
  g.fillRect(0, 0, 300, 70);
  const im = art(SKY_ART[ti]);
  if (im) {
    const sh = (im.width * 70) / 300;
    g.drawImage(im, 0, im.height - sh, im.width, sh, 0, 0, 300, 70);
  }
  const sg = g.createLinearGradient(0, 20, 0, 70);
  sg.addColorStop(0, t.sun[0]);
  sg.addColorStop(1, t.sun[2]);
  g.fillStyle = sg;
  g.beginPath(); g.arc(150, 70, 40, Math.PI, 0); g.fill();
  g.fillStyle = t.ground;
  g.fillRect(0, 70, 300, 60);
  g.strokeStyle = t.grid;
  g.globalAlpha = 0.6;
  for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(150 + i * 6, 70); g.lineTo(150 + i * 60, 130); g.stroke(); }
  for (let y = 74; y < 130; y += (y - 66) * 0.5) { g.beginPath(); g.moveTo(0, y); g.lineTo(300, y); g.stroke(); }
  g.globalAlpha = 1;
  g.fillStyle = t.road;
  g.beginPath(); g.moveTo(146, 70); g.lineTo(154, 70); g.lineTo(230, 130); g.lineTo(70, 130); g.fill();
  g.strokeStyle = t.edge;
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(146, 70); g.lineTo(70, 130); g.moveTo(154, 70); g.lineTo(230, 130); g.stroke();
  return c;
}

function carThumb(i: number): HTMLCanvasElement {
  const c = CARS[i];
  const [cc, g] = mk(300, 130);
  const bg = g.createLinearGradient(0, 0, 0, 130);
  bg.addColorStop(0, '#1a0838');
  bg.addColorStop(1, '#05010f');
  g.fillStyle = bg;
  g.fillRect(0, 0, 300, 130);
  const im = art(CAR_ART[i]);
  if (im) g.drawImage(im, 60, 8, 177, 118);
  else g.drawImage(carSprite(c.col, c.col2, 0), 60, 18, 180, 107);
  return cc;
}

const STAT_NAMES = ['Vitesse', 'Accélération', 'Maniabilité'];
const SETTING_NAMES: Record<keyof Settings, string> = { music: 'Musique', sfx: 'Sons', shake: 'Secousses' };

/** Reconstruit les cartes (après chaque choix) et le texte des réglages. */
export function buildMenus(): void {
  const tr = $('trackRow');
  tr.replaceChildren();
  TRACKS.forEach((t, i) => {
    const b = el('button', 'card' + (i === profile.trackIndex ? ' sel' : ''));
    b.setAttribute('aria-pressed', String(i === profile.trackIndex));
    const best = profile.bestRace(i), lap = profile.bestLap(i);
    b.append(thumb(i), el('div', 'n', t.name), el('div', 's', t.sub));
    const rec = el('div', 's rec-line');
    rec.append(el('span', '', 'Record : ' + (best ? fmt(best) : '—')));
    if (lap) rec.append(el('span', 'lap-rec', ' · tour ' + fmt(lap)));
    b.append(rec);
    b.onclick = () => { profile.trackIndex = i; sfx('click'); buildMenus(); };
    tr.appendChild(b);
  });
  const cr = $('carRow');
  cr.replaceChildren();
  CARS.forEach((c, i) => {
    const b = el('button', 'card' + (i === profile.carIndex ? ' sel' : ''));
    b.setAttribute('aria-pressed', String(i === profile.carIndex));
    const n = el('div', 'n', c.name);
    n.style.color = c.col;
    b.append(carThumb(i), n, el('div', 's', c.sub));
    STAT_NAMES.forEach((l, k) => {
      const d = el('div', 'stat');
      const bar = el('div', 'bar');
      const fill = el('i');
      fill.style.width = c.stats[k] * 20 + '%';
      bar.appendChild(fill);
      d.append(el('span', '', l), bar);
      b.appendChild(d);
    });
    b.onclick = () => { profile.carIndex = i; sfx('click'); buildMenus(); };
    cr.appendChild(b);
  });
  refreshSettings();
}

/** Texte des boutons de réglage (« Musique : oui »), partout où ils apparaissent. */
export function refreshSettings(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-setting]').forEach(b => {
    const k = b.dataset.setting as keyof Settings;
    const on = profile.settings[k];
    b.textContent = `${SETTING_NAMES[k]} : ${on ? 'oui' : 'non'}`;
    b.setAttribute('aria-pressed', String(on));
  });
}
