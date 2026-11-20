// GEO — paths and deterministic particle streams (shared with the ventilator film): smooth polylines with cumulative
// lengths, a point at a distance along them, and streams of particles moving along a path as pure functions of time.
(() => {
const clamp = U.clamp, lerp = U.lerp;
const GEO = window.GEO = { NAME: 'GEO' };
const lens = pts => { const S = [0]; for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return S; };
const at = (pts, S, d) => {
  if (d <= 0) return [pts[0][0], pts[0][1], Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0])];
  for (let i = 1; i < pts.length; i++) if (d <= S[i]) { const q = (d - S[i - 1]) / Math.max(1e-9, S[i] - S[i - 1]); return [lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q), Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])]; }
  const n = pts.length - 1; return [pts[n][0], pts[n][1], Math.atan2(pts[n][1] - pts[n - 1][1], pts[n][0] - pts[n - 1][0])];
};
const smooth = (pts, step = 2) => {
  const out = [], Q = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < Q.length - 2; i++) {
    const p0 = Q[i - 1], p1 = Q[i], p2 = Q[i + 1], p3 = Q[i + 2], n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  out.push(pts[pts.length - 1].slice()); out.S = lens(out); return out;
};
GEO.lens = lens; GEO.at = (pts, d) => at(pts, pts.S, d); GEO.path = (pts, step = 2) => smooth(pts, step);
GEO.line = (a, b, step = 2) => smooth([a, b], step);
GEO.len = pts => pts.S[pts.S.length - 1];
// a round particle: 1–2 px squares, a plus at 3 px, a small disc from 4 px
const dot = GEO.dot = (c, x, y, w) => {
  if (w <= 2) { c.fillRect(x, y, w, w); return; }
  if (w === 3) { c.fillRect(x - 1, y, 3, 1); c.fillRect(x, y - 1, 1, 3); return; }
  const r = w / 2; for (let dy = -Math.ceil(r); dy < Math.ceil(r); dy++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - (dy + 0.5) ** 2))); if (hw > 0) c.fillRect(x - hw, y + dy, 2 * hw, 1); }
};
// particles moving along pts: o = { n, speed (units/s), dir, seed, ramp, len (trail, units), w (px), spread, a, from, to }
GEO.stream = (c, cam, pts, T, o = {}) => {
  const L = GEO.len(pts), n = o.n ?? Math.max(4, Math.round(L / 6)), sp = o.speed ?? 60, dir = o.dir ?? 1, seed = o.seed ?? 1, a = o.a ?? 1;
  const from = o.from ?? 0, to = o.to ?? L, z = cam.z, len = o.len ?? 0, ramp = o.ramp || ['ga3', 'ga4', 'ga5'], w = o.w ?? 2;
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.setTransform(1, 0, 0, 1, 0, 0);
  for (let k = 0; k < n; k++) {
    const h1 = U.hash(k, seed), h2 = U.hash(k, seed + 7), h3 = U.hash(k, seed + 13);
    let d = ((h1 * L + dir * T * sp * (0.8 + 0.4 * h2)) % L + L) % L;
    if (d < from || d > to) continue;
    const [x, y, ang] = at(pts, pts.S, d), off = (o.spread ?? 0) * (h3 - 0.5) * 2, [sx, sy] = K.S(cam, x - Math.sin(ang) * off, y + Math.cos(ang) * off);
    if (sx < -10 || sy < -10 || sx > PIX.W + 10 || sy > PIX.H + 10) continue;
    const col = ramp[k % ramp.length], X = Math.round(sx), Y = Math.round(sy);
    if (len > 0) { const tl = Math.min(o.maxTrail ?? 8, len * z), ux = Math.cos(ang) * dir, uy = Math.sin(ang) * dir; c.fillStyle = PIX.P[o.trail || col] || col; for (let s = Math.ceil(w / 2); s < tl + Math.ceil(w / 2); s++) c.fillRect(Math.round(sx - ux * s), Math.round(sy - uy * s), Math.max(1, w - 2), Math.max(1, w - 2)); }
    c.fillStyle = PIX.P[col] || col; dot(c, X, Y, w);
  }
  c.restore();
};
GEO.init = () => {};
})();
