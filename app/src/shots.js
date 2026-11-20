// shots.js — deterministic scenes used only for screenshots.
//
// The screenshot harness loads the studio with a query string such as
//   ?shot=cover&size=wide&layout=heroGrid&grade=sunset&...
// readShotScene turns that string into a plain scene object (or null when
// no shot was requested, meaning "boot the normal editor"). Once main.js
// has painted the scene it calls markShotReady, which flips
// window.__shotReady after two animation frames so the harness captures a
// settled frame rather than a half-loaded one.

const DEFAULT_PHOTOS = 'boulevard,pier';

export function readShotScene(params) {
  const mode = params.get('shot');
  if (!mode) return null;

  const rawList = params.get('photos') || DEFAULT_PHOTOS;
  const photoUrls = rawList
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((name) => `samples/${name}.jpg`);

  const fallbackSize = mode === 'cover' ? 'wide' : 'portrait';

  return {
    mode,
    sizeId: params.get('size') || fallbackSize,
    layout: params.get('layout') || 'heroGrid',
    grade: params.get('grade') || 'sunset',
    caption: params.get('caption') || 'NEON COAST',
    subtitle: params.get('sub') || 'welcome back to the coast',
    badge: params.get('badge') || 'DAY ONE',
    stars: Number(params.get('stars') ?? 3),
    photoUrls,
  };
}

export function markShotReady() {
  // Double rAF: the first frame schedules layout, the second guarantees
  // the canvas paint triggered by the scene has actually been presented.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}
