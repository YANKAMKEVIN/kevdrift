// Course complète dans un vrai navigateur (Chromium), voiture pilotée par le robot (?robot) en accéléré :
// titre -> grille -> choix du circuit et de la voiture -> 3 tours -> résultats -> record sauvegardé ->
// circuit suivant -> rechargement -> choix et record retrouvés -> anciens records repris -> sauvegarde abîmée.
// Lancer : npm run partie
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer, connect } from 'node:net';
import { mkdirSync } from 'node:fs';

const PORT = await new Promise(res => { const s = createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const URL = `http://127.0.0.1:${PORT}/index.html?robot&turbo=8`;
const OUT = process.env.SMOKE_SHOTS || 'test-results';
const KEY = 'kevdrift.sauvegarde';
mkdirSync(OUT, { recursive: true });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 100; i++) {
  const ok = await new Promise(res => { const c = connect(PORT, '127.0.0.1', () => { c.end(); res(true); }); c.on('error', () => res(false)); });
  if (ok) break; await sleep(100);
}
const fails = [];
const check = (ok, msg) => { console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${msg}`); if (!ok) fails.push(msg); };
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const save = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);

  await page.goto(URL);
  await page.click('#bPlay');
  check((await page.locator('#ver').innerText()).startsWith('v'), 'numéro de version sur l\'écran titre');
  check(await page.evaluate(() => window.__kdArt) === 8, 'les 8 visuels peints sont chargés');
  check((await page.locator('#sTitle').evaluate(el => getComputedStyle(el).backgroundImage)).includes('titre.webp'), 'affiche peinte derrière l\'écran titre');
  await page.screenshot({ path: `${OUT}/partie-0-titre.png` });
  await page.locator('#trackRow .card').nth(1).click();
  await page.locator('#carRow .card').nth(2).click();
  await page.click('#bStart');
  await page.waitForFunction(() => window.__kd().state === 'race', null, { timeout: 30000 });
  check(true, 'compte à rebours puis départ');
  await page.screenshot({ path: `${OUT}/partie-1-course.png` });
  const t0 = Date.now();
  await page.waitForSelector('#sResult.on', { timeout: 240000 });
  check(true, `3 tours jusqu'à l'arrivée (${Math.round((Date.now() - t0) / 1000)} s en accéléré)`);
  await page.screenshot({ path: `${OUT}/partie-2-resultats.png` });
  const rows = await page.locator('#rTable tr').count();
  check(rows === 6, `tableau des résultats : temps total, meilleur tour, 3 tours, machine (${rows} lignes)`);
  let d = await save();
  check(d?.version === 1, 'sauvegarde écrite, version 1');
  check(d?.track === 1 && d?.car === 2, 'circuit et voiture sauvegardés');
  check(typeof d?.best?.[1] === 'number' && d.best[1] > 30, `record enregistré sur le circuit 2 (${d?.best?.[1]?.toFixed?.(2)} s)`);

  await page.click('#bNext');
  await page.waitForFunction(() => window.__kd().state === 'race', null, { timeout: 30000 });
  d = await save();
  check(d?.track === 2, 'circuit suivant mémorisé');
  await page.keyboard.press('Escape');
  await page.click('#bQuit');
  await page.reload();
  await page.click('#bPlay');
  const card2 = await page.locator('#trackRow .card').nth(1).innerText();
  check(!card2.includes('Record : —'), 'après rechargement : le record s\'affiche sur la carte du circuit');
  check(await page.locator('#trackRow .card').nth(2).getAttribute('class').then(c => c.includes('sel')), 'après rechargement : dernier circuit choisi');
  check(await page.locator('#carRow .card').nth(2).getAttribute('class').then(c => c.includes('sel')), 'après rechargement : voiture choisie');

  await page.evaluate(k => { localStorage.clear(); localStorage.setItem('kevdrift.best0', '88.5'); localStorage.setItem('kevdrift.car', '1'); }, KEY);
  await page.reload();
  await page.click('#bPlay');
  check((await page.locator('#trackRow .card').nth(0).innerText()).includes('1:28.50'), 'ancien record (format d\'avant) repris');
  check(await page.evaluate(() => localStorage.getItem('kevdrift.best0')) === null, 'anciennes clés nettoyées');

  await page.evaluate(k => localStorage.setItem(k, '{abîmée'), KEY);
  await page.reload();
  await page.click('#bPlay');
  check(await page.evaluate(k => localStorage.getItem(k + '.abimee'), KEY) === '{abîmée', 'sauvegarde abîmée mise de côté, le jeu démarre');
  check(errors.length === 0, `aucune erreur console${errors.length ? ' : ' + errors.slice(0, 3).join(' | ') : ''}`);
} finally { await browser.close(); server.kill(); }
console.log(fails.length ? `\n${fails.length} échec(s).` : '\nCourse complète réussie.');
process.exit(fails.length ? 1 : 0);
