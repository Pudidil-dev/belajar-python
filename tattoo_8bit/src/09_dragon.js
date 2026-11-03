'use strict';
// ============================================================================
// THE TATTOO: a black Eastern-style dragon in tattoo linework (arm-world px,
// 40 px ≈ 1 cm). One serpentine body winding down the forearm in an S, outlined
// by two edges, with scales across it and spines along its back; a horned head
// with an open mouth, teeth, an eye, whiskers and a flame-like mane; two clawed
// legs; a flame-tipped tail. It is built once into an ink raster at twice the
// resolution; everything that shows the tattoo (the arm, the top of the skin
// block, the ink under the cut) samples this one raster, so the design is
// identical in every shot.
// ============================================================================
const DRG = { x0: 30, y0: 110, w: 300, h: 340, k: 2 };                 // raster window (arm px) and supersampling
const DRG_RW = DRG.w * DRG.k, DRG_RH = DRG.h * DRG.k;
const INK = new Float32Array(DRG_RW * DRG_RH);
// the body's centreline, head end first: right along the top, down the right side, back left, down, and the tail rising on the right
const DRG_CTRL = [136, 188, 176, 200, 214, 226, 240, 264, 240, 304, 214, 334, 166, 348, 122, 360, 98, 382, 108, 406, 154, 416, 212, 408, 252, 388, 276, 358, 286, 326];
const DRG_C = (() => {
  const d = spline(DRG_CTRL, 16, false), pts = []; let s = 0;
  for (let i = 0; i < d.length; i += 2) { if (i) s += Math.hypot(d[i] - d[i - 2], d[i + 1] - d[i - 1]); pts.push([d[i], d[i + 1], s]); }
  pts.forEach(p => p[2] /= s); return pts;
})();
// a point on the body at arc fraction u: position, unit tangent (toward the tail) and normal (the back is on the +n side)
function drgAt(u) {
  u = clamp(u, 0, 1); let i = 1; while (i < DRG_C.length - 1 && DRG_C[i][2] < u) i++;
  const a = DRG_C[i - 1], b = DRG_C[i], k = (u - a[2]) / Math.max(1e-9, b[2] - a[2]), x = lerp(a[0], b[0], k), y = lerp(a[1], b[1], k);
  let tx = b[0] - a[0], ty = b[1] - a[1]; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
  return { x, y, tx, ty, nx: ty, ny: -tx };
}
const DRG_W = [[0, 13], [0.12, 16], [0.45, 15.5], [0.75, 11], [1, 2]];
function drgW(u) { let i = 1; while (i < DRG_W.length - 1 && DRG_W[i][0] < u) i++; const a = DRG_W[i - 1], b = DRG_W[i]; return lerp(a[1], b[1], clamp((u - a[0]) / (b[0] - a[0]), 0, 1)); }
const drgEdge = (u, side) => { const p = drgAt(u), w = drgW(u); return [p.x + p.nx * w * side, p.y + p.ny * w * side]; };
// ---------------------------------------------------------------- rasterising: tapered strokes and filled shapes (max-blended)
function inkSeg(ax, ay, bx, by, w0, w1) {
  const K = DRG.k, wm = Math.max(w0, w1) + 1;
  const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - wm - DRG.x0) * K)), i1 = Math.min(DRG_RW - 1, Math.ceil((Math.max(ax, bx) + wm - DRG.x0) * K));
  const j0 = Math.max(0, Math.floor((Math.min(ay, by) - wm - DRG.y0) * K)), j1 = Math.min(DRG_RH - 1, Math.ceil((Math.max(ay, by) + wm - DRG.y0) * K));
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
  for (let j = j0; j <= j1; j++) {
    const y = DRG.y0 + (j + 0.5) / K;
    for (let i = i0; i <= i1; i++) {
      const x = DRG.x0 + (i + 0.5) / K, u = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1), d = Math.hypot(x - ax - u * dx, y - ay - u * dy);
      const a = clamp((lerp(w0, w1, u) - d) * K + 0.5, 0, 1), k = j * DRG_RW + i; if (a > INK[k]) INK[k] = a;
    }
  }
}
function inkPath(pts, w0, w1) {
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let s = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); inkSeg(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], lerp(w0, w1, s / L), lerp(w0, w1, (s + l) / L)); s += l; }
}
const inkCurve = (ctrl, w0, w1) => { const d = spline(ctrl.flat(), 8, false), pts = []; for (let i = 0; i < d.length; i += 2) pts.push([d[i], d[i + 1]]); inkPath(pts, w0, w1); };
function inkPoly(pts) {
  const K = DRG.k, xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const i0 = Math.max(0, Math.floor((Math.min(...xs) - DRG.x0) * K)), i1 = Math.min(DRG_RW - 1, Math.ceil((Math.max(...xs) - DRG.x0) * K));
  const j0 = Math.max(0, Math.floor((Math.min(...ys) - DRG.y0) * K)), j1 = Math.min(DRG_RH - 1, Math.ceil((Math.max(...ys) - DRG.y0) * K));
  for (let j = j0; j <= j1; j++) {
    const y = DRG.y0 + (j + 0.5) / K;
    for (let i = i0; i <= i1; i++) {
      const x = DRG.x0 + (i + 0.5) / K; let inside = false;
      for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) { const [xa, ya] = pts[a], [xb, yb] = pts[b]; if ((ya > y) !== (yb > y) && x < (xb - xa) * (y - ya) / (yb - ya) + xa) inside = !inside; }
      if (inside) INK[j * DRG_RW + i] = 1;
    }
  }
}
// ---------------------------------------------------------------- the dragon
(function drawDragon() {
  const N = 220, edgeL = [], edgeR = [];
  for (let k = 0; k <= N; k++) { const u = k / N; edgeL.push(drgEdge(u, 1)); edgeR.push(drgEdge(u, -1)); }
  inkPath(edgeL, 2.1, 1.1); inkPath(edgeR, 2.1, 1.1);
  // scales: two staggered rows of small crescents, each bulging toward the tail
  let row = 0;
  for (let u = 0.035; u < 0.93; u += 0.021, row++) {
    const p = drgAt(u), w = drgW(u), o = (row % 2 ? 0.42 : -0.42) * w, rs = 0.34 * w, cx = p.x + p.nx * o, cy = p.y + p.ny * o, pts = [];
    for (let k = 0; k <= 8; k++) { const th = -Math.PI / 2 + Math.PI * k / 8; pts.push([cx + rs * (Math.cos(th) * p.tx + Math.sin(th) * p.nx), cy + rs * (Math.cos(th) * p.ty + Math.sin(th) * p.ny)]); }
    inkPath(pts, 1.0, 1.0);
  }
  // a crest of spikes along the back, leaning toward the tail
  for (let u = 0.05; u < 0.9; u += 0.045) {
    const p = drgAt(u), w = drgW(u), h = 7 + 4 * (1 - u), b0 = drgEdge(u - 0.012, 1), b1 = drgEdge(u + 0.012, 1);
    inkPoly([b0, b1, [p.x + p.nx * (w + h) + p.tx * 5, p.y + p.ny * (w + h) + p.ty * 5]]);
  }
  // the head at the body's front end, in its own frame: f forward (out of the body), d "down" on screen
  const h0 = drgAt(0), f = [-h0.tx, -h0.ty]; let D = [-f[1], f[0]]; if (D[1] < 0) D = [f[1], -f[0]];
  const HS = 1.45, H = (lx, ly) => [h0.x + (f[0] * lx + D[0] * ly) * HS, h0.y + (f[1] * lx + D[1] * ly) * HS];
  const path = (arr, w0, w1) => inkCurve(arr.map(([a, b]) => H(a, b)), w0 * 1.2, (w1 === undefined ? w0 : w1) * 1.2);
  const poly = arr => inkPoly(arr.map(([a, b]) => H(a, b)));
  path([[-4, -12], [8, -15], [22, -12], [34, -7], [42, -3], [41, 1], [30, 2], [17, 1]], 1.9);         // brow, snout, upper lip
  path([[17, 1], [28, 6], [37, 9], [33, 12], [18, 11], [4, 12], [-4, 12]], 1.9);                     // lower jaw (the mouth is open)
  for (const x of [22, 28, 34]) poly([[x - 1.6, 2], [x + 1.6, 2], [x, 5.2]]);                         // teeth
  for (const x of [24, 31]) poly([[x - 1.5, 7], [x + 1.5, 7.4], [x, 4]]);
  poly([[11, -8], [13, -10], [17, -9.5], [18, -7], [15, -5.6], [12, -6]]);                            // eye
  path([[6, -12], [14, -11.5], [23, -9]], 1.5);                                                        // brow ridge
  poly([[36, -5.2], [38.4, -4.6], [37.4, -3]]);                                                        // nostril
  path([[2, -13], [-8, -22], [-20, -29], [-33, -31]], 2.4, 0.7); path([[-11, -24], [-13, -34]], 1.5, 0.5);   // horns
  path([[-2, -9], [-14, -16], [-28, -19]], 2.0, 0.6);
  for (const [a, b, c] of [[[-3, -10], [-3, -4], [-21, -14]], [[-3, -4], [-3, 2], [-23, -3]], [[-3, 2], [-3, 8], [-21, 9]], [[-2, 8], [-2, 12], [-16, 19]]]) poly([a, b, c]);   // mane
  path([[40, 0], [52, 4], [60, 14], [58, 26], [50, 34]], 1.25, 0.45);                                // whiskers
  path([[32, -5], [44, -14], [56, -16], [64, -12]], 1.15, 0.45);
  // two clawed legs on the belly side
  for (const u of [0.17, 0.6]) {
    const p = drgAt(u), w = drgW(u), base = [p.x - p.nx * (w - 2), p.y - p.ny * (w - 2)], c35 = Math.cos(0.6), s35 = Math.sin(0.6);
    const dir = [-p.nx * c35 + p.tx * s35, -p.ny * c35 + p.ty * s35], knee = [base[0] + dir[0] * 15, base[1] + dir[1] * 15];
    const d2 = [dir[0] * 0.77 - p.tx * 0.64, dir[1] * 0.77 - p.ty * 0.64], foot = [knee[0] + d2[0] * 12, knee[1] + d2[1] * 12];
    inkPath([base, knee], 3.8, 3.0); inkPath([knee, foot], 3.0, 2.2);
    for (const a of [-0.9, -0.15, 0.6]) { const ca = Math.cos(a), sa = Math.sin(a), cd = [d2[0] * ca - d2[1] * sa, d2[0] * sa + d2[1] * ca]; inkPath([foot, [foot[0] + cd[0] * 8, foot[1] + cd[1] * 8]], 1.6, 0.4); }
  }
  // the flame at the tip of the tail
  const e = drgAt(1), T = (a, b) => [e.x + e.tx * a + e.nx * b, e.y + e.ty * a + e.ny * b];
  inkCurve([T(0, 0), T(6, 4), T(12, 2), T(17, 7)], 2.2, 0.5); inkCurve([T(0, 0), T(8, -2), T(14, -6), T(21, -4)], 2.2, 0.5); inkCurve([T(0, 0), T(5, 0), T(10, 1), T(13, -1)], 1.8, 0.5);
})();
// the ink of the design at an arm-world point (bilinear on the 2× raster)
function dragonInk(wx, wy) {
  const fx = (wx - DRG.x0) * DRG.k - 0.5, fy = (wy - DRG.y0) * DRG.k - 0.5;
  if (fx < 0 || fy < 0 || fx >= DRG_RW - 1 || fy >= DRG_RH - 1) return 0;
  const i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, k = j * DRG_RW + i;
  return (INK[k] * (1 - u) + INK[k + 1] * u) * (1 - v) + (INK[k + DRG_RW] * (1 - u) + INK[k + DRG_RW + 1] * u) * v;
}
