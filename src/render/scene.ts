/** Ce que le rendu garde entre deux images : canvas, décor du circuit, images des voitures. */
import { CARS, RIVALS, TRACKS } from '../sim/config.ts';
import { art, CAR_ART, tintedRival } from './art.ts';
import { carSet, type Ctx, type Img } from './sprites-cars.ts';
import { buildDeco, type DecoSprites } from './sprites-deco.ts';

export const scene = {
  ctx: null as Ctx | null,
  deco: null as DecoSprites | null,
  decoTrack: -1,
  /** 5 inclinaisons de la voiture du joueur. */
  carImgs: [] as Img[],
  /** 5 inclinaisons pour chaque rival. */
  rivalImgs: [] as Img[][],
  /** Secousses de l'écran autorisées (réglage). */
  shake: true,
};

/** Décor du circuit (redessiné seulement quand on change de circuit). */
export function useTrack(ti: number): void {
  if (scene.decoTrack === ti && scene.deco) return;
  scene.deco = buildDeco(TRACKS[ti]);
  scene.decoTrack = ti;
}

/** Image de la machine choisie : peinte si prête, sinon dessinée. */
export function useCar(ci: number): void {
  const C = CARS[ci];
  const im = art(CAR_ART[ci]);
  scene.carImgs = im ? [im, im, im, im, im] : carSet(C.col, C.col2);
}

/** Bolides des rivaux : dessinés d'abord, puis repeints quand l'image peinte arrive. */
export function buildRivalImgs(): void {
  scene.rivalImgs = RIVALS.map(r => {
    const c = tintedRival(r[1]);
    return c ? [c, c, c, c, c] : carSet(r[1], r[2]);
  });
}
