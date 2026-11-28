/** Réglages lus dans l'adresse de la page (utilisés par les tests de bout en bout et les démos). */
const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const hash = typeof location !== 'undefined' ? location.hash : '';

/** ?robot : la voiture se pilote seule (partie jouée par la CI). */
export const ROBOT = q.has('robot');
/** ?turbo=N : la simulation va N fois plus vite (1 à 20). */
export const TURBO = Math.max(1, Math.min(20, Number(q.get('turbo')) || 1));
/** #demo, #demo2, #demo3 : course de démonstration sur le circuit 1, 2 ou 3. */
export const DEMO = hash.startsWith('#demo') ? Math.max(0, Math.min(2, (Number(hash.slice(5)) || 1) - 1)) : -1;
