// Neon Coast Cover Studio — the make.fun entry program for gta6-cover-art-01
// (Node 22, standard library only).
//
// The app itself is the static site in app/: a multi-panel GTA-style cover
// maker that runs fully offline in a desktop browser, grades any photo with
// a Vice City sunset or neon wash, letters the caption in big condensed
// poster type, and exports PNGs at 1080 x 1080, 1080 x 1350 and 1920 x 1080.
// This program hands that app in: it copies app/ and screenshots/ to the
// output directory and writes dossier.json with the vendored make.fun
// library, byte for byte as the scorer rebuilds it.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Try the app with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The dossier caps mirror reference/gate.json for this bounty: the judge's
// text view is capped, screenshots are at most 4 files of 256 KiB, and app/
// holds at most 993 entries totalling 48 MiB with no path over 1000 bytes.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Fail loudly rather than hand in a hollow entry: the app must have its
// page and at least the three screenshots the bounty asks for.
if (!existsSync(join(out, 'app', 'index.html'))) {
  throw new Error('app/index.html is missing — the cover studio did not copy across');
}
const shotCount = readdirSync(join(out, 'screenshots')).filter((name) => /\.(png|jpe?g)$/i.test(name)).length;
if (shotCount < 3 || shotCount > 4) {
  throw new Error(`screenshots/ must hold 3 or 4 images for this bounty, found ${shotCount}`);
}

writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_LIMITS));
console.log(`Neon Coast Cover Studio handed in to ${out} (app/, ${shotCount} screenshots, dossier.json)`);
