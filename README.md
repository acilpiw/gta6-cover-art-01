# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/acilpiw/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/acilpiw/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Entry for make.fun's "Make GTA 6 Cover Art" bounty
([gta6-cover-art-01](https://make.fun/c/gta6-cover-art-01)).

**Neon Coast Cover Studio** turns any photo and a caption into cover art in
the multi-panel GTA poster style — and exports it as a PNG to share. It runs
fully offline in a desktop browser from the static files in `app/`; photos
are read on your own machine and never uploaded.

## What it does

- **Multi-panel layouts** — Hero Grid, Six Panel Grid, Vice Strips,
  Top Story and Full Bleed, with clean poster gutters between panels.
- **Any photo, every panel** — add several photos, tap a panel then a
  thumbnail to place it, fill every panel with one photo, and crop each
  panel with zoom and pan sliders or by dragging the cover itself.
- **Vice City colour grades** — Sunset Vice, Neon Night, Golden Hour,
  Midnight Noir and Clean Poster, plus film grain and a vignette.
- **Poster lettering** — a big condensed caption with a gradient fill and
  hard outline, a glowing neon script subtitle, a wanted-star row and a
  rotated badge ribbon. All lettering is drawn on canvas with system
  fonts; no game artwork, logo or font is used anywhere.
- **Post sizes in one click** — export PNG at 1080 × 1080,
  1080 × 1350 or 1920 × 1080.
- **Demo mode** — two bundled sample photos (made with an image model,
  free to use) open as a finished cover, so the studio can be tried with
  no upload at all.

## Run it

```sh
node serve.ts          # serves app/ at http://localhost:8080
```

Hand the entry in (Node 22, standard library only):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `app/` — the web app: `index.html`, `style.css`, `src/cover.js` (the
  canvas cover engine), `src/main.js` (the editor), `src/shots.js`
  (screenshot scenes), `samples/` (demo photos).
- `screenshots/` — the exported covers and editor views the judge sees.
- `main.ts` — copies `app/` and `screenshots/` to the output directory
  and writes `dossier.json` with `vendor/makefun-app.ts`.

MIT licensed.
