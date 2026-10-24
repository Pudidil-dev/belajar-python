'use strict';
// ============================================================================
// Shared FX: paths, electrons (dots + short trails), photons (yellow line
// packets / zigzags), RF sine patterns (purple), radical tags.
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
function arcPts(cx, cy, r, a0, a1, n, fx) { // fx(a) -> [x,y] param; default circle
  const out = [];
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); if (fx) { const q = fx(a); out.push(q[0], q[1]); } else out.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  return out;
}
// electron: bright dot, short trail behind the motion, small glow (screen px)
function electron(x, y, vx, vy, opt) {
  opt = opt || {};
  const L = opt.trail === undefined ? 7 : opt.trail;
  const c1 = opt.c1 || P.E1, c2 = opt.c2 || P.E2, c3 = opt.c3 || P.E3, c0 = opt.c0 || P.E0;
  const v = Math.hypot(vx, vy) || 1, ux = vx / v, uy = vy / v;
  if (opt.glow !== false) disc(x, y, opt.gr || 4.5, c0, 0.45 * (opt.lv || 1));
  if (L > 0) {
    line(x - ux * L, y - uy * L, x - ux * L * 0.45, y - uy * L * 0.45, c1, 0.6);
    line(x - ux * L * 0.5, y - uy * L * 0.5, x, y, c1);
  }
  const r = opt.r || 1;
  if (r >= 1.5) { disc(x, y, r + 0.6, c2); pset(x - 0.5, y - 0.5, c3); pset(x + 0.5, y - 0.5, c3); }
  else { pset(x, y, c3); pset(x - 1, y, c2); pset(x + 1, y, c2); pset(x, y - 1, c2); pset(x, y + 1, c2); }
}
// photon packet: zigzag along direction (dx,dy); len, amp, wl in screen px
function photon(x, y, dx, dy, opt) {
  opt = opt || {};
  const len = opt.len || 10, amp = opt.amp === undefined ? 1.6 : opt.amp, wl = opt.wl || 4;
  const c = opt.c || P.Y2, ch = opt.ch || P.Y3;
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const nx = -dy, ny = dx;
  if (opt.glow) disc(x - dx * len * 0.4, y - dy * len * 0.4, len * 0.55, P.Y0, 0.4 * opt.glow);
  if (amp <= 0.3) { line(x - dx * len, y - dy * len, x, y, c); pset(x, y, ch); return; }
  let px = x - dx * len, py = y - dy * len; const steps = Math.max(2, Math.round(len / (wl / 2)));
  for (let i = 1; i <= steps; i++) {
    const s = i / steps, sgn = (i === steps) ? 0 : (i % 2 ? 1 : -1);
    const qx = x - dx * len * (1 - s) + nx * amp * sgn, qy = y - dy * len * (1 - s) + ny * amp * sgn;
    line(px, py, qx, qy, c); px = qx; py = qy;
  }
  pset(x, y, ch); pset(x - dx, y - dy, ch);
}
// RF wave: sine drawn along a path (world path, cam), purple
function rfAlong(cam, path, s0, s1, amp, wl, phase, c, cdim, lv) {
  if (amp <= 0.05) return;
  const step = 1.2 / cam.z;
  let prev = null;
  for (let s = s0; s <= s1; s += step) {
    const [x, y] = path.at(s), [tx, ty] = path.tan(s);
    const off = amp * Math.sin((s / wl) * TAU - phase);
    const sx = cam.x(x - ty * off), sy = cam.y(y + tx * off);
    if (prev) { line(prev[0], prev[1], sx, sy, Math.abs(off) > amp * 0.55 ? c : (cdim || c), lv); }
    prev = [sx, sy];
  }
}
// •OH tag next to a radical
function ohTag(x, y, t0, t) { tag('•OH', x, y, t0, t, { c: P.O3 }); }
