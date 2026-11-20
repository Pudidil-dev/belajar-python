// VES — the patient's cerebral arteries and the one aneurysm, in HEAD's frame (mm; x = patient's left, y = anterior,
// z = superior). Centrelines with radii (≈ adult calibres, drawn 1.3× thicker so the thin branches read at phone size):
//   internal carotid arteries (cervical → petrous → cavernous → supraclinoid), middle cerebral arteries (M1 →
//   bifurcation → superior and inferior M2 trunks → M3 branches), anterior cerebral arteries (A1, the anterior
//   communicating artery, A2, pericallosal, callosomarginal), vertebral arteries → basilar artery → superior
//   cerebellar and posterior cerebral arteries, with the posterior communicating arteries closing the circle of Willis.
// The aneurysm: one unruptured saccular aneurysm on the RIGHT MCA bifurcation — a narrow neck and a rounder dome
// pointing lateral, a little forward and down. It is part of the model from the first frame: it never grows or moves.
// Uses: VES.sd (signed distance to the lumen, for HEAD.hu: the lumen is blood, enhanced while the iodine bolus passes);
// VES.render (a z-buffered sphere-splat renderer: blood red, contrast violet, the workstation's vessel rendering in
// ivory; cel bands by ordered dither; a dark rim where vessels cross) and VES.ring (the amber editorial annotation).
(() => {
const VES = globalThis.VES = { NAME: 'VES' };
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const RS = 1.3;                                          // drawing scale for the radii
VES.RS = RS;
// ---------- the tree (left side; the right side is mirrored) ----------
const L = {
  ica: [[24, 2, -100, 2.6], [25, 0, -80, 2.6], [25, -2, -62, 2.5], [24, -3, -50, 2.4], [21, 2, -42, 2.3], [17, 9, -36, 2.2], [14, 12, -30, 2.1],
    [13, 16, -27, 2.1], [13, 22, -24, 2.0], [13, 23, -19, 2.0], [13, 19, -14, 1.9], [12.5, 16, -10, 1.9]],
  m1: [[12.5, 16, -10, 1.55], [18, 17, -9.5, 1.5], [24, 17.5, -9, 1.45], [30, 16.5, -8, 1.4], [34, 15, -7, 1.35]],
  m2s: [[34, 15, -7, 1.15], [37, 13, -2, 1.1], [39, 9, 5, 1.05], [41, 3, 12, 1.0], [43, -4, 19, 0.95], [46, -12, 26, 0.9], [50, -20, 33, 0.8]],
  m2i: [[34, 15, -7, 1.1], [38, 12, -10, 1.05], [42, 5, -11, 1.0], [46, -4, -10, 0.95], [49, -14, -8, 0.9], [52, -26, -5, 0.8]],
  m3f: [[39, 9, 5, 0.85], [44, 18, 12, 0.8], [48, 27, 20, 0.75], [50, 33, 30, 0.7]],
  m3p: [[43, -4, 19, 0.8], [48, -2, 28, 0.75], [51, -4, 37, 0.7]],
  m3t: [[46, -4, -10, 0.8], [51, 1, -15, 0.75], [53, 6, -19, 0.7]],
  a1: [[12.5, 16, -10, 1.15], [9, 20, -9, 1.1], [5, 24, -8, 1.05], [2, 26, -7.5, 1.0]],
  a2: [[2, 26, -7.5, 1.0], [2.6, 31, -2, 1.0], [2.8, 36, 6, 0.95], [2.8, 39, 15, 0.95], [2.8, 37, 24, 0.9], [2.8, 30, 31, 0.9], [2.8, 18, 36, 0.85],
    [2.8, 4, 38, 0.8], [2.8, -10, 37, 0.8], [2.8, -24, 33, 0.7]],
  cm: [[2.8, 37, 24, 0.75], [3, 42, 34, 0.7], [3, 36, 46, 0.65], [3, 20, 54, 0.6]],
  va: [[12, -24, -100, 1.7], [13, -26, -80, 1.7], [12, -28, -62, 1.65], [9, -24, -46, 1.6], [5, -14, -38, 1.6], [1.5, -8, -34, 1.6]],
  p1: [[0, 2.5, -13, 1.2], [5, 2, -12.5, 1.15], [10, 1, -12, 1.1]],
  pcom: [[13, 19, -14, 0.65], [12.5, 13, -13, 0.65], [11, 6, -12.5, 0.65], [10, 1, -12, 0.65]],
  p2: [[10, 1, -12, 1.1], [15, -6, -11.5, 1.05], [20, -14, -10.5, 1.0], [23, -24, -9, 1.0], [24, -36, -6, 0.95], [22, -48, -3, 0.9], [18, -60, 0, 0.85], [13, -72, 4, 0.75]],
  sca: [[0, 1.5, -16, 0.75], [6, -1, -17, 0.75], [12, -7, -18, 0.75], [17, -16, -19, 0.7], [19, -28, -21, 0.7], [17, -40, -22, 0.65]],
};
const MID = {
  ba: [[1.5, -8, -34, 1.6], [0, -7, -33, 1.7], [0, -4, -27, 1.7], [0, -1, -21, 1.65], [0, 1.5, -16, 1.6], [0, 2.5, -13, 1.6]],
  ba2: [[-1.5, -8, -34, 1.6], [0, -7, -33, 1.7]],
  acom: [[2, 26, -7.5, 0.7], [0, 26.2, -7.5, 0.7], [-2, 26, -7.5, 0.7]],
};
// kind: 0 carotid/basilar trunks, 1 the right MCA (the parent artery and its branches), 2 the aneurysm, 3 other branches
const SEGS = [];
const add = (name, pts, side, kind, parent) => SEGS.push({ name, side, kind, parent, raw: pts });
for (const s of [1, -1]) {
  const side = s > 0 ? 'L' : 'R', mir = p => p.map(([x, y, z, r]) => [s * x, y, z, r]);
  add('ica' + side, mir(L.ica), side, 0, null);
  add('m1' + side, mir(L.m1), side, s < 0 ? 1 : 3, 'ica' + side);
  add('m2s' + side, mir(L.m2s), side, s < 0 ? 1 : 3, 'm1' + side);
  add('m2i' + side, mir(L.m2i), side, s < 0 ? 1 : 3, 'm1' + side);
  add('m3f' + side, mir(L.m3f), side, 3, 'm2s' + side);
  add('m3p' + side, mir(L.m3p), side, 3, 'm2s' + side);
  add('m3t' + side, mir(L.m3t), side, 3, 'm2i' + side);
  add('a1' + side, mir(L.a1), side, 3, 'ica' + side);
  add('a2' + side, mir(L.a2), side, 3, 'a1' + side);
  add('cm' + side, mir(L.cm), side, 3, 'a2' + side);
  add('va' + side, mir(L.va), side, 0, null);
  add('p1' + side, mir(L.p1), side, 3, 'ba');
  add('pcom' + side, mir(L.pcom), side, 3, 'ica' + side);
  add('p2' + side, mir(L.p2), side, 3, 'p1' + side);
  add('sca' + side, mir(L.sca), side, 3, 'ba');
}
add('ba', MID.ba, 'M', 0, 'vaL'); add('ba2', MID.ba2, 'M', 0, 'vaR'); add('acom', MID.acom, 'M', 3, 'a1L');
// ---------- the aneurysm (right MCA bifurcation) ----------
const BIF = [-34, 15, -7];
const dn = (() => { const d = [-0.74, 0.36, -0.57], l = Math.hypot(...d); return d.map(v => v / l); })();
const AN = VES.AN = { bif: BIF, dir: dn, rNeck: 1.55, neckLen: 1.7, rDome: 3.0 };
AN.neck = BIF.map((v, i) => v + dn[i] * AN.neckLen);
AN.c = BIF.map((v, i) => v + dn[i] * (AN.neckLen + AN.rDome * 0.92));
AN.cDraw = BIF.map((v, i) => v + dn[i] * (AN.neckLen + AN.rDome * 0.92) * RS);
// ---------- smoothing: Catmull–Rom through the control points, resampled every `step` mm ----------
function resample(pts, step) {
  const out = [];
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]), n = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push(p1.map((_, j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}
// ---------- build: dense centrelines with arc length from the root (s, mm), spheres, capsule grid ----------
const near = (p, pts) => { let best = 1e9, bs = 0, bi = 0; pts.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]); if (d < best) { best = d; bi = i; } }); return bi; };
VES.init = () => {
  const byName = {};
  for (const sg of SEGS) {
    sg.pts = resample(sg.raw, 0.35);
    sg.s = new Float32Array(sg.pts.length);
    byName[sg.name] = sg;
  }
  // arc length from the roots (ICA / vertebral origins), in tree order (parents first: SEGS is in that order except ba)
  const done = new Set(), order = [];
  const visit = sg => { if (done.has(sg.name)) return; if (sg.parent && byName[sg.parent]) visit(byName[sg.parent]); done.add(sg.name); order.push(sg); };
  SEGS.forEach(visit);
  for (const sg of order) {
    let s0 = 0;
    if (sg.parent && byName[sg.parent]) { const par = byName[sg.parent], i = near(sg.pts[0], par.pts); s0 = par.s[i]; }
    let acc = s0; sg.s[0] = acc;
    for (let i = 1; i < sg.pts.length; i++) { const a = sg.pts[i - 1], b = sg.pts[i]; acc += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); sg.s[i] = acc; }
  }
  // the aneurysm: a short neck (radius grows to the dome) and the dome, with the right M1's arc length at the bifurcation
  const m1R = byName.m1R, sB = m1R.s[m1R.s.length - 1];
  const an = { name: 'aneurysm', side: 'R', kind: 2, pts: [], s: [] };
  // drawn as the true sac scaled about the bifurcation by the drawing scale (so the neck stays visible next to the
  // thickened vessels): sphere centres at BIF + dir · d · RS, radii × RS in the renderer
  for (let k = 0; k <= 12; k++) {
    const q = k / 12, d = q * (AN.neckLen + AN.rDome * 0.92), r = q < 0.45 ? AN.rNeck * (1 + 0.15 * q) : null;
    const p = BIF.map((v, i) => v + dn[i] * d * RS);
    if (r) { an.pts.push([...p, r]); an.s.push(sB + d); }
  }
  an.pts.push([...AN.cDraw, AN.rDome]); an.s.push(sB + AN.neckLen + AN.rDome);
  an.s = Float32Array.from(an.s); SEGS.push(an); byName.aneurysm = an;
  VES.byName = byName; VES.SEGS = SEGS;
  // spheres for the renderer
  const SP = []; let smax = 0;
  for (const sg of SEGS) sg.pts.forEach((p, i) => { SP.push([p[0], p[1], p[2], p[3] * RS, sg.kind, sg.s[i], SEGS.indexOf(sg)]); smax = Math.max(smax, sg.s[i]); });
  VES.SP = SP; VES.SMAX = smax; VES.S_BIF = sB;
  // capsule grid (4 mm cells) for the signed distance
  const G = VES.G = { x0: -70, y0: -90, z0: -110, cs: 4, nx: 35, ny: 40, nz: 42, cells: new Map() };
  const cap = [];
  for (const sg of SEGS) {
    if (sg.kind === 2) continue;
    for (let i = 1; i < sg.pts.length; i++) cap.push([sg.pts[i - 1], sg.pts[i]]);
  }
  cap.forEach(([a, b], ci) => {
    const r = Math.max(a[3], b[3]) + 0.6;
    const lo = [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r], hi = [Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r];
    for (let k = Math.floor((lo[2] - G.z0) / G.cs); k <= Math.floor((hi[2] - G.z0) / G.cs); k++)
      for (let j = Math.floor((lo[1] - G.y0) / G.cs); j <= Math.floor((hi[1] - G.y0) / G.cs); j++)
        for (let i = Math.floor((lo[0] - G.x0) / G.cs); i <= Math.floor((hi[0] - G.x0) / G.cs); i++) {
          const key = (k * G.ny + j) * G.nx + i; if (!G.cells.has(key)) G.cells.set(key, []); G.cells.get(key).push(ci);
        }
  });
  VES.CAP = cap; VES.ready = true;
};
// ---------- signed distance to the lumen (mm, negative inside; real calibres, not the drawing scale) ----------
const capSD = (x, y, z, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L2 = dx * dx + dy * dy + dz * dz;
  const t = L2 > 0 ? clamp(((x - a[0]) * dx + (y - a[1]) * dy + (z - a[2]) * dz) / L2) : 0;
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy, z - a[2] - t * dz) - (a[3] + (b[3] - a[3]) * t);
};
VES.anSD = (x, y, z) => {
  const dome = Math.hypot(x - AN.c[0], y - AN.c[1], z - AN.c[2]) - AN.rDome;
  const neck = capSD(x, y, z, [...BIF, AN.rNeck], [...AN.neck, AN.rNeck * 1.1]);
  const k = 1.0, h = Math.max(k - Math.abs(dome - neck), 0) / k;
  return Math.min(dome, neck) - h * h * k * 0.25;
};
VES.sd = (x, y, z) => {
  if (!VES.ready) return 9;
  const G = VES.G, i = Math.floor((x - G.x0) / G.cs), j = Math.floor((y - G.y0) / G.cs), k = Math.floor((z - G.z0) / G.cs);
  let d = 9;
  if (i >= 0 && j >= 0 && k >= 0 && i < G.nx && j < G.ny && k < G.nz) {
    const cell = G.cells.get((k * G.ny + j) * G.nx + i);
    if (cell) for (const ci of cell) { const [a, b] = VES.CAP[ci], v = capSD(x, y, z, a, b); if (v < d) d = v; }
  }
  if (Math.abs(x - AN.c[0]) < 8 && Math.abs(y - AN.c[1]) < 8 && Math.abs(z - AN.c[2]) < 8) d = Math.min(d, VES.anSD(x, y, z));
  return d;
};
// ---------- view (same convention as SKULL.view: yaw about z, then pitch, then roll; X right, Y up, D toward viewer) ----------
VES.view = o => {
  const cy = Math.cos(o.yaw || 0), sy = Math.sin(o.yaw || 0), cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0), cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0);
  return (x, y, z) => {
    const x1 = x * cy + y * sy, d1 = -x * sy + y * cy;
    const d2 = d1 * cp + z * sp, y2 = -d1 * sp + z * cp;
    return [x1 * cr - y2 * sr, x1 * sr + y2 * cr, d2];
  };
};
VES.proj = (o, x, y, z) => { const [X, Y, D] = VES.view(o)(x - (o.ox || 0), y - (o.oy || 0), z - (o.oz || 0)); return [o.cx + o.s * X, o.cy - o.s * Y, D]; };
// ---------- ramps ----------
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
let RAMPS = null;
const ramps = () => RAMPS || (RAMPS = {
  blood: ['d1', 'd2', 'd3', 'd4', 'd5', 'p3'].map(k => hex(globalThis.P[k])),
  contrast: ['v0', 'v1', 'v2', 'v3', 'w'].map(k => hex(globalThis.P[k])),
  vr: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'w'].map(k => hex(globalThis.P[k])),
  gray: ['g2', 'g4', 'g6', 'g8', 'ga', 'gb', 'w'].map(k => hex(globalThis.P[k])),
  amber: ['a0', 'a1', 'a2', 'w'].map(k => hex(globalThis.P[k])),
  pulse: hex(globalThis.P.d4), rimB: hex(globalThis.P.d0), rimV: hex(globalThis.P.v0), rimQ: hex(globalThis.P.q0),
});
VES.ramps = () => ramps();
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bay = (x, y) => BAY[(y & 3) << 2 | (x & 3)];
let ZB = null, ID = null, NXb = null, NYb = null, NDb = null, FB = null;
// o = {cx, cy, s (px/mm), yaw, pitch, roll, ox/oy/oz (view centre in head mm),
//      mode: 'blood' | 'vr' | 'gray', fill(s, kind) → 0..1 contrast in the lumen (violet), pulse(s) → 0..1 brightening,
//      show(sphere) → bool, zb (a depth buffer to test against, e.g. SKULL.last.ZB), clipD (drop spheres nearer than this),
//      light, amb, gain, an: 0..1 aneurysm tint (amber), rim (true)}
VES.render = (img, o) => {
  const W = img.width, H = img.height, data = img.data, R = ramps();
  if (!ZB || ZB.length !== W * H) { ZB = new Float32Array(W * H); ID = new Int32Array(W * H); NXb = new Float32Array(W * H); NYb = new Float32Array(W * H); NDb = new Float32Array(W * H); FB = new Float32Array(W * H); }
  const ext = o.zb || null;
  ZB.fill(-1e9); ID.fill(-1);
  const view = VES.view(o), s = o.s, ox = o.ox || 0, oy = o.oy || 0, oz = o.oz || 0;
  let bx0 = W, by0 = H, bx1 = -1, by1 = -1;
  const SP = VES.SP, show = o.show, clipD = o.clipD ?? 1e9;
  for (let m = 0; m < SP.length; m++) {
    const sp = SP[m];
    if (show && !show(sp, m)) continue;
    const [X, Y, D] = view(sp[0] - ox, sp[1] - oy, sp[2] - oz);
    if (D > clipD) continue;
    const sx = o.cx + s * X, sy = o.cy - s * Y, Rr = Math.max(0.6, sp[3] * s);
    const x0 = Math.max(0, Math.floor(sx - Rr)), x1 = Math.min(W - 1, Math.ceil(sx + Rr)), y0 = Math.max(0, Math.floor(sy - Rr)), y1 = Math.min(H - 1, Math.ceil(sy + Rr));
    if (x1 < x0 || y1 < y0) continue;
    const R2 = Rr * Rr;
    for (let yy = y0; yy <= y1; yy++) {
      const dy = yy + 0.5 - sy;
      for (let xx = x0; xx <= x1; xx++) {
        const dx = xx + 0.5 - sx, q = dx * dx + dy * dy;
        if (q > R2) continue;
        const dz = Math.sqrt(R2 - q), dd = D + dz / s, p = yy * W + xx;
        if (dd <= ZB[p]) continue;
        if (ext && dd <= ext[p]) continue;
        ZB[p] = dd; ID[p] = m; NXb[p] = dx / Rr; NYb[p] = -dy / Rr; NDb[p] = dz / Rr;
      }
    }
    if (x0 < bx0) bx0 = x0; if (y0 < by0) by0 = y0; if (x1 > bx1) bx1 = x1; if (y1 > by1) by1 = y1;
  }
  if (bx1 < 0) return null;
  const Lt = o.light || [-0.45, 0.55, 0.7], ln = Math.hypot(...Lt), lx = Lt[0] / ln, ly = Lt[1] / ln, ld = Lt[2] / ln;
  const amb = o.amb ?? 0.08, gain = o.gain ?? 0.92, mode = o.mode || 'blood', fill = o.fill, pulse = o.pulse, anT = o.an || 0;
  const base = mode === 'vr' ? R.vr : mode === 'gray' ? R.gray : R.blood, rim = mode === 'vr' ? R.rimQ : R.rimB;
  for (let yy = by0; yy <= by1; yy++) for (let xx = bx0; xx <= bx1; xx++) {
    const p = yy * W + xx, m = ID[p]; if (m < 0) continue;
    const sp = SP[m], b = bay(xx, yy), i4 = p * 4;
    if (o.fadeZ && sp[2] < o.fadeZ[1] && (sp[2] - o.fadeZ[0]) / (o.fadeZ[1] - o.fadeZ[0]) < b) continue;
    // a dark rim where this pixel sits clearly behind a neighbour (crossing vessels) or at the silhouette
    let edge = false;
    const z0 = ZB[p], th = 1.2 / Math.max(0.5, s) + 0.8;
    if (o.rim !== false) {
      if (xx === 0 || ID[p - 1] < 0 || xx === W - 1 || ID[p + 1] < 0 || yy === 0 || ID[p - W] < 0 || yy === H - 1 || ID[p + W] < 0) edge = NDb[p] < 0.42;
      if (!edge && ((xx > 0 && ZB[p - 1] - z0 > th && SP[ID[p - 1]][6] !== sp[6]) || (xx < W - 1 && ZB[p + 1] - z0 > th && SP[ID[p + 1]][6] !== sp[6]) ||
        (yy > 0 && ZB[p - W] - z0 > th && SP[ID[p - W]][6] !== sp[6]) || (yy < H - 1 && ZB[p + W] - z0 > th && SP[ID[p + W]][6] !== sp[6]))) edge = true;
    }
    const lam = Math.max(0, NXb[p] * lx + NYb[p] * ly + NDb[p] * ld);
    let v = (amb + 0.95 * lam) * gain;
    if (pulse) v += 0.45 * pulse(sp[5], sp[4]);
    const spec = Math.pow(Math.max(0, 2 * lam * NDb[p] - ld), 18);
    let ramp = base, f = 0;
    if (fill) { f = fill(sp[5], sp[4], sp); if (f > b) ramp = R.contrast; }
    if (anT > 0 && sp[4] === 2 && anT > b) ramp = R.amber;
    let col;
    if (edge) col = ramp === R.contrast ? R.rimV : rim;
    else {
      const n = ramp.length - (ramp === R.blood ? 1 : 0);
      const k = clamp(Math.round(clamp(v) * (n - 1) + b - 0.5), 0, n - 1);
      col = spec > 0.55 && v > 0.5 ? ramp[ramp.length - 1] : ramp[k];
    }
    data[i4] = col[0]; data[i4 + 1] = col[1]; data[i4 + 2] = col[2]; data[i4 + 3] = 255;
  }
  VES.last = { o, ZB, ID, W, H, bx0, by0, bx1, by1 };
  return VES.last;
};
// screen position and radius of the aneurysm dome for a view
VES.anScreen = o => { const [x, y, D] = VES.proj(o, ...AN.cDraw); return { x, y, D, r: AN.rDome * RS * o.s }; };
// the amber editorial ring: a pixel circle drawn on clockwise from 12 o'clock (p = 0..1), 2 px thick, with a gap that
// slowly turns (so it never reads as light coming from the aneurysm)
VES.ring = (c, x, y, r, p, t = 0, col = 'a1') => {
  if (p <= 0) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = globalThis.P[col] || col;
  const n = Math.max(24, Math.round(r * 7)), gapA = (t * 0.6) % 1;
  for (let k = 0; k < n * p; k++) {
    const q = k / n, an = -Math.PI / 2 + q * Math.PI * 2;
    if (p >= 1 && Math.abs(((q - gapA + 1) % 1) - 0.5) > 0.47) continue;
    for (const dr of [0, 1]) c.fillRect(Math.round(x + Math.cos(an) * (r + dr)), Math.round(y + Math.sin(an) * (r + dr)), 1, 1);
  }
  c.restore();
};
})();
