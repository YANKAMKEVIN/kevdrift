/** Ce que la course annonce : gros messages, bulles, flash, sons, résultats et records. */
import { events, profile, race } from '../app.ts';
import { CARS, TRACKS } from '../sim/config.ts';
import { fmt } from '../sim/util.ts';
import { sfx } from '../audio/sfx.ts';
import { $, el } from './dom.ts';
import { show } from './screens.ts';

let lastOutcome = { race: false, lap: false };

function bigMsg(t: string, col: string): void {
  const m = $('msg');
  m.textContent = t;
  m.style.color = col || '#fff';
  m.classList.remove('pop');
  void m.offsetWidth;
  m.classList.add('pop');
}

function toast(t: string, col: string): void {
  const m = $('toast');
  m.textContent = t;
  m.style.color = col;
  m.style.textShadow = '0 0 18px ' + col;
  m.classList.remove('pop');
  void m.offsetWidth;
  m.classList.add('pop');
}

function flash(a: number): void {
  if (!profile.settings.shake) return;
  const f = $('flash');
  f.style.transition = 'none';
  f.style.opacity = String(a);
  requestAnimationFrame(() => {
    f.style.transition = 'opacity .35s';
    f.style.opacity = '0';
  });
}

function verdict(rank: number): string {
  return rank === 1 ? 'VICTOIRE ÉCLATANTE' : rank <= 3 ? 'SUR LE PODIUM' : rank <= 5 ? 'PAS MAL, ENCORE UN EFFORT' : 'LA REVANCHE T’ATTEND';
}

function showResults(): void {
  const P = race.player;
  const rank = P.finalRank || 8;
  $('rPlace').textContent = rank + (rank === 1 ? 'er' : 'e');
  $('rVerdict').textContent = verdict(rank);
  const rows: [string, string][] = [
    ['Temps total', fmt(P.finalT)],
    ['Meilleur tour', fmt(race.bestLap)],
    ...race.lapTimes.map((t, i): [string, string] => ['Tour ' + (i + 1), fmt(t)]),
    ['Machine', CARS[race.car].name],
  ];
  const tb = $('rTable');
  tb.replaceChildren();
  for (const [a, b] of rows) {
    const tr = el('tr');
    tr.append(el('td', '', a), el('td', '', b));
    tb.appendChild(tr);
  }
  const name = TRACKS[race.course.index].name;
  const lines: string[] = [];
  if (lastOutcome.race) lines.push('★ Nouveau record sur ' + name + ' !');
  if (lastOutcome.lap) lines.push('★ Meilleur tour du circuit : ' + fmt(race.bestLap));
  $('rRec').textContent = lines.join('  ');
  $('hud').classList.remove('on');
  $('touch').classList.remove('on');
  show('sResult');
}

/** Branche les événements de la course sur l'interface. */
export function wireEvents(): void {
  Object.assign(events, {
    bigMsg, toast, flash, sfx,
    finished() {
      lastOutcome = profile.recordResult(race.course.index, race.player.finalT, race.bestLap);
    },
    results: showResults,
    resultsShown: () => $('sResult').classList.contains('on'),
  });
}
