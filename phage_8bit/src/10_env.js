'use strict';
// ============================================================================
// THE BIOFLUID: a flat deep-navy ground, suspended matter in three parallax
// layers (Kurzgesagt depth: shift ~ d, scale ~ z^d) and far, out-of-focus
// bacteria. Every motion here is periodic in the 72 s loop. The parallax
// camera absorbs the world offset between the opening hero (above the target
// cell) and the progeny of the last shot (above a new cell), so the last
// frame flows straight into frame one.
// ============================================================================
const LOOP_SHIFT = [-300, -420];
function parC(cam, t) { const k = t / DUR; return [cam.cx - LOOP_SHIFT[0] * k, cam.cy - LOOP_SHIFT[1] * k]; }
const imod = (a, n) => ((a % n) + n) % n;
const FLUIDL = [
  { d: 0.25, S: 66, N: 13, kx: 0, ky: 0, rmin: 2.2, rmax: 4.8, c: 'N2', hi: 'N3', p: 0.5, seed: 11 },
  { d: 0.5, S: 46, N: 15, kx: 1, ky: 0, rmin: 0.9, rmax: 2.0, c: 'N3', hi: 'N4', p: 0.62, seed: 23 },
  { d: 0.85, S: 38, N: 17, kx: 1, ky: -1, rmin: 0.5, rmax: 1.1, c: 'N4', hi: 'N6', p: 0.72, seed: 37 },
];
function fluidLayer(L, cam, pc, t, lvMul) {
  const zl = Math.pow(cam.z, L.d), lcx = pc[0] * L.d, lcy = pc[1] * L.d;
  const span = L.N * L.S, dx = L.kx * span * t / DUR, dy = L.ky * span * t / DUR;
  const qx0 = lcx - dx - cam.ax / zl - 8, qx1 = lcx - dx + (W - cam.ax) / zl + 8;
  const qy0 = lcy - dy - cam.ay / zl - 8, qy1 = lcy - dy + (H - cam.ay) / zl + 8;
  const i0 = Math.floor(qx0 / L.S), i1 = Math.floor(qx1 / L.S), j0 = Math.floor(qy0 / L.S), j1 = Math.floor(qy1 / L.S);
  const c = P[L.c], hi = P[L.hi];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const a = imod(i, L.N), b = imod(j, L.N);
    if (hash3(a, b, L.seed) > L.p) continue;
    const h1 = hash3(a, b, L.seed + 1), h2 = hash3(a, b, L.seed + 2), h3 = hash3(a, b, L.seed + 3), h4 = hash3(a, b, L.seed + 4);
    const k1 = 4 + Math.floor(h4 * 7), k2 = 5 + Math.floor(h3 * 6);
    const qx = (i + h1) * L.S + 2.2 * wob(t, k1, h2 * 6.3), qy = (j + h2) * L.S + 2.2 * wob(t, k2, h1 * 6.3);
    const sx = (qx + dx - lcx) * zl + cam.ax, sy = (qy + dy - lcy) * zl + cam.ay;
    const r = lerp(L.rmin, L.rmax, h3) * zl;
    if (sx < -r - 2 || sx > W + r + 2 || sy < -r - 2 || sy > H + r + 2) continue;
    if (r < 0.8) { pset(sx, sy, c); continue; }
    disc(sx, sy, r, c, lvMul);
    if (r >= 1.6) disc(sx - r * 0.3, sy - r * 0.3, r * 0.45, hi, lvMul);
  }
}
// far bacteria: dim capsules, barely above the ground (atmospheric depth)
const FARB = { d: 0.36, S: 330, N: 6, seed: 71 };
function capsulePts(cx, cy, hl, r, a, n) { // world capsule outline (axis along local y)
  const out = [], hc = Math.max(0, hl - r);
  for (let i = 0; i <= n; i++) { const th = Math.PI + Math.PI * i / n; const q = rot(Math.cos(th) * r, -hc + Math.sin(th) * r, a); out.push(cx + q[0], cy + q[1]); }
  for (let i = 0; i <= n; i++) { const th = Math.PI * i / n; const q = rot(Math.cos(th) * r, hc + Math.sin(th) * r, a); out.push(cx + q[0], cy + q[1]); }
  return out;
}
function farBacteria(cam, pc, t) {
  const L = FARB, zl = Math.pow(cam.z, 0.18) * 0.5, lcx = pc[0] * L.d, lcy = pc[1] * L.d;
  const qx0 = lcx - cam.ax / zl - 200, qx1 = lcx + (W - cam.ax) / zl + 200, qy0 = lcy - cam.ay / zl - 200, qy1 = lcy + (H - cam.ay) / zl + 200;
  for (let j = Math.floor(qy0 / L.S); j <= Math.floor(qy1 / L.S); j++) for (let i = Math.floor(qx0 / L.S); i <= Math.floor(qx1 / L.S); i++) {
    const a = imod(i, L.N), b = imod(j, L.N);
    if (hash3(a, b, L.seed) > 0.42) continue;
    const cx = (i + 0.2 + 0.6 * hash3(a, b, 2)) * L.S + 6 * wob(t, 2 + a, b), cy = (j + 0.2 + 0.6 * hash3(a, b, 3)) * L.S + 6 * wob(t, 3 + b, a);
    const ang = hash3(a, b, 4) * Math.PI + 0.08 * wob(t, 2, a + b), hl = 95 + 40 * hash3(a, b, 5), r = 36 + 10 * hash3(a, b, 6);
    const pts = capsulePts(cx, cy, hl, r, ang, 10).map((v, k) => k % 2 ? (v - lcy) * zl + cam.ay : (v - lcx) * zl + cam.ax);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let k = 0; k < pts.length; k += 2) { x0 = Math.min(x0, pts[k]); x1 = Math.max(x1, pts[k]); y0 = Math.min(y0, pts[k + 1]); y1 = Math.max(y1, pts[k + 1]); }
    if (!onScreen(x0, y0, x1, y1, 2)) continue;
    poly(pts, P.N1, 0.75);
  }
}
function drawFluid(cam, t, opt) {
  opt = opt || {};
  rect(0, 0, W, H, P.BG);
  const pc = parC(cam, t);
  if (opt.far !== false && cam.z < 1.05) farBacteria(cam, pc, t);
  for (const L of FLUIDL) fluidLayer(L, cam, pc, t, opt.lv);
}
