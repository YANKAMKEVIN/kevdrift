// @ts-check
/**
 * Visuels peints avec Codex (dossier art/, prompts dans tools/art/prompts.json).
 * Le jeu reste jouable sans eux : tant qu'une image n'est pas chargée, le dessin
 * procédural d'origine prend le relais.
 */

export const ART_FILES = /** @type {const} */ ([
  'titre', 'ciel_neon', 'ciel_dunes', 'ciel_orbital',
  'voiture_rose', 'voiture_cyan', 'voiture_or', 'voiture_rivale',
]);

/** Panorama de chaque circuit et bolide de chaque machine, dans l'ordre de TRACKS et CARS. */
export const SKY_ART = ['ciel_neon', 'ciel_dunes', 'ciel_orbital'];
export const CAR_ART = ['voiture_rose', 'voiture_cyan', 'voiture_or'];

/** @type {Map<string, HTMLImageElement>} */
const loaded = new Map();

/**
 * Charge tous les visuels. Se résout quand tout est chargé, ou au bout de `maxMs`
 * (une image lente ou absente ne bloque jamais le jeu).
 * @param {number} [maxMs]
 * @returns {Promise<number>} nombre d'images prêtes
 */
export function loadArt(maxMs = 4000) {
  const all = ART_FILES.map(name => new Promise(res => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { loaded.set(name, im); res(true); };
    im.onerror = () => res(false);
    im.src = `art/${name}.webp`;
  }));
  return Promise.race([
    Promise.all(all),
    new Promise(res => setTimeout(res, maxMs)),
  ]).then(() => loaded.size);
}

/**
 * L'image si elle est prête, sinon null.
 * @param {string} name
 * @returns {HTMLImageElement|null}
 */
export function art(name) { return loaded.get(name) || null; }

/**
 * Le bolide générique repeint à la couleur d'un rival (le blanc nacré prend la teinte,
 * les vitres et les feux restent sombres ou rouges).
 * @param {string} col
 * @returns {HTMLCanvasElement|null}
 */
export function tintedRival(col) {
  const im = art('voiture_rivale'); if (!im) return null;
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(im, 0, 0);
  return c;
}
