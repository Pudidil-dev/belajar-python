'use strict';
// ============================================================================
// Paths (arc-length parameterised polylines) and small geometric helpers.
// ============================================================================
class Path {
  constructor(pts) { // flat [x0,y0,x1,y1,...]
    this.p = pts; this.n = pts.length >> 1; this.c = [0];
    for (let i = 1; i < this.n; i++) this.c.push(this.c[i - 1] + Math.hypot(pts[2 * i] - pts[2 * i - 2], pts[2 * i + 1] - pts[2 * i - 1]));
    this.L = this.c[this.n - 1];
  }
  _seg(s) { s = clamp(s, 0, this.L); let lo = 0, hi = this.n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.c[m] <= s) lo = m; else hi = m; } return [lo, s]; }
  at(s) { const [i, ss] = this._seg(s); const l = this.c[i + 1] - this.c[i] || 1e-9, f = (ss - this.c[i]) / l; return [lerp(this.p[2 * i], this.p[2 * i + 2], f), lerp(this.p[2 * i + 1], this.p[2 * i + 3], f)]; }
  tan(s) { const [i] = this._seg(s); const dx = this.p[2 * i + 2] - this.p[2 * i], dy = this.p[2 * i + 3] - this.p[2 * i + 1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
  sub(s0, s1, step) { // flat points of the sub-path
    step = step || 2; const out = []; s0 = clamp(s0, 0, this.L); s1 = clamp(s1, 0, this.L);
    for (let s = s0; s < s1; s += step) { const q = this.at(s); out.push(q[0], q[1]); }
    const q = this.at(s1); out.push(q[0], q[1]); return out;
  }
}
// rotate (x,y) by angle a about the origin
function rot(x, y, a) { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; }
// is a screen rect visible (with margin)
const onScreen = (x0, y0, x1, y1, m) => { m = m || 0; return x1 >= -m && x0 <= W + m && y1 >= -m && y0 <= H + m; };
// ---------------------------------------------------------------- particles shared by every world
// starburst flash (detections, interactions)
function flash(x, y, r, k, cols) {
  cols = cols || [P.DT1, P.DT2, P.DT3, P.C6];
  if (k <= 0) return;
  disc(x, y, r * 1.6, cols[0], 0.3 * k); disc(x, y, r, cols[1], 0.6 * k); disc(x, y, r * 0.55, cols[2]); disc(x, y, r * 0.28, cols[3]);
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.2, L = r * (i % 2 ? 1.5 : 2.4) * k; line(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4, x + Math.cos(a) * L, y + Math.sin(a) * L, i % 2 ? cols[1] : cols[2]); }
}
// arrows and marks used by labels
function arrowHead(x, y, ang, s, col) { const ca = Math.cos(ang), sa = Math.sin(ang); poly([x + ca * s, y + sa * s, x - ca * s * 0.7 - sa * s * 0.7, y - sa * s * 0.7 + ca * s * 0.7, x - ca * s * 0.7 + sa * s * 0.7, y - sa * s * 0.7 - ca * s * 0.7], col); }
function crossMark(x, y, s, col) { for (const d of [-1, 0, 1]) { line(x - s + d, y - s, x + s + d, y + s, col); line(x + s + d, y - s, x - s + d, y + s, col); } }
function checkMark(x, y, s, col) { const pts = [x - s, y, x - s * 0.3, y + s * 0.7, x + s, y - s * 0.8]; for (const d of [-1, 0, 1]) { line(pts[0], pts[1] + d, pts[2], pts[3] + d, col); line(pts[2], pts[3] + d, pts[4], pts[5] + d, col); } }
