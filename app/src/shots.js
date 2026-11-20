// Fixed scenes for screenshot capture.
// The harness opens the studio with a query like
// ?shot=cover&size=wide&layout=heroGrid&grade=sunset
// I translate that into a plain object here, and once the editor
// has painted I flag readiness after two frames so captures are stable.

const FALLBACK_PHOTOS = "boulevard,pier";

export function readShotScene(params) {
  const mode = params.get("shot");
  if (!mode) return null;

  const listRaw = params.get("photos") || FALLBACK_PHOTOS;
  const photoUrls = listRaw
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => `samples/${name}.jpg`);

  return {
    mode,
    sizeId: params.get("size") || (mode === "cover" ? "wide" : "portrait"),
    layout: params.get("layout") || "heroGrid",
    grade: params.get("grade") || "sunset",
    caption: params.get("caption") || "NEON COAST",
    subtitle: params.get("sub") || "welcome back to the coast",
    badge: params.get("badge") || "DAY ONE",
    stars: Number(params.get("stars") ?? 3),
    photoUrls,
  };
}

export function markShotReady() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}
