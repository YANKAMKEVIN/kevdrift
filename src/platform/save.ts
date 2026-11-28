/**
 * Sauvegarde versionnée : circuit et machine choisis, réglages, records par circuit.
 *
 * Règles :
 * - toute modification du format incrémente SAVE_VERSION et ajoute une étape à migrate() ;
 * - une sauvegarde illisible, ou plus récente que le jeu, n'est jamais écrasée en silence :
 *   elle est mise de côté sous KEY + '.abimee' et le jeu repart des valeurs par défaut ;
 * - un champ abîmé dans une sauvegarde lisible est remplacé par sa valeur par défaut, les
 *   autres (records surtout) sont gardés ; l'original est quand même mis de côté ;
 * - les anciennes clés séparées (kevdrift.track, kevdrift.best0…) sont reprises une fois ;
 * - localStorage absent, bloqué ou plein : le jeu marche, simplement sans mémoire.
 *
 * Pur : le stockage est passé en paramètre (testé sous Node avec un faux stockage).
 */
import { CARS, TRACKS } from '../sim/config.ts';

export const KEY = 'kevdrift.sauvegarde';
export const STASH = KEY + '.abimee';
export const SAVE_VERSION = 2;
const LEGACY = 'kevdrift.';
const LEGACY_KEYS = ['track', 'car', 'music', ...TRACKS.map((_, i) => 'best' + i)];

export interface Settings {
  /** Musique synthwave. */
  music: boolean;
  /** Bruitages et moteur. */
  sfx: boolean;
  /** Secousses et flashs de l'écran (à couper si ça gêne). */
  shake: boolean;
}

export interface TrackRecord {
  /** Meilleur temps de course (3 tours), en secondes. */
  race: number | null;
  /** Meilleur tour, en secondes. */
  lap: number | null;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  /** Identifiant du circuit choisi (TRACKS[].id). */
  track: string;
  /** Identifiant de la machine choisie (CARS[].id). */
  car: string;
  settings: Settings;
  /** Records par identifiant de circuit : l'ordre des circuits peut changer sans rien perdre. */
  records: Record<string, TrackRecord>;
}

/** Version 1 (jeu 1.1.0) : numéros de circuit et de voiture, un seul record par circuit. */
export interface SaveV1 {
  version: 1;
  track: number;
  car: number;
  music: boolean;
  best: (number | null)[];
}

export interface Storage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export type LoadStatus = 'new' | 'ok' | 'legacy' | 'migrated' | 'repaired' | 'corrupt' | 'newer' | 'unavailable';

export interface Loaded {
  data: SaveData;
  status: LoadStatus;
}

export function defaultSettings(): Settings {
  return { music: true, sfx: true, shake: true };
}

export function defaults(): SaveData {
  const records: Record<string, TrackRecord> = {};
  for (const t of TRACKS) records[t.id] = { race: null, lap: null };
  return { version: SAVE_VERSION, track: TRACKS[0].id, car: CARS[0].id, settings: defaultSettings(), records };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const intIn = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

/** Un temps plausible (secondes) : ni négatif, ni absurde. */
export function isTime(t: unknown): t is number {
  return typeof t === 'number' && Number.isFinite(t) && t > 5 && t < 3600;
}

/** v1 -> v2 : numéros -> identifiants, musique -> réglages, best[i] -> records[id].race. */
export function v1ToV2(d: Record<string, unknown>): Record<string, unknown> {
  const best = Array.isArray(d.best) ? d.best : [];
  const records: Record<string, TrackRecord> = {};
  TRACKS.forEach((t, i) => {
    records[t.id] = { race: isTime(best[i]) ? best[i] : null, lap: null };
  });
  return {
    version: 2,
    track: intIn(d.track, 0, TRACKS.length - 1) ? TRACKS[d.track].id : d.track,
    car: intIn(d.car, 0, CARS.length - 1) ? CARS[d.car].id : d.car,
    settings: { music: d.music, sfx: true, shake: true },
    records,
  };
}

/** Amène une sauvegarde lue à la version courante ; null si ce n'est pas une sauvegarde ou si elle vient du futur. */
export function migrate(raw: unknown): Record<string, unknown> | null {
  if (!isObj(raw)) return null;
  const v = raw.version;
  if (!Number.isInteger(v) || (v as number) < 1 || (v as number) > SAVE_VERSION) return null;
  let d: Record<string, unknown> = structuredClone(raw);
  if (d.version === 1) d = v1ToV2(d);
  // Étapes futures : if (d.version === 2) d = v2ToV3(d);
  return d;
}

/** Remplace chaque champ abîmé par sa valeur par défaut. `repaired` dit s'il a fallu le faire. */
export function sanitize(d: Record<string, unknown>): { data: SaveData; repaired: boolean } {
  const out = defaults();
  let repaired = false;
  const fix = <T>(ok: boolean, v: unknown, fallback: T): T => {
    if (ok) return v as T;
    repaired = true;
    return fallback;
  };
  out.track = fix(TRACKS.some(t => t.id === d.track), d.track, out.track);
  out.car = fix(CARS.some(c => c.id === d.car), d.car, out.car);
  if (!isObj(d.settings) || !isObj(d.records)) repaired = true;
  const s = isObj(d.settings) ? d.settings : {};
  for (const k of ['music', 'sfx', 'shake'] as const) out.settings[k] = fix(typeof s[k] === 'boolean', s[k], out.settings[k]);
  const recs = isObj(d.records) ? d.records : {};
  for (const t of TRACKS) {
    const r = recs[t.id];
    if (r === undefined) continue;
    if (!isObj(r)) { repaired = true; continue; }
    for (const k of ['race', 'lap'] as const) out.records[t.id][k] = fix(r[k] === null || isTime(r[k]), r[k], null);
  }
  return { data: out, repaired };
}

/** Texte stocké -> sauvegarde ; null si illisible ou plus récente que le jeu. */
export function parse(text: string): { data: SaveData; repaired: boolean; migrated: boolean } | null {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return null; }
  const d = migrate(raw);
  if (!d) return null;
  return { ...sanitize(d), migrated: isObj(raw) && raw.version !== SAVE_VERSION };
}

/** Reprend les anciennes clés séparées (avant la sauvegarde versionnée) ; null s'il n'y en a pas. */
export function fromLegacy(st: Storage): SaveData | null {
  const get = (k: string): unknown => {
    try {
      const v = st.getItem(LEGACY + k);
      return v == null ? undefined : JSON.parse(v);
    } catch { return undefined; }
  };
  const vals: Record<string, unknown> = {};
  for (const k of LEGACY_KEYS) vals[k] = get(k);
  if (LEGACY_KEYS.every(k => vals[k] === undefined)) return null;
  const v1 = {
    version: 1,
    track: intIn(vals.track, 0, TRACKS.length - 1) ? vals.track : 0,
    car: intIn(vals.car, 0, CARS.length - 1) ? vals.car : 0,
    music: typeof vals.music === 'boolean' ? vals.music : true,
    best: TRACKS.map((_, i) => (isTime(vals['best' + i]) ? vals['best' + i] : null)),
  };
  return sanitize(v1ToV2(v1)).data;
}

/** Met de côté un texte illisible (sans jamais planter). */
function stash(st: Storage, text: string): void {
  try {
    st.setItem(STASH, text);
  } catch { /* stockage plein ou bloqué : tant pis, on ne plante pas */ }
}

export function load(st: Storage | null): Loaded {
  if (!st) return { data: defaults(), status: 'unavailable' };
  let text: string | null;
  try { text = st.getItem(KEY); } catch { return { data: defaults(), status: 'unavailable' }; }
  if (text == null) {
    const old = fromLegacy(st);
    if (!old) return { data: defaults(), status: 'new' };
    if (save(st, old)) for (const k of LEGACY_KEYS) try { st.removeItem(LEGACY + k); } catch { /* rien */ }
    return { data: old, status: 'legacy' };
  }
  const p = parse(text);
  if (!p) {
    let newer = false;
    try { const raw = JSON.parse(text); newer = isObj(raw) && Number.isInteger(raw.version) && (raw.version as number) > SAVE_VERSION; } catch { /* illisible */ }
    stash(st, text);
    try { st.removeItem(KEY); } catch { /* rien */ }
    return { data: defaults(), status: newer ? 'newer' : 'corrupt' };
  }
  if (p.repaired) stash(st, text);
  if (p.repaired || p.migrated) save(st, p.data);
  return { data: p.data, status: p.repaired ? 'repaired' : p.migrated ? 'migrated' : 'ok' };
}

export function save(st: Storage | null, d: SaveData): boolean {
  if (!st) return false;
  try {
    st.setItem(KEY, JSON.stringify(d));
    return true;
  } catch { return false; }
}

/** localStorage s'il est utilisable, sinon null (navigation privée stricte, cookies bloqués, Node). */
export function browserStorage(): Storage | null {
  try {
    const s = (globalThis as { localStorage?: Storage }).localStorage;
    if (!s) return null;
    s.getItem(KEY);
    return s;
  } catch { return null; }
}
