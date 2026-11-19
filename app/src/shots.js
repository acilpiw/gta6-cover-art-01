// Fixed scenes for screenshots, driven by the page's query string:
//   ?shot=cover   — the cover alone, full frame (an exported-cover view)
//   ?shot=editor  — the whole studio with a photo loaded
// Parameters: size (square|portrait|wide), layout, grade, caption, sub,
// badge, stars, photos (comma list of sample names, without extension).
// window.__shotReady is set once the scene has painted, so the screenshot
// tooling can wait for a finished frame instead of guessing a delay.

export function readShotScene(params) {
  const mode = params.get('shot');
  if (!mode) return null;
  const photoList = (params.get('photos') ?? 'boulevard,pier')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => `samples/${name}.jpg`);
  return {
    mode,
    sizeId: params.get('size') ?? (mode === 'cover' ? 'wide' : 'portrait'),
    layout: params.get('layout') ?? 'heroGrid',
    grade: params.get('grade') ?? 'sunset',
    caption: params.get('caption') ?? 'NEON COAST',
    subtitle: params.get('sub') ?? 'welcome back to the coast',
    badge: params.get('badge') ?? 'DAY ONE',
    stars: Number(params.get('stars') ?? 3),
    photoUrls: photoList,
  };
}

export function markShotReady() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}
