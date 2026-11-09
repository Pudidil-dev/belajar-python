// FILM — timeline and frame loop for "How Does a Foley Catheter Work?".
// Scenes register SC[id] = { draw(c, lt, S), cues, init, xin } in scenes/*.js. 20 scenes of exactly 3 s (60 s): at 120 BPM a
// scene is 1.5 bars, the film 30 bars. The journey: the sagittal cutaway with the catheter in the urethra → into the bladder →
// the balloon → retention → outside support → urine from the kidneys → the drainage eyes → into the drainage lumen → past
// the balloon → two channels → the balloon channel → the ports → the tubing → the bag below bladder level → the bag → the
// whole route → retention vs drainage → the answer → the loop wipe into a catheter segment (S01 pulls back out of it).
// Exposes the hooks the skill's qa.py / render.py expect: ERAS, __total, renderFrame, renderSolo, prepare, __canvas, __ready.
(() => {
const { W, H, BAYER } = PIX;
window.SC = window.SC || {};
window.BPM = 120; window.BEAT = 0.5; window.BAR = 2;
const qs = new URLSearchParams(location.search);
window.NOTEXT = qs.has('notext');
const IDS = ['s01_where', 's02_route', 's03_balloon', 's04_retention', 's05_support',
  's06_kidneys', 's07_question', 's08_eyes', 's09_enter', 's10_past',
  's11_channels', 's12_connection', 's13_ports', 's14_line', 's15_height',
  's16_collect', 's17_route', 's18_compare', 's19_answer', 's20_loop'];
const SCENE = 3;
const ERAS = window.ERAS = IDS.map((id, i) => ({ id, dur: SCENE, t0: i * SCENE, t1: (i + 1) * SCENE, transition: null, n: i + 1 }));
window.__total = IDS.length * SCENE;

const main = document.getElementById('c'); main.width = W; main.height = H;
const mc = main.getContext('2d', { willReadFrequently: true });
window.__canvas = main;

function drawOne(cc, e, lt) {
  const s = SC[e.id];
  cc.save(); window.__scene = e.id;
  if (!s) { PIX.text(cc, 'MISSING ' + e.id, 10, 300, 'w'); cc.restore(); return; }
  s.draw(cc, lt, { id: e.id, dur: e.dur, t: e.t0 + lt, n: e.n });
  cc.restore(); cc.setTransform(1, 0, 0, 1, 0, 0); cc.globalAlpha = 1; cc.globalCompositeOperation = 'source-over';
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
// dither dissolve: draws A on c, B offscreen, then shows B where the Bayer threshold is below p
const mk = () => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; return [cv, cv.getContext('2d', { willReadFrequently: true })]; };
const [cvB, xB] = mk();
window.dissolve = (c, fa, fb, p) => {
  if (p <= 0) { fa(c); return; } if (p >= 1) { fb(c); return; }
  fa(c);
  xB.setTransform(1, 0, 0, 1, 0, 0); xB.globalAlpha = 1; xB.fillStyle = PIX.P.k; xB.fillRect(0, 0, W, H); fb(xB); xB.setTransform(1, 0, 0, 1, 0, 0);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const a = c.getImageData(0, 0, W, H), b = xB.getImageData(0, 0, W, H), A = a.data, B = b.data;
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) if (p > BAYER[(y & 3) << 2 | (x & 3)] + 0.5) { A[i] = B[i]; A[i + 1] = B[i + 1]; A[i + 2] = B[i + 2]; }
  c.putImageData(a, 0, 0); c.restore();
};
// draw fn on a transparent offscreen layer and composite it onto c shifted by (dx, dy)
const [cvL, xL] = mk();
window.shifted = (c, fn, dx, dy = 0) => {
  xL.setTransform(1, 0, 0, 1, 0, 0); xL.globalAlpha = 1; xL.clearRect(0, 0, W, H); fn(xL); xL.setTransform(1, 0, 0, 1, 0, 0);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.drawImage(cvL, Math.round(dx), Math.round(dy)); c.restore();
};
// draw fn into a clipped screen rectangle (insets, panels)
window.inset = (c, x, y, w, h, fn) => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.beginPath(); c.rect(x, y, w, h); c.clip(); fn(c); c.restore(); c.setTransform(1, 0, 0, 1, 0, 0); };
function sceneAt(t) { for (let i = 0; i < ERAS.length; i++) if (t < ERAS[i].t1) return i; return ERAS.length - 1; }
window.renderFrame = t => {
  t = Math.max(0, Math.min(t, window.__total - 1e-6));
  const e = ERAS[sceneAt(t)]; drawScene(mc, e, t - e.t0);
  PIX.quantize(mc);
};
window.renderSolo = (id, lt) => { const e = ERAS.find(x => x.id === id) || { id, dur: SCENE, t0: 0, n: 0 }; drawScene(mc, e, lt); PIX.quantize(mc); };
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
    for (const lib of ['PELVIS', 'FOLEY', 'BED'].map(k => window[k])) if (lib && lib.init) { const t1 = performance.now(); await lib.init(); console.log(`${lib.NAME || 'lib'} ready in ${Math.round(performance.now() - t1)} ms`); }
    for (const e of ERAS) { const s = SC[e.id]; if (s && s.init) await s.init(); }
    window.__ready = true;
  } catch (err) { window.__bootFailed = String(err); console.error(err && err.stack || err); }
})();
})();
