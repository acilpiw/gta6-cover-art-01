// Neon Coast Cover Studio — the cover-art rendering engine.
// Everything is drawn on a 2D canvas, client-side only: panel layouts in the
// multi-panel GTA poster tradition, a Vice City colour grade per panel and
// over the whole sheet, film grain, a vignette, and big condensed caption
// lettering with a neon script subtitle, a wanted-star row and a badge ribbon.
// No artwork, logo or font is taken from any game: the lettering uses the
// viewer's own system condensed fonts and every effect is drawn here.

export const POST_SIZES = [
  { id: 'square', label: 'Square 1080 × 1080', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait 1080 × 1350', width: 1080, height: 1350 },
  { id: 'wide', label: 'Wide 1920 × 1080', width: 1920, height: 1080 },
];

// Panel rectangles as fractions of the sheet. Each layout is a function so a
// wide sheet can give its hero panel more room than a square one.
export const COVER_LAYOUTS = {
  heroGrid: {
    label: 'Hero Grid',
    panels: (w, h) => {
      const heroW = w >= h ? 0.54 : 0.58;
      return [
        { x: 0, y: 0, w: heroW, h: 1 },
        { x: heroW, y: 0, w: 1 - heroW, h: 0.52 },
        { x: heroW, y: 0.52, w: (1 - heroW) / 2, h: 0.48 },
        { x: heroW + (1 - heroW) / 2, y: 0.52, w: (1 - heroW) / 2, h: 0.48 },
      ];
    },
  },
  gridSix: {
    label: 'Six Panel Grid',
    panels: () => {
      const cells = [];
      for (let row = 0; row < 2; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          cells.push({ x: col / 3, y: row / 2, w: 1 / 3, h: 1 / 2 });
        }
      }
      return cells;
    },
  },
  strips: {
    label: 'Vice Strips',
    panels: () => [
      { x: 0, y: 0, w: 0.38, h: 1 },
      { x: 0.38, y: 0, w: 0.31, h: 1 },
      { x: 0.69, y: 0, w: 0.31, h: 1 },
    ],
  },
  stackTop: {
    label: 'Top Story',
    panels: () => [
      { x: 0, y: 0, w: 1, h: 0.6 },
      { x: 0, y: 0.6, w: 0.5, h: 0.4 },
      { x: 0.5, y: 0.6, w: 0.5, h: 0.4 },
    ],
  },
  fullBleed: {
    label: 'Full Bleed',
    panels: () => [{ x: 0, y: 0, w: 1, h: 1 }],
  },
};

// Colour grades: a canvas filter for the photo itself, a wash of gradient
// stops over the whole sheet, and the accent colours the lettering picks up.
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

const TITLE_FONT_STACK = 'Impact, "Arial Narrow Bold", "Franklin Gothic Medium", "Liberation Sans Narrow", sans-serif';
const SCRIPT_FONT_STACK = '"Segoe Script", "Brush Script MT", "Comic Sans MS", cursive';
const GUTTER_FRACTION = 0.006;

let grainCanvas = null;

// Builds a small tile of deterministic film grain once, then tiles it over
// the sheet so an export looks the same every time it is made.
export function buildGrainTile() {
  if (grainCanvas) return grainCanvas;
  const tile = document.createElement('canvas');
  tile.width = 180;
  tile.height = 180;
  const g = tile.getContext('2d');
  const image = g.createImageData(tile.width, tile.height);
  let seed = 20261119;
  for (let i = 0; i < image.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const v = 118 + (seed % 120);
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  g.putImageData(image, 0, 0);
  grainCanvas = tile;
  return tile;
}

// Returns the panel rectangles in pixels for a layout on a sheet of w × h.
export function panelRectsFor(layoutId, w, h) {
  const layout = COVER_LAYOUTS[layoutId] ?? COVER_LAYOUTS.heroGrid;
  return layout.panels(w, h).map((p) => ({ x: p.x * w, y: p.y * h, w: p.w * w, h: p.h * h }));
}

// Draws one photo into a panel: cover-fit, then the panel's own zoom and pan
// (offsets are fractions of the overflow, -1..1), with the grade's filter.
export function drawPanelPhoto(ctx, image, rect, view, filter) {
  const zoom = Math.max(1, view?.zoom ?? 1);
  const baseScale = Math.max(rect.w / image.naturalWidth, rect.h / image.naturalHeight);
  const scale = baseScale * zoom;
  const drawnW = image.naturalWidth * scale;
  const drawnH = image.naturalHeight * scale;
  const overflowX = Math.max(0, drawnW - rect.w);
  const overflowY = Math.max(0, drawnH - rect.h);
  const dx = rect.x - overflowX / 2 + (view?.panX ?? 0) * (overflowX / 2);
  const dy = rect.y - overflowY / 2 + (view?.panY ?? 0) * (overflowY / 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = filter;
  ctx.drawImage(image, dx, dy, drawnW, drawnH);
  ctx.filter = 'none';
  ctx.restore();
}

// A panel with no photo yet is not left black: it gets a painted Vice City
// backdrop — sunset sky, a low sun, sea, and palm silhouettes — so the demo
// cover and a half-filled grid still read as finished poster art.
export function paintBackdropPanel(ctx, rect, gradeId, panelIndex) {
  const grade = COLOR_GRADES[gradeId] ?? COLOR_GRADES.sunset;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  sky.addColorStop(0, gradeId === 'neon' || gradeId === 'noir' ? '#101736' : '#3b1d5e');
  sky.addColorStop(0.55, gradeId === 'neon' ? '#5e1a68' : '#b52a6e');
  sky.addColorStop(0.78, '#ff7a3c');
  sky.addColorStop(1, '#16102a');
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const sunX = rect.x + rect.w * (0.3 + 0.18 * (panelIndex % 3));
  const sunY = rect.y + rect.h * 0.68;
  const sunR = Math.min(rect.w, rect.h) * 0.26;
  const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 1.7);
  sun.addColorStop(0, 'rgba(255, 214, 120, 0.95)');
  sun.addColorStop(0.55, 'rgba(255, 122, 60, 0.55)');
  sun.addColorStop(1, 'rgba(255, 122, 60, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 0.52, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(10, 8, 24, 0.88)';
  ctx.fillRect(rect.x, rect.y + rect.h * 0.78, rect.w, rect.h * 0.22);
  ctx.strokeStyle = 'rgba(6, 6, 16, 0.95)';
  ctx.lineWidth = Math.max(3, rect.w * 0.012);
  ctx.lineCap = 'round';
  const palmBaseX = rect.x + rect.w * 0.78;
  const palmBaseY = rect.y + rect.h * 0.8;
  const palmTopY = rect.y + rect.h * 0.34;
  ctx.beginPath();
  ctx.moveTo(palmBaseX, palmBaseY);
  ctx.quadraticCurveTo(palmBaseX + rect.w * 0.03, rect.y + rect.h * 0.55, palmBaseX + rect.w * 0.08, palmTopY);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, rect.w * 0.008);
  for (let frond = 0; frond < 6; frond += 1) {
    const angle = Math.PI * (0.08 + frond * 0.17);
    const fx = palmBaseX + rect.w * 0.08 + Math.cos(angle) * rect.w * 0.2;
    const fy = palmTopY - Math.sin(angle) * rect.h * 0.12 + rect.h * 0.05;
    ctx.beginPath();
    ctx.moveTo(palmBaseX + rect.w * 0.08, palmTopY);
    ctx.quadraticCurveTo(palmBaseX + rect.w * 0.08 + Math.cos(angle) * rect.w * 0.12, palmTopY - Math.sin(angle) * rect.h * 0.1, fx, fy);
    ctx.stroke();
  }
  ctx.fillStyle = grade.glow;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h * 0.1);
  ctx.restore();
}

// Shrinks the caption font until the words fit the sheet, the way a poster
// letterer would, and returns the size that fits.
export function fitTitleSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `italic 900 ${size}px ${TITLE_FONT_STACK}`;
  while (ctx.measureText(text).width > maxWidth && size > 18) {
    size *= 0.94;
    ctx.font = `italic 900 ${size}px ${TITLE_FONT_STACK}`;
  }
  return size;
}

// Draws one five-pointed star centred at (cx, cy).
export function drawWantedStar(ctx, cx, cy, radius, filled) {
  ctx.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const r = point % 2 === 0 ? radius : radius * 0.45;
    const a = -Math.PI / 2 + (point * Math.PI) / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
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

// The full render. `state` carries the sheet size, layout, grade, the photos
// and per-panel views, the caption lines, stars, badge and effect toggles.
export function drawCoverArt(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = COLOR_GRADES[state.grade] ?? COLOR_GRADES.sunset;
  const gutter = Math.max(4, Math.round(w * GUTTER_FRACTION));
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, w, h);

  const rects = panelRectsFor(state.layout, w, h);
  rects.forEach((rect, index) => {
    const inner = {
      x: rect.x + (rect.x > 0 ? gutter / 2 : 0),
      y: rect.y + (rect.y > 0 ? gutter / 2 : 0),
      w: rect.w - (rect.x > 0 ? gutter / 2 : 0) - (rect.x + rect.w < w ? gutter / 2 : 0),
      h: rect.h - (rect.y > 0 ? gutter / 2 : 0) - (rect.y + rect.h < h ? gutter / 2 : 0),
    };
    const panel = state.panels[index] ?? {};
    const image = panel.photoIndex >= 0 ? state.photos[panel.photoIndex] : null;
    if (image) drawPanelPhoto(ctx, image, inner, panel, grade.filter);
    else paintBackdropPanel(ctx, inner, state.grade, index);
    if (state.selectedPanel === index && state.showSelection) {
      ctx.strokeStyle = '#ff2e88';
      ctx.lineWidth = Math.max(4, w * 0.005);
      ctx.strokeRect(inner.x + 3, inner.y + 3, inner.w - 6, inner.h - 6);
    }
  });

  // The grade wash over the whole sheet ties the panels into one poster.
  const wash = ctx.createLinearGradient(0, 0, w * 0.25, h);
  for (const [stop, colour] of grade.wash) wash.addColorStop(stop, colour);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.16, 0, w * 0.5, h * 0.16, w * 0.75);
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  if (state.vignette) {
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(5,2,12,0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.globalCompositeOperation = 'overlay';
    const pattern = ctx.createPattern(buildGrainTile(), 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  drawTitleBlock(ctx, state, grade, w, h);
  if (state.stars > 0) drawStarRow(ctx, state.stars, w, h);
  if (state.badge?.trim()) drawBadgeRibbon(ctx, state.badge.trim(), w, h);
  // A thin poster frame finishes the sheet.
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

// Caption block: a neon script subtitle over a huge condensed title, skewed
// like hand-lettered poster type, with a hard drop shadow and dark outline.
export function drawTitleBlock(ctx, state, grade, w, h) {
  const caption = (state.caption ?? '').trim().toUpperCase();
  const subtitle = (state.subtitle ?? '').trim();
  const baseY = h * 0.965;
  ctx.save();
  ctx.textAlign = 'center';
  if (caption) {
    const size = fitTitleSize(ctx, caption, w * 0.92, h * 0.155);
    ctx.translate(w / 2, baseY);
    ctx.transform(1, 0, -0.09, 1, 0, 0);
    ctx.font = `italic 900 ${size}px ${TITLE_FONT_STACK}`;
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = 'rgba(8,4,16,0.92)';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = size * 0.07;
    ctx.strokeText(caption, 0, 0);
    const fill = ctx.createLinearGradient(0, -size, 0, 0);
    fill.addColorStop(0, grade.titleTop);
    fill.addColorStop(1, grade.titleBottom);
    ctx.fillStyle = fill;
    ctx.shadowColor = 'transparent';
    ctx.fillText(caption, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    if (subtitle) {
      const subSize = Math.max(20, size * 0.34);
      ctx.font = `italic 700 ${subSize}px ${SCRIPT_FONT_STACK}`;
      ctx.shadowColor = grade.script;
      ctx.shadowBlur = subSize * 0.55;
      ctx.fillStyle = grade.script;
      ctx.fillText(subtitle, w / 2, baseY - size * 1.04);
      ctx.shadowBlur = subSize * 0.2;
      ctx.fillText(subtitle, w / 2, baseY - size * 1.04);
    }
  } else if (subtitle) {
    ctx.font = `italic 700 ${Math.round(h * 0.05)}px ${SCRIPT_FONT_STACK}`;
    ctx.fillStyle = grade.script;
    ctx.fillText(subtitle, w / 2, baseY);
  }
  ctx.restore();
}

// Wanted stars, top right — the poster's heat meter.
export function drawStarRow(ctx, stars, w, h) {
  const radius = Math.min(w, h) * 0.026;
  const gap = radius * 2.5;
  const startX = w - radius * 1.6 - gap * 4;
  const cy = radius * 1.7;
  for (let i = 0; i < 5; i += 1) {
    drawWantedStar(ctx, startX + i * gap, cy, radius, i < stars);
  }
}

// A small rotated ribbon in the top-left corner for words like DAY ONE.
export function drawBadgeRibbon(ctx, text, w, h) {
  const label = text.toUpperCase().slice(0, 18);
  ctx.save();
  const size = Math.round(Math.min(w, h) * 0.034);
  ctx.font = `900 ${size}px ${TITLE_FONT_STACK}`;
  const width = ctx.measureText(label).width + size * 1.6;
  ctx.translate(w * 0.015, h * 0.045);
  ctx.rotate(-0.06);
  ctx.fillStyle = '#ff2e88';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = size * 0.4;
  ctx.shadowOffsetY = size * 0.16;
  ctx.fillRect(0, -size * 1.05, width, size * 1.7);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(label, width / 2, size * 0.32);
  ctx.restore();
}
