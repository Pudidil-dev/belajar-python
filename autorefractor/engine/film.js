// FILM — timeline and frame loop for "Why THIS balloon? How an Autorefractor Measures Your Eyes".
// Scenes register SC[id] = { draw(c, lt, S), cues, init, xin } in scenes/*.js. 21 scenes of exactly 3 s (63 s). At 120 BPM a
// scene is 6 beats and the harmony changes once per scene. The journey: the balloon in the viewing aperture → the patient at
// the autorefractor → the side cutaway (the gaze on the slide) → fogging → the infrared source → into the eye → the eye's
// optics → the return from the fundus → back to the sensor → the ring pattern → one pixel (light to charge) → readout (charge
// to data) → where light focuses → astigmatism → analysing the ring → repeated readings → the numbers → the printout → both
// systems together → back to the window → the balloon again, on the opening frame.
// Exposes the hooks the skill's qa.py / render.py expect: ERAS, __total, renderFrame, renderSolo, prepare, __canvas, __ready.
(() => {
const { W, H, BAYER } = PIX;
window.SC = window.SC || {};
window.BPM = 120; window.BEAT = 0.5; window.BAR = 2;
const qs = new URLSearchParams(location.search);
window.NOTEXT = qs.has('notext');
window.NODATA = qs.has('nodata');
const IDS = ['s01_balloon', 's02_exam', 's03_gaze', 's04_fog', 's05_infrared', 's06_front', 's07_bend',
  's08_return', 's09_sensor', 's10_pattern', 's11_charge', 's12_data', 's13_focus', 's14_astig',
  's15_analyze', 's16_repeat', 's17_numbers', 's18_print', 's19_both', 's20_return', 's21_loop'];
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
// The navy glow behind the subject, pulsing with the score's kick (tools/synth_audio.py: which bars have a kick on every beat,
// on beats 1 and 4, or none). An ambient layer: low contrast, 2 Hz at most; the subjects themselves do not move with it.
const KMODE = [0, 2, 2, 2, 4, 4, 4, 4, 4, 4, 0, 0, 2, 4, 4, 5, 4, 4, 2, 0, 0], KSTR = [0, .25, .25, .3, .35, .35, .35, .35, .35, .35, 0, 0, .3, .4, .5, .6, 1, .9, .3, 0, 0];
window.beatGlow = (c, T, cx = 180, cy = 330, r = 300) => {
  const bar = Math.max(0, Math.min(20, Math.floor(T / SCENE + 1e-9))), bt = (T - bar * SCENE) / 0.5, ib = Math.floor(bt + 1e-9), ph = bt - ib, m = KMODE[bar];
  const on = m === 4 || (m === 2 && ib % 3 === 0) || (m === 5 && ib < 4), p = on ? Math.exp(-5.5 * ph) * KSTR[bar] : 0;
  PIX.glow(c, cx, cy, r * (1 + 0.05 * p), 'n2', 0.7 + 0.25 * p);
  if (p > 0.02) PIX.glow(c, cx, cy, r * 0.62 * (1 + 0.1 * p), 'n3', 0.6 * p);
};
window.__ready = false;
(async () => {
  try {
    for (const lib of ['BAL', 'EYE', 'OPT', 'EXT', 'SEN', 'RES'].map(k => window[k])) if (lib && lib.init) { const t1 = performance.now(); await lib.init(); console.log(`${lib.NAME || 'lib'} ready in ${Math.round(performance.now() - t1)} ms`); }
    for (const e of ERAS) { const s = SC[e.id]; if (s && s.init) await s.init(); }
    window.__ready = true;
  } catch (err) { window.__bootFailed = String(err); console.error(err && err.stack || err); }
})();
})();
