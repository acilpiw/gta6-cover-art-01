// Screenshot scenes for Neon Coast Cover Studio.
// The capture harness passes a query string; I parse it into a scene
// object here, or return null for a normal editor boot. After painting,
// the editor signals readiness over two animation frames.

const DEFAULT_LIST = "boulevard,pier";

export function readShotScene(params) {
  const mode = params.get("shot");
  if (!mode) return null;
  const raw = params.get("photos") || DEFAULT_LIST;
  const photoUrls = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
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
