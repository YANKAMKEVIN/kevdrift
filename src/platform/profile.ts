/** Profil du joueur : la sauvegarde en mémoire, écrite à chaque changement. */
import { CARS, TRACKS } from '../sim/config.ts';
import { isTime, load, save, type LoadStatus, type SaveData, type Settings, type Storage } from './save.ts';

export interface RecordOutcome {
  /** Nouveau meilleur temps de course sur ce circuit. */
  race: boolean;
  /** Nouveau meilleur tour sur ce circuit. */
  lap: boolean;
}

export class Profile {
  readonly data: SaveData;
  readonly status: LoadStatus;
  private readonly st: Storage | null;

  constructor(st: Storage | null) {
    this.st = st;
    const l = load(st);
    this.data = l.data;
    this.status = l.status;
  }

  /** Écrit la sauvegarde ; faux si le stockage est indisponible (le jeu continue en mémoire). */
  persist(): boolean {
    return save(this.st, this.data);
  }

  get trackIndex(): number {
    return Math.max(0, TRACKS.findIndex(t => t.id === this.data.track));
  }

  set trackIndex(i: number) {
    this.data.track = TRACKS[i].id;
    this.persist();
  }

  get carIndex(): number {
    return Math.max(0, CARS.findIndex(c => c.id === this.data.car));
  }

  set carIndex(i: number) {
    this.data.car = CARS[i].id;
    this.persist();
  }

  get settings(): Readonly<Settings> {
    return this.data.settings;
  }

  setSetting(k: keyof Settings, v: boolean): void {
    this.data.settings[k] = v;
    this.persist();
  }

  bestRace(ti: number): number | null {
    return this.data.records[TRACKS[ti].id]?.race ?? null;
  }

  bestLap(ti: number): number | null {
    return this.data.records[TRACKS[ti].id]?.lap ?? null;
  }

  /** Enregistre une course terminée ; dit ce qui est un nouveau record. */
  recordResult(ti: number, total: number, bestLap: number): RecordOutcome {
    const id = TRACKS[ti].id;
    const rec = (this.data.records[id] ??= { race: null, lap: null });
    const out: RecordOutcome = { race: false, lap: false };
    if (isTime(total) && (rec.race === null || total < rec.race)) {
      rec.race = total;
      out.race = true;
    }
    if (isTime(bestLap) && (rec.lap === null || bestLap < rec.lap)) {
      rec.lap = bestLap;
      out.lap = true;
    }
    if (out.race || out.lap) this.persist();
    return out;
  }
}
