// SPIN — magnetization graphics. Vectors are 3D with z along B0 (up on screen); a view tilts the frame so the
// transverse plane reads as an ellipse: (az, el) = azimuth about B0 and elevation above the transverse plane.
// A population of proton moments: each sits on the "up" (parallel, lower energy) or "down" cone of the two-state
// picture with a random phase, so all of them precess at the one Larmor rate while their transverse parts cancel and
// only the small excess along B0 survives as the net magnetization M.
(() => {
const { W, H, P } = PIX;
const SPIN = window.SPIN = {};
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, h = U.hash;
SPIN.CONE = Math.acos(1 / Math.sqrt(3));                                         // 54.7°: the spin-½ cone
// project a 3D vector to screen offsets [dx, dy, depth]; az rotates about z, el looks down onto the transverse plane
SPIN.proj = (v, az = 0, el = 0.35) => {
  const ca = Math.cos(az), sa = Math.sin(az), x = v[0] * ca - v[1] * sa, y = v[0] * sa + v[1] * ca;
  return [x, -(v[2] * Math.cos(el) + y * Math.sin(el)), -y * Math.cos(el) + v[2] * Math.sin(el)];
};
SPIN.sph = (th, ph) => [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)];
// a 3D arrow from (cx, cy) along v (unit-ish) scaled by L px
SPIN.arrow = (c, cx, cy, v, L, o = {}) => {
  const [dx, dy, d] = SPIN.proj(v, o.az, o.el), back = d < -0.25 && o.depth !== false;
  const x1 = cx + dx * L, y1 = cy + dy * L, len = Math.hypot(dx, dy) * L;
  if (len < 1.5) { PIX.rect(c, Math.round(cx) - 1, Math.round(cy) - 1, 3, 3, o.col || 'c3'); return; }
  MICRO.arrow(c, cx, cy, x1, y1, back ? (o.colB || 'c1') : (o.col || 'c3'), back ? (o.colB || 'c1') : (o.hi || 'c5'), o.head ?? Math.max(3, Math.min(7, len * 0.3)), o.thick || 1);
};
// the axes of a magnetization frame: z (B0) up, the transverse plane as a dotted ellipse
SPIN.frame = (c, cx, cy, R, o = {}) => {
  const a = o.a ?? 1; if (a <= 0) return;
  c.save(); c.globalAlpha = a;
  const n = Math.max(40, Math.round(R * 5));
  for (let k = 0; k < n; k++) { const [dx, dy, d] = SPIN.proj([Math.cos(k / n * TAU), Math.sin(k / n * TAU), 0], o.az, o.el); if (d < 0 && k % 2) continue; PIX.rect(c, Math.round(cx + dx * R), Math.round(cy + dy * R), 1, 1, d < 0 ? 'g4' : 'g6'); }
  const [zx, zy] = SPIN.proj([0, 0, 1.25], o.az, o.el); PIX.bline(c, cx, cy + R * 0.25, cx + zx * R, cy + zy * R, 'g6', 1);
  if (o.zlabel !== false) PIX.text(c, o.zlabel || 'z', cx + zx * R + 3, cy + zy * R - 4, 'g7', { shadow: null });
  c.restore();
};
// ---------- a population of moments ----------
// state: 'thermal' (tumbling), then 'cones' (two cones, precessing); returns each moment's unit vector at time t
SPIN.pop = (n, seed = 7, excess = 0.12) => {
  const L = [];
  for (let i = 0; i < n; i++) {
    const up = h(i, seed) < 0.5 + excess / 2;
    L.push({ i, up, ph0: h(i, seed + 1) * TAU, th0: Math.acos(2 * h(i, seed + 2) - 1), q0: h(i, seed + 3) * TAU, s1: 0.6 + h(i, seed + 4), s2: 0.6 + h(i, seed + 5) });
  }
  return L;
};
// thermal tumbling direction (smooth, deterministic)
SPIN.thermal = (m, t) => {
  const th = clamp(m.th0 + 0.5 * Math.sin(t * 1.3 * m.s1 + m.q0), 0.05, Math.PI - 0.05), ph = m.ph0 + 0.9 * Math.sin(t * 0.9 * m.s2 + m.q0 * 2) + t * 0.4 * (m.s1 - 1.1);
  return SPIN.sph(th, ph);
};
// on its cone, precessing: phase advances by w·t (w in rad/s; protons precess clockwise seen from the tip of B0)
SPIN.cone = (m, phase) => SPIN.sph(m.up ? SPIN.CONE : Math.PI - SPIN.CONE, m.ph0 - phase);
// normalised blend of two directions
SPIN.mix = (a, b, u) => { const v = [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)], l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
// rotate a vector about the x axis (an RF pulse along x in the rotating frame) and about z
SPIN.rotX = (v, a) => [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];
SPIN.rotZ = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
// a proton with its moment, small (population view)
SPIN.dot = (c, x, y, v, L, o = {}) => {
  const [dx, dy, d] = SPIN.proj(v, o.az, o.el);
  if (d < 0) SPIN.arrow(c, x, y, v, L, o);
  c.save(); c.globalAlpha = o.a ?? 1; PIX.rect(c, Math.round(x) - 1, Math.round(y) - 1, 3, 3, 'y2'); PIX.rect(c, Math.round(x) - 1, Math.round(y) - 1, 1, 1, 'y4'); c.restore();
  if (d >= 0) SPIN.arrow(c, x, y, v, L, o);
};
})();
