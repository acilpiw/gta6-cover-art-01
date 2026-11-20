# Neon Coast Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/rank.svg?repo=acilpiw/gta6-cover-art-01)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/reward.svg?repo=acilpiw/gta6-cover-art-01)](https://make.fun/c/gta6-cover-art-01)

An offline web app that turns your own photos and a caption into GTA-style
multi-panel cover art — the classic poster grid with a white frame, a Vice
City sunset or neon colour grade, heavy gradient lettering, a ribbon badge
and heat stars — and exports it as a PNG in the sizes people actually post.

Everything runs in the browser from static files. Photos are read on your
own machine and never uploaded anywhere; there is no build step and the app
makes no network requests.

## What it does

- **Five panel layouts** — a six-panel cover grid, hero + three, film
  strips, a five-panel mosaic and a full-bleed single panel.
- **Any photo, every panel** — upload or drag-and-drop photos, fill several
  panels with one photo or a different photo per panel, then crop each
  panel with zoom and slide controls, flip, reset or clear per panel.
- **Five colour grades** — Vice sunset, Neon night, Golden hour, Mono noir
  and Clean print, plus optional film grain, vignette and an inked poster
  punch.
- **Lettering you control** — cover title with a sunset-gradient fill and
  white keyline, a script subtitle, a tilted ribbon badge and a heat-star
  rating, all editable live.
- **Post-ready exports** — one click writes a PNG at 1080 x 1080,
  1080 x 1350 or 1920 x 1080.
- Two bundled sample photos (AI-made, free to use) fill the panels until
  you drop in your own.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Any static file server pointed at `app/`
works just as well.

## Hand it in

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` there with the kit's `buildDossier`
(`vendor/makefun-app.ts`, unchanged) under the scorer's caps.

## Screenshots

`screenshots/` holds four captures of the running app, described in
`shots.json`: an exported wide cover, the editor with photos loaded, an
exported portrait cover and an exported square cover. Each is produced by
opening the app with its `?shot=` scene (see `app/src/shots.js`).

## Originality

The studio, its lettering and its painted panel backdrops are original work
for this entry. No game artwork, logos, wordmarks or font files are used;
the lettering is drawn with system font stacks only.

## License

MIT — see `LICENSE`.
