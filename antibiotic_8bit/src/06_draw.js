'use strict';
// ============================================================================
// World-space drawing helpers: every world is drawn through a 2D camera
// (cam.x / cam.y / cam.s map world units to pixels), with masks for 16-bit
// shading (base, light rim, shadow rim, outline).
// ============================================================================
function wrr(cam, x0, y0, x1, y1, r) { return maskRR(cam.x(x0), cam.y(y0), cam.x(x1), cam.y(y1), r * cam.z); }
function wpoly(cam, pts) { return maskPoly(cam.pts(pts)); }
function wrect(cam, x0, y0, x1, y1, c, lv) { rect(cam.x(x0), cam.y(y0), cam.x(x1), cam.y(y1), c, lv); }
function wline(cam, x0, y0, x1, y1, c, w, lv) { lineW(cam.x(x0), cam.y(y0), cam.x(x1), cam.y(y1), Math.max(1, (w || 1) * cam.z), c, lv); }
function wdisc(cam, x, y, r, c, lv) { disc(cam.x(x), cam.y(y), Math.max(0.6, r * cam.z), c, lv); }
function wring(cam, x, y, r, w, c, lv) { ring(cam.x(x), cam.y(y), r * cam.z, Math.max(1, w * cam.z), c, lv); }
function wpath(cam, pts, w, c, lv) { const q = cam.pts(pts); for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, w * cam.z), c, lv); }
function arcPts(cx, cy, r, a0, a1, n) { const o = []; n = n || 24; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } return o; }
// a shaded ball (16-bit): body, light rim up-left, shadow rim down-right, outline; r in pixels
function ball(x, y, r, base, hi, lo, ol) {
  if (r < 1.2) { disc(x, y, Math.max(0.8, r), base); return; }
  const m = maskDisc(x, y, r); shade(m, base, hi, lo, ol, { k: r > 6 ? 2 : 1 });
  if (r >= 3) disc(x - r * 0.35, y - r * 0.38, Math.max(0.7, r * 0.22), hi);
}
// a shaded polygon from world points
function wshape(cam, pts, base, hi, lo, ol, k) { const m = maskPoly(cam.pts(pts)); shade(m, base, hi, lo, ol, { k: k || Math.max(1, Math.round(cam.z * 0.6)) }); return m; }
// a regular polygon (hexagon for a sugar ring, pentagon) as flat points
function ngon(cx, cy, r, n, rot) { const o = []; for (let k = 0; k < n; k++) { const a = (rot || 0) + k / n * TAU; o.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } return o; }
// a capsule (rod) outline as points: centre, half straight length L, radius R, angle
function rodPts(cx, cy, L, R, ang, n) {
  n = n || 14; const o = [], c = Math.cos(ang), s = Math.sin(ang);
  const P_ = (x, y) => o.push(cx + x * c - y * s, cy + x * s + y * c);
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI; P_(L + Math.cos(a) * R, Math.sin(a) * R); }
  for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + i / n * Math.PI; P_(-L + Math.cos(a) * R, Math.sin(a) * R); }
  return o;
}
