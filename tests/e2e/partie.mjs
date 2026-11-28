// Parcours complet dans un vrai navigateur (Chromium), voiture pilotée par le robot (?robot) en accéléré :
// titre -> grille -> choix du circuit et de la voiture -> 3 tours -> résultats -> records sauvegardés ->
// circuit suivant -> pause -> réglages -> rechargement -> choix, records et réglages retrouvés ->
// onglet caché (boucle arrêtée) -> anciennes sauvegardes reprises -> sauvegarde abîmée mise de côté.
// Lancer : npm run build && npm run partie
import { setup, sleep, SHOTS } from './browser.mjs';

const KEY = 'kevdrift.sauvegarde';
const fails = [];
const check = (ok, msg) => { console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${msg}`); if (!ok) fails.push(msg); };

const env = await setup();
try {
  const URL = `${env.base}/index.html?robot&turbo=8`;
  const page = await env.browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 3 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const save = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
  const kd = () => page.evaluate(() => window.__kd());

  await page.goto(URL);
  await page.waitForFunction(() => typeof window.__kd === 'function' && window.__kd().running);
  check((await page.locator('#ver').innerText()).startsWith('v'), 'numéro de version sur l\'écran titre');
  check(await page.evaluate(() => window.__kdArt) === 8, 'les 8 visuels peints sont chargés');
  check((await page.locator('#sTitle').evaluate(el => getComputedStyle(el).backgroundImage)).includes('titre.webp'), 'affiche peinte derrière l\'écran titre');
  const cw = await page.evaluate(() => document.getElementById('c').width);
  check(cw <= 1280 * 1.5, `densité de pixels plafonnée (canvas de ${cw} px de large pour un écran ×3)`);
  await page.screenshot({ path: `${SHOTS}/partie-0-titre.png` });
  await page.click('#bPlay');
  await page.locator('#trackRow .card').nth(1).click();
  await page.locator('#carRow .card').nth(2).click();
  await page.screenshot({ path: `${SHOTS}/partie-1-grille.png` });
  await page.click('#bStart');
  await page.waitForFunction(() => window.__kd().state === 'race', null, { timeout: 30000 });
  check(true, 'compte à rebours puis départ');
  await sleep(1500);
  await page.screenshot({ path: `${SHOTS}/partie-2-course.png` });
  const t0 = Date.now();
  await page.waitForSelector('#sResult.on', { timeout: 240000 });
  check(true, `3 tours jusqu'à l'arrivée (${Math.round((Date.now() - t0) / 1000)} s en accéléré)`);
  await page.screenshot({ path: `${SHOTS}/partie-3-resultats.png` });
  const rows = await page.locator('#rTable tr').count();
  check(rows === 6, `tableau des résultats : temps total, meilleur tour, 3 tours, machine (${rows} lignes)`);
  check((await page.locator('#rRec').innerText()).includes('Nouveau record'), 'nouveau record annoncé');
  let d = await save();
  check(d?.version === 2, 'sauvegarde écrite, version 2');
  check(d?.track === 'dunes' && d?.car === 'or', 'circuit et voiture sauvegardés');
  const rec = d?.records?.dunes;
  check(typeof rec?.race === 'number' && rec.race > 30, `record de course sur Dunes de Chrome (${rec?.race?.toFixed?.(2)} s)`);
  check(typeof rec?.lap === 'number' && rec.lap > 10 && rec.lap < rec.race, `meilleur tour sur Dunes de Chrome (${rec?.lap?.toFixed?.(2)} s)`);

  await page.click('#bNext');
  await page.waitForFunction(() => window.__kd().state === 'race', null, { timeout: 30000 });
  d = await save();
  check(d?.track === 'orbital', 'circuit suivant mémorisé');
  await page.keyboard.press('Escape');
  check(await page.locator('#sPause.on').isVisible(), 'Échap met en pause');
  const posA = (await kd()).pos;
  await sleep(600);
  check((await kd()).pos === posA, 'en pause, la course est figée');
  await page.locator('#sPause [data-setting=music]').click();
  await page.locator('#sPause [data-setting=shake]').click();
  d = await save();
  check(d?.settings?.music === false && d?.settings?.shake === false && d?.settings?.sfx === true, 'réglages sauvegardés depuis la pause');
  await page.click('#bQuit');
  await page.reload();
  await page.click('#bPlay');
  const card2 = await page.locator('#trackRow .card').nth(1).innerText();
  check(!card2.includes('Record : —') && card2.includes('tour'), 'après rechargement : record et meilleur tour sur la carte du circuit');
  check(await page.locator('#trackRow .card').nth(2).getAttribute('class').then(c => c.includes('sel')), 'après rechargement : dernier circuit choisi');
  check(await page.locator('#carRow .card').nth(2).getAttribute('class').then(c => c.includes('sel')), 'après rechargement : voiture choisie');
  check((await page.locator('#sSelect [data-setting=music]').innerText()).includes('non'), 'après rechargement : musique coupée');

  // onglet caché : la boucle s'arrête (batterie), puis repart
  await page.click('#bStart');
  await page.waitForFunction(() => window.__kd().state === 'race', null, { timeout: 30000 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hidden = await kd();
  check(hidden.state === 'pause' && !hidden.running, 'onglet caché : course en pause et boucle arrêtée');
  const steps = hidden.steps;
  await sleep(400);
  check((await kd()).steps === steps, 'onglet caché : plus aucun calcul');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  check((await kd()).running, 'onglet revenu : la boucle repart (la course attend en pause)');

  // reprise des formats d'avant
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('kevdrift.best0', '88.5'); localStorage.setItem('kevdrift.car', '1'); });
  await page.reload();
  await page.click('#bPlay');
  check((await page.locator('#trackRow .card').nth(0).innerText()).includes('1:28.50'), 'record du tout premier format repris');
  check(await page.evaluate(() => localStorage.getItem('kevdrift.best0')) === null, 'anciennes clés nettoyées');
  check(await page.locator('#carRow .card').nth(1).getAttribute('class').then(c => c.includes('sel')), 'voiture du tout premier format reprise');
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({ version: 1, track: 2, car: 0, music: true, best: [null, 99.25, null] })), KEY);
  await page.reload();
  await page.click('#bPlay');
  check((await page.locator('#trackRow .card').nth(1).innerText()).includes('1:39.25'), 'sauvegarde version 1 migrée (record gardé)');
  check((await save())?.version === 2, 'sauvegarde version 1 réécrite en version 2');

  await page.evaluate(k => localStorage.setItem(k, '{abîmée'), KEY);
  await page.reload();
  await page.click('#bPlay');
  check(await page.evaluate(k => localStorage.getItem(k + '.abimee'), KEY) === '{abîmée', 'sauvegarde abîmée mise de côté, le jeu démarre');
  check(errors.length === 0, `aucune erreur console${errors.length ? ' : ' + errors.slice(0, 3).join(' | ') : ''}`);
} catch (e) {
  check(false, `erreur du test : ${e.stack || e}`);
} finally {
  await env.close();
}
console.log(fails.length ? `\n${fails.length} échec(s).` : '\nParcours complet réussi.');
process.exit(fails.length ? 1 : 0);
