// Outils communs aux tests de bout en bout : serveur du jeu construit (dist/) et navigateur.
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { serve } from '../../tools/serve.mjs';

export const SHOTS = process.env.SMOKE_SHOTS || 'test-results';

/** Sert dist/ (construire d'abord : npm run build) et lance Chromium. */
export async function setup(launchOpts = {}) {
  if (!existsSync('dist/index.html')) throw new Error('dist/ absent : lancer « npm run build » avant les tests de bout en bout');
  mkdirSync(SHOTS, { recursive: true });
  const server = await serve('dist');
  // Chromium préinstallé (PLAYWRIGHT_BROWSERS_PATH) ou téléchargé par « npx playwright install ».
  const browser = await chromium.launch(launchOpts);
  return { base: server.url, browser, close: async () => { await browser.close(); await server.close(); } };
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
