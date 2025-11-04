/* Handwriting Capture MVP
 * - Custom canvas capture with pointer events
 * - Immediate reveal preview driven by captured strokes
 * - Simple local persistence in IndexedDB
 */

// --- Character sets ---
const SETS = {
  AZaz09basic: [
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    ..."abcdefghijklmnopqrstuvwxyz",
    ..."0123456789",
    ...".,?!:-$'\""
  ],
  AZ: [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"],
  az: [..."abcdefghijklmnopqrstuvwxyz"],
  "09": [..."0123456789"],
};

// --- Simple IndexedDB (barebones) ---
const DB_NAME = "hw-capture-db";
const DB_VER = 1;
let db;
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains("sessions")) {
        d.createObjectStore("sessions", { keyPath: "id" });
      }
      if (!d.objectStoreNames.contains("glyphs")) {
        const store = d.createObjectStore("glyphs", { keyPath: ["sessionId", "char"] });
        // Each value: { sessionId, char, variants: [...], metrics, approvedVariantId? }
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}
function tx(store, mode="readonly") {
  return db.transaction(store, mode).objectStore(store);
}
function put(store, val) {
  return new Promise((res, rej) => {
    const r = tx(store, "readwrite").put(val);
    r.onsuccess = () => res(true);
    r.onerror = () => rej(r.error);
  });
}
function get(store, key) {
  return new Promise((res, rej) => {
    const r = tx(store, "readonly").get(key);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => rej(r.error);
  });
}
function getAll(store) {
  return new Promise((res, rej) => {
    const r = tx(store, "readonly").getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error);
  });
}

// --- Session state ---
let session = null; // { id, fontFamily, setKey, order, index, createdAt }
let order = [];     // order of chars
let currentChar = "A";
let currentVariant = []; // strokes for current capture (array of arrays of points)
let strokes = [];   // working strokes
let capturing = false;

// --- DOM ---
const $ = (sel) => document.querySelector(sel);
const fontSel = $("#fontSelect");
const charSetSel = $("#charSetSelect");
const newBtn = $("#newSessionBtn");
const resumeBtn = $("#resumeBtn");
const exportBtn = $("#exportBtn");
const progressEl = $("#progress");

const undoBtn = $("#undoBtn");
const clearBtn = $("#clearBtn");
const skipBtn = $("#skipBtn");
const variantBtn = $("#variantBtn");
const opacityRange = $("#opacityRange");
const previewBtn = $("#previewBtn");
const nextBtn = $("#nextBtn");

const approveBtn = $("#approveBtn");
const redoBtn = $("#redoBtn");
const playBtn = $("#playBtn");
const pauseBtn = $("#pauseBtn");
const speedSel = $("#speedSel");
const widthGain = $("#widthGain");

const captureCanvas = $("#captureCanvas");
const templateCanvas = $("#templateCanvas");
const previewCanvas = $("#previewCanvas");
const glyphLabel = $("#glyphLabel");
const gfLink = $("#gf-link");

let dpr = Math.max(1, window.devicePixelRatio || 1);

// --- Canvas sizing ---
function fitCanvas(canvas) {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor((rect.height || 300) * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

// --- Font loader ---
function setFontLink(family) {
  const href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(family.replace(/\s+/g, "+")) + ":wght@400&display=swap";
  gfLink.href = href;
}

// --- Draw template glyph on templateCanvas & captureCanvas background ---
function drawTemplateGlyph(char, family, opacity=0.3) {
  const ctxT = fitCanvas(templateCanvas);
  const ctxC = fitCanvas(captureCanvas);
  const W = templateCanvas.width / dpr;
  const H = templateCanvas.height / dpr;
  [ctxT, ctxC].forEach(ctx => {
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = "#0c1220";
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = `rgba(255,255,255,${opacity})`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // auto font size to fit
    const size = Math.min(W, H) * 0.72;
    ctx.font = `${size}px '${family}', system-ui, sans-serif`;
    ctx.fillText(char, W/2, H/2 + size*0.06); // small baseline tweak
  });
}

// --- Capture strokes ---
function initCapture() {
  const ctx = captureCanvas.getContext("2d");
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  captureCanvas.style.touchAction = "none";

  let lastTime = 0;
  function pointerDown(e) {
    e.preventDefault();
    capturing = true;
    strokes.push([]);
    lastTime = performance.now();
    pointerMove(e);
  }
  function pointerMove(e) {
    if (!capturing) return;
    const rect = captureCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    const t = performance.now();
    const p = (e.pressure === undefined ? 0.5 : e.pressure);
    const pt = { x, y, t, p };
    strokes[strokes.length-1].push(pt);
    // draw
    const W = captureCanvas.width / dpr;
    const H = captureCanvas.height / dpr;
    ctx.strokeStyle = "#bcd7ff";
    ctx.lineWidth = 3;
    const s = strokes[strokes.length-1];
    if (s.length > 1) {
      const a = s[s.length-2], b = s[s.length-1];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI*2); ctx.fillStyle="#bcd7ff"; ctx.fill();
    }
  }
  function pointerUp(e) {
    if (!capturing) return;
    capturing = false;
    autoSaveGlyphDraft(); // save progress per stroke
  }

  captureCanvas.addEventListener("pointerdown", pointerDown);
  captureCanvas.addEventListener("pointermove", pointerMove);
  window.addEventListener("pointerup", pointerUp);
}

// --- Utility: resample to constant-ish step in px ---
function resampleStroke(points, step=3) {
  if (points.length < 2) return points.slice();
  const out = [points[0]];
  let acc = 0;
  for (let i=1;i<points.length;i++) {
    const a = points[i-1], b = points[i];
    const dx = b.x-a.x, dy=b.y-a.y;
    const d = Math.hypot(dx,dy);
    const dt = b.t - a.t;
    if (acc + d >= step) {
      const r = (step - acc) / d;
      const nx = a.x + r*dx;
      const ny = a.y + r*dy;
      const nt = a.t + r*dt;
      const np = a.p + r*(b.p - a.p);
      out.push({ x:nx, y:ny, t:nt, p:np });
      points.splice(i,0,{ x:nx, y:ny, t:nt, p:np });
      acc = 0;
    } else {
      acc += d;
    }
  }
  if (out[out.length-1] !== points[points.length-1]) {
    out.push(points[points.length-1]);
  }
  return out;
}

// --- Normalize to em-space (we approximate by mapping canvas rect to em box) ---
function canvasToEm(points, canvasRect, emSize=1000) {
  const { x, y, w, h } = canvasRect; // canvas glyph box
  return points.map(pt => ({
    x: ( (pt.x - x) / w ) * emSize,
    y: ( (pt.y - y) / h ) * emSize,
    t: pt.t,
    p: pt.p
  }));
}

// --- Compute a glyph box (use capture canvas size padding) ---
function getGlyphBox(canvas) {
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
  const size = Math.min(W, H) * 0.72;
  const x = (W - size)/2;
  const y = (H - size)/2;
  return { x, y, w: size, h: size };
}

// --- Autosave draft ---
async function autoSaveGlyphDraft() {
  if (!session) return;
  const key = { sessionId: session.id, char: currentChar };
  const existing = await get("glyphs", [session.id, currentChar]) || { sessionId: session.id, char: currentChar, variants: [] };
  existing.draft = { strokes };
  await put("glyphs", existing);
  updateProgress();
}

// --- Approve current capture as a variant ---
async function approveCurrentCapture() {
  if (!session) return;
  if (!strokes.length) return;
  const stepPx = 3;
  const box = getGlyphBox(captureCanvas);
  const emSize = 1000;
  const normStrokes = strokes.map(s => {
    const rs = resampleStroke(s.slice(), stepPx);
    const em = canvasToEm(rs, box, emSize);
    const resampled = [];
    let sCum = 0;
    for (let i=1;i<em.length;i++) {
      const a = em[i-1], b = em[i];
      const d = Math.hypot(b.x-a.x, b.y-a.y);
      const dt = (b.t - a.t);
      sCum += d;
      resampled.push({ x:b.x, y:b.y, dt, p:b.p, s:sCum });
    }
    if (resampled.length===0) {
      resampled.push({ x:em[0].x, y:em[0].y, dt:0, p:em[0].p, s:0 });
    }
    return { points: em, resampled };
  });
  const variant = {
    id: crypto.randomUUID(),
    strokes: normStrokes,
    stats: {},
    starred: true,
    weight: 1.0
  };
  const rec = await get("glyphs", [session.id, currentChar]) || { sessionId: session.id, char: currentChar, variants: [] };
  rec.variants.push(variant);
  delete rec.draft;
  await put("glyphs", rec);
  // advance index
  session.index = Math.min(session.index + 1, order.length-1);
  await put("sessions", session);
  updateProgress();
}

// --- Update progress text ---
async function updateProgress() {
  if (!session) { progressEl.textContent = "No session."; return; }
  const all = await getAll("glyphs");
  const done = all.filter(r => r.sessionId === session.id && r.variants && r.variants.length>0).length;
  progressEl.textContent = `Session: ${session.fontFamily} · ${done}/${order.length} captured · Current: "${currentChar}"`;
}

// --- Load char into capture stage ---
function loadCurrentChar() {
  currentChar = order[session.index] || order[0];
  glyphLabel.textContent = currentChar;
  drawTemplateGlyph(currentChar, session.fontFamily, parseInt(opacityRange.value,10)/100);
  strokes = [];
}

// --- Preview engine: reveal text using moving mask along captured strokes ---
let rafId = 0, playing = false, playStart = 0, playPos = 0;
function drawPreview(family, char, variant, speedMul=1, widthGainVal=30) {
  const ctxT = templateCanvas.getContext("2d");
  const ctxP = fitCanvas(previewCanvas);
  const W = previewCanvas.width / dpr;
  const H = previewCanvas.height / dpr;
  // 1) draw text once to offscreen
  const off = document.createElement("canvas");
  off.width = Math.floor(W*dpr); off.height=Math.floor(H*dpr);
  const octx = off.getContext("2d");
  octx.setTransform(dpr,0,0,dpr,0,0);
  octx.fillStyle = "#0c1220"; octx.fillRect(0,0,W,H);
  octx.fillStyle = "#ffffff";
  const size = Math.min(W, H) * 0.72;
  octx.font = `${size}px '${family}', system-ui, sans-serif`;
  octx.textAlign = "center"; octx.textBaseline = "middle";
  octx.fillText(char, W/2, H/2 + size*0.06);

  // 2) animation loop: reveal using destination-in mask following strokes
  const emSize = 1000;
  const box = getGlyphBox(previewCanvas);
  const startTime = performance.now();
  playing = true; playStart = startTime; playPos = 0;

  function toCanvas(pt) {
    const x = box.x + (pt.x / emSize) * box.w;
    const y = box.y + (pt.y / emSize) * box.h;
    return { x, y };
  }
  const segments = [];
  for (const s of variant.strokes) {
    for (let i=1;i<s.resampled.length;i++) {
      const a = s.resampled[i-1], b = s.resampled[i];
      segments.push({ a, b });
    }
  }
  const totalT = segments.reduce((acc, seg) => acc + Math.max(1, seg.b.dt), 0);

  function frame(now) {
    if (!playing) return;
    const elapsed = (now - playStart) * speedMul;
    // clear
    ctxP.clearRect(0,0,W,H);
    // draw full text
    ctxP.drawImage(off, 0, 0, W, H);
    // set up mask
    ctxP.save();
    ctxP.globalCompositeOperation = "destination-in";
    ctxP.fillStyle = "#000";
    ctxP.fillRect(0,0,W,H);

    // draw revealing strokes up to elapsed
    let tAcc = 0;
    const baseWidth = Math.max(6, Math.min(22, (Math.min(W,H)*0.04)));
    const widthGain01 = widthGainVal/100;
    ctxP.strokeStyle = "#fff";
    ctxP.lineCap = "round";
    for (const seg of segments) {
      const nextAcc = tAcc + seg.b.dt;
      if (elapsed >= nextAcc) {
        // draw full segment
        const A = toCanvas(seg.a);
        const B = toCanvas(seg.b);
        const speed = Math.max(1, seg.b.s - (seg.a.s || 0));
        const w = baseWidth * (0.6 + widthGain01*(seg.b.p ?? 0.5)) / Math.max(1, speed*0.02);
        ctxP.lineWidth = w;
        ctxP.beginPath(); ctxP.moveTo(A.x,A.y); ctxP.lineTo(B.x,B.y); ctxP.stroke();
        tAcc = nextAcc;
      } else {
        // partial segment
        const ratio = Math.max(0, Math.min(1, (elapsed - tAcc) / Math.max(1, seg.b.dt)));
        const ax = seg.a.x + ratio*(seg.b.x - seg.a.x);
        const ay = seg.a.y + ratio*(seg.b.y - seg.a.y);
        const A = toCanvas(seg.a);
        const B = toCanvas({ x: ax, y: ay });
        const speed = Math.max(1, (seg.b.s - (seg.a.s || 0)) * ratio);
        const w = baseWidth * (0.6 + widthGain01*(seg.b.p ?? 0.5)) / Math.max(1, speed*0.02);
        ctxP.lineWidth = w;
        ctxP.beginPath(); ctxP.moveTo(A.x,A.y); ctxP.lineTo(B.x,B.y); ctxP.stroke();
        break;
      }
    }
    ctxP.restore();

    // stop when done
    if (elapsed >= totalT + 16) {
      playing = false;
      return;
    }
    rafId = requestAnimationFrame(frame);
  }
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(frame);
}

// --- UI Handlers ---
function newSession() {
  const id = crypto.randomUUID();
  const family = fontSel.value || "Caveat";
  setFontLink(family);
  session = {
    id, fontFamily: family,
    setKey: charSetSel.value || "AZaz09basic",
    order: SETS[charSetSel.value || "AZaz09basic"],
    index: 0,
    createdAt: new Date().toISOString()
  };
  order = session.order;
  put("sessions", session).then(() => {
    localStorage.setItem("hw-last-session", id);
    loadCurrentChar();
    updateProgress();
  });
}
async function resumeLast() {
  const id = localStorage.getItem("hw-last-session");
  if (!id) { alert("No previous session found."); return; }
  const sessions = await getAll("sessions");
  session = sessions.find(s => s.id === id);
  if (!session) { alert("Session not found."); return; }
  order = session.order || SETS[session.setKey] || SETS.AZaz09basic;
  setFontLink(session.fontFamily);
  loadCurrentChar();
  updateProgress();
}
async function exportJSON() {
  if (!session) { alert("No session."); return; }
  const glyphRecs = (await getAll("glyphs")).filter(r => r.sessionId === session.id);
  const data = {
    schemaVersion: 1,
    font: {
      family: session.fontFamily,
      source: "https://fonts.googleapis.com/css2?family=" + session.fontFamily.replace(/\s+/g,"+") + ":wght@400&display=swap",
      emSize: 1000
    },
    meta: { sessionId: session.id, createdAt: session.createdAt, appBuild: "mvp-1" },
    set: {}
  };
  for (const rec of glyphRecs) {
    data.set[rec.char] = {
      metrics: { advance: null, bounds: null, baseline: 0 }, // filled later if needed
      variants: rec.variants || []
    };
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `handset_${session.fontFamily.replace(/\s+/g,'_')}_${session.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function undoStroke() {
  if (strokes.length) {
    strokes.pop();
    // redraw
    drawTemplateGlyph(currentChar, session.fontFamily, parseInt(opacityRange.value,10)/100);
    const ctx = captureCanvas.getContext("2d");
    ctx.strokeStyle = "#bcd7ff"; ctx.lineWidth = 3; ctx.lineCap="round"; ctx.lineJoin="round";
    for (const s of strokes) {
      for (let i=1;i<s.length;i++) {
        const a=s[i-1], b=s[i];
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      }
    }
    autoSaveGlyphDraft();
  }
}
function clearStrokes() {
  strokes = [];
  drawTemplateGlyph(currentChar, session.fontFamily, parseInt(opacityRange.value,10)/100);
  autoSaveGlyphDraft();
}
async function skipGlyph() {
  // just advance
  session.index = Math.min(session.index + 1, order.length-1);
  await put("sessions", session);
  loadCurrentChar();
  updateProgress();
}
function addVariant() {
  // Keep strokes but mark a boundary by approving as separate later; for MVP we just leave as is.
  alert("Variant: capture another take for this glyph, then Approve to save it as another variant.");
}
function showPreview() {
  if (!strokes.length) { alert("Capture something first."); return; }
  // Create a temporary variant from current strokes and preview it
  const stepPx = 3;
  const box = getGlyphBox(captureCanvas);
  const emSize = 1000;
  const normStrokes = strokes.map(s => {
    const rs = resampleStroke(s.slice(), stepPx);
    const em = canvasToEm(rs, box, emSize);
    const resampled = [];
    let sCum = 0;
    for (let i=1;i<em.length;i++) {
      const a = em[i-1], b = em[i];
      const d = Math.hypot(b.x-a.x, b.y-a.y);
      const dt = (b.t - a.t);
      sCum += d;
      resampled.push({ x:b.x, y:b.y, dt, p:b.p, s:sCum });
    }
    if (resampled.length===0) {
      resampled.push({ x:em[0].x, y:em[0].y, dt:0, p:em[0].p, s:0 });
    }
    return { points: em, resampled };
  });
  const tempVariant = { id:"preview", strokes: normStrokes };
  drawTemplateGlyph(currentChar, session.fontFamily, parseInt(opacityRange.value,10)/100);
  drawPreview(session.fontFamily, currentChar, tempVariant, parseFloat(speedSel.value), parseInt(widthGain.value,10));
}

// --- Event wiring ---
function onResize() {
  if (!session) return;
  drawTemplateGlyph(currentChar, session.fontFamily, parseInt(opacityRange.value,10)/100);
}
window.addEventListener("resize", onResize);

newBtn.addEventListener("click", newSession);
resumeBtn.addEventListener("click", resumeLast);
exportBtn.addEventListener("click", exportJSON);

undoBtn.addEventListener("click", undoStroke);
clearBtn.addEventListener("click", clearStrokes);
skipBtn.addEventListener("click", skipGlyph);
variantBtn.addEventListener("click", addVariant);
opacityRange.addEventListener("input", () => drawTemplateGlyph(currentChar, session.fontFamily, parseInt(opacityRange.value,10)/100));
previewBtn.addEventListener("click", showPreview);
nextBtn.addEventListener("click", async () => { await approveCurrentCapture(); loadCurrentChar(); });

approveBtn.addEventListener("click", async () => { await approveCurrentCapture(); loadCurrentChar(); });
redoBtn.addEventListener("click", () => { clearStrokes(); });
playBtn.addEventListener("click", () => {
  // re-preview with current settings
  showPreview();
});
pauseBtn.addEventListener("click", () => {
  cancelAnimationFrame(rafId);
});
speedSel.addEventListener("change", showPreview);
widthGain.addEventListener("input", showPreview);

// Init
openDB().then(() => {
  initCapture();
  // Try to load last session silently
  const last = localStorage.getItem("hw-last-session");
  if (last) {
    resumeLast();
  } else {
    newSession(); // start fresh with default Caveat
  }
});
