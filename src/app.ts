/** L'application : profil sauvegardé et course en cours, partagés par l'interface. */
import { browserStorage } from './platform/save.ts';
import { Profile } from './platform/profile.ts';
import { createRace } from './sim/race.ts';
import type { RaceEvents } from './sim/types.ts';

export const profile = new Profile(browserStorage());

/** Les événements sont branchés par l'interface (ui/feedback.ts) au démarrage. */
export const events: RaceEvents = {
  bigMsg() {}, toast() {}, flash() {}, sfx() {}, finished() {}, results() {},
  resultsShown: () => false,
};

export const race = createRace(profile.trackIndex, profile.carIndex, events);
