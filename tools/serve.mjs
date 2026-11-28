// Petit serveur statique sans dépendance : sert un dossier (par défaut dist/, le jeu construit).
// Utilisé par les tests de bout en bout ; en ligne de commande : node tools/serve.mjs [dossier] [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json',
};

/** Démarre le serveur ; renvoie { url, close }. Port 0 : le système en choisit un libre. */
export function serve(root, port = 0) {
  const ROOT = resolve(root);
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(ROOT, path.endsWith('/') ? path + 'index.html' : path);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(body);
    } catch { res.writeHead(404).end('introuvable'); }
  });
  return new Promise(ok => server.listen(port, '127.0.0.1', () => {
    ok({ url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(r => server.close(r)) });
  }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] || 'dist';
  const { url } = await serve(root, Number(process.argv[3] || process.env.PORT || 8000));
  console.log(`KEVDRIFT (${root}) : ${url}`);
}
