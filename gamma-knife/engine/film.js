// FILM — timeline and frame loop for "HOW GAMMA KNIFE MACHINES WORK".
// Scenes register SC[id] = { draw(c, t, S), cues, xin } in scenes/*.js. 49 micro-scenes in 90 s (the client's storyboard
// one to one; lengthened from the brief's 60 s so each scene can be read); every cut sits on the 16th-note grid of the
// score (120 BPM). xin = a short ordered-dither dissolve from the previous scene's last frame. The last frame is the
// first frame: the film loops. Exposes the hooks render.py expects: ERAS, __total, renderFrame, renderSolo, dumpCues,
// __canvas, __ready.
(() => {
const { W, H, BAYER } = PIX;
window.SC = window.SC || {};
window.BPM = 120; window.BEAT = 0.5; window.BAR = 2;
const qs = new URLSearchParams(location.search);
window.NOTEXT = qs.has('notext');
const SCN = [
  // A — the impossible surgery (the result first)
  ['s01_beams', 1.25], ['s02_dose', 1.0], ['s03_photon', 1.0], ['s04_ionize', 1.0], ['s05_dsb', 1.25], ['s06_reveal', 2.0],
  // B — how the machine finds its target
  ['s07_mri', 1.75], ['s08_mask', 1.75], ['s09_cbct', 2.0], ['s10_plan', 2.5],
  // C — inside the cobalt-60 radiation unit
  ['s11_cutaway', 2.0], ['s12_sectors', 2.5], ['s13_capsule', 1.75], ['s14_decay', 2.25], ['s15_gamma', 1.75], ['s16_source', 1.75], ['s17_shield', 2.0],
  // D — the collimator system
  ['s18_focus', 2.0], ['s19_translate', 1.75], ['s20_collimate', 1.75], ['s21_sizes', 1.75], ['s22_onoff', 1.75], ['s23_plan8', 2.5], ['s24_channel', 1.75],
  // E — beams and dose
  ['s25_beam', 1.75], ['s26_converge', 1.75], ['s27_isocenter', 2.25], ['s28_onevsmany', 2.0], ['s29_irregular', 1.75], ['s30_shotsizes', 1.75],
  // F — shaping the dose
  ['s31_overlap', 1.75], ['s32_reset', 1.5], ['s33_couch', 1.75], ['s34_nextshot', 1.5], ['s35_conform', 2.0],
  // G — what gamma radiation does to cells
  ['s36_enter', 1.5], ['s37_compton', 2.25], ['s38_track', 1.75], ['s39_radiolysis', 1.75], ['s40_radicals', 1.75], ['s41_dnahit', 1.75], ['s42_cell', 2.25],
  // H — safety and motion monitoring
  ['s43_ir', 2.0], ['s44_motion', 2.0], ['s45_off', 2.0],
  // I — the loop
  ['s46_system', 2.5], ['s47_return', 2.0], ['s48_cycle', 2.0], ['s49_loop', 2.0]];
let acc = 0;
const ERAS = window.ERAS = SCN.map(([id, dur], i) => { const e = { id, dur, t0: acc, t1: acc + dur, transition: null, n: i + 1 }; acc += dur; return e; });
window.__total = acc;                                                   // 90
window.T0 = Object.fromEntries(ERAS.map(e => [e.id, e.t0]));
const main = document.getElementById('c'); main.width = W; main.height = H;
const mc = main.getContext('2d', { willReadFrequently: true });
window.__canvas = main;
function drawOne(cc, e, lt) {
  const s = SC[e.id];
  cc.save(); window.__scene = e.id; window.__cams = {};
  if (!s) { PIX.rect(cc, 0, 0, W, H, 'n0'); PIX.text(cc, 'MISSING ' + e.id, 6, 200, 'w'); cc.restore(); return; }
  const S = { id: e.id, dur: e.dur, t: e.t0 + lt, n: e.n };
  s.draw(cc, lt, S);
  if (window.LABELS) { cc.setTransform(1, 0, 0, 1, 0, 0); cc.globalAlpha = 1; LABELS.draw(cc, e.id, S, lt); }
  cc.restore(); cc.setTransform(1, 0, 0, 1, 0, 0); cc.globalAlpha = 1; cc.globalCompositeOperation = 'source-over'; cc.filter = 'none';
}
function drawScene(c, e, lt) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = PIX.P.n0; c.fillRect(0, 0, W, H);
  const s = SC[e.id], i = ERAS.indexOf(e), pe = i > 0 ? ERAS[i - 1] : null;
  if (s && s.xin && pe && lt < s.xin && SC[pe.id]) window.dissolve(c, cc => drawOne(cc, pe, pe.dur - 1 / 120), cc => drawOne(cc, e, lt), MO.smooth(lt / s.xin));
  else drawOne(c, e, lt);
  c.setTransform(1, 0, 0, 1, 0, 0);
}
const mk = () => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; return [cv, cv.getContext('2d', { willReadFrequently: true })]; };
const [cvB, xB] = mk();
// dither dissolve: draws A on c, B offscreen, then shows B where the Bayer threshold is below p
window.dissolve = (c, fa, fb, p) => {
  if (p <= 0) { fa(c); return; } if (p >= 1) { fb(c); return; }
  fa(c);
  xB.setTransform(1, 0, 0, 1, 0, 0); xB.globalAlpha = 1; xB.fillStyle = PIX.P.n0; xB.fillRect(0, 0, W, H); fb(xB); xB.setTransform(1, 0, 0, 1, 0, 0);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const a = c.getImageData(0, 0, W, H), b = xB.getImageData(0, 0, W, H), A = a.data, B = b.data;
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) if (p > BAYER[(y & 3) << 2 | (x & 3)] + 0.5) { A[i] = B[i]; A[i + 1] = B[i + 1]; A[i + 2] = B[i + 2]; }
  c.putImageData(a, 0, 0); c.restore();
};
// draw fn into a clipped screen rectangle (split views, insets)
window.inset = (c, x, y, w, h, fn) => { const prev = LIT.CLIP; LIT.CLIP = [x, y, x + w, y + h]; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.beginPath(); c.rect(x, y, w, h); c.clip(); try { fn(c); } finally { c.restore(); c.setTransform(1, 0, 0, 1, 0, 0); LIT.CLIP = prev; } };
function sceneAt(t) { for (let i = 0; i < ERAS.length; i++) if (t < ERAS[i].t1) return i; return ERAS.length - 1; }
window.renderFrame = t => { t = Math.max(0, Math.min(t, window.__total - 1e-6)); const e = ERAS[sceneAt(t)]; drawScene(mc, e, t - e.t0); PIX.quantize(mc); };
window.renderSolo = (id, lt) => { const e = ERAS.find(x => x.id === id) || { id, dur: 3, t0: 0, n: 0 }; drawScene(mc, e, lt); PIX.quantize(mc); };
window.renderSheet = () => {};
window.prepare = async () => {};
window.dumpCues = () => {
  const out = [];
  for (const e of ERAS) { const s = SC[e.id], cues = s && (typeof s.cues === 'function' ? s.cues() : s.cues); if (cues) for (const [tt, sfx, g = 1, pan = 0, arg = null] of cues) if (tt + e.t0 >= 0 && tt + e.t0 < window.__total) out.push({ t: +(e.t0 + tt).toFixed(4), sfx, g, pan, arg, scene: e.id }); }
  return out.sort((a, b) => a.t - b.t);
};
window.__ready = false;
(async () => {
  try {
    for (const lib of ['LIT', 'HEAD', 'TISSUE', 'MICRO', 'ROOM', 'UNIT', 'NUC', 'UI'].map(k => window[k])) if (lib && lib.init) await lib.init();
    for (const e of ERAS) { const s = SC[e.id]; if (s && s.init) await s.init(); }
    window.__ready = true;
  } catch (err) { window.__bootFailed = String(err); console.error(err && err.stack || err); }
})();
})();
