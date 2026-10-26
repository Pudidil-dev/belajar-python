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
