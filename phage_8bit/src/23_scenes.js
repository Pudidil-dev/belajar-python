'use strict';
// ============================================================================
// CAMERA + TEXT LAYER + SCENE TABLE.
// One camera track for the whole film (log-zoom keyframes): holds while a
// mechanism plays, slow pushes / glides between sites, fast pull-out reveals,
// one punch on the sheath snap, and a final push into the progeny that
// becomes frame one. Text: one typed caption at a time (top left) plus small
// leader-line tags next to the thing they name.
// ============================================================================
const REVEAL = bezierEase(0.2, 0.72, 0.3, 1), BLAST = bezierEase(0.12, 0.8, 0.3, 1), ENDE = bezierEase(0.45, 0, 0.25, 1);
const CAMK = [
  [0, 0, -90, 3.0], [T_REV, 0, -90, 3.0],
  [3.3, 0, 118, 0.42, REVEAL], [T_GO + 0.15, 0, 122, 0.42, eio],
  [6.95, 0, 6, 2.9, K75], [9.0, 0, 9, 2.92, lin], [T_SNAP, 0, 12, 2.95, lin],
  [T_SNAP + 0.28, 0, 22, 3.5, eout], [14.077, 0, 24, 3.55, lin],
  [14.95, 0, 44, 6.0, K75], [17.077, 0, 45, 6.1, lin],
  [17.95, 0, 6, 1.8, K75], [barT(11), 0, 6, 1.8, lin], [20.4, 5, 104, 1.8, eio], [21.0, 5, 107, 1.8, lin],
  [22.0, 0, 190, 0.95, K75], [24.0, 0, 194, 1.0, lin], [27.923, 0, 192, 1.02, eio],
  [29.1, 35, 122, 5.0, K75], [32.077, 37, 122, 5.0, lin], [33.0, 62, 158, 5.0, K75], [35.3, 62, 158, 5.0, lin],
  [36.0, 8, 162, 1.85, K75], [39.923, 8, 168, 1.8, lin],
  [41.0, 0, 300, 0.86, K75], [44.077, 0, 300, 0.86, lin],
  [45.0, -68, 200, 4.2, K75], [T_DETACH, -66, 200, 4.2, lin], [T_MOTOR + 0.2, -60, 216, 4.0, K75], [50.077, -60, 216, 4.0, lin],
  [50.85, 34, 226, 3.4, K75], [53.077, 34, 226, 3.4, lin],
  [54.0, 0, 214, 2.2, K75], [56.077, 0, 214, 2.2, lin],
  [57.3, 0, 300, 0.84, K75], [60.0, 0, 300, 0.84, lin],
  [61.6, -78, 198, 2.1, eio], [T_BURST, -80, 196, 2.2, lin],
  [64.2, -80, 165, 0.5, BLAST], [T_REL, -95, 90, 0.46, eio], [T_PUSH, -150, -30, 0.44, eio],
  [DUR, ANCH[0], ANCH[1] - 30, 3.0, ENDE],
];
function lin(x) { return x; }
function camAt(t) {
  const cam = camTrack(CAMK, t, CX, CY);
  let sx = 0, sy = 0;
  const sn = t - T_SNAP; if (sn > 0 && sn < 0.18) { const a = 1.6 * (1 - sn / 0.18); sx += a * Math.sin(sn * 140); sy += a * Math.cos(sn * 170); }
  const bn = t - T_BURST; if (bn > 0 && bn < 0.45) { const a = 3.2 * (1 - bn / 0.45); sx += a * Math.sin(bn * 120); sy += a * Math.cos(bn * 150); }
  if (t > 61.2 && t < T_BURST) { const a = 0.9 * seg(t, 61.2, T_BURST); sx += a * Math.sin(t * 95); sy += a * Math.cos(t * 83); }
  cam.ax += Math.round(sx); cam.ay += Math.round(sy);
  return cam;
}
// ---------------------------------------------------------------- captions (FL, max 2 lines, typed; quick erase at the end)
const CAP_X = 18, CAP_Y = 40;
function caption(s, t0, t1, t) {
  if (!UI_ON || t < t0 || t > t1) return;
  const lines = wrapBal(FL, s, SAFE.r - CAP_X - 10, 2), cps = 46, total = s.length;
  let n = (t - t0) * cps;
  const out = t1 - t < 0.16 ? (t1 - t) / 0.16 : 1;       // erase
  n = Math.min(n, total * out + 0.01);
  if (n < 0.6) return;
  let left = n, bw = 0;
  lines.forEach(ln => { bw = Math.max(bw, textW(FL, ln, 2)); });
  const shown = [];
  lines.forEach((ln, i) => { if (left <= 0) return; const k = Math.min(ln.length, left); shown.push([ln, k, i]); left -= ln.length + 1; });
  if (!shown.length) return;
  for (const [ln, k, i] of shown) text(FL, ln, CAP_X, CAP_Y + i * 18, { sc: 2, n: k, c: P.INK, ol: P.SH, shadow: P.SH, sd: 2 });   // no plate: outlined text floats over the scene
}
// ---------------------------------------------------------------- tags: anchor dot + leader + typed micro label on a plate
function wtag(cam, s, wp, lx, ly, t0, t1, t, col) {
  if (!UI_ON || t < t0 || t > t1) return;
  const ax = Math.round(cam.x(wp[0])), ay = Math.round(cam.y(wp[1])), age = t - t0;
  const out = t1 - t < 0.14 ? (t1 - t) / 0.14 : 1, gk = K75(clamp(age / 0.18, 0, 1)) * out;
  const tw = textW(FM, s, 2), x0 = Math.round(clamp(lx, SAFE.l, SAFE.r - tw)), y0 = Math.round(clamp(ly, 34, 400));
  const ux = ax < x0 ? x0 - 3 : ax > x0 + tw ? x0 + tw + 2 : ax, uy = y0 + 13;
  const ex = lerp(ax, ux, gk), ey = lerp(ay, uy, gk);
  line(ax, ay, ex, ey, P.SH); line(ax + 1, ay, ex + 1, ey, P.SH); line(ax, ay, ex, ey, col || P.INK);
  rect(ax - 1, ay - 1, ax + 2, ay + 2, col || P.INK);
  if (gk < 1) return;
  const n = clamp((age - 0.16) * 50, 0, s.length) * out;
  if (n <= 0) return;
  const pw = textW(FM, s.slice(0, Math.ceil(n)), 2);
  rect(x0 - 3, y0 - 3, x0 + pw + 3, y0 + 12, P.K0); rect(x0 - 3, y0 + 12, x0 + pw + 3, y0 + 13, col || P.INK);
  text(FM, s, x0, y0, { sc: 2, c: P.INK, ol: null, n });
}
function chip(s, t0, t1, t, col) {
  if (!UI_ON || t < t0 || t > t1) return;
  const k = K75(clamp((t - t0) / 0.22, 0, 1)) * (t1 - t < 0.15 ? (t1 - t) / 0.15 : 1), tw = textW(FM, s, 2), y = 386;
  const x = Math.round(lerp(-tw - 30, SAFE.l, k));
  rect(x - 3, y - 3, x + tw + 3, y + 13, P.K0); frame(x - 3, y - 3, x + tw + 3, y + 13, col);
  text(FM, s, x, y, { sc: 2, c: P.SUB, ol: null });
}
function brackets(cam, cell, t, t0) {   // target reticle around a cell
  if (t < t0) return;
  const k = backOut(clamp((t - t0) / 0.3, 0, 1), 1.4), sc = lerp(1.35, 1, k), R = cellR(cell) + 18, L = cell.hl + 18;
  const cx = cam.x(cell.cx), cy = cam.y(cell.cy), hw = R * cam.z * sc, hh = L * cam.z * sc, a = Math.round(10 + 4 * Math.sin(t * 6));
  const c = (t - t0) % 0.46 < 0.23 || t - t0 > 1.4 ? P.PH4 : P.PH3;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = cx + sx * hw, y = cy + sy * hh;
    rect(Math.min(x, x - sx * a), y - 1, Math.max(x, x - sx * a) + 1, y + 1, c); rect(x - 1, Math.min(y, y - sy * a), x + 1, Math.max(y, y - sy * a) + 1, c);
  }
}
