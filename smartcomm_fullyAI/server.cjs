const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { conditions } = require('./lib/feeds.cjs');
// Keep the single optional secret server-side; do not serve the repository root.
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const match = /^LTA_ACCOUNT_KEY\s*=\s*(.*?)\s*$/.exec(line);
    if (match && !process.env.LTA_ACCOUNT_KEY) process.env.LTA_ACCOUNT_KEY = match[1].replace(/^['"]|['"]$/g, '');
  }
} catch (error) { if (error.code !== 'ENOENT') console.error('Could not read local configuration.'); }
const root = path.join(__dirname, 'dist');
const port = Number(process.env.PORT) || 4173;
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.json':'application/json' };
const server = http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  if (pathname === '/api/conditions') {
    try { const data=await conditions(); res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data)); }
    catch { res.writeHead(503,{'Content-Type':'application/json'}).end(JSON.stringify({error:'Condition feeds are unavailable.'})); }
    return;
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': (types[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  });
});
server.listen(port, '0.0.0.0', () => console.log(`SmartComm is ready at http://localhost:${port}`));
