# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/acilpiw/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/acilpiw/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Entry for the make.fun bounty **"Make GTA 6 Cover Art"**
([gta6-cover-art-01](https://make.fun/c/gta6-cover-art-01)).

Neon Coast Cover Studio is a poster maker in the multi-panel GTA
cover tradition. Feed it your own photographs and a headline, and
it hands back a finished cover as a PNG. The whole app is static
files that run locally in a desktop browser; your images are
never sent anywhere.

## Highlights

- **Five layouts** — Hero Grid, Six Panel Grid, Vice Strips,
  Top Story, and Full Bleed, split by thin poster gutters.
  Empty panels are painted with a sunset shoreline and a palm
  silhouette, so a half-finished cover still looks deliberate.
- **Per-panel editing** — load multiple photos, select a panel
  and tap a thumbnail to place an image, send one photo to all
  panels, or clear a panel. Every panel keeps its own zoom and
  pan, set with sliders or by dragging on the preview itself.
- **Five colour grades** — Sunset Vice, Neon Night, Golden Hour,
  Midnight Noir, and Clean Poster. Each grade bundles a photo
  filter, a wash over the assembled sheet, and a title palette.
  Film grain is seeded for reproducible exports; vignette is
  optional.
- **Poster type set by hand** — the caption uses a large
  condensed face with gradient fill, heavy outline and shadow;
  the subtitle glows above it in script. A wanted-star row and
  a tilted badge ribbon finish the sheet. System fonts only,
  rendered on canvas — no game assets, logos, or fonts.
- **Three export sizes** — Square 1080 × 1080, Portrait
  1080 × 1350, and Wide 1920 × 1080, downloaded as one PNG.
- **Demo ready on open** — two bundled sample photographs load
  as a finished cover, so the studio can be tried with no upload.

## Running it locally

Serve the static app with Node 22, no dependencies to install:

```sh
node serve.ts
# → http://localhost:8080
```

Build the submission bundle:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` into the output
directory and writes `dossier.json` using `vendor/makefun-app.ts`.

## Repository map

| Path | Contents |
| --- | --- |
| `app/index.html` | Page shell and control markup |
| `app/style.css` | Editor styling, including screenshot mode |
| `app/src/cover.js` | Canvas rendering — layouts, grades, backdrop, lettering |
| `app/src/main.js` | Editor state, control wiring, drag handling, PNG export |
| `app/src/shots.js` | Fixed `?shot=` scenes for reproducible screenshots |
| `app/samples/` | Demo photographs (AI-generated, free to use) |
| `screenshots/` | Cover and editor captures shown to judges |
| `main.ts` | Submission builder |
| `serve.ts` | Local static server for `app/` |

MIT licensed — see `LICENSE`.
