// serve.ts — minimal static file server for local development.
//
// Usage:  node serve.ts [--port 8080]
// Serves the contents of app/ over http://127.0.0.1:<port> with no build
// step and no dependencies beyond Node's standard library. It is a
// convenience for trying the entry locally — not a production server:
// it disables caching, serves a fixed MIME table, and rejects any request
// whose resolved path escapes the app/ directory.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

function parsePort(argv: string[]): number {
  const flagAt = argv.indexOf('--port');
  if (flagAt === -1) return 8080;
  const candidate = Number(argv[flagAt + 1]);
  const valid = Number.isInteger(candidate) && candidate > 0 && candidate < 65536;
  return valid ? candidate : 8080;
}

const listenPort = parsePort(process.argv.slice(2));

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  let decodedPath: string;
  try {
    const parsed = new URL(req.url ?? '/', 'http://localhost');
    decodedPath = decodeURIComponent(parsed.pathname);
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }

  if (decodedPath.endsWith('/')) decodedPath += 'index.html';

  const targetFile = resolve(join(appRoot, normalize(decodedPath)));
  const insideRoot = targetFile === appRoot || targetFile.startsWith(appRoot + sep);
  if (!insideRoot) {
    res.writeHead(403).end('forbidden');
    return;
  }

  let fileSize: number;
  try {
    const info = statSync(targetFile);
    if (!info.isFile()) throw new Error('not a regular file');
    fileSize = info.size;
  } catch {
    res.writeHead(404).end('not found');
    return;
  }

  const type = CONTENT_TYPES[extname(targetFile).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, {
    'content-type': type,
    'content-length': fileSize,
    'cache-control': 'no-store',
  });
  createReadStream(targetFile).pipe(res);
});

server.listen(listenPort, '127.0.0.1', () => {
  console.log(`app/ is on http://localhost:${listenPort}`);
});
