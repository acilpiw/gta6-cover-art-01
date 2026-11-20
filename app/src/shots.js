// shots.js — deterministic scenes for the entry's screenshots.
// Opening the app with ?shot=<name> applies one of these scenes after the
// sample photos load, so every screenshot is the real app in a known state:
// the editor at work, or the app's own drawing of an exported cover filling
// the frame. With no ?shot= parameter nothing here runs.

export const SHOT_SCENES = {
  editor: {
    coverOnly: false,
    sizeKey: "wide",
    layoutKey: "grid6",
    gradeKey: "sunset",
    title: "Neon Coast",
    subtitle: "vice nights, fast tides",
    badge: "Cover story",
    stars: 4,
    sources: ["boulevard", "pier", "boulevard", "pier", "pier", "boulevard"],
  },
  "cover-wide": {
    coverOnly: true,
    sizeKey: "wide",
    layoutKey: "hero3",
    gradeKey: "neon",
    title: "Neon Coast",
    subtitle: "vice nights, fast tides",
    badge: "Out now",
    stars: 5,
    sources: ["boulevard", "pier", "boulevard", "pier"],
  },
  "cover-portrait": {
    coverOnly: true,
    sizeKey: "portrait",
    layoutKey: "grid6",
    gradeKey: "sunset",
    title: "Neon Coast",
    subtitle: "one summer, no brakes",
    badge: "Cover story",
    stars: 4,
    sources: ["pier", "boulevard", "pier", "boulevard", "boulevard", "pier"],
  },
  "cover-square": {
    coverOnly: true,
    sizeKey: "square",
    layoutKey: "mosaic5",
    gradeKey: "golden",
    title: "Neon Coast",
    subtitle: "golden hour getaway",
    badge: "Fan favourite",
    stars: 5,
    sources: ["boulevard", "boulevard", "pier", "pier", "boulevard"],
  },
};

export function shotNameFromUrl(search) {
  const name = new URLSearchParams(search).get("shot");
  if (name && Object.prototype.hasOwnProperty.call(SHOT_SCENES, name)) return name;
  return null;
}

export function shotScene(name) {
  return SHOT_SCENES[name] || null;
}
