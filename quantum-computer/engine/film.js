// FILM — timeline and frame loop for "How Quantum Computers Work".
// Scenes register SC[id] = { draw(c, lt, S), cues, init } in scenes/*.js. The 11 scene boundaries are the brief's
// timings (exactly 120 s); at 120 BPM every one of them falls on a beat. Each scene's camera continues the previous
// one's move, so the cuts read as one journey.
// Exposes the hooks the skill's qa.py / render.py expect: ERAS, __total, renderFrame, renderSolo, prepare, __canvas, __ready.
(() => {
const { W, H, BAYER } = PIX;
window.SC = window.SC || {};
window.BPM = 120; window.BEAT = 0.5; window.BAR = 2;
// [id, seconds]
const ORDER = [['s01_lab', 7], ['s02_qubit', 10], ['s03_cold', 13], ['s04_junction', 14], ['s05_transmon', 11],
  ['s06_superposition', 15], ['s07_interference', 14], ['s08_entanglement', 15], ['s09_measure', 10], ['s10_errors', 7], ['s11_final', 4]];
let t = 0;
const ERAS = window.ERAS = ORDER.map(([id, dur]) => { const e = { id, dur, t0: t, t1: t + dur, transition: null }; t += dur; return e; });
window.__total = t;

const main = document.getElementById('c'); main.width = W; main.height = H;
const mc = main.getContext('2d', { willReadFrequently: true });
window.__canvas = main;

function drawScene(c, e, lt) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = PIX.P.k; c.fillRect(0, 0, W, H);
  const s = SC[e.id];
  if (!s) { PIX.text(c, 'MISSING ' + e.id, 10, 10, 'w'); return; }
  c.save(); s.draw(c, lt, { id: e.id, dur: e.dur, t: e.t0 + lt }); c.restore();
  c.setTransform(1, 0, 0, 1, 0, 0);
}
// dither dissolve inside a scene: draws A on c, B offscreen, then shows B where the Bayer threshold is below p
const [cvB, xB] = (() => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; return [cv, cv.getContext('2d', { willReadFrequently: true })]; })();
window.dissolve = (c, fa, fb, p) => {
  if (p <= 0) { fa(c); return; } if (p >= 1) { fb(c); return; }
  fa(c);
  xB.setTransform(1, 0, 0, 1, 0, 0); xB.globalAlpha = 1; xB.fillStyle = PIX.P.k; xB.fillRect(0, 0, W, H); fb(xB); xB.setTransform(1, 0, 0, 1, 0, 0);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const a = c.getImageData(0, 0, W, H), b = xB.getImageData(0, 0, W, H), A = a.data, B = b.data;
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) if (p > BAYER[(y & 3) << 2 | (x & 3)] + 0.5) { A[i] = B[i]; A[i + 1] = B[i + 1]; A[i + 2] = B[i + 2]; }
  c.putImageData(a, 0, 0); c.restore();
};

// draw fn on a transparent offscreen layer and composite it onto c shifted by (dx, dy) — overlays sliding in or out
const [cvL, xL] = (() => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; return [cv, cv.getContext('2d', { willReadFrequently: true })]; })();
window.shifted = (c, fn, dx, dy = 0) => {
  xL.setTransform(1, 0, 0, 1, 0, 0); xL.globalAlpha = 1; xL.clearRect(0, 0, W, H); fn(xL); xL.setTransform(1, 0, 0, 1, 0, 0);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.drawImage(cvL, Math.round(dx), Math.round(dy)); c.restore();
};
function sceneAt(t) { for (let i = 0; i < ERAS.length; i++) if (t < ERAS[i].t1) return i; return ERAS.length - 1; }
window.renderFrame = t => {
  t = Math.max(0, Math.min(t, window.__total - 1e-6));
  const e = ERAS[sceneAt(t)]; drawScene(mc, e, t - e.t0);
  PIX.quantize(mc);
};
window.renderSolo = (id, lt) => { const e = ERAS.find(x => x.id === id) || { id, dur: 6, t0: 0 }; drawScene(mc, e, lt); PIX.quantize(mc); };
window.prepare = async () => {};
window.dumpCues = () => {
  const out = [];
  for (const e of ERAS) {
    const s = SC[e.id];
    const cues = s && (typeof s.cues === 'function' ? s.cues() : s.cues);
    if (cues) for (const [tt, sfx, g = 1, pan = 0, arg = null] of cues) if (tt + e.t0 >= 0 && tt + e.t0 < window.__total) out.push({ t: +(e.t0 + tt).toFixed(4), sfx, g, pan, arg, scene: e.id });
  }
  return out.sort((a, b) => a.t - b.t);
};
window.__ready = false;
(async () => {
  try { for (const e of ERAS) { const s = SC[e.id]; if (s && s.init) await s.init(); } window.__ready = true; }
  catch (err) { window.__bootFailed = String(err); console.error(err); }
})();
})();
