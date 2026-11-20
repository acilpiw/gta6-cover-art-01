// serve.ts — a tiny local static server for trying the app.
// Serves app/ at http://localhost:8080 with no build step and no network
// access beyond this machine. Node standard library only.

import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "app");
const port = Number(process.env.PORT ?? 8080);

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = createServer((request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    const wanted = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = normalize(join(appRoot, wanted));
    if (!filePath.startsWith(appRoot)) {
      response.writeHead(403).end("forbidden");
      return;
    }
    const stat = statSync(filePath);
    if (!stat.isFile()) throw new Error("not a file");
    const body = readFileSync(filePath);
    response.writeHead(200, {
      "content-type": MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("not found");
  }
});

server.listen(port, () => {
  console.log(`Neon Coast Cover Studio at http://localhost:${port}`);
});
