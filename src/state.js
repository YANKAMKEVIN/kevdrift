// @ts-check
/** État de la course partagé par les modules, et liaisons vers l'interface. */
import { store } from './save.js';
import { TRACKS } from './config.js';

/**
 * @typedef {{w:{x?:number,y:number,z:number},c:any,s:any}} Point
 * @typedef {{i:number,p1:Point,p2:Point,curve:number,sprites:{img:any,off:number,w:number,col:boolean}[],cars:Rival[],pad:number|null,stripe:number,start:boolean,clip:number,vis?:boolean}} Seg
 * @typedef {{name:string,col:string,d:number,z:number,x:number,lane:number,speed:number,top:number,imgs:(HTMLCanvasElement|HTMLImageElement)[],steer:number}} Rival
 */

/** État mutable partagé (anciennes variables globales). */
export const etat = {
  DRAW: 260,
  W: 0,
  H: 0,
  DPR: 1,
  PX: 1,
  PY: 1,
  CY: 0,
  musicOn: store.get('music',true),
  /** @type {Record<string,any>} images du décor (sprites.js) */
  SP: {},
  /** @type {Seg[]} */
  segs: [],
  trackLen: 0,
  T: TRACKS[0],
  state: 'title',
  pos: 0,
  raceT: 0,
  lapT: 0,
  bestLap: Infinity,
  lap: 0,
  cd: 0,
  finishT: 0,
  shake: 0,
  skyX: 0,
  time: 0,
  lastRank: 8,
  /** @type {Rival[]} */
  rivals: [],
  touchMode: false,
  /** @type {(HTMLCanvasElement|HTMLImageElement)[]} */
  carImgs: [],
  /** @type {(HTMLCanvasElement|HTMLImageElement)[][]} */
  rivalImgs: [],
  /** @type {{x:number,y:number,vx:number,vy:number,c:string,l:number,ml:number,s:number,line?:boolean}[]} */
  particles: [],
  /** @type {number[]} */
  lapTimes: [],
  /** @type {any} contexte audio (null tant que le joueur n'a rien touché) */
  AC: null,
  /** @type {any} */ master: undefined,
  /** @type {any} */ musicG: undefined,
  /** @type {any} */ sfxG: undefined,
  /** @type {any} */ rev: undefined,
  /** @type {any} */ dly: undefined,
  /** @type {any} */ noiseB: undefined,
  /** @type {any} */ eng: null,
  step: 0,
  nextT: 0,
  /** @type {any} */ song: null,
  songIdx: -1,
  /** @type {any} */ schedId: 0,
  lastCd: 4,
  prevState: 'race',
  last: performance.now(),
  acc: 0,
  fpsv: 0,
  fc: 0,
  ft: 0,
};
/** Voiture du joueur.
 * @type {{x:number,speed:number,drift:boolean,dDir:number,charge:number,boostT:number,boostLvl:number,padCD:number,lean:number,hitCD:number,finalRank?:number,finalT?:number,newRec?:boolean,boostLvlPreview?:number}} */
export const P={x:0,speed:0,drift:false,dDir:0,charge:0,boostT:0,boostLvl:0,padCD:0,lean:0,hitCD:0};
/** @type {Record<string,boolean>} commandes enfoncées */
export const inp={up:false,down:false,left:false,right:false,drift:false};
// ================== LOGIQUE ==================
/** Ce que la course annonce à l'interface (vide sous Node, branché par ui.js). */
export const fx={bigMsg(t,c){},toast(t,c){},flash(a){},sfx(k){},results(){},resultsShown(){return false},carImgs(i){}};
export function carBase(){return etat.H-(etat.touchMode&&etat.H>etat.W*1.1?Math.min(190,etat.H*.22):Math.max(8,etat.H*.025))}
