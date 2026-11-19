// Neon Coast Cover Studio — the editor wiring.
// Owns the cover state (photos, per-panel crop views, layout, grade, words),
// keeps the control chips and sliders in step with it, redraws the live
// preview on every change, and exports the sheet as a PNG at full post size.
// Photos are read with object URLs on this machine only; nothing is sent
// anywhere. A ?shot= query builds a fixed scene for screenshots instead.

import { COLOR_GRADES, COVER_LAYOUTS, POST_SIZES, drawCoverArt, panelRectsFor } from './cover.js';
import { markShotReady, readShotScene } from './shots.js';

const canvas = document.getElementById('coverCanvas');
const statusLine = document.getElementById('statusLine');
const captionInput = document.getElementById('captionInput');
const subtitleInput = document.getElementById('subtitleInput');
const badgeInput = document.getElementById('badgeInput');
const starRange = document.getElementById('starRange');
const zoomRange = document.getElementById('zoomRange');
const panXRange = document.getElementById('panXRange');
const panYRange = document.getElementById('panYRange');
const grainToggle = document.getElementById('grainToggle');
const vignetteToggle = document.getElementById('vignetteToggle');
const thumbStrip = document.getElementById('thumbStrip');

const state = {
  sizeId: 'portrait',
  layout: 'heroGrid',
  grade: 'sunset',
  photos: [],
  photoUrls: [],
  panels: [],
  selectedPanel: 0,
  caption: captionInput.value,
  subtitle: subtitleInput.value,
  badge: badgeInput.value,
  stars: Number(starRange.value),
  grain: grainToggle.checked,
  vignette: vignetteToggle.checked,
  showSelection: true,
};

function panelCount() {
  const size = POST_SIZES.find((s) => s.id === state.sizeId) ?? POST_SIZES[0];
  return panelRectsFor(state.layout, size.width, size.height).length;
}

// Keeps the panel list the size of the current layout, preserving the crops
// already set and giving new panels the next photo round-robin.
function syncPanels() {
  const count = panelCount();
  while (state.panels.length < count) {
    const index = state.panels.length;
    state.panels.push({
      photoIndex: state.photos.length ? index % state.photos.length : -1,
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  }
  state.panels.length = count;
  if (state.selectedPanel >= count) state.selectedPanel = 0;
}

function currentSize() {
  return POST_SIZES.find((s) => s.id === state.sizeId) ?? POST_SIZES[0];
}

function redraw() {
  syncPanels();
  const size = currentSize();
  if (canvas.width !== size.width) canvas.width = size.width;
  if (canvas.height !== size.height) canvas.height = size.height;
  drawCoverArt(canvas, state);
  buildPanelChips();
  syncCropSliders();
}

// Loads an image from a URL and resolves once it can be drawn.
export function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Adds a loaded photo to the library, refreshes the thumbnails, and fills
// the first empty panel with it so a fresh upload shows up at once.
export function addPhoto(image, url) {
  state.photos.push(image);
  state.photoUrls.push(url);
  const photoIndex = state.photos.length - 1;
  syncPanels();
  const empty = state.panels.findIndex((p) => p.photoIndex < 0);
  if (empty >= 0) state.panels[empty].photoIndex = photoIndex;
  else if (state.photos.length === 1) state.panels.forEach((p) => { p.photoIndex = 0; });
  renderThumbs();
  redraw();
  return photoIndex;
}

function renderThumbs() {
  thumbStrip.innerHTML = '';
  state.photoUrls.forEach((url, index) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = `Photo ${index + 1}`;
    img.title = 'Put this photo in the selected panel';
    const panel = state.panels[state.selectedPanel];
    if (panel && panel.photoIndex === index) img.classList.add('active');
    img.addEventListener('click', () => assignPhotoToPanel(index, state.selectedPanel));
    thumbStrip.appendChild(img);
  });
}

// Puts photo `photoIndex` into panel `panelIndex` with a centred crop.
export function assignPhotoToPanel(photoIndex, panelIndex) {
  syncPanels();
  const panel = state.panels[panelIndex];
  if (!panel) return;
  panel.photoIndex = photoIndex;
  panel.zoom = 1;
  panel.panX = 0;
  panel.panY = 0;
  state.selectedPanel = panelIndex;
  renderThumbs();
  redraw();
}

function buildChipGroup(containerId, entries, activeId, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  for (const entry of entries) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip${entry.id === activeId ? ' active' : ''} chip-${containerId}`;
    chip.textContent = entry.label;
    chip.addEventListener('click', () => onPick(entry.id));
    box.appendChild(chip);
  }
}

function refreshChipGroups() {
  buildChipGroup('layoutGroup', Object.entries(COVER_LAYOUTS).map(([id, v]) => ({ id, label: v.label })), state.layout, (id) => {
    state.layout = id;
    state.selectedPanel = 0;
    redraw();
  });
  buildChipGroup('gradeGroup', Object.entries(COLOR_GRADES).map(([id, v]) => ({ id, label: v.label })), state.grade, (id) => {
    state.grade = id;
    redraw();
  });
  buildChipGroup('sizeGroup', POST_SIZES.map((s) => ({ id: s.id, label: s.label })), state.sizeId, (id) => {
    state.sizeId = id;
    redraw();
  });
}

function buildPanelChips() {
  const box = document.getElementById('panelGroup');
  const count = panelCount();
  if (box.childElementCount !== count) {
    box.innerHTML = '';
    for (let i = 0; i < count; i += 1) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = `Panel ${i + 1}`;
      chip.addEventListener('click', () => {
        state.selectedPanel = i;
        renderThumbs();
        redraw();
      });
      box.appendChild(chip);
    }
  }
  [...box.children].forEach((chip, i) => chip.classList.toggle('active', i === state.selectedPanel));
}

function syncCropSliders() {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  zoomRange.value = String(panel.zoom);
  panXRange.value = String(panel.panX);
  panYRange.value = String(panel.panY);
}

function applyCropFromSliders() {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panel.zoom = Number(zoomRange.value);
  panel.panX = Number(panXRange.value);
  panel.panY = Number(panYRange.value);
  drawCoverArt(canvas, state);
}

document.getElementById('photoInput').addEventListener('change', async (event) => {
  const files = [...event.target.files];
  for (const file of files) {
    const url = URL.createObjectURL(file);
    addPhoto(await loadImageFromUrl(url), url);
  }
  if (files.length) statusLine.textContent = `${files.length} photo${files.length > 1 ? 's' : ''} added — tap a panel, then a thumbnail to place one.`;
});

document.getElementById('demoButton').addEventListener('click', async () => {
  await loadDemoPhotos();
  statusLine.textContent = 'Demo photos loaded. Swap in your own any time.';
});

// The two bundled sample photos (made with an image model, free to use) fill
// the panels alternately so the studio opens as a finished cover.
export async function loadDemoPhotos() {
  state.photos = [];
  state.photoUrls = [];
  state.panels = [];
  for (const name of ['boulevard', 'pier']) {
    const url = `samples/${name}.jpg`;
    const image = await loadImageFromUrl(url);
    state.photos.push(image);
    state.photoUrls.push(url);
  }
  syncPanels();
  state.panels.forEach((panel, index) => { panel.photoIndex = index % state.photos.length; });
  renderThumbs();
  redraw();
}

document.getElementById('fillAllButton').addEventListener('click', () => {
  const panel = state.panels[state.selectedPanel];
  if (!panel || panel.photoIndex < 0) return;
  state.panels.forEach((p) => { p.photoIndex = panel.photoIndex; });
  redraw();
});

document.getElementById('clearPanelButton').addEventListener('click', () => {
  const panel = state.panels[state.selectedPanel];
  if (panel) panel.photoIndex = -1;
  renderThumbs();
  redraw();
});

for (const slider of [zoomRange, panXRange, panYRange]) slider.addEventListener('input', applyCropFromSliders);
captionInput.addEventListener('input', () => { state.caption = captionInput.value; drawCoverArt(canvas, state); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; drawCoverArt(canvas, state); });
badgeInput.addEventListener('input', () => { state.badge = badgeInput.value; drawCoverArt(canvas, state); });
starRange.addEventListener('input', () => { state.stars = Number(starRange.value); drawCoverArt(canvas, state); });
grainToggle.addEventListener('change', () => { state.grain = grainToggle.checked; drawCoverArt(canvas, state); });
vignetteToggle.addEventListener('change', () => { state.vignette = vignetteToggle.checked; drawCoverArt(canvas, state); });

// Dragging on the preview pans the selected panel's photo; a plain click
// selects the panel under the pointer.
let dragStart = null;
canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  const rects = panelRectsFor(state.layout, canvas.width, canvas.height);
  const hit = rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  if (hit >= 0) state.selectedPanel = hit;
  dragStart = { x: event.clientX, y: event.clientY, panX: state.panels[state.selectedPanel]?.panX ?? 0, panY: state.panels[state.selectedPanel]?.panY ?? 0 };
  canvas.setPointerCapture(event.pointerId);
  renderThumbs();
  redraw();
});
canvas.addEventListener('pointermove', (event) => {
  if (!dragStart) return;
  const panel = state.panels[state.selectedPanel];
  if (!panel || panel.photoIndex < 0) return;
  const rect = canvas.getBoundingClientRect();
  panel.panX = Math.max(-1, Math.min(1, dragStart.panX + ((event.clientX - dragStart.x) / rect.width) * 2.2));
  panel.panY = Math.max(-1, Math.min(1, dragStart.panY + ((event.clientY - dragStart.y) / rect.height) * 2.2));
  syncCropSlidersValuesOnly(panel);
  drawCoverArt(canvas, state);
});
canvas.addEventListener('pointerup', () => { dragStart = null; });

function syncCropSlidersValuesOnly(panel) {
  zoomRange.value = String(panel.zoom);
  panXRange.value = String(panel.panX);
  panYRange.value = String(panel.panY);
}

// Exports the sheet exactly as previewed, minus the selection outline, as a
// PNG named for its size.
document.getElementById('exportButton').addEventListener('click', () => {
  state.showSelection = false;
  drawCoverArt(canvas, state);
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const size = currentSize();
    link.href = url;
    link.download = `neon-coast-cover-${size.width}x${size.height}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    statusLine.textContent = `Saved neon-coast-cover-${size.width}x${size.height}.png — post it anywhere.`;
    state.showSelection = true;
    drawCoverArt(canvas, state);
  }, 'image/png');
});

// Boot: a fixed ?shot= scene for screenshots, otherwise the demo cover so
// the first thing anyone sees is a finished poster, not an empty form.
const scene = readShotScene(new URLSearchParams(location.search));
refreshChipGroups();
if (scene) {
  state.sizeId = scene.sizeId;
  state.layout = scene.layout;
  state.grade = scene.grade;
  state.caption = scene.caption;
  state.subtitle = scene.subtitle;
  state.badge = scene.badge;
  state.stars = scene.stars;
  captionInput.value = scene.caption;
  subtitleInput.value = scene.subtitle;
  badgeInput.value = scene.badge;
  starRange.value = String(scene.stars);
  if (scene.mode === 'cover') {
    document.body.classList.add('shot-cover');
    state.showSelection = false;
  }
  state.photos = [];
  state.photoUrls = [];
  state.panels = [];
  for (const url of scene.photoUrls) {
    state.photos.push(await loadImageFromUrl(url));
    state.photoUrls.push(url);
  }
  syncPanels();
  state.panels.forEach((panel, index) => { panel.photoIndex = index % state.photos.length; });
  renderThumbs();
  refreshChipGroups();
  redraw();
  markShotReady();
} else {
  await loadDemoPhotos();
  statusLine.textContent = 'Demo cover ready — add your own photos to make it yours, then download the PNG.';
}
