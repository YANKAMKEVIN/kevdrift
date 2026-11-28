/** Types de la simulation de course (aucun DOM). */
import type { Course } from './track.ts';

export type Phase = 'title' | 'countdown' | 'race' | 'pause' | 'finish';
export type Sfx = 'beep' | 'go' | 'click' | 'boost' | 'bump' | 'hop' | 'lap' | 'win';

/** Commandes enfoncées. */
export interface Input {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
}

/** Voiture du joueur. x : position latérale (0 au centre, ±1 aux bords de la route). */
export interface Player {
  x: number;
  speed: number;
  drift: boolean;
  dDir: number;
  charge: number;
  boostT: number;
  boostLvl: number;
  padCD: number;
  lean: number;
  hitCD: number;
  finalRank: number;
  finalT: number;
}

export interface Rival {
  /** Rang dans RIVALS (sert au rendu pour choisir l'image). */
  k: number;
  name: string;
  col: string;
  /** Distance totale parcourue depuis le départ. */
  d: number;
  /** Profondeur sur le circuit (bouclée). */
  z: number;
  x: number;
  lane: number;
  speed: number;
  top: number;
  steer: number;
}

/** Ce que la course annonce à l'interface et au son (tout est facultatif sous Node). */
export interface RaceEvents {
  bigMsg(text: string, col: string): void;
  toast(text: string, col: string): void;
  flash(a: number): void;
  sfx(kind: Sfx): void;
  /** Arrivée franchie (rang et temps dans race.player). */
  finished(): void;
  /** Le moment de montrer les résultats est venu (2,2 s après l'arrivée). */
  results(): void;
  resultsShown(): boolean;
}

export interface Race {
  course: Course;
  car: number;
  phase: Phase;
  prevPhase: Phase;
  pos: number;
  raceT: number;
  lapT: number;
  bestLap: number;
  lap: number;
  cd: number;
  lastCd: number;
  finishT: number;
  shake: number;
  skyX: number;
  time: number;
  lastRank: number;
  rivals: Rival[];
  lapTimes: number[];
  player: Player;
  input: Input;
  /** La voiture se pilote seule pendant la course (?robot, démo). */
  autopilot: boolean;
  /** Accélération automatique (mode tactile). */
  autoThrottle: boolean;
  events: RaceEvents;
}
