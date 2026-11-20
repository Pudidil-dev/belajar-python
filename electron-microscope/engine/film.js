// FILM — timeline and frame loop for "How Electron Microscopes See Atoms".
// Scenes register SC[id] = { draw(c, lt, S), cues, init, xin } in scenes/*.js. The 16 scene boundaries are the brief's
// timings (exactly 115 s); at 120 BPM every one of them falls on a beat. Each scene's camera continues the previous
// one's move, so the cuts read as one journey: atom → monitor → lab → column → sample → vacuum → gun → … → image → atom.
// Exposes the hooks the skill's qa.py / render.py expect: ERAS, __total, renderFrame, renderSolo, prepare, __canvas, __ready.
(() => {
const { W, H, BAYER } = PIX;
window.SC = window.SC || {};
window.BPM = 120; window.BEAT = 0.5; window.BAR = 2;
// [id, seconds]
const ORDER = [['s01_hook', 4], ['s02_lab', 5], ['s03_column', 7], ['s04_sample', 7], ['s05_vacuum', 7], ['s06_emission', 8],
  ['s07_accel', 7], ['s08_wave', 7], ['s09_lens', 7], ['s10_corrector', 7], ['s11_scan', 8], ['s12_scatter', 9],
  ['s13_zcontrast', 8], ['s14_detector', 8], ['s15_image', 9], ['s16_final', 7]];
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
  const cur = cc => { cc.save(); s.draw(cc, lt, { id: e.id, dur: e.dur, t: e.t0 + lt }); cc.restore(); cc.setTransform(1, 0, 0, 1, 0, 0); };
  const i = ERAS.indexOf(e), pe = i > 0 ? ERAS[i - 1] : null;
  if (s.xin && pe && lt < s.xin && SC[pe.id]) {
    // a dithered dissolve from the previous scene's last frame: no hard cut between connected shots
    const prev = cc => { cc.save(); SC[pe.id].draw(cc, pe.dur - 1 / 120, { id: pe.id, dur: pe.dur, t: pe.t1 - 1 / 120 }); cc.restore(); cc.setTransform(1, 0, 0, 1, 0, 0); };
    window.dissolve(c, prev, cur, MO.smooth(lt / s.xin));
  } else cur(c);
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
  try {
    const t0 = performance.now(); HA.init(); console.log(`micrograph synthesized in ${Math.round(performance.now() - t0)} ms, ${HA.AU.length} gold atoms`);
    for (const lib of [window.LAB, window.COL, window.OPT, window.ATOM, window.SAMPLE]) if (lib && lib.init) await lib.init();
    for (const e of ERAS) { const s = SC[e.id]; if (s && s.init) await s.init(); }
    window.__ready = true;
  } catch (err) { window.__bootFailed = String(err); console.error(err); }
})();
})();
