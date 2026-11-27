// @ts-check
/** Sauvegarde versionnée : circuit et voiture choisis, musique, records par circuit.
 *
 * Règle : toute modification du format incrémente SAVE_VERSION et ajoute une étape
 * à migrate(). Une sauvegarde abîmée ou plus récente que le jeu n'est jamais écrasée
 * en silence : elle est mise de côté sous KEY + '.abimee'.
 * Les anciennes clés séparées (kevdrift.track, kevdrift.best0…) sont reprises une fois. */
import { TRACKS, CARS } from './config.js';

export const KEY = 'kevdrift.sauvegarde';
export const SAVE_VERSION = 1;
const LEGACY = 'kevdrift.';

/** @typedef {{version:number,track:number,car:number,music:boolean,best:(number|null)[]}} SaveData */
/** @typedef {{getItem(k:string):string|null,setItem(k:string,v:string):void,removeItem(k:string):void}} Store */

/** @returns {SaveData} */
export function defaults() { return { version: SAVE_VERSION, track: 0, car: 0, music: true, best: TRACKS.map(() => null) }; }

/** @param {unknown} v @param {number} lo @param {number} hi */
const intIn = (v, lo, hi) => Number.isInteger(v) && /** @type {number} */ (v) >= lo && /** @type {number} */ (v) <= hi;
/** Un temps de course plausible (secondes), ou null. @param {unknown} t */
const time = t => t === null || (typeof t === 'number' && Number.isFinite(t) && t > 5 && t < 3600);

/** @param {any} d @returns {any} */
export function migrate(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  if (!Number.isInteger(d.version) || d.version < 1 || d.version > SAVE_VERSION) return null;
  const out = structuredClone(d);
  // Étapes futures : if (out.version === 1) out = v1ToV2(out);
  return out;
}

/** @param {any} d @returns {d is SaveData} */
export function isValid(d) {
  return !!d && d.version === SAVE_VERSION && intIn(d.track, 0, TRACKS.length - 1) && intIn(d.car, 0, CARS.length - 1)
    && typeof d.music === 'boolean' && Array.isArray(d.best) && d.best.length === TRACKS.length && d.best.every(time);
}

/** @param {string|null} text */
export function parse(text) {
  if (text == null) return null;
  try { const d = migrate(JSON.parse(text)); return isValid(d) ? d : null; } catch { return null; }
}

/** Reprend les anciennes clés séparées (avant la sauvegarde versionnée) ; null s'il n'y en a pas.
 * Une valeur abîmée est ignorée, les autres sont gardées.
 * @param {Store} st @returns {SaveData|null} */
export function fromLegacy(st) {
  /** @param {string} k */
  const get = k => { try { const v = st.getItem(LEGACY + k); return v == null ? undefined : JSON.parse(v); } catch { return undefined; } };
  const keys = ['track', 'car', 'music', ...TRACKS.map((_, i) => 'best' + i)];
  const vals = Object.fromEntries(keys.map(k => [k, get(k)]));
  if (keys.every(k => vals[k] === undefined)) return null;
  const d = defaults();
  if (intIn(vals.track, 0, TRACKS.length - 1)) d.track = vals.track;
  if (intIn(vals.car, 0, CARS.length - 1)) d.car = vals.car;
  if (typeof vals.music === 'boolean') d.music = vals.music;
  TRACKS.forEach((_, i) => { const b = vals['best' + i]; if (b !== null && b !== undefined && time(b)) d.best[i] = b; });
  return d;
}

/** @param {Store|null} st @returns {SaveData} */
export function load(st) {
  if (!st) return defaults();
  let text;
  try { text = st.getItem(KEY); } catch { return defaults(); }
  if (text == null) {
    const old = fromLegacy(st);
    if (!old) return defaults();
    if (save(st, old)) for (const k of ['track', 'car', 'music', ...TRACKS.map((_, i) => 'best' + i)]) try { st.removeItem(LEGACY + k); } catch { /* rien */ }
    return old;
  }
  const d = parse(text);
  if (d) return d;
  try { st.setItem(KEY + '.abimee', text); st.removeItem(KEY); } catch { /* stockage plein ou bloqué */ }
  return defaults();
}

/** @param {Store|null} st @param {SaveData} d */
export function save(st, d) {
  if (!st || !isValid(d)) return false;
  try { st.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; }
}

/** @returns {Store|null} */
function browserStore() { try { const s = globalThis.localStorage; s.getItem(KEY); return s; } catch { return null; } }

const st = browserStore();
export const data = load(st);

/** Accès simple utilisé par le jeu : track, car, music, best0…best2.
 * @type {{get(k:string,d:any):any,set(k:string,v:any):void}} */
export const store = {
  get(k, d) {
    if (k === 'track' || k === 'car' || k === 'music') return data[k];
    const m = /^best(\d)$/.exec(k);
    return m ? (data.best[Number(m[1])] ?? d) : d;
  },
  set(k, v) {
    const m = /^best(\d)$/.exec(k);
    if (m) data.best[Number(m[1])] = v; else if (k === 'track' || k === 'car' || k === 'music') /** @type {any} */ (data)[k] = v;
    save(st, data);
  },
};
export const sel = { track: data.track, car: data.car };
