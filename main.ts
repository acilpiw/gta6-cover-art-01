// main.ts — hands in the Neon Coast Cover Studio entry.
// Copies app/ and screenshots/ from this repository into the output
// directory and writes dossier.json there with the kit's buildDossier,
// using the scorer's caps from the competition rules: the dossier text is
// capped at 160 KiB, at most 4 screenshots of at most 256 KiB each, and
// app/ holds at most 993 entries totalling at most 48 MiB with no path
// longer than 1000 bytes. Node standard library only; the run is a pure
// copy plus the dossier build, so two runs write the same bytes.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

const DOSSIER_CAPS = {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: 262_144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

// Pre-flight checks, added after the first verified build: fail loudly
// here, with the file named, instead of handing the scorer an entry it
// would refuse. Screenshots must number 3 or 4, sit under the 256 KiB cap
// and carry real PNG or JPEG magic bytes — a renamed or truncated file
// would otherwise pass the copy and fail the gate in silence.
function checkInputs(): void {
  const indexHtml = join(repoRoot, "app", "index.html");
  if (!existsSync(indexHtml)) throw new Error(`missing required file: ${indexHtml}`);
  const shotsDir = join(repoRoot, "screenshots");
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith(".")).sort();
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
  }
  for (const name of shots) {
    const bytes = readFileSync(join(shotsDir, name));
    if (bytes.length > DOSSIER_CAPS.screenshots.max_bytes) {
      throw new Error(`screenshot ${name} is ${bytes.length} bytes, over the 262144 cap`);
    }
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!isPng && !isJpeg) throw new Error(`screenshot ${name} is neither a PNG nor a JPEG`);
  }
}

function main(): void {
  checkInputs();
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, "app"), join(outputDir, "app"), { recursive: true });
  cpSync(join(repoRoot, "screenshots"), join(outputDir, "screenshots"), { recursive: true });
  const dossier = buildDossier(outputDir, DOSSIER_CAPS);
  writeFileSync(join(outputDir, "dossier.json"), dossier);
  console.log(`Neon Coast Cover Studio handed in: dossier.json ${dossier.length} bytes -> ${outputDir}`);
}

main();
