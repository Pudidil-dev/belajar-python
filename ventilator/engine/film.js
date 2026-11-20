// FILM — timeline and frame loop for "HOW MEDICAL VENTILATORS WORK".
// Scenes register SC[id] = { draw(c, lt, S), cues, init, xin } in scenes/*.js. 40 micro-scenes in 60 s; every cut sits on
// the 16th-note grid of the score (120 BPM, a 16th = 0.125 s), so picture and sound hit together. Transitions live inside a
// scene's own time (xin = a short ordered-dither dissolve from the previous scene's last frame). The last frame is the
// first frame: the film loops.
// Exposes the hooks render.py expects: ERAS, __total, renderFrame, renderSolo, renderSheet, dumpCues, __canvas, __ready.
(() => {
const { W, H, BAYER } = PIX;
window.SC = window.SC || {};
window.BPM = 120; window.BEAT = 0.5; window.BAR = 2;
const qs = new URLSearchParams(location.search);
window.NOTEXT = qs.has('notext');
// [id, duration on screen (s), the scene's own animation length (s)]. Each scene's animation is stretched to its screen
// duration (the revision that slowed the film from 60 to 88 s): its camera, particles and state all run in the original
// 60-s timeline, so the loop and the machine's sequence stay exact, only calmer.
const SCN = [
  ['s01_breath', 1.0, 0.375], ['s02_trachea', 1.0, 0.375], ['s03_branches', 1.25, 0.46875], ['s04_alveoli', 1.25, 0.46875], ['s05_barrier', 1.5, 0.5625], ['s06_reveal', 2.0, 0.75],
  ['s07_circuit', 2.5, 1.5], ['s08_cutaway', 2.5, 1.75], ['s09_sources', 3.0, 1.75],
  ['s10_air', 2.0, 1.375], ['s11_oxygen', 2.0, 1.375], ['s12_valves', 2.5, 1.5], ['s13_mix', 2.5, 1.5], ['s14_o2sensor', 3.0, 2.25],
  ['s15_timer', 2.5, 1.5], ['s16_signals', 2.25, 1.5], ['s17_inspvalve', 2.25, 1.625], ['s18_flowsensor', 2.5, 1.625], ['s19_feedback', 2.5, 1.75],
  ['s20_outlet', 2.0, 1.5], ['s21_humidifier', 2.25, 1.5], ['s22_tube', 1.75, 1.5], ['s23_ypiece', 2.0, 1.5], ['s24_ett', 2.0, 1.5], ['s25_bronchi', 2.0, 1.5],
  ['s26_alveoli', 2.25, 1.625], ['s27_membrane', 2.5, 1.625], ['s28_hemoglobin', 2.75, 1.75], ['s29_exchange', 2.5, 2.0],
  ['s30_volume', 2.0, 1.5], ['s31_switch', 2.25, 1.5], ['s32_recoil', 2.5, 2.0], ['s33_expflow', 2.25, 2.0], ['s34_expvalve', 2.5, 2.0], ['s35_peep', 2.5, 2.0],
  ['s36_sensors', 2.5, 2.0], ['s37_machine', 2.5, 2.0], ['s38_next', 2.5, 2.0], ['s39_return', 2.25, 1.5], ['s40_loop', 2.25, 1.5]];
let acc = 0;
let oacc = 0;
const ERAS = window.ERAS = SCN.map(([id, dur, odur], i) => { const e = { id, dur, odur, t0: acc, t1: acc + dur, ot0: oacc, transition: null, n: i + 1 }; acc += dur; oacc += odur; return e; });
window.__total = acc;                                                   // 88
window.T0 = Object.fromEntries(ERAS.map(e => [e.id, e.t0]));            // film time at which each scene starts

const main = document.getElementById('c'); main.width = W; main.height = H;
const mc = main.getContext('2d', { willReadFrequently: true });
window.__canvas = main;

// lt is screen time inside the scene; the scene draws in its own (original) time lo, with rt = the screen time for labels
const warp = (e, lt) => lt * (e.odur ?? e.dur) / e.dur;
function drawOne(cc, e, lt) {
  const s = SC[e.id], lo = warp(e, lt);
  cc.save(); window.__scene = e.id;
  if (!s) { PIX.rect(cc, 0, 0, W, H, 'n0'); PIX.text(cc, 'MISSING ' + e.id, 6, 200, 'w'); cc.restore(); return; }
  window.__cams = {};
  const S = { id: e.id, dur: e.odur ?? e.dur, t: (e.ot0 ?? e.t0) + lo, n: e.n, rt: lt, rdur: e.dur };
  s.draw(cc, lo, S);
  if (window.LABELS) { cc.setTransform(1, 0, 0, 1, 0, 0); cc.globalAlpha = 1; LABELS.draw(cc, e.id, S, lo); }
  cc.restore(); cc.setTransform(1, 0, 0, 1, 0, 0); cc.globalAlpha = 1; cc.globalCompositeOperation = 'source-over'; cc.filter = 'none';
}
function drawScene(c, e, lt) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = PIX.P.k; c.fillRect(0, 0, W, H);
  const s = SC[e.id], i = ERAS.indexOf(e), pe = i > 0 ? ERAS[i - 1] : null;
  if (s && s.xin && pe && warp(e, lt) < s.xin && SC[pe.id]) {
    // a dithered dissolve from the previous scene's last frame: connected shots never hard-cut
    window.dissolve(c, cc => drawOne(cc, pe, pe.dur - 1 / 120), cc => drawOne(cc, e, lt), MO.smooth(warp(e, lt) / s.xin));
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
    if (s && s.gcues) for (const [t, sfx, g = 1, pan = 0, arg = null] of s.gcues) out.push({ t: +t.toFixed(4), sfx, g, pan, arg, scene: e.id });   // already on screen time
    const k = e.dur / (e.odur ?? e.dur);                                // cue times are in the scene's own time: stretch them
    if (cues) for (const [tt, sfx, g = 1, pan = 0, arg0 = null] of cues) { const t = e.t0 + tt * k, arg = typeof arg0 === 'number' && arg0 > 0.05 && /^(whoosh_dir|fwoosh|zoomout|airflow|trace_up|push|reveal_sweep|glide|hiss_air|hiss_o2|whip|o2_stream|servo|swirl|signal_zip|activate|gas_start|whoosh_pneu|warm|rush|tunnel|airflow_soft|dive|molecular|exhale|reverse_air|release_hiss|stabilize|zoom_out|rise|buildup|loop_rise)$/.test(sfx) ? +(arg0 * k).toFixed(3) : arg0; if (t >= 0 && t < window.__total) out.push({ t: +t.toFixed(4), sfx, g, pan, arg, scene: e.id }); }
  }
  return out.sort((a, b) => a.t - b.t);
};
window.__ready = false;
(async () => {
  try {
    for (const lib of ['LIT', 'BREATH', 'MACRO', 'MONITOR', 'INSIDE', 'AIR', 'MICRO'].map(k => window[k])) if (lib && lib.init) { const t1 = performance.now(); await lib.init(); console.log(`${lib.NAME || 'lib'} ready in ${Math.round(performance.now() - t1)} ms`); }
    for (const e of ERAS) { const s = SC[e.id]; if (s && s.init) await s.init(); }
    window.__ready = true;
  } catch (err) { window.__bootFailed = String(err); console.error(err && err.stack || err); }
})();
})();
