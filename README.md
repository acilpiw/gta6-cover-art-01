# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/acilpiw/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/acilpiw/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Submission for the make.fun bounty **"Make GTA 6 Cover Art"**
([gta6-cover-art-01](https://make.fun/c/gta6-cover-art-01)).

Neon Coast Cover Studio is a browser-based poster maker in the multi-panel
GTA cover tradition. Give it a photograph and a headline and it produces a
finished, shareable cover as a PNG. The app is fully static — open `app/`
in a desktop browser and everything runs locally; your images are never
sent to a server.

## Highlights

- **Five panel layouts** — Hero Grid, Six Panel Grid, Vice Strips,
  Top Story, and Full Bleed, separated by thin poster gutters. Empty
  panels are filled with a painted sunset shoreline so a half-finished
  grid still looks intentional.
- **Per-panel art direction** — load multiple photos, click a panel and
  then a thumbnail to place an image, broadcast one photo to every panel,
  or clear a panel. Each panel keeps its own zoom and pan, adjustable
  with sliders or by dragging the preview canvas directly.
- **Five colour grades** — Sunset Vice, Neon Night, Golden Hour,
  Midnight Noir, and Clean Poster. Each grade combines a photo filter,
  a wash over the whole sheet, and a matching title palette. Optional
  film grain (deterministic, so exports are reproducible) and vignette.
- **Hand-set poster type** — the caption is set in a large condensed
  face with a gradient fill, heavy outline, and drop shadow; the
  subtitle glows above it in a script face. A five-star wanted meter
  and a tilted badge ribbon complete the look. All type uses system
  fonts rendered on canvas — no game assets, logos, or fonts.
- **Three export sizes** — Square 1080 × 1080, Portrait 1080 × 1350,
  and Wide 1920 × 1080, downloaded as a single PNG click.
- **Instant demo** — two bundled sample photographs open as a ready-made
  cover, so the studio can be evaluated without uploading anything.

## Running locally

Serve the static app (Node 22, no dependencies):

```sh
node serve.ts
# → http://localhost:8080
```

Build the submission bundle:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` into the output directory and
writes `dossier.json` using `vendor/makefun-app.ts`.

## Repository map

| Path | Contents |
| --- | --- |
| `app/index.html` | Page shell and control markup |
| `app/style.css` | Editor styling, including screenshot mode |
| `app/src/cover.js` | Canvas rendering engine — layouts, grades, backdrop, lettering |
| `app/src/main.js` | Editor state, control wiring, drag handling, PNG export |
| `app/src/shots.js` | Fixed `?shot=` scenes for reproducible screenshots |
| `app/samples/` | Demo photographs (AI-generated, free to use) |
| `screenshots/` | Cover and editor captures shown to judges |
| `main.ts` | Submission builder |
| `serve.ts` | Local static server for `app/` |

MIT licensed — see `LICENSE`.
