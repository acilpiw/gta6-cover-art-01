# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/acilpiw/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/acilpiw/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Entry for the make.fun bounty **"Make GTA 6 Cover Art"**
([gta6-cover-art-01](https://make.fun/c/gta6-cover-art-01)).

Neon Coast Cover Studio turns your own photos into a finished
multi-panel poster in the GTA cover tradition. It runs entirely in
the browser as static files — open the app, add pictures, set a
headline, and download a PNG. Nothing you upload leaves the page.

## What it does

- **Five layouts to choose from** — Hero Grid, Six Panel Grid,
  Vice Strips, Top Story and Full Bleed, divided by thin gutters.
  Panels without a photo get a painted sunset shoreline with a
  palm silhouette, so an unfinished grid still reads as art.
- **Direct panel editing** — add several photos, pick a panel,
  tap a thumbnail to place it there, fill every panel from one
  photo, or clear a panel. Zoom and pan are per panel, via sliders
  or by dragging straight on the preview.
- **Five colour grades** — Sunset Vice, Neon Night, Golden Hour,
  Midnight Noir and Clean Poster. Each one pairs a photo filter
  with a wash and a title palette. Film grain is seeded so exports
  repeat exactly, and vignette is optional.
- **Poster lettering** — a big condensed headline with gradient
  fill, outline and shadow, a glowing script subtitle above it,
  a five-star wanted row, and a tilted badge ribbon. System fonts
  only, drawn on canvas — no borrowed game art or type.
- **Three output sizes** — Square 1080 × 1080, Portrait
  1080 × 1350 and Wide 1920 × 1080, exported in one click.
- **Demo included** — two bundled sample photos open as a ready
  cover, so you can judge the studio without uploading anything.

## Try it locally

```sh
node serve.ts
# http://localhost:8080
```

Build the submission output:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output folder
and writes `dossier.json` via `vendor/makefun-app.ts`.

## Files

| Path | What is there |
| --- | --- |
| `app/index.html` | Page shell and sidebar controls |
| `app/style.css` | Editor styles plus screenshot mode |
| `app/src/cover.js` | Canvas engine: layouts, grades, backdrop, type |
| `app/src/main.js` | Editor state, wiring, drag, PNG export |
| `app/src/shots.js` | Deterministic `?shot=` scenes for captures |
| `app/samples/` | Demo photos, AI-generated and free to use |
| `screenshots/` | Captures shown to judges |
| `main.ts` | Submission builder |
| `serve.ts` | Local server for `app/` |

MIT — see `LICENSE`.
