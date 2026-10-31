'use strict';
// ============================================================================
// Shared helpers: noise, splines, periodic wobble, pops, IK, vectors.
// Colour code (fixed for the whole film; colours are educational): dark navy
// ground; virus cyan spikes + muted purple envelope; viral RNA magenta; cDNA
// electric blue; template DNA deep blue; new DNA warm orange; reverse
// transcriptase purple; DNA polymerase cyan / silver; primers yellow; probe
// light green with a neon-green reporter and a dark purple quencher;
// excitation light blue; fluorescence green; photodiode metallic cyan;
// electrons electric blue; electrical signals neon green; heating orange;
// cooling blue.
// ============================================================================
// 2-D value noise in [0,1)
function vn2(x, y, s) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash3(i, j, s), b = hash3(i + 1, j, s), c = hash3(i, j + 1, s), d = hash3(i + 1, j + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// Catmull-Rom spline through control points -> dense flat polyline (open or closed)
function spline(pts, n, closed) {
  const m = pts.length / 2, out = [];
  const P_ = i => closed ? ((i % m) + m) % m : clamp(i, 0, m - 1);
  const segs = closed ? m : m - 1;
  for (let i = 0; i < segs; i++) {
    const a = P_(i - 1), b = P_(i), c = P_(i + 1), d = P_(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      for (let q = 0; q < 2; q++) {
        const p0 = pts[2 * a + q], p1 = pts[2 * b + q], p2 = pts[2 * c + q], p3 = pts[2 * d + q];
        out.push(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
      }
    }
  }
  if (!closed) out.push(pts[2 * (m - 1)], pts[2 * (m - 1) + 1]);
  return out;
}
// periodic wobble: every environmental motion repeats exactly every 130 s (seamless loop)
const LOOPW = k => TAU * k / DUR;
function wob(t, k, ph) { return Math.sin(LOOPW(k) * t + ph); }
// UI switch (renders a scene without its captions)
let UI_ON = true;
// Kurzgesagt pop: ~90% at 0.25 s, ~108% overshoot, settles by 0.5 s
const pop = (t, t0, d) => t < t0 ? 0 : backOut(clamp((t - t0) / (d || 0.5), 0, 1), 1.1);
function pulse(t, t0, d) { return t < t0 ? 0 : Math.max(0, 1 - (t - t0) / d); }
// 2-bone IK: knee position for a limb from (bx,by) to (tx,ty) with segment lengths L1, L2; side = +1/-1 bends the knee
function ik(bx, by, tx, ty, L1, L2, side) {
  let dx = tx - bx, dy = ty - by, d = Math.hypot(dx, dy) || 1e-6;
  const dm = Math.min(d, L1 + L2 - 1e-3), dn = Math.max(dm, Math.abs(L1 - L2) + 1e-3);
  const a = (L1 * L1 - L2 * L2 + dn * dn) / (2 * dn), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const ux = dx / d, uy = dy / d;
  return [bx + ux * a - uy * h * side, by + uy * a + ux * h * side];
}
// small 3-vector helpers
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// seeded RNG (deterministic paths)
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gaussR(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
// fast sine table (big per-pixel loops)
const SIN_N = 4096, SIN_T = new Float32Array(SIN_N + 1);
for (let i = 0; i <= SIN_N; i++) SIN_T[i] = Math.sin(i / SIN_N * TAU);
function fsin(x) { const u = x / TAU; return SIN_T[Math.floor((u - Math.floor(u)) * SIN_N)]; }
