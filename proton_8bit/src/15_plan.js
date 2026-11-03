'use strict';
// ============================================================================
// GRAPH (screen space): the Bragg curve turns from the tissue's depth axis
// into a depth-dose graph; the beam energy sets where the peak sits.
// PLAN3D (screen space): the treatment plan — the tumour as depth layers in
// 3D, one layer selected, its energy set; then spot by spot the dose fills a
// layer and the energy steps down to the next one.
// DNA (world units "dn"): a DNA double helix in a cell nucleus in the treated
// region; a secondary electron breaks one strand directly, and a hydroxyl
// radical made from water breaks the other. Illustrative, not to scale.
// ============================================================================
// ---------------------------------------------------------------- the depth-dose curve (relative depth 0..1.15, relative dose 0..1)
function braggCurve(R, n) {
  const out = new Float32Array(n), sig = 0.028;
  for (let s = -2; s <= 2; s += 0.5) { const w = Math.exp(-s * s / 2), Ri = R * (1 + sig * s); for (let i = 0; i < n; i++) { const d = i / (n - 1) * 1.15; if (d < Ri) out[i] += w * Math.pow((Ri - d) / R + 0.012, -0.44); } }
  let mx = 0; for (const v of out) mx = Math.max(mx, v); for (let i = 0; i < n; i++) out[i] /= mx;
  return out;
}
const BR_PLAN = 0.8, BR_LOW = 0.58, BR_HIGH = 0.98;
const G = { x0: 46, y0: 384, w: 250, h: 190 };                      // the horizontal graph: origin bottom-left
// curve points in screen space for relative range R; k = 0 (vertical, along the tissue) … 1 (horizontal graph)
function graphPts(R, k, vert) {
  const n = 90, D = braggCurve(R, n), th = -Math.PI / 2 * K75(k), c = Math.cos(th), s = Math.sin(th);
  const wv = lerp(vert.w, G.h, K75(k)), hv = lerp(vert.h, G.w, K75(k)) / 1.15, px = lerp(vert.x, G.x0, K75(k)), py = lerp(vert.y, G.y0, K75(k));
  const pts = [];
  for (let i = 0; i < n; i++) { const u = i / (n - 1) * 1.15, Lx = D[i] * wv, Ly = u * hv; pts.push(px + c * Lx - s * Ly, py + s * Lx + c * Ly); }
  return pts;
}
function graphWorld(t, opt) {
  clear(P.BG);
  const k = opt.k, vert = opt.vert;
  // faint grid of the graph once it is horizontal
  const ga = smooth(seg(k, 0.6, 1));
  if (ga > 0) withDither(ga, () => {
    rect(G.x0 - 20, G.y0 - G.h - 34, G.x0 + G.w + 16, G.y0 + 44, P.N1);
    for (let i = 1; i <= 4; i++) line(G.x0, G.y0 - G.h * i / 4, G.x0 + G.w, G.y0 - G.h * i / 4, P.N2);
    for (let i = 1; i <= 5; i++) line(G.x0 + G.w * i / 5, G.y0, G.x0 + G.w * i / 5, G.y0 - G.h, P.N2);
    // the tumour's depth on the depth axis
    const a = G.x0 + G.w * (0.68 / 1.15), b = G.x0 + G.w * (0.86 / 1.15); tintRect(a, G.y0 - G.h, b, G.y0, P.TU1, 0.35); rect(a, G.y0 - 2, b, G.y0 + 2, P.TU2);
    lineW(G.x0, G.y0, G.x0 + G.w + 6, G.y0, 2, P.N6); lineW(G.x0, G.y0, G.x0, G.y0 - G.h - 8, 2, P.N6);
    arrowHead(G.x0 + G.w + 8, G.y0, 0, 5, P.N6); arrowHead(G.x0, G.y0 - G.h - 10, -Math.PI / 2, 5, P.N6);
  });
  // the curves: planned; then lower and higher energy (each shifts the peak)
  const cur = (R, col, w, lv) => { const q = graphPts(R, k, vert); withDither(lv, () => { for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], w, col); }); return q; };
  const lo = smooth(seg(t, EV.lower, EV.lower + 0.35)), hi = smooth(seg(t, EV.higher, EV.higher + 0.35));
  const out = {};
  if (k >= 1 && t >= EV.lower) out.lo = cur(lerp(BR_PLAN, BR_LOW, lo), P.DE3, 2, 1);
  if (k >= 1 && t >= EV.higher) out.hi = cur(lerp(BR_PLAN, BR_HIGH, hi), P.DE3, 2, 1);
  out.plan = cur(BR_PLAN, t >= EV.lower ? P.DE1 : P.DE3, t >= EV.lower ? 2 : 3, 1);
  // a tracer runs along the newest curve (depth increasing), so the eye follows the dose to its peak
  // the dose under the newest curve: slowly moving stripes
  if (k >= 1) { const q = out.hi || out.lo || out.plan, sh = Math.floor(t * 18); for (let i = 0; i + 3 < q.length; i += 2) { const x0 = Math.round(q[i]), x1 = Math.round(q[i + 2]); for (let x = x0; x < x1; x++) { const u = (x - q[i]) / Math.max(1e-6, q[i + 2] - q[i]), yc = Math.round(lerp(q[i + 1], q[i + 3], u)); for (let y = yc + 2; y < G.y0 - 1; y++) if ((x + y + sh) % 7 === 0) pset(x, y, P.DE1); } } }
  if (k >= 1) { const q = out.hi || out.lo || out.plan, n = q.length / 2, u = ((t - 57.7) / 1.1) % 1, i = Math.min(n - 1, Math.floor(u * n)); glow(q[2 * i], q[2 * i + 1], 7, P.DE2, P.DE4, 0.9); disc(q[2 * i], q[2 * i + 1], 2, P.DE4); }
  return out;
}
// ---------------------------------------------------------------- PLAN3D
const P3 = { cx: 160, cy: 196, s: 1.85 };
const LAYERS = [[0, 24], [26, 34], [52, 40], [78, 35], [104, 23]];      // depth (down the beam) and radius of each layer
function l3r(k, a) { return LAYERS[k][1] * (1 + 0.13 * Math.sin(3 * a + k * 1.3) + 0.08 * Math.sin(5 * a + 2 * k)); }
function p3(X, Y, Z, o) { o = o || P3; const c = 0.866, s = 0.5, r = o.rot || 0; if (r) { const cr = Math.cos(r), sr = Math.sin(r), x2 = X * cr - Z * sr; Z = X * sr + Z * cr; X = x2; } return [o.cx + (X - Z) * c * o.s, o.cy + ((X + Z) * s + Y) * o.s]; }
const L_SPOTS = LAYERS.map((L, k) => { const o = []; let row = 0; for (let Z = -44; Z <= 44; Z += 10, row++) { const r = []; for (let X = -44; X <= 44; X += 10) { const a = Math.atan2(Z, X); if (Math.hypot(X, Z) < l3r(k, a) - 3) r.push([X, Z]); } if (row % 2) r.reverse(); o.push(...r); } return o; });
// scanning order: deepest layer (highest energy) first; the times each spot gets its dose
const L_ORDER = [4, 3, 2, 1, 0];
const L_TIMES = (() => {
  const T = {}; const ticks = [EV.spotsL1, EV.spotsL2, EV.spotsL3];
  L_ORDER.forEach((k, n) => {
    const sp = L_SPOTS[k], tk = ticks[n];
    if (tk) T[k] = sp.map((_, j) => tk[Math.min(tk.length - 1, Math.floor(j * tk.length / sp.length))] + (j * tk.length / sp.length % 1) / 12);
    else { const a = EV.lapse + (n - 3) * 0.25; T[k] = sp.map((_, j) => a + 0.24 * j / sp.length); }
  });
  return T;
})();
function layerOf(t) { if (t < EV.spotsL1[0]) return 4; if (t < EV.layer2) return 4; if (t < EV.layer3) return 3; if (t < EV.lapse) return 2; if (t < EV.lapse + 0.25) return 1; return 0; }
function plan3dWorld(t, opt) {
  opt = opt || {};
  clear(P.BG);
  const o = opt.view || P3;
  // the planning screen: a panel with a header strip
  const fr = opt.frame === undefined ? 1 : opt.frame;
  if (fr > 0) withDither(fr, () => { const m = maskRR(16, 92, 304, 452, 8); mFill(m, P.SCR0); mOutline(m, P.N5); rect(17, 93, 303, 110, P.SCR1); text(FS, 'TREATMENT PLAN', 26, 98, { sc: 1, c: P.SUB, ol: null }); for (let x = 30; x < 300; x += 18) line(x, 112, x, 450, P.SCR1); for (let y = 120; y < 450; y += 18) line(18, y, 302, y, P.SCR1); });
  const sel = opt.sel, cur = opt.scan ? layerOf(t) : -1;
  // the beam direction (from above) as a dashed axis
  { const a = p3(0, -60, 0, o), b = p3(0, 124, 0, o); dashLine(a[0], a[1], b[0], b[1], P.N6, 3, 3, t * 20); }
  // layers from the deepest up (painter's order)
  for (let k = LAYERS.length - 1; k >= 0; k--) {
    const Y = LAYERS[k][0], pts = []; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, r = l3r(k, a); const q = p3(Math.cos(a) * r, Y, Math.sin(a) * r, o); pts.push(q[0], q[1]); }
    const active = k === sel || k === cur, done = opt.scan && L_TIMES[k] && t >= L_TIMES[k][L_TIMES[k].length - 1];
    const m = maskPoly(pts);
    withDither(active ? 0.8 : 0.3, () => mFill(m, active ? P.TU2 : P.TU1));
    mOutline(m, active ? P.PC4 : P.TU2);
    // spots: grid rings on the active layer; dosed spots orange-yellow
    if (opt.scan || active) for (let j = 0; j < L_SPOTS[k].length; j++) {
      const [X, Z] = L_SPOTS[k][j], q = p3(X, Y, Z, o), dosed = opt.scan && L_TIMES[k] && t >= L_TIMES[k][j];
      if (dosed) { ellipse(q[0], q[1], 3.2 * o.s / 2.1, 1.7 * o.s / 2.1, P.DE2); pset(q[0], q[1], P.DE4); }
      else if (active) pset(q[0], q[1], P.TU4);
    }
    if (done && !active) withDither(0.25, () => mFill(m, P.DE2));
  }
  // the beam to the current spot
  if (opt.scan && t >= EV.spotsL1[0] && t < EV.covered) {
    const k = layerOf(t), T = L_TIMES[k]; let j = 0; while (j + 1 < T.length && t >= T[j + 1]) j++;
    const [X, Z] = L_SPOTS[k][j], q = p3(X, LAYERS[k][0], Z, o), top = p3(X * 0.3, -70, Z * 0.3, o);
    lineW(top[0], top[1], q[0], q[1], 3, P.PC1); line(top[0], top[1], q[0], q[1], P.PC4); glow(q[0], q[1], 9, P.PC2, P.PC4, 0.9);
    return { spot: q, layer: k };
  }
  return null;
}
// the energy readout of the plan: one level per layer (deeper layer = higher energy)
function energyBar(x, y, h, lvl, k) {
  if (k <= 0) return;
  withDither(k, () => {
    rect(x - 7, y - 4, x + 9, y + h + 4, P.K0); frame(x - 7, y - 4, x + 9, y + h + 4, P.N5);
    for (let i = 0; i < 5; i++) { const yy = y + h - (i + 1) * h / 5 + 2; rect(x - 3, yy, x + 5, yy + h / 5 - 3, i < lvl ? P.PC3 : P.N3); }
  });
}
// ---------------------------------------------------------------- DNA
const DNA = { R: 22, k: TAU / 92, step: 9.2 };
const strandY = (x, s, ph) => DNA.R * Math.sin(DNA.k * x + ph + (s ? 2.5 : 0));
const strandZ = (x, s, ph) => Math.cos(DNA.k * x + ph + (s ? 2.5 : 0));
const BREAKS = [{ x: -6, s: 0, t: EV.direct }, { x: 10, s: 1, t: EV.indirect }];
function dnaWorld(cam, t, opt) {
  opt = opt || {};
  clear(P.N1);
  const z = cam.z, ph = 0.25 * Math.sin(t * 0.6);
  // the nucleus: faint chromatin fibres
  for (let i = 0; i < 9; i++) { let x = -260 + i * 64, y = -220 + 50 * Math.sin(i * 2.1); const q = []; for (let j = 0; j < 14; j++) { q.push(cam.x(x), cam.y(y)); x += 22 * Math.cos(i + j * 0.6); y += 36; } for (let j = 0; j + 3 < q.length; j += 2) lineW(q[j], q[j + 1], q[j + 2], q[j + 3], Math.max(2, 7 * z), P.N2); }
  const open = smooth(seg(t, EV.lesion, EV.lesion + 0.6));
  const shift = x => x > 2 ? [6 * open, -4 * open] : [-6 * open, 4 * open];
  const X = (x, y) => cam.x(x + shift(x)[0]), Y = (x, y) => cam.y(y + shift(x)[1]);
  const gap = (x, s) => BREAKS.some(b => b.s === s && t >= b.t && Math.abs(x - b.x) < 6.5);
  const x0 = Math.floor(cam.wx(-30) / DNA.step) * DNA.step, x1 = cam.wx(W + 30);
  const strand = (s, front) => {
    for (let x = x0; x < x1; x += 2) {
      const za = strandZ(x, s, ph); if ((za > 0) !== front) continue;
      if (gap(x, s) || gap(x + 2, s)) continue;
      lineW(X(x, 0), Y(x, strandY(x, s, ph)), X(x + 2, 0), Y(x + 2, strandY(x + 2, s, ph)), Math.max(2, 5.5 * z), front ? (s ? P.DN2 : P.DN1) : P.DN0);
    }
  };
  strand(0, false); strand(1, false);
  for (let x = x0; x < x1; x += DNA.step) {
    const ya = strandY(x, 0, ph), yb = strandY(x, 1, ph), mid = (ya + yb) / 2, c = Math.floor(x / DNA.step) & 1;
    lineW(X(x, 0), Y(x, ya), X(x, 0), Y(x, mid), Math.max(1, 3 * z), c ? P.BA1 : P.BA2);
    lineW(X(x, 0), Y(x, mid), X(x, 0), Y(x, yb), Math.max(1, 3 * z), c ? P.BA2 : P.BA1);
  }
  strand(0, true); strand(1, true);
  for (let x = x0; x < x1; x += DNA.step) for (const s of [0, 1]) if (strandZ(x, s, ph) > 0 && !gap(x, s)) disc(X(x, 0), Y(x, strandY(x, s, ph)), Math.max(1.5, 3.6 * z), s ? P.M7 : P.DN2);
  // water molecules drifting around
  for (let i = 0; i < 26; i++) { const wx = -170 + (i * 53) % 340 + 8 * Math.sin(t + i), wy = (i % 2 ? -1 : 1) * (48 + (i * 37) % 120) + 6 * Math.cos(t * 1.2 + i); drawWater(cam.x(wx), cam.y(wy), i, z * 0.6, false); }
  // the secondary electron: comes in from the left, passes the DNA (direct break), ionises a water molecule (radical)
  const ePath = t2 => { const u = (t2 - EV.electron + 0.5) / 1.0; return [lerp(-190, 70, u), lerp(70, -40, u) + 18 * Math.sin(u * 7)]; };
  if (t >= EV.electron - 0.5 && t < EV.radical + 0.4) { const [ex, ey] = ePath(t), [bx, by] = ePath(t - 0.08); streak(cam.x(bx), cam.y(by), cam.x(ex), cam.y(ey), P.EL0, P.EL1, Math.max(1, 2 * z)); electron(cam.x(ex), cam.y(ey), Math.max(1.5, 3 * z)); }
  // the hydroxyl radical (•OH): appears where the electron ionised water, drifts to the other strand
  const rp = t < EV.attack ? [44, -46] : [lerp(44, 12, smooth(seg(t, EV.attack, EV.indirect))), lerp(-46, strandY(10, 1, ph) - 4, smooth(seg(t, EV.attack, EV.indirect)))];
  if (t >= EV.radical && t < EV.indirect + 0.15) { const sx = cam.x(rp[0]), sy = cam.y(rp[1]); glow(sx, sy, 10 * z, P.RD1, P.RD2, 0.7); disc(sx, sy, Math.max(2, 4.5 * z), P.RD1); disc(sx - z, sy - z, Math.max(1, 2 * z), P.RD2); disc(sx + 4 * z, sy - 3 * z, Math.max(1, 2.4 * z), P.WH); }
  // the breaks: a small orange-yellow mark of deposited energy at each
  for (const b of BREAKS) if (t >= b.t) { const k = pulse(t, b.t, 0.6), sx = X(b.x, 0), sy = Y(b.x, strandY(b.x, b.s, ph)); glow(sx, sy, (8 + 10 * k) * z, P.DE1, P.DE3, 0.5 + 0.5 * k); }
  return { ph, rp };
}
