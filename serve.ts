// Tiny static server for trying the studio locally.
// Usage: node serve.ts [--port 8080]
// Serves app/ only, blocks path escapes, no dependencies.

import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = resolve(fileURLToPath(new URL("./app", import.meta.url)));

function readPort(args: string[]): number {
  const at = args.indexOf("--port");
  if (at === -1) return 8080;
  const value = Number(args[at + 1]);
  return Number.isInteger(value) && value > 0 && value < 65536 ? value : 8080;
}

const port = readPort(process.argv.slice(2));

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".bin": "application/octet-stream",
  ".wasm": "application/wasm",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer((req, res) => {
  let pathname: string;
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400).end("bad request");
    return;
  }

  if (pathname.endsWith("/")) pathname += "index.html";
  const target = resolve(join(appDir, normalize(pathname)));
  const inside = target === appDir || target.startsWith(appDir + sep);
  if (!inside) {
    res.writeHead(403).end("forbidden");
    return;
  }

  let size: number;
  try {
    const info = statSync(target);
    if (!info.isFile()) throw new Error("not a file");
    size = info.size;
  } catch {
    res.writeHead(404).end("not found");
    return;
  }

  const type = MIME[extname(target).toLowerCase()] ?? "application/octet-stream";
  res.writeHead(200, {
    "content-type": type,
    "content-length": size,
    "cache-control": "no-store",
  });
  createReadStream(target).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`app/ is on http://localhost:${port}`);
});
