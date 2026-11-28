import { describe, expect, test } from 'vitest';
import { recorder, run, startOn } from './helpers.ts';
import { attract, courseFor, createRace, emptyInput, pause, resetRace, resume, startCountdown, update } from '../../src/sim/race.ts';
import { botInput, drive } from '../../src/sim/bot.ts';
import { LAPS, MAXS, PZ, STEP } from '../../src/sim/config.ts';

describe('compte à rebours', () => {
  test('3, 2, 1, GO puis la course', () => {
    const ev = recorder();
    const r = createRace(0, 0, ev);
    startCountdown(r);
    expect(r.phase).toBe('countdown');
    run(r, 4.1);
    expect(r.phase).toBe('race');
    expect(ev.big.slice(0, 4)).toEqual(['3', '2', '1', 'GO!']);
    expect(ev.sounds.filter(s => s === 'beep')).toHaveLength(3);
    expect(ev.sounds).toContain('go');
  });
  test('pendant le compte à rebours, la voiture ne bouge pas et le chrono est arrêté', () => {
    const r = createRace(0, 0);
    startCountdown(r);
    r.input.up = true;
    run(r, 3);
    expect(r.pos).toBe(0);
    expect(r.raceT).toBe(0);
    expect(r.player.speed).toBe(0);
  });
  test('les rivaux attendent aussi le départ', () => {
    const r = createRace(0, 0);
    startCountdown(r);
    run(r, 3);
    expect(r.rivals.every(o => o.speed === 0)).toBe(true);
  });
  test('départ parfait : accélérateur enfoncé au GO = petit boost', () => {
    const r = createRace(0, 0);
    startCountdown(r);
    r.input.up = true;
    run(r, 4.05);
    expect(r.player.boostLvl).toBe(1);
    expect(r.player.boostT).toBeGreaterThan(0);
    const r2 = createRace(0, 0);
    startCountdown(r2);
    run(r2, 4.05);
    expect(r2.player.boostT).toBe(0);
  });
});

describe('tours et arrivée', () => {
  test('passer la ligne compte un tour et annonce le suivant', () => {
    const ev = recorder();
    const r = startOn(0, 0, ev);
    r.pos = r.course.length - 50; r.player.speed = MAXS;
    r.lapT = 40;
    update(r, STEP);
    expect(r.lap).toBe(1);
    expect(r.lapTimes).toHaveLength(1);
    expect(r.lapTimes[0]).toBeCloseTo(40 + STEP);
    expect(r.lapT).toBe(0);
    expect(r.bestLap).toBeCloseTo(40 + STEP);
    expect(ev.big).toContain('TOUR 2');
    expect(ev.sounds).toContain('lap');
  });
  test('avant-dernier passage : DERNIER TOUR', () => {
    const ev = recorder();
    const r = startOn(0, 0, ev);
    r.lap = LAPS - 2; r.pos = r.course.length - 50; r.player.speed = MAXS;
    update(r, STEP);
    expect(ev.big).toContain('DERNIER TOUR');
  });
  test('dernier passage : arrivée, rang et temps figés, un seul événement', () => {
    const ev = recorder();
    const r = startOn(0, 0, ev);
    r.lap = LAPS - 1; r.pos = r.course.length - 50; r.player.speed = MAXS; r.raceT = 100;
    for (const o of r.rivals) o.d = -1;
    update(r, STEP);
    expect(r.phase).toBe('finish');
    expect(r.player.finalRank).toBe(1);
    expect(r.player.finalT).toBeCloseTo(100 + STEP);
    expect(ev.big).toContain('VICTOIRE');
    expect(ev.sounds).toContain('win');
    expect(ev.finishedCount).toBe(1);
    run(r, 5);
    expect(ev.finishedCount).toBe(1);
    expect(ev.resultsCount).toBe(1);
  });
  test('arrivée hors du podium : ARRIVÉE, pas de fanfare', () => {
    const ev = recorder();
    const r = startOn(0, 0, ev);
    r.lap = LAPS - 1; r.pos = r.course.length - 50; r.player.speed = MAXS;
    for (const o of r.rivals) o.d = 1e9;
    update(r, STEP);
    expect(r.player.finalRank).toBe(8);
    expect(ev.big).toContain('ARRIVÉE');
    expect(ev.sounds).not.toContain('win');
  });
  test('les résultats arrivent 2,2 s après l\'arrivée', () => {
    const ev = recorder();
    const r = startOn(0, 0, ev);
    r.lap = LAPS - 1; r.pos = r.course.length - 50; r.player.speed = MAXS;
    update(r, STEP);
    run(r, 2);
    expect(ev.resultsCount).toBe(0);
    run(r, 0.4);
    expect(ev.resultsCount).toBe(1);
  });
  test('après l\'arrivée, la voiture continue seule, au ralenti, sans compter de tour', () => {
    const r = startOn(0);
    r.lap = LAPS - 1; r.pos = r.course.length - 50; r.player.speed = MAXS;
    update(r, STEP);
    run(r, 120);
    expect(r.lap).toBe(LAPS);
    expect(r.player.speed).toBeLessThan(MAXS * 0.6);
    expect(r.player.speed).toBeGreaterThan(0);
  });
  test('reculer sous la ligne ne compte pas de tour', () => {
    const r = startOn(0);
    r.pos = 10; r.player.speed = 0;
    update(r, STEP);
    expect(r.lap).toBe(0);
  });
  test('+1 PLACE quand on dépasse quelqu\'un', () => {
    const ev = recorder();
    const r = startOn(0, 0, ev);
    r.lap = 1; r.pos = 5000;
    r.lastRank = 8;
    for (const o of r.rivals) o.d = 1e9;
    r.rivals[0].d = 0;
    update(r, STEP);
    expect(ev.toasts).toContain('+1 PLACE');
    expect(r.lastRank).toBe(7);
  });
});

describe('pause', () => {
  test('la pause fige tout et relâche les commandes', () => {
    const r = startOn(0);
    run(r, 2, rr => { rr.input.up = true; });
    expect(pause(r)).toBe(true);
    expect(r.input).toEqual(emptyInput());
    const snap = JSON.stringify([r.pos, r.raceT, r.rivals.map(o => o.d)]);
    run(r, 3);
    expect(JSON.stringify([r.pos, r.raceT, r.rivals.map(o => o.d)])).toBe(snap);
    expect(resume(r)).toBe(true);
    expect(r.phase).toBe('race');
  });
  test('pause pendant le compte à rebours : on y revient', () => {
    const r = createRace(0, 0);
    startCountdown(r);
    run(r, 1);
    pause(r);
    resume(r);
    expect(r.phase).toBe('countdown');
  });
  test('pas de pause sur l\'écran titre ni après l\'arrivée', () => {
    const r = createRace(0, 0);
    expect(pause(r)).toBe(false);
    r.phase = 'finish';
    expect(pause(r)).toBe(false);
    expect(resume(r)).toBe(false);
  });
});

describe('remise à zéro et écran titre', () => {
  test('resetRace remet la grille et change de circuit et de voiture', () => {
    const r = startOn(0);
    run(r, 10, rr => { rr.input.up = true; });
    resetRace(r, 2, 1);
    expect(r.course).toBe(courseFor(2));
    expect(r.car).toBe(1);
    expect(r.pos).toBe(0);
    expect(r.lap).toBe(0);
    expect(r.lapTimes).toEqual([]);
    expect(r.player.speed).toBe(0);
    expect(r.player.x).toBe(0.5);
    expect(r.bestLap).toBe(Infinity);
  });
  test('les circuits sont construits une seule fois', () => {
    expect(courseFor(1)).toBe(courseFor(1));
  });
  test('mode attraction : la course tourne seule sans chrono', () => {
    const r = createRace(0, 0);
    attract(r, 1);
    expect(r.phase).toBe('title');
    run(r, 20);
    expect(r.pos).toBeGreaterThan(0);
    expect(r.raceT).toBe(0);
    expect(r.lap).toBe(0);
    expect(Math.abs(r.player.x)).toBeLessThan(1.08);
  });
  test('la simulation est déterministe', () => {
    const go = () => {
      const r = createRace(2, 1);
      startCountdown(r);
      drive(r, { drift: true, limit: 60 });
      return [r.pos, r.player.x, r.player.speed, ...r.rivals.map(o => o.d)];
    };
    expect(go()).toEqual(go());
  });
  test('le robot ne touche ni au frein ni aux deux directions à la fois', () => {
    const r = startOn(0);
    for (let k = 0; k < 600; k++) {
      botInput(r, true);
      expect(r.input.down).toBe(false);
      expect(r.input.left && r.input.right).toBe(false);
      update(r, STEP);
    }
    expect(r.pos + PZ).toBeGreaterThan(PZ);
  });
});
