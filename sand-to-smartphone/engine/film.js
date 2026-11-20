// FILM — timeline, transitions and the frame loop.
// Scene files register SC[id] = { draw(c, lt, S), cues: [[t, sfx, gain, pan, arg], ...] } in local time.
// A scene must draw sensibly a little before 0 and after its duration: transitions keep both scenes live.
// Exposes the hooks the skill's qa.py / render.py expect: ERAS, __total, renderFrame, renderSolo, prepare, __canvas, __ready.
(() => {
const { W, H, BAYER } = PIX;
window.SC = window.SC || {};

// [id, seconds, transition into this scene]
//   type: cut | dither | iris | wipe | slideV | slideH | flash | whip
//   dur: seconds, pre: fraction of dur before the boundary, plus type params; sfx: transition sound
const ORDER = [
  ['s01_grain', 6],
  ['s02_lattice', 5, { type: 'iris', dur: 0.9, pre: 0.55, cx: 135, cy: 240, ring: 's4', sfx: 'dive' }],
  ['s03_conveyor', 5, { type: 'dither', dur: 0.5, pre: 0.5, sfx: 'whoosh_out' }],
  ['s04_furnace', 6, { type: 'wipe', dir: 'down', dur: 0.8, pre: 0.5, line: 'o1', sfx: 'scan' }],
  ['s05_reduction', 6, { type: 'flash', dur: 0.6, pre: 0.5, col: 'y1', sfx: 'dive' }],
  ['s06_tapping', 6, { type: 'wipe', dir: 'down', dur: 0.7, pre: 0.5, line: 'y0', sfx: 'pour' }],
  ['s07_chlorosilane', 7, { type: 'slideV', dir: 'up', dur: 0.9, pre: 0.5, sfx: 'whoosh' }],
  ['s08_siemens', 7, { type: 'slideH', dir: 'left', dur: 0.9, pre: 0.5, sfx: 'whoosh' }],
  ['s09_melt', 6, { type: 'slideV', dir: 'up', dur: 0.9, pre: 0.5, sfx: 'whoosh' }],
  ['s10_seed', 6, { type: 'dither', dur: 0.4, pre: 0.5 }],
  ['s11_pull', 7, { type: 'dither', dur: 0.4, pre: 0.5, sfx: 'whoosh_out' }],
  ['s12_saw', 7, { type: 'slideH', dir: 'left', dur: 0.9, pre: 0.5, sfx: 'whoosh' }],
  ['s13_polish', 6, { type: 'iris', dur: 0.8, pre: 0.5, cx: 135, cy: 240, ring: 'g5', sfx: 'whoosh' }],
  ['s14_cleanroom', 6, { type: 'flash', dur: 0.5, pre: 0.5, col: 'w', sfx: 'glint' }],
  ['s15_deposition', 5, { type: 'wipe', dir: 'right', dur: 0.6, pre: 0.5, line: 'g4', sfx: 'whoosh' }],
  ['s16_spincoat', 5, { type: 'whip', dir: 'left', dur: 0.4, pre: 0.5, sfx: 'whip' }],
  ['s17_euv', 6, { type: 'dither', dur: 0.6, pre: 0.5, sfx: 'whoosh_out' }],
  ['s18_tin', 7, { type: 'iris', dur: 0.9, pre: 0.55, cx: 135, cy: 240, ring: 'p3', sfx: 'dive' }],
  ['s19_optics', 6, { type: 'flash', dur: 0.5, pre: 0.5, col: 'p4', sfx: 'plasma_big' }],
  ['s20_exposure', 5, { type: 'slideV', dir: 'up', dur: 0.8, pre: 0.5, sfx: 'whoosh' }],
  ['s21_etch', 6, { type: 'iris', dur: 0.8, pre: 0.5, cx: 135, cy: 240, ring: 'p3', sfx: 'dive' }],
  ['s22_implant', 5, { type: 'slideH', dir: 'left', dur: 0.8, pre: 0.5, sfx: 'whoosh' }],
  ['s23_transistor', 10, { type: 'flash', dur: 0.5, pre: 0.5, col: 'w', sfx: 'flash' }],
  ['s24_interconnect', 7, { type: 'dither', dur: 0.4, pre: 0.5, sfx: 'whoosh_out' }],
  ['s25_probe', 5, { type: 'dither', dur: 0.6, pre: 0.5, sfx: 'whoosh_out' }],
  ['s26_dicing', 5, { type: 'slideH', dir: 'left', dur: 0.8, pre: 0.5, sfx: 'whoosh' }],
  ['s27_package', 6, { type: 'dither', dur: 0.5, pre: 0.5, sfx: 'whoosh' }],
  ['s28_reflow', 6, { type: 'slideV', dir: 'down', dur: 0.8, pre: 0.5, sfx: 'whoosh' }],
  ['s29_phone', 13, { type: 'dither', dur: 0.5, pre: 0.5, sfx: 'whoosh_out' }],
  ['s30_finale', 12, { type: 'iris', dur: 0.9, pre: 0.5, cx: 135, cy: 240, ring: 'c3', sfx: 'whoosh' }],
];
let t = 0;
const ERAS = window.ERAS = ORDER.map(([id, dur, tr]) => { const e = { id, dur, t0: t, t1: t + dur, transition: tr || null }; t += dur; return e; });
window.__total = t;

// ---------- canvases ----------
const main = document.getElementById('c'); main.width = W; main.height = H;
const mc = main.getContext('2d', { willReadFrequently: true });
const mk = () => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; return [cv, cv.getContext('2d', { willReadFrequently: true })]; };
const [cA, xA] = mk(), [cB, xB] = mk();
window.__canvas = main;

function drawScene(c, e, lt) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = PIX.P.k; c.fillRect(0, 0, W, H);
  const s = SC[e.id];
  if (!s) { PIX.text(c, 'MISSING ' + e.id, 10, 10, 'm1'); return; }
  c.save(); s.draw(c, lt, { id: e.id, dur: e.dur, t: e.t0 + lt }); c.restore();
  c.setTransform(1, 0, 0, 1, 0, 0);
}

// ---------- transitions: per-pixel masks with Bayer thresholds (dithered edges) ----------
const ease = MO.k75;
function maskMix(fn) {                  // fn(x, y, th) → true = show B; th = Bayer threshold 0..1
  const a = xA.getImageData(0, 0, W, H), b = xB.getImageData(0, 0, W, H), o = mc.createImageData(W, H);
  const A = a.data, B = b.data, O = o.data;
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) {
    const S = fn(x, y, BAYER[(y & 3) << 2 | (x & 3)] + 0.5) ? B : A;
    O[i] = S[i]; O[i + 1] = S[i + 1]; O[i + 2] = S[i + 2]; O[i + 3] = 255;
  }
  mc.putImageData(o, 0, 0);
}
function composite(tr, p) {             // p: 0..1 through the transition window
  const q = ease(p);
  mc.setTransform(1, 0, 0, 1, 0, 0);
  switch (tr.type) {
    case 'cut': mc.drawImage(p < tr.pre ? cA : cB, 0, 0); break;
    case 'dither': maskMix((x, y, th) => q > th); break;
    case 'iris': {
      const cx = tr.cx ?? W / 2, cy = tr.cy ?? H / 2, R = q * Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.05;
      maskMix((x, y, th) => Math.hypot(x - cx, y - cy) < R - 6 * th);
      if (tr.ring && q > 0 && q < 1) { mc.save(); mc.strokeStyle = PIX.P[tr.ring]; mc.lineWidth = 2; mc.beginPath(); mc.arc(cx, cy, Math.max(0, R - 3), 0, U.TAU); mc.stroke(); mc.restore(); }
      break;
    }
    case 'wipe': {
      // v = distance from the edge the wipe starts at; B shows where v is behind the moving front e (dithered 8px band)
      const d = tr.dir || 'down', vert = d === 'down' || d === 'up', L = vert ? H : W, e = q * (L + 16) - 8;
      const along = (x, y) => d === 'down' ? y : d === 'up' ? H - y : d === 'right' ? x : W - x;
      maskMix((x, y, th) => along(x, y) < e - 8 * th);
      if (tr.line && q > 0 && q < 1) {
        const s = Math.round(d === 'down' || d === 'right' ? e : L - e);
        mc.save(); mc.fillStyle = PIX.P[tr.line]; if (vert) mc.fillRect(0, s - 1, W, 2); else mc.fillRect(s - 1, 0, 2, H); mc.restore();
      }
      break;
    }
    case 'slideV': case 'slideH': case 'whip': {
      const vert = tr.type === 'slideV', dir = tr.dir || (vert ? 'up' : 'left'), sgn = dir === 'up' || dir === 'left' ? -1 : 1;
      const L = vert ? H : W, off = Math.round(q * L) * sgn;
      mc.drawImage(cA, vert ? 0 : off, vert ? off : 0);
      mc.drawImage(cB, vert ? 0 : off - sgn * L, vert ? off - sgn * L : 0);
      if (tr.type === 'whip') {                       // speed streaks across the seam
        const v = Math.sin(Math.PI * p); mc.save(); mc.globalAlpha = 0.55 * v;
        for (let k = 0; k < 26; k++) { const yy = Math.floor(U.hash(k, 7) * H), len = 30 + U.hash(k, 9) * 90; mc.fillStyle = PIX.P[k % 3 ? 'g4' : 'w']; mc.fillRect(Math.floor(U.hash(k, 3) * W), yy, len, 1); }
        mc.restore();
      }
      break;
    }
    case 'flash': {
      mc.drawImage(p < (tr.pre ?? 0.5) ? cA : cB, 0, 0);
      const a = Math.pow(Math.sin(Math.PI * p), 0.7);
      mc.save(); mc.globalAlpha = a; mc.fillStyle = PIX.P[tr.col || 'w']; mc.fillRect(0, 0, W, H); mc.restore();
      break;
    }
    default: mc.drawImage(p < 0.5 ? cA : cB, 0, 0);
  }
}

// ---------- frame loop ----------
function sceneAt(t) { for (let i = 0; i < ERAS.length; i++) if (t < ERAS[i].t1) return i; return ERAS.length - 1; }
function windowOf(i) {                 // transition window of scene i (into it), or null
  const e = ERAS[i], tr = e && e.transition; if (!tr || i === 0) return null;
  const a = e.t0 - tr.pre * tr.dur; return [a, a + tr.dur];
}
window.renderFrame = t => {
  t = Math.max(0, Math.min(t, window.__total - 1e-6));
  let i = sceneAt(t), tw = windowOf(i);
  if (!(tw && t >= tw[0] && t < tw[1])) { const n = windowOf(i + 1); if (n && t >= n[0] && t < n[1]) { i = i + 1; tw = n; } else tw = null; }
  if (tw) {
    const A = ERAS[i - 1], B = ERAS[i], p = (t - tw[0]) / (tw[1] - tw[0]);
    drawScene(xA, A, t - A.t0); drawScene(xB, B, t - B.t0);
    composite(B.transition, p);
  } else {
    const e = ERAS[i]; drawScene(mc, e, t - e.t0);
  }
  PIX.quantize(mc);
};
window.renderSolo = (id, lt) => { const e = ERAS.find(x => x.id === id) || { id, dur: 6, t0: 0 }; drawScene(mc, e, lt); PIX.quantize(mc); };
window.prepare = async () => {};
window.dumpCues = () => {
  const out = [];
  for (const e of ERAS) {
    const s = SC[e.id];
    if (s && s.cues) for (const [tt, sfx, g = 1, pan = 0, arg = null] of s.cues) if (tt + e.t0 >= 0 && tt + e.t0 < window.__total) out.push({ t: +(e.t0 + tt).toFixed(4), sfx, g, pan, arg, scene: e.id });
    if (e.transition && e.transition.sfx) out.push({ t: +(e.t0 - e.transition.pre * e.transition.dur).toFixed(4), sfx: e.transition.sfx, g: 1, pan: 0, arg: e.transition.dur, scene: e.id });
  }
  return out.sort((a, b) => a.t - b.t);
};
window.__ready = true;
})();
