// cover.js — the drawing engine for Neon Coast Cover Studio.
// Everything here is pure canvas work: given a state object and a list of
// loaded images it paints one complete multi-panel cover. The editor in
// main.js owns the state; this file only knows how to draw it, so the same
// code path renders the live preview and the exported PNG.

export const POST_SIZES = {
  square: { width: 1080, height: 1080, label: "Square 1080 x 1080" },
  portrait: { width: 1080, height: 1350, label: "Portrait 1080 x 1350" },
  wide: { width: 1920, height: 1080, label: "Wide 1920 x 1080" },
};

// Each layout is a list of normalised panel rectangles (x, y, w, h in
// fractions of the poster). Panels are painted in order, so the hero of a
// layout is simply its first rectangle.
export const PANEL_LAYOUTS = {
  grid6: {
    label: "Cover grid · 6 panels",
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 / 2 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 / 2 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 / 2 },
      { x: 0, y: 1 / 2, w: 1 / 3, h: 1 / 2 },
      { x: 1 / 3, y: 1 / 2, w: 1 / 3, h: 1 / 2 },
      { x: 2 / 3, y: 1 / 2, w: 1 / 3, h: 1 / 2 },
    ],
  },
  hero3: {
    label: "Hero + three · 4 panels",
    panels: [
      { x: 0, y: 0, w: 0.58, h: 1 },
      { x: 0.58, y: 0, w: 0.42, h: 1 / 3 },
      { x: 0.58, y: 1 / 3, w: 0.42, h: 1 / 3 },
      { x: 0.58, y: 2 / 3, w: 0.42, h: 1 / 3 },
    ],
  },
  strip4: {
    label: "Film strips · 4 panels",
    panels: [
      { x: 0, y: 0, w: 1 / 4, h: 1 },
      { x: 1 / 4, y: 0, w: 1 / 4, h: 1 },
      { x: 2 / 4, y: 0, w: 1 / 4, h: 1 },
      { x: 3 / 4, y: 0, w: 1 / 4, h: 1 },
    ],
  },
  mosaic5: {
    label: "Mosaic · 5 panels",
    panels: [
      { x: 0, y: 0, w: 2 / 3, h: 0.55 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 0.55 },
      { x: 0, y: 0.55, w: 1 / 3, h: 0.45 },
      { x: 1 / 3, y: 0.55, w: 1 / 3, h: 0.45 },
      { x: 2 / 3, y: 0.55, w: 1 / 3, h: 0.45 },
    ],
  },
  single: {
    label: "Full bleed · 1 panel",
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
};

// Colour grades. `sky` tints the empty-panel scene, `wash` is laid over a
// photo with soft-light, `shade` deepens the bottom of every panel and
// `filter` is the canvas filter string applied while the photo is drawn.
export const COLOUR_GRADES = {
  sunset: {
    label: "Vice sunset",
    sky: ["#2b1055", "#7597de", "#ff7e5f", "#feb47b"],
    wash: "rgba(255, 110, 64, 0.20)",
    shade: "rgba(43, 16, 85, 0.55)",
    filter: "saturate(1.25) contrast(1.08)",
    titleStops: ["#ffe259", "#ffa751", "#ff5e8a"],
  },
  neon: {
    label: "Neon night",
    sky: ["#0f0529", "#3a0ca3", "#f72585", "#4cc9f0"],
    wash: "rgba(76, 201, 240, 0.16)",
    shade: "rgba(5, 2, 24, 0.62)",
    filter: "saturate(1.45) contrast(1.16) brightness(0.98)",
    titleStops: ["#a8fff9", "#4cc9f0", "#f72585"],
  },
  golden: {
    label: "Golden hour",
    sky: ["#3d2c29", "#8a5a44", "#e8a15c", "#f7d08a"],
    wash: "rgba(232, 161, 92, 0.18)",
    shade: "rgba(40, 20, 8, 0.5)",
    filter: "saturate(1.12) contrast(1.05) brightness(1.04)",
    titleStops: ["#fff3b0", "#f4a950", "#d96c33"],
  },
  noir: {
    label: "Mono noir",
    sky: ["#0a0a0a", "#3a3a3a", "#8a8a8a", "#d9d9d9"],
    wash: "rgba(255, 255, 255, 0.06)",
    shade: "rgba(0, 0, 0, 0.6)",
    filter: "grayscale(1) contrast(1.22)",
    titleStops: ["#ffffff", "#cfcfcf", "#8a8a8a"],
  },
  clean: {
    label: "Clean print",
    sky: ["#123a5c", "#2e6da4", "#7fb2d9", "#dceefb"],
    wash: "rgba(255, 255, 255, 0)",
    shade: "rgba(10, 30, 50, 0.35)",
    filter: "saturate(1.05) contrast(1.02)",
    titleStops: ["#ffffff", "#ffe259", "#ff7e5f"],
  },
};

export function panelCount(layoutKey) {
  const layout = PANEL_LAYOUTS[layoutKey] || PANEL_LAYOUTS.grid6;
  return layout.panels.length;
}

// Pixel rectangles for a layout at a given poster size. The white frame of
// the classic cover look comes from painting the whole frame white and
// insetting every panel by half the gutter.
export function layoutRects(layoutKey, width, height) {
  const layout = PANEL_LAYOUTS[layoutKey] || PANEL_LAYOUTS.grid6;
  const frame = Math.round(Math.min(width, height) * 0.018);
  const gutter = Math.max(4, Math.round(Math.min(width, height) * 0.008));
  const innerW = width - frame * 2;
  const innerH = height - frame * 2;
  return layout.panels.map((p) => ({
    x: frame + p.x * innerW + gutter / 2,
    y: frame + p.y * innerH + gutter / 2,
    w: p.w * innerW - gutter,
    h: p.h * innerH - gutter,
  }));
}

// Cover-fit maths: scale the image so it fills the panel, then let the
// panel's zoom and offset slide the visible window around.
export function coverFit(image, rect, zoom, offsetX, offsetY) {
  const scale = Math.max(rect.w / image.width, rect.h / image.height) * (zoom || 1);
  const drawnW = image.width * scale;
  const drawnH = image.height * scale;
  const dx = rect.x + (rect.w - drawnW) / 2 + (offsetX || 0) * rect.w * 0.5;
  const dy = rect.y + (rect.h - drawnH) / 2 + (offsetY || 0) * rect.h * 0.5;
  return { dx, dy, drawnW, drawnH };
}

// A painted backdrop for panels that hold no photo yet: gradient sky, a low
// sun, a skyline and two palm silhouettes, all in the grade's own colours so
// an empty cover still reads as finished art.
export function paintEmptyPanel(ctx, rect, grade, seed) {
  const sky = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.45, grade.sky[1]);
  sky.addColorStop(0.78, grade.sky[2]);
  sky.addColorStop(1, grade.sky[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  const sunX = rect.x + rect.w * (0.3 + 0.14 * (seed % 3));
  const sunY = rect.y + rect.h * 0.62;
  const sunR = rect.h * 0.16;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 236, 190, 0.9)";
  ctx.fill();
  ctx.fillStyle = "rgba(20, 8, 40, 0.16)";
  for (let i = 0; i < 3; i += 1) {
    ctx.fillRect(sunX - sunR, sunY - sunR * 0.2 + i * sunR * 0.32, sunR * 2, sunR * 0.1);
  }

  ctx.fillStyle = "rgba(12, 6, 28, 0.85)";
  const base = rect.y + rect.h;
  let bx = rect.x - 6;
  let tower = 0;
  while (bx < rect.x + rect.w) {
    const tw = rect.w * (0.1 + 0.05 * ((seed + tower) % 3));
    const th = rect.h * (0.16 + 0.09 * ((seed * 2 + tower) % 4));
    ctx.fillRect(bx, base - th, tw, th);
    bx += tw + rect.w * 0.02;
    tower += 1;
  }
  ctx.fillRect(rect.x, base - rect.h * 0.05, rect.w, rect.h * 0.05);

  paintPalm(ctx, rect.x + rect.w * 0.82, base, rect.h * 0.52);
  paintPalm(ctx, rect.x + rect.w * 0.12, base, rect.h * 0.38);
}

function paintPalm(ctx, baseX, baseY, height) {
  ctx.strokeStyle = "rgba(8, 4, 20, 0.92)";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(3, height * 0.045);
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + height * 0.08, baseY - height * 0.6, baseX + height * 0.2, baseY - height);
  ctx.stroke();
  const topX = baseX + height * 0.2;
  const topY = baseY - height;
  ctx.lineWidth = Math.max(2, height * 0.03);
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI * (0.08 + i * 0.17);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(angle) * height * 0.3,
      topY - Math.sin(angle) * height * 0.22 - height * 0.05,
      topX + Math.cos(angle) * height * 0.42,
      topY - Math.sin(angle) * height * 0.1 + height * 0.14,
    );
    ctx.stroke();
  }
}

// One panel: clip, paint photo or backdrop, lay the grade over it, deepen
// the foot of the panel so the lettering that overlaps stays readable.
export function paintPanel(ctx, rect, panel, image, grade, ink) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (image) {
    const fit = coverFit(image, rect, panel.zoom, panel.offsetX, panel.offsetY);
    ctx.filter = grade.filter + (ink ? " contrast(1.18) saturate(1.3)" : "");
    ctx.beginPath();
    if (panel.flip) {
      ctx.translate(fit.dx + fit.drawnW, fit.dy);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0, fit.drawnW, fit.drawnH);
    } else {
      ctx.drawImage(image, fit.dx, fit.dy, fit.drawnW, fit.drawnH);
    }
    ctx.filter = "none";
  } else {
    paintEmptyPanel(ctx, rect, grade, panel.seed || 0);
  }
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = grade.wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = "source-over";
  const shade = ctx.createLinearGradient(rect.x, rect.y + rect.h * 0.55, rect.x, rect.y + rect.h);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, grade.shade);
  ctx.fillStyle = shade;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

const TITLE_FONT = '"Arial Narrow", "Liberation Sans Narrow", Impact, "Arial Black", sans-serif';
const SCRIPT_FONT = 'italic Georgia, "Times New Roman", serif';

// The lettering block: script subtitle over a heavy condensed title with a
// sunset gradient fill and a white keyline, anchored to the poster's foot.
export function paintLettering(ctx, state, width, height) {
  const grade = COLOUR_GRADES[state.gradeKey] || COLOUR_GRADES.sunset;
  const unit = Math.min(width, height);
  const title = (state.title || "").trim();
  const subtitle = (state.subtitle || "").trim();
  const baseY = height - unit * 0.055;

  ctx.save();
  ctx.textAlign = "left";
  if (subtitle) {
    ctx.font = `${Math.round(unit * 0.052)}px ${SCRIPT_FONT}`;
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = unit * 0.012;
    ctx.shadowOffsetY = unit * 0.006;
    ctx.fillText(subtitle, unit * 0.055, baseY - unit * 0.155);
    ctx.shadowColor = "transparent";
  }
  if (title) {
    let size = unit * 0.148 * (state.titleScale || 1);
    ctx.font = `${Math.round(size)}px ${TITLE_FONT}`;
    const maxW = width - unit * 0.11;
    while (ctx.measureText(title.toUpperCase()).width > maxW && size > unit * 0.05) {
      size *= 0.94;
      ctx.font = `${Math.round(size)}px ${TITLE_FONT}`;
    }
    const grad = ctx.createLinearGradient(0, baseY - size, 0, baseY);
    grade.titleStops.forEach((stop, i) => {
      grad.addColorStop(i / (grade.titleStops.length - 1), stop);
    });
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = size * 0.09;
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = unit * 0.014;
    ctx.shadowOffsetY = unit * 0.008;
    const text = title.toUpperCase();
    ctx.strokeText(text, unit * 0.05, baseY);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = grad;
    ctx.fillText(text, unit * 0.05, baseY);
  }
  ctx.restore();
}

// Heat stars and the corner ribbon: the poster's bragging corner.
export function paintBadges(ctx, state, width, height) {
  const unit = Math.min(width, height);
  const stars = Math.max(0, Math.min(6, state.stars || 0));
  ctx.save();
  if (stars > 0) {
    const starSize = unit * 0.026;
    const totalW = stars * starSize * 2.5;
    let cx = width - unit * 0.05 - totalW + starSize;
    const cy = unit * 0.062;
    ctx.fillStyle = "rgba(8, 4, 20, 0.55)";
    ctx.fillRect(width - unit * 0.05 - totalW - starSize * 0.7, cy - starSize * 1.5, totalW + starSize * 1.4, starSize * 3);
    for (let i = 0; i < stars; i += 1) {
      paintStar(ctx, cx, cy, starSize, "#ffd23f");
      cx += starSize * 2.5;
    }
  }
  const badge = (state.badge || "").trim();
  if (badge) {
    ctx.translate(unit * 0.115, unit * 0.052);
    ctx.rotate(-0.1);
    ctx.font = `${Math.round(unit * 0.03)}px ${TITLE_FONT}`;
    const w = ctx.measureText(badge.toUpperCase()).width + unit * 0.035;
    ctx.fillStyle = "#f72585";
    ctx.fillRect(-w / 2, -unit * 0.026, w, unit * 0.052);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badge.toUpperCase(), 0, unit * 0.002);
  }
  ctx.restore();
}

function paintStar(ctx, cx, cy, radius, colour) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
}

let grainPattern = null;
function getGrainPattern(ctx) {
  if (grainPattern) return grainPattern;
  const tile = document.createElement("canvas");
  tile.width = 128;
  tile.height = 128;
  const tctx = tile.getContext("2d");
  const data = tctx.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 96);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  grainPattern = ctx.createPattern(tile, "repeat");
  return grainPattern;
}

// The whole poster, top to bottom: white frame, panels, lettering, badges,
// then the finishing grain and vignette.
export function drawCover(ctx, state, images, width, height) {
  const grade = COLOUR_GRADES[state.gradeKey] || COLOUR_GRADES.sunset;
  ctx.save();
  ctx.fillStyle = "#0b0618";
  ctx.fillRect(0, 0, width, height);
  const frame = Math.round(Math.min(width, height) * 0.018);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(frame * 0.35, frame * 0.35, width - frame * 0.7, height - frame * 0.7);

  const rects = layoutRects(state.layoutKey, width, height);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] || { zoom: 1, offsetX: 0, offsetY: 0, seed: i };
    paintPanel(ctx, rect, panel, images[i] || null, grade, state.ink);
  });

  paintLettering(ctx, state, width, height);
  paintBadges(ctx, state, width, height);

  if (state.grain) {
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = getGrainPattern(ctx);
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  if (state.vignette) {
    const rad = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.42,
      width / 2, height / 2, Math.max(width, height) * 0.72,
    );
    rad.addColorStop(0, "rgba(0,0,0,0)");
    rad.addColorStop(1, "rgba(5,2,16,0.42)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
  return rects;
}
