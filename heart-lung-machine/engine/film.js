// FILM — timeline and frame loop for "THE HEART IS STILL — How a Heart–Lung Machine Works".
// Scenes register SC[id] = { draw(c, lt, S), cues, init, xin } in scenes/*.js. 25 scenes, 92 s; every transition happens
// inside a scene's own time (xin = a dithered dissolve from the previous scene's last frame; window.flip = the turn between
// the surgeon's view from above and the machine seen from the side). Music grid: 120 BPM in 4/4, one bar = 2 s, 46 bars.
// The journey: the still heart → the venous line → the machine from the side → the workflow in seven steps (drainage,
// reservoir, pump, temperature, gas and oxygenator — down to one fibre, the membrane, a red cell, hemoglobin, CO2 out —
// filter and detector, the return to the aorta) → oxygen in the tissue → the machine's other lines (cardioplegia, suction)
// → the perfusionist → the whole loop → the opening frame again.
// Exposes the hooks render.py expects: ERAS, __total, renderFrame, renderSolo, renderSheet, dumpCues, __canvas, __ready.
(() => {
const { W, H, BAYER } = PIX;
window.SC = window.SC || {};
window.BPM = 120; window.BEAT = 0.5; window.BAR = 2;
const qs = new URLSearchParams(location.search);
window.NOTEXT = qs.has('notext');
const SCN = [
  ['s01_still', 2], ['s02_moving', 2], ['s03_follow', 2], ['s04_machine', 4], ['s05_workflow', 8], ['s06_drain', 3], ['s07_reservoir', 3],
  ['s08_pump', 5], ['s09_heater', 3], ['s10_exchanger', 3], ['s11_gas', 3], ['s12_oxygenator', 3], ['s13_fiber', 4], ['s14_diffuse', 4],
  ['s15_rbc', 4], ['s16_hemoglobin', 5], ['s17_co2', 4], ['s18_filter', 3], ['s19_return', 3], ['s20_tissue', 4], ['s21_cardioplegia', 4],
  ['s22_suction', 4], ['s23_perfusionist', 3], ['s24_system', 4], ['s25_loop', 5]];
let acc = 0;
const ERAS = window.ERAS = SCN.map(([id, dur], i) => { const e = { id, dur, t0: acc, t1: acc + dur, transition: null, n: i + 1 }; acc += dur; return e; });
window.__total = acc;                                                   // 92
window.T0 = Object.fromEntries(ERAS.map(e => [e.id, e.t0]));            // film time at which each scene starts

const main = document.getElementById('c'); main.width = W; main.height = H;
const mc = main.getContext('2d', { willReadFrequently: true });
window.__canvas = main;

function drawOne(cc, e, lt) {
  const s = SC[e.id];
  cc.save(); window.__scene = e.id;
  if (!s) { PIX.rect(cc, 0, 0, W, H, 'n0'); PIX.text(cc, 'MISSING ' + e.id, 6, 200, 'w'); cc.restore(); return; }
  s.draw(cc, lt, { id: e.id, dur: e.dur, t: e.t0 + lt, n: e.n });
  cc.restore(); cc.setTransform(1, 0, 0, 1, 0, 0); cc.globalAlpha = 1; cc.globalCompositeOperation = 'source-over'; cc.filter = 'none';
}
function drawScene(c, e, lt) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = PIX.P.k; c.fillRect(0, 0, W, H);
  const s = SC[e.id], i = ERAS.indexOf(e), pe = i > 0 ? ERAS[i - 1] : null;
  if (s && s.xin && pe && lt < s.xin && SC[pe.id]) {
    // a dithered dissolve from the previous scene's last frame: connected shots never hard-cut
    window.dissolve(c, cc => drawOne(cc, pe, pe.dur - 1 / 120), cc => drawOne(cc, e, lt), MO.smooth(lt / s.xin));
  } else drawOne(c, e, lt);
  c.setTransform(1, 0, 0, 1, 0, 0);
}
const mk = () => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; return [cv, cv.getContext('2d', { willReadFrequently: true })]; };
const [cvB, xB] = mk();
// dither dissolve: draws A on c, B offscreen, then shows B where the Bayer threshold is below p
window.dissolve = (c, fa, fb, p) => {
  if (p <= 0) { fa(c); return; } if (p >= 1) { fb(c); return; }
  fa(c);
  xB.setTransform(1, 0, 0, 1, 0, 0); xB.globalAlpha = 1; xB.fillStyle = PIX.P.k; xB.fillRect(0, 0, W, H); fb(xB); xB.setTransform(1, 0, 0, 1, 0, 0);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const a = c.getImageData(0, 0, W, H), b = xB.getImageData(0, 0, W, H), A = a.data, B = b.data;
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) if (p > BAYER[(y & 3) << 2 | (x & 3)] + 0.5) { A[i] = B[i]; A[i + 1] = B[i + 1]; A[i + 2] = B[i + 2]; }
  c.putImageData(a, 0, 0); c.restore();
};
// the turn between two views (the operating field from above ↔ the machine from the side): the first picture folds flat to
// a line across the middle of the frame, the second unfolds from it (rows sampled, so every pixel stays a hard pixel)
window.flip = (c, fa, fb, p) => {
  if (p <= 0) { fa(c); return; } if (p >= 1) { fb(c); return; }
  const s = p < 0.5 ? 1 - 2 * p : 2 * p - 1;
  xB.setTransform(1, 0, 0, 1, 0, 0); xB.globalAlpha = 1; xB.fillStyle = PIX.P.k; xB.fillRect(0, 0, W, H); (p < 0.5 ? fa : fb)(xB); xB.setTransform(1, 0, 0, 1, 0, 0);
  const src = xB.getImageData(0, 0, W, H).data, out = c.createImageData(W, H), d = out.data, k = PIX.hex(PIX.P.k);
  for (let y = 0; y < H; y++) {
    const sy = Math.floor((y + 0.5 - H / 2) / Math.max(s, 1e-3) + H / 2), ok = s > 0.004 && sy >= 0 && sy < H;
    for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (ok) { const j = (sy * W + x) * 4; d[i] = src[j]; d[i + 1] = src[j + 1]; d[i + 2] = src[j + 2]; } else { d[i] = k[0]; d[i + 1] = k[1]; d[i + 2] = k[2]; } d[i + 3] = 255; }
  }
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.putImageData(out, 0, 0);
  if (s < 0.3) { c.globalAlpha = 1 - s / 0.3; PIX.rect(c, 0, H / 2 - 1, W, 1, 'g6'); }
  c.restore();
};
// draw fn into a clipped screen rectangle (insets, panels)
window.inset = (c, x, y, w, h, fn) => { const prev = LIT.CLIP; LIT.CLIP = [x, y, x + w, y + h]; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.beginPath(); c.rect(x, y, w, h); c.clip(); try { fn(c); } finally { c.restore(); c.setTransform(1, 0, 0, 1, 0, 0); LIT.CLIP = prev; } };
function sceneAt(t) { for (let i = 0; i < ERAS.length; i++) if (t < ERAS[i].t1) return i; return ERAS.length - 1; }
window.renderFrame = t => {
  t = Math.max(0, Math.min(t, window.__total - 1e-6));
  const e = ERAS[sceneAt(t)]; drawScene(mc, e, t - e.t0);
  PIX.quantize(mc);
};
window.renderSolo = (id, lt) => { const e = ERAS.find(x => x.id === id) || { id, dur: 3, t0: 0, n: 0 }; drawScene(mc, e, lt); PIX.quantize(mc); };
window.renderSheet = (name, k = 0) => { const f = window.SHEETS && SHEETS[name]; mc.setTransform(1, 0, 0, 1, 0, 0); mc.fillStyle = PIX.P.k; mc.fillRect(0, 0, W, H); if (f) f(mc, k); PIX.quantize(mc); };
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
  try {
    for (const lib of ['LIT', 'WORLD', 'HEART', 'SIDE', 'PEOPLE', 'MACHINE', 'MICRO'].map(k => window[k])) if (lib && lib.init) { const t1 = performance.now(); await lib.init(); console.log(`${lib.NAME || 'lib'} ready in ${Math.round(performance.now() - t1)} ms`); }
    for (const e of ERAS) { const s = SC[e.id]; if (s && s.init) await s.init(); }
    window.__ready = true;
  } catch (err) { window.__bootFailed = String(err); console.error(err && err.stack || err); }
})();
})();
