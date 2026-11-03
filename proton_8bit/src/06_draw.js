'use strict';
// ============================================================================
// Shared drawing helpers for every world: world-space wrappers, the proton and
// electron sprites, magnetic-field marks, arrows, the RF field arrow, panels.
// ============================================================================
function wrr(cam, x0, y0, x1, y1, r) { return maskRR(cam.x(x0), cam.y(y0), cam.x(x1), cam.y(y1), r * cam.z); }
function wpoly(cam, pts) { return maskPoly(cam.pts(pts)); }
function wrect(cam, x0, y0, x1, y1, c, lv) { rect(cam.x(x0), cam.y(y0), cam.x(x1), cam.y(y1), c, lv); }
function wline(cam, x0, y0, x1, y1, c, w, lv) { lineW(cam.x(x0), cam.y(y0), cam.x(x1), cam.y(y1), Math.max(1, (w || 1) * cam.z), c, lv); }
function wdisc(cam, x, y, r, c, lv) { disc(cam.x(x), cam.y(y), Math.max(0.6, r * cam.z), c, lv); }
function wring(cam, x, y, r, w, c, lv) { ring(cam.x(x), cam.y(y), r * cam.z, Math.max(1, w * cam.z), c, lv); }
function wpath(cam, pts, w, c, lv) { const q = cam.pts(pts); for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, w * cam.z), c, lv); }
// arc polyline (screen angles: a = 0 right, 90 top; counter-clockwise on screen)
function arcPts(cx, cy, r, a0, a1, n) { const o = []; n = n || 24; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push(cx + r * Math.cos(a), cy - r * Math.sin(a)); } return o; }
// ---------------------------------------------------------------- particles
// a proton: luminous cyan sphere with a soft glow (r in screen px)
function proton(x, y, r, k) {
  k = k === undefined ? 1 : k; if (k <= 0) return;
  glow(x, y, r * 3.2 + 3, P.PC2, P.PC4, 0.8 * k);
  if (r < 1.6) { rect(x - 1, y - 1, x + 1, y + 1, P.PC4); pset(x - 1, y - 1, P.PC5); return; }
  const m = maskDisc(x, y, r); shade(m, P.PC3, P.PC5, P.PC2, P.PC1);
  if (r >= 3) disc(x - r * 0.35, y - r * 0.35, r * 0.32, P.PC5);
}
// an electron: smaller yellow sphere
function electron(x, y, r, k) {
  k = k === undefined ? 1 : k; if (k <= 0) return;
  glow(x, y, r * 2.6 + 2, P.EL1, P.EL2, 0.6 * k);
  if (r < 1.4) { rect(x - 1, y - 1, x + 1, y + 1, P.EL2); pset(x - 1, y - 1, P.EL3); return; }
  const m = maskDisc(x, y, r); shade(m, P.EL2, P.EL3, P.EL1, P.EL0);
}
// a motion streak behind a particle (fading line toward its past position)
function streak(x0, y0, x1, y1, c0, c1, w) {
  const L = Math.hypot(x1 - x0, y1 - y0); if (L < 1) return;
  const n = Math.max(2, Math.ceil(L / 3));
  for (let i = 0; i < n; i++) { const a = i / n, b = (i + 1) / n; lineW(lerp(x0, x1, a), lerp(y0, y1, a), lerp(x0, x1, b), lerp(y0, y1, b), w || 1, i < n * 0.5 ? c0 : c1); }
}
// magnetic field into the screen (⊗), purple
function fieldIn(x, y, s, c) {
  c = c === undefined ? P.MG2 : c; s = Math.max(2, s);
  ring(x, y, s, 1, c);
  if (s >= 2.5) { line(x - s * 0.55, y - s * 0.55, x + s * 0.55, y + s * 0.55, c); line(x + s * 0.55, y - s * 0.55, x - s * 0.55, y + s * 0.55, c); }
}
// magnetic field out of the screen (⊙)
function fieldOut(x, y, s, c) { c = c === undefined ? P.MG2 : c; s = Math.max(2, s); ring(x, y, s, 1, c); rect(x - 0.5, y - 0.5, x + 1, y + 1, c); }
// arrow from (x0,y0) to (x1,y1) with a dark outline (screen space)
function arrow(x0, y0, x1, y1, w, col, hs) {
  const L = Math.hypot(x1 - x0, y1 - y0); if (L < 2) return;
  const ux = (x1 - x0) / L, uy = (y1 - y0) / L, h = hs || Math.max(4, w * 2.6), a = Math.atan2(uy, ux);
  const bx = x1 - ux * h * 0.6, by = y1 - uy * h * 0.6;
  lineW(x0, y0, bx, by, w + 2, P.SH); arrowHead(x1 + ux, y1 + uy, a, h + 1.5, P.SH);
  lineW(x0, y0, bx, by, w, col); arrowHead(x1, y1, a, h, col);
}
// the RF field across a gap: an outlined cyan arrow, brightness by strength (0..1)
function rfArrow(x0, y0, x1, y1, k) {
  if (k <= 0.05) return;
  const c = k > 0.66 ? P.PC4 : k > 0.33 ? P.PC3 : P.PC2;
  withDither(clamp(0.35 + 0.65 * k, 0, 1), () => arrow(x0, y0, x1, y1, 1.6, c, 4.5));
}
// a right-angle mark between two directions at (x, y)
function rightAngle(x, y, ux, uy, vx, vy, s, c) {
  const p1 = [x + ux * s, y + uy * s], p2 = [x + ux * s + vx * s, y + uy * s + vy * s], p3 = [x + vx * s, y + vy * s];
  line(p1[0], p1[1], p2[0], p2[1], c); line(p2[0], p2[1], p3[0], p3[1], c);
}
// a dark rounded panel with a thin border (screen space)
function panel(x0, y0, x1, y1, k, edge) {
  if (k <= 0) return;
  withDither(k, () => { const m = maskRR(x0, y0, x1, y1, 5); mFill(m, P.K0); mOutline(m, edge === undefined ? P.N5 : edge); });
}
// small text helper that fades with k (no outline, for panels)
function ptext(s, x, y, c, k, align, sc) { if (k <= 0) return; withDither(k, () => text(FS, s, x, y, { sc: sc || 2, c, ol: null, align })); }
