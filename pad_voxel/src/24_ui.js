'use strict';
// ============================================================================
// GRAPHIC OVERLAYS — part of the picture, so the clean (text-free) version
// keeps them: the time cue (hourglass), the demand / supply bars, the CTA
// viewer frame, the axial inset with its slice line, the divider of the
// comparison and the lesion marks of the final image. No numbers anywhere.
// Safe area for short-video apps (native px; ×3 on export): text and key
// marks stay inside x 16..313 and y 67..507.
// ============================================================================
const SAFE = { l: 16, r: 344, rb: 313, t: 67, b: 507 };
// open / close factor: eased over d seconds at each end (whole pixels: sizes are rounded where it is used, so the
// edges stay crisp while they move smoothly; n is ignored, kept so older calls read the same)
function stepK(t, t0, t1, n, d) {
  if (t < t0 || t >= t1) return 0;
  d = d || 0.2;
  return Math.min(eout(clamp((t - t0) / d, 0, 1)), eout(clamp((t1 - t) / d, 0, 1)));
}
// ---------------------------------------------------------------- the time cue (chronic exposure, progression over time)
function hourglass(cx, cy, f, k) {
  if (k <= 0) return;
  const w = 9, h = 13, hk = Math.max(1, Math.round(h * k));
  rect(cx - w - 2, cy - hk - 3, cx + w + 3, cy - hk - 1, P.SUB); rect(cx - w - 2, cy + hk + 1, cx + w + 3, cy + hk + 3, P.SUB);
  if (k < 1) return;
  for (let y = -h; y <= h; y++) {
    const hw = Math.max(1, Math.round(1 + (w - 1) * Math.abs(y) / h));
    rect(cx - hw - 1, cy + y, cx - hw, cy + y + 1, P.N5); rect(cx + hw + 1, cy + y, cx + hw + 2, cy + y + 1, P.N5);
    const top = y <= 0 && y >= -h * f, bot = y > 0 && y >= h * f;
    if (top || bot) rect(cx - hw + 1, cy + y, cx + hw, cy + y + 1, P.WARN);
    else rect(cx - hw + 1, cy + y, cx + hw, cy + y + 1, P.N1);
  }
  if (f > 0 && f < 1) for (let y = 1; y < h * f; y++) if ((y + Math.floor(G_T * 30)) % 3) pset(cx, cy + y, P.WARN);
}
// ---------------------------------------------------------------- demand vs supply (scenes 12-13): two bars, no scale, no numbers
const BARS = { x: 113, y: 123, w: 197, h: 8, gap: 20, ix: 27, lx: 37 };   // bars at the top, under the caption
const SUPPLY = 0.44;                                        // fixed: the lesions limit how much blood can reach the calf
function demandLevel(t) {
  if (t < EV.rest13) { const n = EV.steps12.filter(e => t >= e).length, f = EV.steps12.reduce((a, e) => a + 0.19 * eout(seg(t, e, e + 0.3)), 0); return 0.2 + f; }
  return lerp(0.2 + 0.19 * 4, 0.24, eio(seg(t, EV.relax - 0.3, EV.relax + 1.5)));
}
function muscleIcon(x, y, c) { for (let i = -4; i <= 4; i++) { const hw = Math.round(3.4 * Math.sqrt(1 - (i / 5) ** 2)); rect(x + i, y - hw, x + i + 1, y + hw + 1, c); } for (let i = -2; i <= 2; i += 2) line(x + i - 1, y - 2, x + i + 1, y + 2, P.BOX); }
function dropIcon(x, y, c) { for (let j = -5; j <= 3; j++) { const hw = j < 0 ? Math.round((j + 5) * 0.62) : Math.round(Math.sqrt(Math.max(0, 11 - j * j))); rect(x - hw, y + j, x + hw + 1, y + j + 1, c); } rect(x - 1, y - 1, x, y + 1, P.C6); }
function demandBars(t) {
  const k = stepK(t, EV.cut12 + 0.375, EV.rest13 + 2.85, 4, 0.2); if (k <= 0) return;
  const { x, y, w, h, gap } = BARS, ww = Math.round(w * k), dem = demandLevel(t);
  for (const [row, val, col, icon] of [[0, dem, P.WARN, muscleIcon], [1, SUPPLY, P.ACC, dropIcon]]) {
    const yy = y + row * gap;
    rect(x - 1, yy - 1, x + ww + 1, yy + h + 1, P.SH); rect(x, yy, x + ww, yy + h, P.N1);
    if (k < 1) continue;
    icon(BARS.ix, yy + h / 2, row ? P.ACC : P.WARN);
    const v = Math.round(w * clamp(val, 0, 1));
    if (row === 0 && val > SUPPLY) {                        // the part of the demand the blood supply cannot meet
      const s = Math.round(w * SUPPLY);
      rect(x, yy, x + s, yy + h, col);
      const on = Math.floor(G_T / E8) % 2 === 0;            // two-step pulse on the eighths
      rect(x + s, yy, x + v, yy + h, on ? P.PAIN : P.WARN);
      for (let i = x + s + 2; i < x + v - 1; i += 4) rect(i, yy + 2, i + 1, yy + h - 2, P.SH);
    } else rect(x, yy, x + v, yy + h, col);
    rect(x, yy, x + v, yy + 1, P.C6);
  }
  // the supply ceiling: a mark straight through both bars
  if (k >= 1) { const s = x + Math.round(w * SUPPLY); rect(s, y - 4, s + 1, y + gap + h + 4, P.INK); }
}
// ---------------------------------------------------------------- the CTA viewer (scenes 17-19)
const VIEW = { x0: 20, y0: 112, x1: 340, y1: 515 };
function viewerFrame(t) {
  const k = stepK(t, EV.cta17 + 1.6, EV.comp20, 4, 0.3); if (k <= 0) return;      // once the slices have become the 3D view
  const { x0, y0, x1, y1 } = VIEW, L = Math.round(17 * k), c = P.SUB;
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
    rect(Math.min(x, x + sx * L), y - (sy < 0 ? 1 : 0), Math.max(x, x + sx * L), y + (sy > 0 ? 2 : 1) - (sy < 0 ? 1 : 0), c);
    rect(x - (sx < 0 ? 1 : 0), Math.min(y, y + sy * L), x + (sx > 0 ? 2 : 1) - (sx < 0 ? 1 : 0), Math.max(y, y + sy * L), c);
  }
  // small tick ruler down the left edge (no numbers)
  if (k >= 1) for (let yy = y0 + 27; yy < y1 - 27; yy += 16) rect(x0 + 4, yy, x0 + ((yy - y0) % 64 === 27 ? 10 : 7), yy + 1, P.N5);
}
// the axial slice through L1 (scene 18): stepped box, leader to the slice line on the vessel
const AXI = { x: 198, y: 358, s: 132 };
function axialInset(t) {
  if (t < EV.inset18 || t >= EV.pan19) return;
  const k = stepK(t, EV.inset18, EV.pan19, 4, 0.2), c = ctaStenCam(t), a = project(c, [L1W[0] + 17, L1W[1], L1W[2]]);
  if (a && k >= 1) { dashLine(a[0] + 2, a[1], AXI.x, AXI.y + 6, P.WARN, 2, 2, 0); }
  drawAxial(AXI.x, AXI.y, AXI.s, k);
  if (k >= 1) frame(AXI.x - 2, AXI.y - 2, AXI.x + AXI.s + 2, AXI.y + AXI.s + 2, P.WARN);
}
// ---------------------------------------------------------------- comparison (scenes 20-21)
function divider(t) {
  const k = stepK(t, EV.comp20 + 0.25, DUR + 1, 4, 0.2); if (k <= 0) return;
  const y0 = 157, y1 = 157 + Math.round(400 * k);
  for (let y = y0; y < y1; y += 4) rect(179, y, 180, y + 2, P.N4);
}
// lesion marks on the right-hand tree: a bracket beside the stenosis and the occlusion, a dotted route along the collaterals
function lesionMarks(t) {
  if (t < EV.hl21[0]) return;
  const S = sCompareTrees.last; if (!S) return;
  const br = (yTop, yBot, k) => {                            // bracket on the outer side of the vessel, ticks pointing at it
    if (k <= 0) return;
    const a = project(S.c, mApply(S.xR, [-34, yTop, 0])), b = project(S.c, mApply(S.xR, [-34, yBot, 0])); if (!a || !b) return;
    const x = Math.round(Math.max(a[0], b[0])) + 2, ya = Math.round(a[1]), yb = Math.round(b[1]), L = Math.round(6 * k);
    rect(x, ya, x + 2, yb, P.PAIN); rect(x - L, ya, x + 2, ya + 2, P.PAIN); rect(x - L, yb - 2, x + 2, yb, P.PAIN);
  };
  br(LES.L1.y0 + 6, LES.L1.y1 - 6, stepK(t, EV.hl21[0], DUR + 1, 3, 0.15));
  br(LES.L2.y0 + 6, LES.L2.y1 - 6, stepK(t, EV.hl21[1], DUR + 1, 3, 0.15));
  if (t >= EV.hl21[2]) for (const g of ['RGEN1', 'RGEN2']) {
    const pts = ART[g].pts, n = 26;
    for (let i = 0; i < n; i++) {
      const u = (i + (G_T * 6) % 1) / n, f = u * (pts.length - 1), j = Math.min(pts.length - 2, Math.floor(f)), h = f - j;
      const p = project(S.c, mApply(S.xR, [lerp(pts[j][0], pts[j + 1][0], h), lerp(pts[j][1], pts[j + 1][1], h), lerp(pts[j][2], pts[j + 1][2], h) + 8]));
      if (p && i % 2 === 0) rect(Math.round(p[0]) - 1, Math.round(p[1]) - 1, Math.round(p[0]) + 1, Math.round(p[1]) + 1, P.WARN);
    }
  }
}
// ---------------------------------------------------------------- all graphic overlays
function drawUI(t) {
  if (t >= EV.glu[0] && t < EV.push6) hourglass(301, 131, 1 - seg(t, EV.glu[0], EV.push6 - 0.1), stepK(t, EV.cap5, EV.push6, 3, 0.15));
  if (t >= EV.grow8 && t < EV.comp9) hourglass(301, 131, 1 - seg(t, EV.grow8, EV.comp9 - 0.1), stepK(t, EV.cap8, EV.comp9, 3, 0.15));
  demandBars(t);
  viewerFrame(t);
  axialInset(t);
  divider(t);
  lesionMarks(t);
}
