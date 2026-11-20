// Neon Coast Cover Studio - editor controller
// One state object drives everything: photos, panel crops, layout,
// grade, wording and effects. I wire the sidebar controls to that
// state, repaint via cover.js, allow drag-to-pan on the canvas,
// export PNG at full size, and boot from a shot scene or the demo set.
// User photos are only ever object URLs held locally in the browser.

import {
  COLOR_GRADES,
  COVER_LAYOUTS,
  POST_SIZES,
  drawCoverArt,
  panelRectsFor,
} from "./cover.js";
import { markShotReady, readShotScene } from "./shots.js";

const canvasEl = document.getElementById("coverCanvas");
const statusEl = document.getElementById("statusLine");
const captionField = document.getElementById("captionInput");
const subtitleField = document.getElementById("subtitleInput");
const badgeField = document.getElementById("badgeInput");
const starsSlider = document.getElementById("starRange");
const zoomSlider = document.getElementById("zoomRange");
const panXSlider = document.getElementById("panXRange");
const panYSlider = document.getElementById("panYRange");
const grainBox = document.getElementById("grainToggle");
const vignetteBox = document.getElementById("vignetteToggle");
const thumbContainer = document.getElementById("thumbStrip");

const editorState = {
  sizeId: "portrait",
  layout: "heroGrid",
  grade: "sunset",
  photos: [],
  photoUrls: [],
  panels: [],
  selectedPanel: 0,
  caption: captionField.value,
  subtitle: subtitleField.value,
  badge: badgeField.value,
  stars: Number(starsSlider.value),
  grain: grainBox.checked,
  vignette: vignetteBox.checked,
  showSelection: true,
};

function findSize(id) {
  return POST_SIZES.find((s) => s.id === id) || POST_SIZES[0];
}

function panelCount() {
  const size = findSize(editorState.sizeId);
  return panelRectsFor(editorState.layout, size.width, size.height).length;
}

function syncPanelCount() {
  const wanted = panelCount();
  while (editorState.panels.length < wanted) {
    const idx = editorState.panels.length;
    editorState.panels.push({
      photoIndex: editorState.photos.length ? idx % editorState.photos.length : -1,
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  }
  editorState.panels.length = wanted;
  if (editorState.selectedPanel >= wanted) editorState.selectedPanel = 0;
}

function paint() {
  syncPanelCount();
  const size = findSize(editorState.sizeId);
  if (canvasEl.width !== size.width) canvasEl.width = size.width;
  if (canvasEl.height !== size.height) canvasEl.height = size.height;
  drawCoverArt(canvasEl, editorState);
  buildPanelChips();
  syncCropSliders();
}

export function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = url;
  });
}

export function addPhoto(image, url) {
  editorState.photos.push(image);
  editorState.photoUrls.push(url);
  const newIndex = editorState.photos.length - 1;
  syncPanelCount();
  const emptyAt = editorState.panels.findIndex((p) => p.photoIndex < 0);
  if (emptyAt !== -1) editorState.panels[emptyAt].photoIndex = newIndex;
  else if (editorState.photos.length === 1) {
    for (const panel of editorState.panels) panel.photoIndex = 0;
  }
  renderThumbnails();
  paint();
  return newIndex;
}

function renderThumbnails() {
  thumbContainer.replaceChildren();
  editorState.photoUrls.forEach((url, idx) => {
    const thumb = document.createElement("img");
    thumb.src = url;
    thumb.alt = `Photo ${idx + 1}`;
    thumb.title = "Place this photo in the selected panel";
    const active = editorState.panels[editorState.selectedPanel];
    if (active && active.photoIndex === idx) thumb.classList.add("active");
    thumb.addEventListener("click", () => placePhoto(idx, editorState.selectedPanel));
    thumbContainer.appendChild(thumb);
  });
}

export function placePhoto(photoIndex, panelIndex) {
  syncPanelCount();
  const target = editorState.panels[panelIndex];
  if (!target) return;
  target.photoIndex = photoIndex;
  target.zoom = 1;
  target.panX = 0;
  target.panY = 0;
  editorState.selectedPanel = panelIndex;
  renderThumbnails();
  paint();
}

function fillChipRow(containerId, options, activeId, onPick) {
  const host = document.getElementById(containerId);
  host.replaceChildren();
  for (const opt of options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (opt.id === activeId ? " active" : "") + ` chip-${containerId}`;
    btn.textContent = opt.label;
    btn.addEventListener("click", () => onPick(opt.id));
    host.appendChild(btn);
  }
}

function refreshChipRows() {
  fillChipRow(
    "layoutGroup",
    Object.entries(COVER_LAYOUTS).map(([id, def]) => ({ id, label: def.label })),
    editorState.layout,
    (id) => { editorState.layout = id; editorState.selectedPanel = 0; paint(); },
  );
  fillChipRow(
    "gradeGroup",
    Object.entries(COLOR_GRADES).map(([id, def]) => ({ id, label: def.label })),
    editorState.grade,
    (id) => { editorState.grade = id; paint(); },
  );
  fillChipRow(
    "sizeGroup",
    POST_SIZES.map((s) => ({ id: s.id, label: s.label })),
    editorState.sizeId,
    (id) => { editorState.sizeId = id; paint(); },
  );
}

function buildPanelChips() {
  const host = document.getElementById("panelGroup");
  const total = panelCount();
  if (host.childElementCount !== total) {
    host.replaceChildren();
    for (let i = 0; i < total; i++) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.textContent = `Panel ${i + 1}`;
      chip.addEventListener("click", () => {
        editorState.selectedPanel = i;
        renderThumbnails();
        paint();
      });
      host.appendChild(chip);
    }
  }
  Array.from(host.children).forEach((el, i) => {
    el.classList.toggle("active", i === editorState.selectedPanel);
  });
}

function syncCropSliders() {
  const panel = editorState.panels[editorState.selectedPanel];
  if (!panel) return;
  zoomSlider.value = String(panel.zoom);
  panXSlider.value = String(panel.panX);
  panYSlider.value = String(panel.panY);
}

function applySlidersToPanel() {
  const panel = editorState.panels[editorState.selectedPanel];
  if (!panel) return;
  panel.zoom = Number(zoomSlider.value);
  panel.panX = Number(panXSlider.value);
  panel.panY = Number(panYSlider.value);
  drawCoverArt(canvasEl, editorState);
}

document.getElementById("photoInput").addEventListener("change", async (evt) => {
  const files = Array.from(evt.target.files || []);
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const img = await loadImageFromUrl(url);
    addPhoto(img, url);
  }
  if (files.length) {
    statusEl.textContent = `${files.length} photo${files.length > 1 ? "s" : ""} added — pick a panel, then tap a thumbnail to place one.`;
  }
});

document.getElementById("demoButton").addEventListener("click", async () => {
  await loadDemoSet();
  statusEl.textContent = "Demo photos loaded. Swap in your own any time.";
});

export async function loadDemoSet() {
  editorState.photos = [];
  editorState.photoUrls = [];
  editorState.panels = [];
  for (const stem of ["boulevard", "pier"]) {
    const url = `samples/${stem}.jpg`;
    const img = await loadImageFromUrl(url);
    editorState.photos.push(img);
    editorState.photoUrls.push(url);
  }
  syncPanelCount();
  editorState.panels.forEach((panel, i) => {
    panel.photoIndex = i % editorState.photos.length;
  });
  renderThumbnails();
  paint();
}

document.getElementById("fillAllButton").addEventListener("click", () => {
  const source = editorState.panels[editorState.selectedPanel];
  if (!source || source.photoIndex < 0) return;
  for (const panel of editorState.panels) panel.photoIndex = source.photoIndex;
  paint();
});

document.getElementById("clearPanelButton").addEventListener("click", () => {
  const panel = editorState.panels[editorState.selectedPanel];
  if (panel) panel.photoIndex = -1;
  renderThumbnails();
  paint();
});

for (const slider of [zoomSlider, panXSlider, panYSlider]) {
  slider.addEventListener("input", applySlidersToPanel);
}
captionField.addEventListener("input", () => {
  editorState.caption = captionField.value;
  drawCoverArt(canvasEl, editorState);
});
subtitleField.addEventListener("input", () => {
  editorState.subtitle = subtitleField.value;
  drawCoverArt(canvasEl, editorState);
});
badgeField.addEventListener("input", () => {
  editorState.badge = badgeField.value;
  drawCoverArt(canvasEl, editorState);
});
starsSlider.addEventListener("input", () => {
  editorState.stars = Number(starsSlider.value);
  drawCoverArt(canvasEl, editorState);
});
grainBox.addEventListener("change", () => {
  editorState.grain = grainBox.checked;
  drawCoverArt(canvasEl, editorState);
});
vignetteBox.addEventListener("change", () => {
  editorState.vignette = vignetteBox.checked;
  drawCoverArt(canvasEl, editorState);
});

let dragState = null;

canvasEl.addEventListener("pointerdown", (evt) => {
  const box = canvasEl.getBoundingClientRect();
  const px = ((evt.clientX - box.left) / box.width) * canvasEl.width;
  const py = ((evt.clientY - box.top) / box.height) * canvasEl.height;
  const rects = panelRectsFor(editorState.layout, canvasEl.width, canvasEl.height);
  const hit = rects.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
  if (hit >= 0) editorState.selectedPanel = hit;
  const current = editorState.panels[editorState.selectedPanel];
  dragState = { startX: evt.clientX, startY: evt.clientY, startPanX: current?.panX ?? 0, startPanY: current?.panY ?? 0 };
  canvasEl.setPointerCapture(evt.pointerId);
  renderThumbnails();
  paint();
});

canvasEl.addEventListener("pointermove", (evt) => {
  if (!dragState) return;
  const panel = editorState.panels[editorState.selectedPanel];
  if (!panel || panel.photoIndex < 0) return;
  const box = canvasEl.getBoundingClientRect();
  const dx = ((evt.clientX - dragState.startX) / box.width) * 2.2;
  const dy = ((evt.clientY - dragState.startY) / box.height) * 2.2;
  panel.panX = Math.max(-1, Math.min(1, dragState.startPanX + dx));
  panel.panY = Math.max(-1, Math.min(1, dragState.startPanY + dy));
  zoomSlider.value = String(panel.zoom);
  panXSlider.value = String(panel.panX);
  panYSlider.value = String(panel.panY);
  drawCoverArt(canvasEl, editorState);
});

canvasEl.addEventListener("pointerup", () => { dragState = null; });

document.getElementById("exportButton").addEventListener("click", () => {
  editorState.showSelection = false;
  drawCoverArt(canvasEl, editorState);
  canvasEl.toBlob((blob) => {
    if (!blob) return;
    const size = findSize(editorState.sizeId);
    const filename = `neon-coast-cover-${size.width}x${size.height}.png`;
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 4000);
    statusEl.textContent = `Saved ${filename} — post it anywhere.`;
    editorState.showSelection = true;
    drawCoverArt(canvasEl, editorState);
  }, "image/png");
});

const shotScene = readShotScene(new URLSearchParams(window.location.search));
refreshChipRows();

if (shotScene) {
  editorState.sizeId = shotScene.sizeId;
  editorState.layout = shotScene.layout;
  editorState.grade = shotScene.grade;
  editorState.caption = shotScene.caption;
  editorState.subtitle = shotScene.subtitle;
  editorState.badge = shotScene.badge;
  editorState.stars = shotScene.stars;
  captionField.value = shotScene.caption;
  subtitleField.value = shotScene.subtitle;
  badgeField.value = shotScene.badge;
  starsSlider.value = String(shotScene.stars);
  if (shotScene.mode === "cover") {
    document.body.classList.add("shot-cover");
    editorState.showSelection = false;
  }
  editorState.photos = [];
  editorState.photoUrls = [];
  editorState.panels = [];
  for (const url of shotScene.photoUrls) {
    const img = await loadImageFromUrl(url);
    editorState.photos.push(img);
    editorState.photoUrls.push(url);
  }
  syncPanelCount();
  editorState.panels.forEach((panel, i) => {
    panel.photoIndex = i % editorState.photos.length;
  });
  renderThumbnails();
  refreshChipRows();
  paint();
  markShotReady();
} else {
  await loadDemoSet();
  statusEl.textContent = "Demo cover ready — add your own photos to make it yours, then download the PNG.";
}
