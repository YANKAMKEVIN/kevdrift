/** Géométrie de l'écran : taille, densité de pixels plafonnée, horizon, place de la voiture. */

export const view = {
  W: 0,
  H: 0,
  DPR: 1,
  /** Échelle horizontale et verticale de la projection. */
  PX: 1,
  PY: 1,
  /** Hauteur de l'horizon. */
  CY: 0,
  /** Nombre de segments dessinés (moins sur petit écran). */
  DRAW: 260,
  /** Le joueur a touché l'écran : boutons tactiles et accélération automatique. */
  touchMode: false,
};

/** Densité de pixels maximale et budget de pixels du canvas (perf mobile). */
export const MAX_DPR = 1.5;
export const PIXEL_BUDGET = 2.4e6;
/** Nombre maximal de segments dessinés (taille des tableaux de projection). */
export const MAX_DRAW = 260;

export const portrait = (): boolean => view.H > view.W * 1.1;

/** Bas de la voiture du joueur : plus haut en portrait tactile pour laisser la place aux boutons. */
export function carBase(): number {
  const { H, W } = view;
  return H - (view.touchMode && H > W * 1.1 ? Math.min(190, H * 0.22) : Math.max(8, H * 0.025));
}

/** Densité retenue : celle de l'écran, plafonnée à MAX_DPR et au budget de pixels. */
export function cappedDpr(deviceDpr: number, w: number, h: number): number {
  const dpr = Math.min(deviceDpr || 1, MAX_DPR);
  return Math.min(dpr, Math.sqrt(PIXEL_BUDGET / Math.max(1, w * h)));
}

/** Recalcule la vue pour une fenêtre w × h. */
export function layout(w: number, h: number, deviceDpr: number): void {
  view.W = w;
  view.H = h;
  view.DPR = cappedDpr(deviceDpr, w, h);
  view.PX = Math.max(w / 2, h * 0.36);
  view.CY = portrait() ? h * 0.44 : h * 0.5;
  view.PY = carBase() - view.CY + h * 0.012;
  view.DRAW = w < 700 ? 200 : MAX_DRAW;
}
