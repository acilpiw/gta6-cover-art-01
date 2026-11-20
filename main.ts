// Submission builder for Neon Coast Cover Studio (gta6-cover-art-01).
// I copy app/ and screenshots/ into the output folder, check the copy
// looks complete, then write dossier.json with the vendored helper.
// Run locally: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

mkdirSync(outDir, { recursive: true });
cpSync(join(rootDir, "app"), join(outDir, "app"), { recursive: true });

mkdirSync(join(outDir, "screenshots"), { recursive: true });
const shotsSource = join(rootDir, "screenshots");
if (existsSync(shotsSource)) {
  cpSync(shotsSource, join(outDir, "screenshots"), { recursive: true });
}

if (!existsSync(join(outDir, "app", "index.html"))) {
  throw new Error("app/index.html missing after copy");
}

const imageRe = /\.(png|jpe?g)$/i;
const shotNames = readdirSync(join(outDir, "screenshots"))
  .filter((name) => imageRe.test(name))
  .sort();
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shotNames.length}`);
}

// Validate each screenshot before handing it to buildDossier: a truncated
// or mis-labelled file used to fail deep inside the dossier builder with
// an opaque message. Checking magic bytes and size here gives a clear,
// actionable error naming the exact file at fault.
let totalShotBytes = 0;
for (const name of shotNames) {
  const filePath = join(outDir, "screenshots", name);
  const size = statSync(filePath).size;
  if (size === 0) throw new Error(`screenshot ${name} is empty`);
  if (size > CAPS.screenshots.max_bytes) {
    throw new Error(
      `screenshot ${name} is ${size} bytes, over the ${CAPS.screenshots.max_bytes} byte limit`,
    );
  }
  const head = readFileSync(filePath).subarray(0, 3);
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isPng =
    head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e;
  if (!isJpeg && !isPng) {
    throw new Error(`screenshot ${name} is neither JPEG nor PNG (bad magic bytes)`);
  }
  totalShotBytes += size;
}

// The entry page alone is not enough: the module scripts it loads must
// also have survived the copy, otherwise judges get a blank studio.
for (const required of ["src/cover.js", "src/main.js", "src/shots.js", "style.css"]) {
  if (!existsSync(join(outDir, "app", required))) {
    throw new Error(`app/${required} missing after copy`);
  }
}

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, "dossier.json"), dossier);
console.log(
  `Neon Coast Cover Studio -> ${outDir} (${shotNames.length} screenshots, ${totalShotBytes} bytes total, dossier.json written)`,
);
