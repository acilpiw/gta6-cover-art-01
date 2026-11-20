// main.js — editor controller for Neon Coast Cover Studio.
//
// Responsibilities:
//   * hold the single mutable cover state (photos, panel crops, layout,
//     grade, wording, effects)
//   * build and keep in sync every control in the sidebar (chips, sliders,
//     thumbnails, text fields)
//   * repaint the canvas through cover.js whenever state changes
//   * handle pointer dragging on the preview for quick re-cropping
//   * export the current sheet as a full-resolution PNG
//   * boot either into a fixed ?shot= scene (for screenshots) or into the
//     demo cover built from the two bundled samples
//
// Privacy note: user photos are turned into object URLs and drawn locally.
// Nothing in this file performs a network request for photo data.

import {
  COLOR_GRADES,
  COVER_LAYOUTS,
  POST_SIZES,
  drawCoverArt,
  panelRectsFor,
} from './cover.js';
import { markShotReady, readShotScene } from './shots.js';

// --- DOM handles -----------------------------------------------------------
const canvasEl = document.getElementById('coverCanvas');
const statusEl = document.getElementById('statusLine');
const captionField = document.getElementById('captionInput');
const subtitleField = document.getElementById('subtitleInput');
const badgeField = document.getElementById('badgeInput');
const starsSlider = document.getElementById('starRange');
const zoomSlider = document.getElementById('zoomRange');
const panXSlider = document.getElementById('panXRange');
const panYSlider = document.getElementById('panYRange');
const grainBox = document.getElementById('grainToggle');
const vignetteBox = document.getElementById('vignetteToggle');
const thumbContainer = document.getElementById('thumbStrip');

// --- State -----------------------------------------------------------------
const editorState = {
  sizeId: 'portrait',
  layout: 'heroGrid',
  grade: 'sunset',
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

function lookupSize(id) {
  return POST_SIZES.find((s) => s.id === id) || POST_SIZES[0];
}

function howManyPanels() {
  const { width, height } = lookupSize(editorState.sizeId);
  return panelRectsFor(editorState.layout, width, height).length;
}

// Grow or shrink the panels array to match the active layout. Existing
// crops survive a layout switch where possible; brand-new panels are
// seeded round-robin from whatever photos are already loaded.
function ensurePanelCount() {
  const wanted = howManyPanels();
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
  ensurePanelCount();
  const size = lookupSize(editorState.sizeId);
  if (canvasEl.width !== size.width) canvasEl.width = size.width;
  if (canvasEl.height !== size.height) canvasEl.height = size.height;
  drawCoverArt(canvasEl, editorState);
  rebuildPanelChips();
  reflectCropInSliders();
}

// --- Image loading ---------------------------------------------------------
export function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.src = url;
  });
}

export function addPhoto(image, url) {
  editorState.photos.push(image);
  editorState.photoUrls.push(url);
  const newIndex = editorState.photos.length - 1;
  ensurePanelCount();
  const firstEmpty = editorState.panels.findIndex((p) => p.photoIndex < 0);
  if (firstEmpty !== -1) {
    editorState.panels[firstEmpty].photoIndex = newIndex;
  } else if (editorState.photos.length === 1) {
    for (const panel of editorState.panels) panel.photoIndex = 0;
  }
  renderThumbnails();
  paint();
  return newIndex;
}

function renderThumbnails() {
  thumbContainer.replaceChildren();
  editorState.photoUrls.forEach((url, idx) => {
    const thumb = document.createElement('img');
    thumb.src = url;
    thumb.alt = `Photo ${idx + 1}`;
    thumb.title = 'Place this photo in the selected panel';
    const activePanel = editorState.panels[editorState.selectedPanel];
    if (activePanel && activePanel.photoIndex === idx) {
      thumb.classList.add('active');
    }
    thumb.addEventListener('click', () => placePhoto(idx, editorState.selectedPanel));
    thumbContainer.appendChild(thumb);
  });
}

export function placePhoto(photoIndex, panelIndex) {
  ensurePanelCount();
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

// --- Chip groups -----------------------------------------------------------
function populateChipRow(containerId, options, activeId, handler) {
  const host = document.getElementById(containerId);
  host.replaceChildren();
  for (const opt of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip' + (opt.id === activeId ? ' active' : '') + ` chip-${containerId}`;
    btn.textContent = opt.label;
    btn.addEventListener('click', () => handler(opt.id));
    host.appendChild(btn);
  }
}

function refreshAllChipRows() {
  populateChipRow(
    'layoutGroup',
    Object.entries(COVER_LAYOUTS).map(([id, def]) => ({ id, label: def.label })),
    editorState.layout,
    (id) => {
      editorState.layout = id;
      editorState.selectedPanel = 0;
      paint();
    },
  );
  populateChipRow(
    'gradeGroup',
    Object.entries(COLOR_GRADES).map(([id, def]) => ({ id, label: def.label })),
    editorState.grade,
    (id) => {
      editorState.grade = id;
      paint();
    },
  );
  populateChipRow(
    'sizeGroup',
    POST_SIZES.map((s) => ({ id: s.id, label: s.label })),
    editorState.sizeId,
    (id) => {
      editorState.sizeId = id;
      paint();
    },
  );
}

function rebuildPanelChips() {
  const host = document.getElementById('panelGroup');
  const total = howManyPanels();
  if (host.childElementCount !== total) {
    host.replaceChildren();
    for (let i = 0; i < total; i += 1) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = `Panel ${i + 1}`;
      chip.addEventListener('click', () => {
        editorState.selectedPanel = i;
        renderThumbnails();
        paint();
      });
      host.appendChild(chip);
    }
  }
  Array.from(host.children).forEach((el, i) => {
    el.classList.toggle('active', i === editorState.selectedPanel);
  });
}

// --- Crop sliders ----------------------------------------------------------
function reflectCropInSliders() {
  const panel = editorState.panels[editorState.selectedPanel];
  if (!panel) return;
  zoomSlider.value = String(panel.zoom);
  panXSlider.value = String(panel.panX);
  panYSlider.value = String(panel.panY);
}

function pushSliderValuesToPanel() {
  const panel = editorState.panels[editorState.selectedPanel];
  if (!panel) return;
  panel.zoom = Number(zoomSlider.value);
  panel.panX = Number(panXSlider.value);
  panel.panY = Number(panYSlider.value);
  drawCoverArt(canvasEl, editorState);
}

// --- Sidebar events --------------------------------------------------------
document.getElementById('photoInput').addEventListener('change', async (evt) => {
  const chosen = Array.from(evt.target.files || []);
  for (const file of chosen) {
    const blobUrl = URL.createObjectURL(file);
    const img = await loadImageFromUrl(blobUrl);
    addPhoto(img, blobUrl);
  }
  if (chosen.length > 0) {
    statusEl.textContent =
      `${chosen.length} photo${chosen.length > 1 ? 's' : ''} added — ` +
      'pick a panel, then tap a thumbnail to place one.';
  }
});

document.getElementById('demoButton').addEventListener('click', async () => {
  await loadDemoSet();
  statusEl.textContent = 'Demo photos loaded. Swap in your own any time.';
});

// The bundled samples let the studio open on a finished-looking cover
// instead of an empty grid. They alternate across the panels.
export async function loadDemoSet() {
  editorState.photos = [];
  editorState.photoUrls = [];
  editorState.panels = [];
  for (const stem of ['boulevard', 'pier']) {
    const url = `samples/${stem}.jpg`;
    const img = await loadImageFromUrl(url);
    editorState.photos.push(img);
    editorState.photoUrls.push(url);
  }
  ensurePanelCount();
  editorState.panels.forEach((panel, i) => {
    panel.photoIndex = i % editorState.photos.length;
  });
  renderThumbnails();
  paint();
}

document.getElementById('fillAllButton').addEventListener('click', () => {
  const source = editorState.panels[editorState.selectedPanel];
  if (!source || source.photoIndex < 0) return;
  for (const panel of editorState.panels) panel.photoIndex = source.photoIndex;
  paint();
});

document.getElementById('clearPanelButton').addEventListener('click', () => {
  const panel = editorState.panels[editorState.selectedPanel];
  if (panel) panel.photoIndex = -1;
  renderThumbnails();
  paint();
});

for (const slider of [zoomSlider, panXSlider, panYSlider]) {
  slider.addEventListener('input', pushSliderValuesToPanel);
}
captionField.addEventListener('input', () => {
  editorState.caption = captionField.value;
  drawCoverArt(canvasEl, editorState);
});
subtitleField.addEventListener('input', () => {
  editorState.subtitle = subtitleField.value;
  drawCoverArt(canvasEl, editorState);
});
badgeField.addEventListener('input', () => {
  editorState.badge = badgeField.value;
  drawCoverArt(canvasEl, editorState);
});
starsSlider.addEventListener('input', () => {
  editorState.stars = Number(starsSlider.value);
  drawCoverArt(canvasEl, editorState);
});
grainBox.addEventListener('change', () => {
  editorState.grain = grainBox.checked;
  drawCoverArt(canvasEl, editorState);
});
vignetteBox.addEventListener('change', () => {
  editorState.vignette = vignetteBox.checked;
  drawCoverArt(canvasEl, editorState);
});

// --- Canvas pointer interaction --------------------------------------------
// Click selects the panel under the pointer; drag pans that panel's photo.
// Pan deltas are scaled so a full-width drag covers roughly the slider range.
let dragSession = null;

canvasEl.addEventListener('pointerdown', (evt) => {
  const box = canvasEl.getBoundingClientRect();
  const px = ((evt.clientX - box.left) / box.width) * canvasEl.width;
  const py = ((evt.clientY - box.top) / box.height) * canvasEl.height;
  const rects = panelRectsFor(editorState.layout, canvasEl.width, canvasEl.height);
  const hitIdx = rects.findIndex(
    (r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h,
  );
  if (hitIdx >= 0) editorState.selectedPanel = hitIdx;
  const current = editorState.panels[editorState.selectedPanel];
  dragSession = {
    startClientX: evt.clientX,
    startClientY: evt.clientY,
    startPanX: current?.panX ?? 0,
    startPanY: current?.panY ?? 0,
  };
  canvasEl.setPointerCapture(evt.pointerId);
  renderThumbnails();
  paint();
});

canvasEl.addEventListener('pointermove', (evt) => {
  if (!dragSession) return;
  const panel = editorState.panels[editorState.selectedPanel];
  if (!panel || panel.photoIndex < 0) return;
  const box = canvasEl.getBoundingClientRect();
  const dx = ((evt.clientX - dragSession.startClientX) / box.width) * 2.2;
  const dy = ((evt.clientY - dragSession.startClientY) / box.height) * 2.2;
  panel.panX = Math.max(-1, Math.min(1, dragSession.startPanX + dx));
  panel.panY = Math.max(-1, Math.min(1, dragSession.startPanY + dy));
  zoomSlider.value = String(panel.zoom);
  panXSlider.value = String(panel.panX);
  panYSlider.value = String(panel.panY);
  drawCoverArt(canvasEl, editorState);
});

canvasEl.addEventListener('pointerup', () => {
  dragSession = null;
});

// --- Export ----------------------------------------------------------------
document.getElementById('exportButton').addEventListener('click', () => {
  editorState.showSelection = false;
  drawCoverArt(canvasEl, editorState);
  canvasEl.toBlob((blob) => {
    if (!blob) return;
    const size = lookupSize(editorState.sizeId);
    const filename = `neon-coast-cover-${size.width}x${size.height}.png`;
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 4000);
    statusEl.textContent = `Saved ${filename} — post it anywhere.`;
    editorState.showSelection = true;
    drawCoverArt(canvasEl, editorState);
  }, 'image/png');
});

// --- Boot ------------------------------------------------------------------
const shotScene = readShotScene(new URLSearchParams(window.location.search));
refreshAllChipRows();

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

  if (shotScene.mode === 'cover') {
    document.body.classList.add('shot-cover');
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
  ensurePanelCount();
  editorState.panels.forEach((panel, i) => {
    panel.photoIndex = i % editorState.photos.length;
  });
  renderThumbnails();
  refreshAllChipRows();
  paint();
  markShotReady();
} else {
  await loadDemoSet();
  statusEl.textContent =
    'Demo cover ready — add your own photos to make it yours, then download the PNG.';
}
