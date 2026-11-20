// cover.js — canvas renderer for Neon Coast Cover Studio.
//
// The whole poster is painted with the 2D canvas API. No external art is
// bundled: photographs come from the visitor, empty panels fall back to a
// hand-drawn coastal backdrop, and all type is set in locally available
// system faces. The module is deliberately split into small pure helpers
// (geometry, grain, stars) plus one orchestrator, drawCoverArt, so the
// editor in main.js only has to describe state and ask for a repaint.

export const POST_SIZES = [
  { id: 'square', label: 'Square 1080 × 1080', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait 1080 × 1350', width: 1080, height: 1350 },
  { id: 'wide', label: 'Wide 1920 × 1080', width: 1920, height: 1080 },
];

// Layouts return panel boxes in fractional coordinates (0..1) so the same
// definition scales to any output size. heroGrid adapts its split point:
// landscape sheets can afford a slightly narrower hero column.
export const COVER_LAYOUTS = {
  heroGrid: {
    label: 'Hero Grid',
    panels(w, h) {
      const split = w >= h ? 0.54 : 0.58;
      const rest = 1 - split;
      return [
        { x: 0, y: 0, w: split, h: 1 },
        { x: split, y: 0, w: rest, h: 0.52 },
        { x: split, y: 0.52, w: rest / 2, h: 0.48 },
        { x: split + rest / 2, y: 0.52, w: rest / 2, h: 0.48 },
      ];
    },
  },
  gridSix: {
    label: 'Six Panel Grid',
    panels() {
      const out = [];
      for (let r = 0; r < 2; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          out.push({ x: c / 3, y: r / 2, w: 1 / 3, h: 1 / 2 });
        }
      }
      return out;
    },
  },
  strips: {
    label: 'Vice Strips',
    panels() {
      return [
        { x: 0, y: 0, w: 0.38, h: 1 },
        { x: 0.38, y: 0, w: 0.31, h: 1 },
        { x: 0.69, y: 0, w: 0.31, h: 1 },
      ];
    },
  },
  stackTop: {
    label: 'Top Story',
    panels() {
      return [
        { x: 0, y: 0, w: 1, h: 0.6 },
        { x: 0, y: 0.6, w: 0.5, h: 0.4 },
        { x: 0.5, y: 0.6, w: 0.5, h: 0.4 },
      ];
    },
  },
  fullBleed: {
    label: 'Full Bleed',
    panels() {
      return [{ x: 0, y: 0, w: 1, h: 1 }];
    },
  },
};

// Each grade bundles three things: a CSS filter string applied while the
// photograph is drawn, a vertical wash painted over the assembled sheet,
// and the palette the title / subtitle lettering borrows.
export const COLOR_GRADES = {
  sunset: {
    label: 'Sunset Vice',
    filter: 'saturate(1.35) contrast(1.12) brightness(1.04)',
    wash: [
      [0, 'rgba(255, 94, 58, 0.10)'],
      [0.45, 'rgba(255, 45, 120, 0.16)'],
      [1, 'rgba(64, 12, 110, 0.42)'],
    ],
    glow: 'rgba(255, 140, 66, 0.30)',
    titleTop: '#ffffff',
    titleBottom: '#ffd23e',
    script: '#ff5da2',
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.5) contrast(1.18) brightness(0.98)',
    wash: [
      [0, 'rgba(0, 229, 255, 0.14)'],
      [0.55, 'rgba(20, 8, 60, 0.18)'],
      [1, 'rgba(255, 0, 128, 0.34)'],
    ],
    glow: 'rgba(0, 229, 255, 0.28)',
    titleTop: '#e8feff',
    titleBottom: '#39d5ff',
    script: '#ff71ce',
  },
  golden: {
    label: 'Golden Hour',
    filter: 'saturate(1.2) contrast(1.06) brightness(1.1) sepia(0.22)',
    wash: [
      [0, 'rgba(255, 196, 86, 0.16)'],
      [0.6, 'rgba(255, 120, 60, 0.12)'],
      [1, 'rgba(90, 30, 10, 0.34)'],
    ],
    glow: 'rgba(255, 190, 80, 0.34)',
    titleTop: '#ffffff',
    titleBottom: '#ffb347',
    script: '#ffe9a8',
  },
  noir: {
    label: 'Midnight Noir',
    filter: 'saturate(0.72) contrast(1.28) brightness(0.94)',
    wash: [
      [0, 'rgba(10, 30, 46, 0.20)'],
      [0.55, 'rgba(4, 10, 18, 0.10)'],
      [1, 'rgba(0, 0, 0, 0.52)'],
    ],
    glow: 'rgba(90, 200, 255, 0.16)',
    titleTop: '#ffffff',
    titleBottom: '#9adcff',
    script: '#7df9ff',
  },
  clean: {
    label: 'Clean Poster',
    filter: 'saturate(1.12) contrast(1.05)',
    wash: [
      [0, 'rgba(255, 255, 255, 0.04)'],
      [1, 'rgba(16, 16, 40, 0.20)'],
    ],
    glow: 'rgba(255, 255, 255, 0.12)',
    titleTop: '#ffffff',
    titleBottom: '#ffffff',
    script: '#ff5da2',
  },
};

const HEADLINE_FONTS =
  'Impact, "Arial Narrow Bold", "Franklin Gothic Medium", "Liberation Sans Narrow", sans-serif';
const HANDWRITTEN_FONTS =
  '"Segoe Script", "Brush Script MT", "Comic Sans MS", cursive';
const GUTTER_RATIO = 0.006;

let cachedGrain = null;

// Grain is generated once from a fixed-seed LCG so repeated exports are
// pixel-identical. The tile is small (180px) and tiled via a pattern.
export function buildGrainTile() {
  if (cachedGrain) return cachedGrain;
  const tile = document.createElement('canvas');
  tile.width = 180;
  tile.height = 180;
  const tctx = tile.getContext('2d');
  const pixels = tctx.createImageData(180, 180);
  let state = 20261119;
  for (let i = 0; i < pixels.data.length; i += 4) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const shade = 118 + (state % 120);
    pixels.data[i] = shade;
    pixels.data[i + 1] = shade;
    pixels.data[i + 2] = shade;
    pixels.data[i + 3] = 255;
  }
  tctx.putImageData(pixels, 0, 0);
  cachedGrain = tile;
  return tile;
}

// Fractional layout -> pixel rectangles for a concrete sheet size.
export function panelRectsFor(layoutId, w, h) {
  const def = COVER_LAYOUTS[layoutId] || COVER_LAYOUTS.heroGrid;
  return def.panels(w, h).map((p) => ({
    x: p.x * w,
    y: p.y * h,
    w: p.w * w,
    h: p.h * h,
  }));
}

function clampPan(value) {
  const n = Number.isFinite(value) ? value : 0;
  return Math.max(-1, Math.min(1, n));
}

// Paint a single photograph inside its panel. The image is scaled to cover
// the box, multiplied by the panel zoom, then offset by pan values that are
// expressed as a fraction of the available overflow on each axis.
export function drawPanelPhoto(ctx, image, rect, view, filter) {
  const zoom = Math.max(1, view?.zoom ?? 1);
  const panX = clampPan(view?.panX ?? 0);
  const panY = clampPan(view?.panY ?? 0);
  const coverScale = Math.max(rect.w / image.naturalWidth, rect.h / image.naturalHeight);
  const finalScale = coverScale * zoom;
  const dw = image.naturalWidth * finalScale;
  const dh = image.naturalHeight * finalScale;
  const slackX = Math.max(0, dw - rect.w);
  const slackY = Math.max(0, dh - rect.h);
  const originX = rect.x - slackX / 2 + panX * (slackX / 2);
  const originY = rect.y - slackY / 2 + panY * (slackY / 2);

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = filter;
  ctx.drawImage(image, originX, originY, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

// Placeholder artwork for panels that have no photograph yet. Draws a
// stylised shoreline at dusk: gradient sky, a low sun disc with halo, a
// dark ground band, and a leaning palm picked out in silhouette. The sun
// position drifts slightly per panel so a grid does not look stamped.
export function paintBackdropPanel(ctx, rect, gradeId, panelIndex) {
  const grade = COLOR_GRADES[gradeId] || COLOR_GRADES.sunset;
  const isNight = gradeId === 'neon' || gradeId === 'noir';

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();

  const skyGrad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  skyGrad.addColorStop(0, isNight ? '#101736' : '#3b1d5e');
  skyGrad.addColorStop(0.55, gradeId === 'neon' ? '#5e1a68' : '#b52a6e');
  skyGrad.addColorStop(0.78, '#ff7a3c');
  skyGrad.addColorStop(1, '#16102a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  const cx = rect.x + rect.w * (0.3 + 0.18 * (panelIndex % 3));
  const cy = rect.y + rect.h * 0.68;
  const radius = Math.min(rect.w, rect.h) * 0.26;

  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.7);
  halo.addColorStop(0, 'rgba(255, 214, 120, 0.95)');
  halo.addColorStop(0.55, 'rgba(255, 122, 60, 0.55)');
  halo.addColorStop(1, 'rgba(255, 122, 60, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.52, 0, Math.PI * 2);
  ctx.fill();

  // Ground / waterline band.
  ctx.fillStyle = 'rgba(10, 8, 24, 0.88)';
  ctx.fillRect(rect.x, rect.y + rect.h * 0.78, rect.w, rect.h * 0.22);

  // Palm: a curved trunk plus six fronds fanning from its crown.
  ctx.strokeStyle = 'rgba(6, 6, 16, 0.95)';
  ctx.lineCap = 'round';
  const baseX = rect.x + rect.w * 0.78;
  const baseY = rect.y + rect.h * 0.8;
  const crownX = baseX + rect.w * 0.08;
  const crownY = rect.y + rect.h * 0.34;
  ctx.lineWidth = Math.max(3, rect.w * 0.012);
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + rect.w * 0.03, rect.y + rect.h * 0.55, crownX, crownY);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, rect.w * 0.008);
  for (let f = 0; f < 6; f += 1) {
    const ang = Math.PI * (0.08 + f * 0.17);
    const tipX = crownX + Math.cos(ang) * rect.w * 0.2;
    const tipY = crownY - Math.sin(ang) * rect.h * 0.12 + rect.h * 0.05;
    const midX = crownX + Math.cos(ang) * rect.w * 0.12;
    const midY = crownY - Math.sin(ang) * rect.h * 0.1;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();
  }

  // A faint grade-tinted sheen across the top edge.
  ctx.fillStyle = grade.glow;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h * 0.1);
  ctx.restore();
}

// Reduce the headline size in 6% steps until it fits maxWidth (or bottoms
// out at 18px). Sets ctx.font as a side effect and returns the size used.
export function fitTitleSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  const apply = () => {
    ctx.font = `italic 900 ${size}px ${HEADLINE_FONTS}`;
  };
  apply();
  while (ctx.measureText(text).width > maxWidth && size > 18) {
    size *= 0.94;
    apply();
  }
  return size;
}

// One star of the wanted row. Filled stars are gold with a dark rim;
// unfilled stars are just a pale outline.
export function drawWantedStar(ctx, cx, cy, radius, filled) {
  ctx.beginPath();
  for (let k = 0; k < 10; k += 1) {
    const r = k % 2 === 0 ? radius : radius * 0.45;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = '#ffd23e';
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.lineWidth = radius * 0.14;
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = radius * 0.12;
    ctx.stroke();
  }
}

function insetForGutter(rect, sheetW, sheetH, gutter) {
  const half = gutter / 2;
  const left = rect.x > 0 ? half : 0;
  const top = rect.y > 0 ? half : 0;
  const right = rect.x + rect.w < sheetW ? half : 0;
  const bottom = rect.y + rect.h < sheetH ? half : 0;
  return { x: rect.x + left, y: rect.y + top, w: rect.w - left - right, h: rect.h - top - bottom };
}

// Main entry point. `state` shape:
//   { layout, grade, photos, panels, selectedPanel, showSelection,
//     caption, subtitle, badge, stars, grain, vignette }
// panels[i] = { photoIndex, zoom, panX, panY } where photoIndex -1 = empty.
export function drawCoverArt(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = COLOR_GRADES[state.grade] || COLOR_GRADES.sunset;
  const gutter = Math.max(4, Math.round(W * GUTTER_RATIO));

  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, W, H);

  const rects = panelRectsFor(state.layout, W, H);
  for (let i = 0; i < rects.length; i += 1) {
    const inner = insetForGutter(rects[i], W, H, gutter);
    const panel = state.panels[i] || {};
    const photo =
      panel.photoIndex != null && panel.photoIndex >= 0
        ? state.photos[panel.photoIndex]
        : null;
    if (photo) {
      drawPanelPhoto(ctx, photo, inner, panel, grade.filter);
    } else {
      paintBackdropPanel(ctx, inner, state.grade, i);
    }
    if (state.showSelection && state.selectedPanel === i) {
      ctx.strokeStyle = '#ff2e88';
      ctx.lineWidth = Math.max(4, W * 0.005);
      ctx.strokeRect(inner.x + 3, inner.y + 3, inner.w - 6, inner.h - 6);
    }
  }

  // Unify the panels: diagonal wash + a soft glow anchored near the top.
  const washGrad = ctx.createLinearGradient(0, 0, W * 0.25, H);
  for (const [offset, colour] of grade.wash) washGrad.addColorStop(offset, colour);
  ctx.fillStyle = washGrad;
  ctx.fillRect(0, 0, W, H);

  const glowGrad = ctx.createRadialGradient(W * 0.5, H * 0.16, 0, W * 0.5, H * 0.16, W * 0.75);
  glowGrad.addColorStop(0, grade.glow);
  glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  if (state.vignette) {
    const vig = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.78,
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(5,2,12,0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(buildGrainTile(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  drawTitleBlock(ctx, state, grade, W, H);
  if (state.stars > 0) drawStarRow(ctx, state.stars, W, H);
  if (state.badge && state.badge.trim()) drawBadgeRibbon(ctx, state.badge.trim(), W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(3, W * 0.004);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
}

// Bottom-anchored type block. The headline is skewed slightly, outlined,
// shadowed, and filled with a two-stop vertical gradient. The subtitle sits
// just above it in a glowing script face, drawn twice for extra bloom.
export function drawTitleBlock(ctx, state, grade, w, h) {
  const headline = (state.caption || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  const baseline = h * 0.965;

  ctx.save();
  ctx.textAlign = 'center';

  if (headline) {
    const size = fitTitleSize(ctx, headline, w * 0.92, h * 0.155);
    ctx.save();
    ctx.translate(w / 2, baseline);
    ctx.transform(1, 0, -0.09, 1, 0, 0);
    ctx.font = `italic 900 ${size}px ${HEADLINE_FONTS}`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = 'rgba(8,4,16,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = size * 0.07;
    ctx.strokeText(headline, 0, 0);
    const fillGrad = ctx.createLinearGradient(0, -size, 0, 0);
    fillGrad.addColorStop(0, grade.titleTop);
    fillGrad.addColorStop(1, grade.titleBottom);
    ctx.fillStyle = fillGrad;
    ctx.shadowColor = 'transparent';
    ctx.fillText(headline, 0, 0);
    ctx.restore();

    if (sub) {
      const subSize = Math.max(20, size * 0.34);
      ctx.font = `italic 700 ${subSize}px ${HANDWRITTEN_FONTS}`;
      ctx.fillStyle = grade.script;
      ctx.shadowColor = grade.script;
      ctx.shadowBlur = subSize * 0.55;
      ctx.fillText(sub, w / 2, baseline - size * 1.04);
      ctx.shadowBlur = subSize * 0.2;
      ctx.fillText(sub, w / 2, baseline - size * 1.04);
    }
  } else if (sub) {
    ctx.font = `italic 700 ${Math.round(h * 0.05)}px ${HANDWRITTEN_FONTS}`;
    ctx.fillStyle = grade.script;
    ctx.fillText(sub, w / 2, baseline);
  }

  ctx.restore();
}

// Five stars pinned to the top-right corner; `stars` of them are lit.
export function drawStarRow(ctx, stars, w, h) {
  const radius = Math.min(w, h) * 0.026;
  const step = radius * 2.5;
  const firstX = w - radius * 1.6 - step * 4;
  const centreY = radius * 1.7;
  for (let i = 0; i < 5; i += 1) {
    drawWantedStar(ctx, firstX + i * step, centreY, radius, i < stars);
  }
}

// Small tilted label in the top-left, e.g. "DAY ONE". Text is truncated to
// 18 characters so the ribbon never outgrows a narrow sheet.
export function drawBadgeRibbon(ctx, text, w, h) {
  const label = text.toUpperCase().slice(0, 18);
  const fontSize = Math.round(Math.min(w, h) * 0.034);
  ctx.save();
  ctx.font = `900 ${fontSize}px ${HEADLINE_FONTS}`;
  const ribbonW = ctx.measureText(label).width + fontSize * 1.6;
  ctx.translate(w * 0.015, h * 0.045);
  ctx.rotate(-0.06);
  ctx.fillStyle = '#ff2e88';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = fontSize * 0.4;
  ctx.shadowOffsetY = fontSize * 0.16;
  ctx.fillRect(0, -fontSize * 1.05, ribbonW, fontSize * 1.7);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(label, ribbonW / 2, fontSize * 0.32);
  ctx.restore();
}
