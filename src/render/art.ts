/**
 * Visuels peints (dossier public/art/, prompts dans tools/art/prompts.json).
 * Le jeu reste jouable sans eux : tant qu'une image n'est pas chargée, le dessin
 * procédural d'origine prend le relais.
 */
import { mk } from './sprites-cars.ts';

export const ART_FILES = [
  'titre', 'ciel_neon', 'ciel_dunes', 'ciel_orbital',
  'voiture_rose', 'voiture_cyan', 'voiture_or', 'voiture_rivale',
] as const;
export type ArtName = (typeof ART_FILES)[number];

/** Panorama de chaque circuit et bolide de chaque machine, dans l'ordre de TRACKS et CARS. */
export const SKY_ART: readonly ArtName[] = ['ciel_neon', 'ciel_dunes', 'ciel_orbital'];
export const CAR_ART: readonly ArtName[] = ['voiture_rose', 'voiture_cyan', 'voiture_or'];

const loaded = new Map<string, HTMLImageElement>();

/** Adresse d'un visuel, relative à la page (marche en local comme sous /kevdrift/). */
export const artUrl = (name: string): string => `${import.meta.env.BASE_URL}art/${name}.webp`;

/**
 * Charge tous les visuels. Se résout quand tout est chargé, ou au bout de `maxMs`
 * (une image lente ou absente ne bloque jamais le jeu). Renvoie le nombre d'images prêtes.
 */
export function loadArt(maxMs = 4000): Promise<number> {
  const all = ART_FILES.map(
    name =>
      new Promise<boolean>(res => {
        const im = new Image();
        im.decoding = 'async';
        im.onload = () => { loaded.set(name, im); res(true); };
        im.onerror = () => res(false);
        im.src = artUrl(name);
      }),
  );
  return Promise.race([Promise.all(all), new Promise(res => setTimeout(res, maxMs))]).then(() => loaded.size);
}

/** L'image si elle est prête, sinon null. */
export function art(name: ArtName): HTMLImageElement | null {
  return loaded.get(name) ?? null;
}

/**
 * Le bolide générique repeint à la couleur d'un rival (le blanc nacré prend la teinte,
 * les vitres et les feux restent sombres ou rouges).
 */
export function tintedRival(col: string): HTMLCanvasElement | null {
  const im = art('voiture_rivale');
  if (!im) return null;
  const [c, g] = mk(im.width, im.height);
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = col;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(im, 0, 0);
  return c;
}
