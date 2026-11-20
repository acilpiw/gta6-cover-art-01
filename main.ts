// main.ts — submission builder for Neon Coast Cover Studio
// (bounty gta6-cover-art-01, Node 22 standard library only).
//
// What this does, in order:
//   1. resolve the output directory (MAKEFUN_OUTPUT_DIR, default /output)
//   2. copy the static app from app/ into <out>/app
//   3. copy screenshots/ into <out>/screenshots
//   4. sanity-check that the copy is complete (entry page present, 3–4
//      screenshot images present) and fail fast if it is not
//   5. write <out>/dossier.json via the vendored make.fun helper
//
// Local dry run:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Preview the app itself with `node serve.ts` → http://localhost:8080

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Caps taken from this bounty's gate configuration. They bound how much
// text the judge ingests, how large screenshots may be, and how big the
// app payload is allowed to grow.
const LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

mkdirSync(outputDir, { recursive: true });

// App payload.
cpSync(join(projectRoot, 'app'), join(outputDir, 'app'), { recursive: true });

// Screenshots (create the folder even if the source is missing so the
// validation below can report a clean count instead of an ENOENT).
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const sourceShots = join(projectRoot, 'screenshots');
if (existsSync(sourceShots)) {
  cpSync(sourceShots, join(outputDir, 'screenshots'), { recursive: true });
}

if (!existsSync(join(outputDir, 'app', 'index.html'))) {
  throw new Error('app/index.html missing after copy — refusing to hand in an empty app');
}

const imagePattern = /\.(png|jpe?g)$/i;
const shotFiles = readdirSync(join(outputDir, 'screenshots')).filter((n) => imagePattern.test(n));
if (shotFiles.length < 3 || shotFiles.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shotFiles.length}`);
}

const dossierJson = buildDossier(outputDir, LIMITS);
writeFileSync(join(outputDir, 'dossier.json'), dossierJson);
console.log(
  `Neon Coast Cover Studio → ${outputDir} (app copied, ${shotFiles.length} screenshots, dossier.json written)`,
);
