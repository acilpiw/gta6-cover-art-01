// main.js — the editor wiring for Neon Coast Cover Studio.
// Owns the cover state, loads photos (uploaded files stay local, the two
// bundled samples are plain files under app/), keeps the panel controls in
// sync with the selection, and renders through cover.js both for the live
// preview and for the exported PNG.

import { POST_SIZES, PANEL_LAYOUTS, COLOUR_GRADES, panelCount, drawCover } from "./cover.js";
import { shotNameFromUrl, shotScene } from "./shots.js";

const SAMPLE_SOURCES = {
  boulevard: "samples/boulevard.jpg",
  pier: "samples/pier.jpg",
};

const state = {
  sizeKey: "wide",
  layoutKey: "grid6",
  gradeKey: "sunset",
  title: "Neon Coast",
  subtitle: "vice nights, fast tides",
  badge: "Cover story",
  titleScale: 1,
  stars: 4,
  grain: true,
  vignette: true,
  ink: false,
  panels: [],
};

// images[i] is the loaded HTMLImageElement for panel i, or null while the
// panel still shows its painted backdrop.
const images = [];
let selectedPanel = 0;
let lastRects = [];
let fillAllArmed = false;

const els = {};
function grab(id) {
  els[id] = document.getElementById(id);
  return els[id];
}

function freshPanel(seed) {
  return { zoom: 1, offsetX: 0, offsetY: 0, flip: false, seed };
}

function ensurePanelSlots() {
  const count = panelCount(state.layoutKey);
  while (state.panels.length < count) {
    const i = state.panels.length;
    state.panels.push(freshPanel(i * 3 + 1));
    images.push(null);
  }
  if (selectedPanel >= count) selectedPanel = 0;
}

function setStatus(text) {
  els.statusLine.textContent = text;
}

function render() {
  const size = POST_SIZES[state.sizeKey];
  const canvas = els.stage;
  if (canvas.width !== size.width) canvas.width = size.width;
  if (canvas.height !== size.height) canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  lastRects = drawCover(ctx, state, images, size.width, size.height);
  els.exportNote.textContent = `Exports at ${size.width} x ${size.height} — ${PANEL_LAYOUTS[state.layoutKey].label}, ${COLOUR_GRADES[state.gradeKey].label} grade.`;
  document.querySelectorAll(".size-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.size === state.sizeKey);
  });
}

function rebuildChoiceButtons() {
  els.layoutBtns.innerHTML = "";
  Object.entries(PANEL_LAYOUTS).forEach(([key, layout]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = layout.label;
    btn.classList.toggle("active", key === state.layoutKey);
    btn.addEventListener("click", () => {
      state.layoutKey = key;
      ensurePanelSlots();
      rebuildChoiceButtons();
      rebuildPanelChips();
      syncPanelControls();
      render();
    });
    els.layoutBtns.appendChild(btn);
  });
  els.gradeBtns.innerHTML = "";
  Object.entries(COLOUR_GRADES).forEach(([key, grade]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = grade.label;
    btn.classList.toggle("active", key === state.gradeKey);
    btn.addEventListener("click", () => {
      state.gradeKey = key;
      rebuildChoiceButtons();
      render();
    });
    els.gradeBtns.appendChild(btn);
  });
}

function rebuildPanelChips() {
  els.panelList.innerHTML = "";
  const count = panelCount(state.layoutKey);
  for (let i = 0; i < count; i += 1) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "panel-chip";
    chip.textContent = String(i + 1);
    chip.classList.toggle("filled", Boolean(images[i]));
    chip.classList.toggle("active", i === selectedPanel);
    chip.addEventListener("click", () => selectPanel(i));
    els.panelList.appendChild(chip);
  }
}

function selectPanel(index) {
  selectedPanel = index;
  rebuildPanelChips();
  syncPanelControls();
}

function syncPanelControls() {
  const panel = state.panels[selectedPanel] || freshPanel(0);
  els.selectedLabel.textContent = images[selectedPanel]
    ? `Panel ${selectedPanel + 1} selected — photo loaded`
    : `Panel ${selectedPanel + 1} selected — painted backdrop, add a photo`;
  els.zoomRange.value = String(panel.zoom);
  els.panXRange.value = String(panel.offsetX);
  els.panYRange.value = String(panel.offsetY);
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadImageFromFile(file) {
  const url = URL.createObjectURL(file);
  try {
    return await loadImageFromUrl(url);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}

function assignImage(index, image) {
  ensurePanelSlots();
  images[index] = image;
  state.panels[index] = { ...freshPanel(index * 3 + 1), ...(state.panels[index] || {}) };
  rebuildPanelChips();
  syncPanelControls();
  render();
}

async function handleFiles(fileList) {
  const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
  if (!files.length) return;
  setStatus(`Reading ${files.length} photo${files.length > 1 ? "s" : ""} locally…`);
  if (fillAllArmed) {
    fillAllArmed = false;
    const image = await loadImageFromFile(files[0]);
    for (let i = 0; i < panelCount(state.layoutKey); i += 1) images[i] = image;
    rebuildPanelChips();
    syncPanelControls();
    render();
    setStatus("One photo now fills every panel — slide and zoom per panel to vary the crops.");
    return;
  }
  let slot = selectedPanel;
  for (const file of files) {
    if (slot >= panelCount(state.layoutKey)) break;
    const image = await loadImageFromFile(file);
    images[slot] = image;
    slot += 1;
  }
  rebuildPanelChips();
  syncPanelControls();
  render();
  setStatus("Photos loaded — only ever read in this browser tab, never uploaded.");
}

const sampleImages = {};
async function loadSamples() {
  for (const [name, src] of Object.entries(SAMPLE_SOURCES)) {
    try {
      sampleImages[name] = await loadImageFromUrl(src);
    } catch {
      sampleImages[name] = null;
    }
  }
}

function fillWithSamples(pattern) {
  pattern.forEach((name, i) => {
    if (sampleImages[name]) images[i] = sampleImages[name];
  });
  rebuildPanelChips();
  syncPanelControls();
  render();
}

function applyShot(name) {
  const scene = shotScene(name);
  if (!scene) return;
  state.sizeKey = scene.sizeKey;
  state.layoutKey = scene.layoutKey;
  state.gradeKey = scene.gradeKey;
  state.title = scene.title;
  state.subtitle = scene.subtitle;
  state.badge = scene.badge;
  state.stars = scene.stars;
  ensurePanelSlots();
  fillWithSamples(scene.sources);
  els.titleInput.value = scene.title;
  els.subtitleInput.value = scene.subtitle;
  els.badgeInput.value = scene.badge;
  els.starCount.textContent = String(scene.stars);
  if (scene.coverOnly) document.body.classList.add("cover-only");
  rebuildChoiceButtons();
  render();
  setStatus(`Screenshot scene: ${name}`);
}

function exportPng() {
  const size = POST_SIZES[state.sizeKey];
  const out = document.createElement("canvas");
  out.width = size.width;
  out.height = size.height;
  drawCover(out.getContext("2d"), state, images, size.width, size.height);
  out.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `neon-coast-cover-${state.sizeKey}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setStatus(`Exported neon-coast-cover-${state.sizeKey}.png at ${size.width} x ${size.height}.`);
  }, "image/png");
}

function bindControls() {
  document.querySelectorAll(".size-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.sizeKey = btn.dataset.size;
      render();
    });
  });
  els.titleInput.addEventListener("input", () => { state.title = els.titleInput.value; render(); });
  els.subtitleInput.addEventListener("input", () => { state.subtitle = els.subtitleInput.value; render(); });
  els.badgeInput.addEventListener("input", () => { state.badge = els.badgeInput.value; render(); });
  els.titleScale.addEventListener("input", () => { state.titleScale = Number(els.titleScale.value); render(); });
  els.grainToggle.addEventListener("change", () => { state.grain = els.grainToggle.checked; render(); });
  els.vignetteToggle.addEventListener("change", () => { state.vignette = els.vignetteToggle.checked; render(); });
  els.inkToggle.addEventListener("change", () => { state.ink = els.inkToggle.checked; render(); });
  els.starMinus.addEventListener("click", () => {
    state.stars = Math.max(0, state.stars - 1);
    els.starCount.textContent = String(state.stars);
    render();
  });
  els.starPlus.addEventListener("click", () => {
    state.stars = Math.min(6, state.stars + 1);
    els.starCount.textContent = String(state.stars);
    render();
  });

  els.uploadBtn.addEventListener("click", () => els.photoInput.click());
  els.photoInput.addEventListener("change", () => {
    handleFiles(els.photoInput.files);
    els.photoInput.value = "";
  });
  els.fillAllBtn.addEventListener("click", () => {
    const current = images[selectedPanel];
    if (current) {
      for (let i = 0; i < panelCount(state.layoutKey); i += 1) images[i] = current;
      rebuildPanelChips();
      render();
      setStatus("Every panel now shows the selected photo — vary each crop with zoom and slide.");
    } else {
      fillAllArmed = true;
      els.photoInput.click();
    }
  });
  els.sampleBoulevardBtn.addEventListener("click", () => {
    if (sampleImages.boulevard) assignImage(selectedPanel, sampleImages.boulevard);
  });
  els.samplePierBtn.addEventListener("click", () => {
    if (sampleImages.pier) assignImage(selectedPanel, sampleImages.pier);
  });
  els.flipBtn.addEventListener("click", () => {
    const panel = state.panels[selectedPanel];
    if (panel) { panel.flip = !panel.flip; render(); }
  });
  els.resetPanelBtn.addEventListener("click", () => {
    const seed = (state.panels[selectedPanel] || {}).seed || 0;
    state.panels[selectedPanel] = freshPanel(seed);
    syncPanelControls();
    render();
  });
  els.clearPanelBtn.addEventListener("click", () => {
    images[selectedPanel] = null;
    rebuildPanelChips();
    syncPanelControls();
    render();
  });

  els.zoomRange.addEventListener("input", () => {
    state.panels[selectedPanel].zoom = Number(els.zoomRange.value);
    render();
  });
  els.panXRange.addEventListener("input", () => {
    state.panels[selectedPanel].offsetX = Number(els.panXRange.value);
    render();
  });
  els.panYRange.addEventListener("input", () => {
    state.panels[selectedPanel].offsetY = Number(els.panYRange.value);
    render();
  });

  els.exportBtn.addEventListener("click", exportPng);
  els.exportBtnBottom.addEventListener("click", exportPng);

  els.stage.addEventListener("click", (event) => {
    const bounds = els.stage.getBoundingClientRect();
    const px = ((event.clientX - bounds.left) / bounds.width) * els.stage.width;
    const py = ((event.clientY - bounds.top) / bounds.height) * els.stage.height;
    const hit = lastRects.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
    if (hit >= 0) selectPanel(hit);
  });

  const wrap = els.stageWrap;
  wrap.addEventListener("dragover", (event) => {
    event.preventDefault();
    wrap.classList.add("dragging");
  });
  wrap.addEventListener("dragleave", () => wrap.classList.remove("dragging"));
  wrap.addEventListener("drop", (event) => {
    event.preventDefault();
    wrap.classList.remove("dragging");
    selectedPanel = 0;
    handleFiles(event.dataTransfer.files);
  });
}

async function boot() {
  ["stage", "stageWrap", "stageHint", "statusLine", "layoutBtns", "gradeBtns",
    "titleInput", "subtitleInput", "badgeInput", "titleScale", "starMinus",
    "starPlus", "starCount", "grainToggle", "vignetteToggle", "inkToggle",
    "panelList", "selectedLabel", "photoInput", "uploadBtn", "fillAllBtn",
    "sampleBoulevardBtn", "samplePierBtn", "flipBtn", "resetPanelBtn",
    "clearPanelBtn", "zoomRange", "panXRange", "panYRange", "exportBtn",
    "exportBtnBottom", "exportNote",
  ].forEach(grab);
  ensurePanelSlots();
  bindControls();
  rebuildChoiceButtons();
  rebuildPanelChips();
  syncPanelControls();
  render();
  await loadSamples();
  const shot = shotNameFromUrl(window.location.search);
  if (shot) {
    applyShot(shot);
  } else {
    fillWithSamples(["boulevard", "pier", "boulevard", "pier", "pier", "boulevard"]);
    setStatus("Sample photos loaded — drop in your own photos to make the cover yours.");
  }
  window.__coverReady = true;
}

boot();
