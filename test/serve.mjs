import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const allowed = new Map([['/', 'color-test.html'], ['/color-test.html', 'color-test.html'], ['/fixture.css', 'fixture.css'], ['/fixture.js', 'fixture.js']]);
createServer(async (req, res) => {
  const file = allowed.get(new URL(req.url, 'http://localhost').pathname);
  if (!file) { res.writeHead(404).end(); return; }
  try {
    res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8');
    res.end(await readFile(new URL(file, import.meta.url)));
  } catch { res.writeHead(500).end(); }
}).listen(8080, '127.0.0.1', () => console.log('Fixture: http://127.0.0.1:8080 · Ctrl+C to stop'));
