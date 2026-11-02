/* Leanward — local dev server. Run `node tools/serve.js` in the app folder, then open
 * http://localhost:8001/ (PR Forge uses 8000, so both can run at once).
 * Nothing is cached, and the service worker stays off on localhost unless you add ?sw=1.
 * /prototype/ serves ../prototype/app/, matching the deployed site.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PROTO = path.resolve(ROOT, '..', 'prototype', 'app');
const PORT = Number(process.env.PORT) || 8001;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};
const BLOCKED = ['tools', 'tests', 'supabase'];

http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); res.end('Bad request'); return; }
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  let base = ROOT;
  if (urlPath.startsWith('/prototype/')) { base = PROTO; urlPath = urlPath.slice('/prototype'.length); }
  const file = path.join(base, urlPath);
  const first = path.relative(ROOT, file).split(path.sep)[0];
  if (file.indexOf(base + path.sep) !== 0 || (base === ROOT && BLOCKED.includes(first))) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log('Leanward running at http://localhost:' + PORT + '/');
});
