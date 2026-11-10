'use strict';
// ============================================================================
// GRAPHIC OVERLAYS — part of the picture, so the clean (text-free) version
// keeps them: the time cue (hourglass), the demand / supply bars, the CTA
// viewer frame, the axial insets with their slice lines, the divider of the
// comparison and the lesion marks of the final image; and the 2D explanatory
// layer over the 3D scenes: the locator (where in the leg we are), the dive
// reticle, the artery's cross-sections beside its lengthwise cut, the flow
// arrows in the collaterals, the contrast's route as icons. No numbers anywhere.
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
// the axial slice through the block (scene 19): the same box, a slice line across the blocked segment
function axialInsetOcc(t) {
  const c = sCTAOcclusion.last; if (!c || t < EV.cutoff19 || t >= EV.comp20) return;
  const k = stepK(t, EV.cutoff19, EV.comp20, 4, 0.2), a = project(c, [L2W[0] - 15, L2W[1], L2W[2]]), b = project(c, [L2W[0] + 15, L2W[1], L2W[2]]);
  if (a && b && k >= 1) { lineW(a[0], a[1], b[0], b[1], 2, P.WARN); dashLine(Math.max(a[0], b[0]) + 2, (a[0] > b[0] ? a[1] : b[1]), AXI.x, AXI.y + 6, P.WARN, 2, 2, 0); }
  drawAxial(AXI.x, AXI.y, AXI.s, k, axialSampleOcc);
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
    return [x + 2, Math.round((ya + yb) / 2)];
  };
  // the 2D cross-section of the finding (the same pictures as beside the artery in scenes 9-10): a small disc that pops in
  const icon = (at, kind, k, accent) => {
    if (!at || k <= 0) return;
    const R = Math.max(2, Math.round(9 * k)), cx = at[0] + 13, cy = at[1];
    rect(at[0] + 1, cy, cx - R - 1, cy + 1, accent); disc(cx + 1, cy + 1, R + 2.5, P.SH); disc(cx, cy, R + 2.5, accent); disc(cx, cy, R + 1.2, XS_BG);
    if (k >= 1) drawXsec(cx, cy, R, kind);
  };
  const k1 = stepK(t, EV.hl21[0], DUR + 1, 3, 0.15), k2 = stepK(t, EV.hl21[1], DUR + 1, 3, 0.15);
  icon(br(LES.L1.y0 + 6, LES.L1.y1 - 6, k1), 'sten', k1, P.PAIN);
  icon(br(LES.L2.y0 + 6, LES.L2.y1 - 6, k2), 'occ', k2, P.PAIN);
  const nA = project(S.c, mApply(S.xL, [-34, LES.L1.yc, 0]));           // the same level on the normal artery: an open ring
  if (nA) icon([Math.round(nA[0]) + 4, Math.round(nA[1])], 'normal', k1, P.ACC);
  if (t >= EV.hl21[2]) for (const g of ['RGEN1', 'RGEN2']) {
    const pts = ART[g].pts, n = 26;
    for (let i = 0; i < n; i++) {
      const u = (i + (G_T * 6) % 1) / n, f = u * (pts.length - 1), j = Math.min(pts.length - 2, Math.floor(f)), h = f - j;
      const p = project(S.c, mApply(S.xR, [lerp(pts[j][0], pts[j + 1][0], h), lerp(pts[j][1], pts[j + 1][1], h), lerp(pts[j][2], pts[j + 1][2], h) + 8]));
      if (p && i % 2 === 0) rect(Math.round(p[0]) - 1, Math.round(p[1]) - 1, Math.round(p[0]) + 1, Math.round(p[1]) + 1, P.WARN);
    }
  }
}
// ============================================================================
// THE 2D EXPLANATORY LAYER over the 3D scenes (pixel art, no text): where we
// are, what the cut looks like end-on, which way the blood goes.
// ============================================================================
// a pixel bitmap from rows of characters, one colour per character (missing / 0 = transparent)
function bmp(rows, x, y, sc, pal) {
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = pal[rows[j][i]]; if (c) rect(x + i * sc, y + j * sc, x + (i + 1) * sc, y + (j + 1) * sc, c); }
}
// a small arrowhead at (x, y) pointing along (dx, dy)
function chevron(x, y, dx, dy, s, c) {
  const l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
  const tx = x + ux * s, ty = y + uy * s, ax = x - ux * s * 0.6 + nx * s, ay = y - uy * s * 0.6 + ny * s, bx = x - ux * s * 0.6 - nx * s, by = y - uy * s * 0.6 - ny * s;
  lineW(ax + 1, ay + 1, tx + 1, ty + 1, 2, P.SH); lineW(bx + 1, by + 1, tx + 1, ty + 1, 2, P.SH);
  lineW(ax, ay, tx, ty, 2, c); lineW(bx, by, tx, ty, 2, c);
}
// ---------------------------------------------------------------- the locator (scenes 4-8 and 10): where in the leg the close-up is
// a small pixel picture of his right leg, side view as he walked (shorts, skin, sock, shoe — drawn from the same
// shapes as the 3D model), the artery in red, and a cyan marker at the level the camera looks at: the thigh for the
// stenosis, behind the knee for the block
const LOC = { x: 16, y: 388, w: 40, h: 112, s: 0.1, ox: 10.5, oy: 5 };   // s: px per mm; (ox, oy): the hip joint in the box
const LOC_IMG = () => cached('locimg', () => {
  const w = LOC.w, h = LOC.h, img = new Uint32Array(w * h), ins = new Uint8Array(w * h);
  const col = yb => yb > -300 ? RP.shorts[3] : yb > -770 ? RP.skin[3] : yb > -862 ? RP.sock[2] : yb > -930 ? RP.shoe[3] : RP.sole[2];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = (i + 0.5 - LOC.ox) / LOC.s, y = -(j + 0.5 - LOC.oy) / LOC.s;
    if (Math.min(SD.thigh(x, y, 0), SD.shin(x, y + 440, 0), SD.foot(x, y + 860, 0)) < 0) { ins[j * w + i] = 1; img[j * w + i] = col(y); }
  }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!ins[j * w + i]) {                   // a dark outline round the silhouette
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < w && y < h && ins[y * w + x]) { img[j * w + i] = P.SH; break; } }
  }
  return img;
});
// the artery's place in the box at tree height y (common femoral → superficial femoral → popliteal → posterior tibial)
function locArtery(y) {
  for (const n of ['RCFA', 'RSFA', 'RPOP', 'RTPT', 'RPTA']) {
    const p = ART[n].pts;
    for (let i = 0; i + 1 < p.length; i++) if ((y - p[i][1]) * (y - p[i + 1][1]) <= 0 && p[i][1] !== p[i + 1][1]) { const u = (y - p[i][1]) / (p[i + 1][1] - p[i][1]); return [LOC.x + LOC.ox + lerp(p[i][2], p[i + 1][2], u) * LOC.s, LOC.y + LOC.oy + (920 - y) * LOC.s]; }
  }
  return null;
}
function locator(t) {
  const k = Math.max(stepK(t, EV.cap4 - 0.1, EV.comp9, 4, 0.3), stepK(t, EV.pan10, EV.pull11, 4, 0.3)); if (k <= 0) return;
  const { w, h, y } = LOC, x = LOC.x - Math.round((1 - k) * (w + 20));                           // slides in from the left edge
  rect(x + 2, y + 2, x + w + 2, y + h + 2, P.SH, 0.6); rect(x, y, x + w, y + h, P.BOX, 0.92); frame(x - 1, y - 1, x + w + 1, y + h + 1, P.N5);
  const img = LOC_IMG(), dx = x - LOC.x;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const c = img[j * w + i]; if (c) pset(x + i, y + j, c); }
  let q = null; for (let yy = 872; yy >= 26; yy -= 6) { const p = locArtery(yy); if (p && q) line(q[0] + dx, q[1], p[0] + dx, p[1], P.AR3); q = p; }
  // the marker: the level the camera looks at (model x along the artery ↔ height in the leg)
  const mx = t < EV.pan10 ? AR.XS : -occCam(t).tg[1], ly = lerp(LES.L1.yc, 519, clamp((mx - AR.XS) / (AR.XO - AR.XS), 0, 1)), m = locArtery(ly);
  if (m) {
    const b = (t / BEAT) % 1, r = 3.6 + 1.6 * Math.max(0, 1 - b * 2.5), mxp = m[0] + dx, my = Math.round(m[1]);
    rect(x + 1, my, Math.round(mxp - r), my + 1, P.ACC); rect(Math.round(mxp + r) + 1, my, x + w - 1, my + 1, P.ACC);     // a level line across the box
    ring(mxp, m[1] + 0.5, r, 1.5, P.ACC); pset(mxp, m[1], P.INK);
  }
}
// scene 3: a cyan reticle on the thigh artery where the camera is about to dive in — the place the locator then marks
function diveReticle(t) {
  if (t < EV.artery || t >= EV.dive + 0.45 || !sLeg.last) return;
  const p = project(sLeg.last.cam, sLeg.last.A); if (!p) return;
  const k = stepK(t, EV.artery, EV.dive + 0.45, 4, 0.25), b = (t / BEAT) % 1, r = (14 + 4 * Math.max(0, 1 - b * 3)) * k, x = Math.round(p[0]), y = Math.round(p[1]);
  if (r < 3) return;
  ring(x + 1, y + 1, r, 1.6, P.SH); ring(x, y, r, 1.6, P.ACC);
  for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = r + 3, e = r + 8; rect(Math.round(x + Math.min(ax * a, ax * e)) - (ax ? 0 : 1), Math.round(y + Math.min(ay * a, ay * e)) - (ay ? 0 : 1), Math.round(x + Math.max(ax * a, ax * e)) + 1, Math.round(y + Math.max(ay * a, ay * e)) + 1, P.ACC); }
}
// ---------------------------------------------------------------- 2D cross-sections of the artery (the wall layers of the cut face, seen end-on)
// y, z: model units from the vessel's axis; kind: 'normal' | 'sten' | 'occ'; px: model units per screen pixel
const XS_CAL = { sten: [[-13.5, 9.5, 3.4], [-5, 17, 2.6], [-17.5, -1.5, 2.3]], occ: [[-8, 5, 3.6], [7, -9, 3.0], [10, 9, 2.5], [-3, -13, 2.3]] };
function xsecPix(y, z, kind, px) {
  const r = Math.hypot(y, z), th = Math.atan2(z, y), fine = px < 1.7, e = Math.max(0.55, 0.62 * px);
  if (r > AR.RO) return 0;
  if (r > AR.RO - Math.max(0.6, 0.95 * px)) return CX_.ol;
  if (r > AR.RM) {                                                       // adventitia: wavy collagen
    if (fine && ((r + 0.8 * Math.sin(th * 7)) % 1.7 + 1.7) % 1.7 < 0.45) return CX_.advF;
    return hash2(Math.floor(th * 9), Math.floor(r / 1.3)) < 0.3 ? CX_.adv2 : CX_.adv;
  }
  if (r > AR.RIEL + e) {                                                 // media: rings of smooth muscle with nuclei
    if (fine && hash2(Math.floor(th * 11), Math.floor(r / 2.2)) < 0.24 && (r % 2.2) > 0.9 && (r % 2.2) < 1.7) return CX_.medN;
    return Math.floor((r - AR.RIEL) / 1.7) & 1 ? CX_.med2 : CX_.med;
  }
  if (r > AR.RI - e) return CX_.iel;                                     // the internal elastic lamina: a bright ring
  for (const [cy, cz, cr] of XS_CAL[kind] || []) {                       // calcium: white nodules with a dark rim
    const q = ((y - cy) / cr) ** 2 + ((z - cz) / cr) ** 2; if (q < 1) return q > (fine ? 0.62 : 0.3) ? CX_.calO : (y - cy + z - cz > cr * 0.5 ? CX_.calD : CX_.cal);
  }
  if (kind === 'occ') {                                                  // the block: organised fibrous material, no channel
    if (fine && ((z + 0.8 * Math.sin(y * 0.3)) % 2.6 + 2.6) % 2.6 < 0.6) return CX_.occ2;
    return hash2(Math.floor(y / 1.7), Math.floor(z / 1.7)) < 0.08 ? CX_.occD : CX_.occ;
  }
  const sten = kind === 'sten', rho = AR.RL * (sten ? 0.36 : 1), s = sten ? 0.42 * AR.RL : 0, d = Math.hypot(y - s * 0.74, z + s * 0.67);
  if (d < rho) {                                                         // the open channel: blood
    const gy = Math.floor(y / 3.4), gz = Math.floor(z / 3.4), cx = (gy + 0.5) * 3.4 + (hash2(gy, gz) - 0.5), cz = (gz + 0.5) * 3.4 + (hash2(gz, gy + 5) - 0.5);
    if (fine && hash2(gy + 3, gz + 7) < 0.36 && Math.hypot(y - cx, z - cz) < 1.25) return P.BL2;
    return d > rho - Math.max(0.9, px) ? P.AR4 : P.AR3;
  }
  if (d < rho + Math.max(0.95, 0.9 * px) || !sten) return CX_.endo;      // the lining
  const u = d - rho, v = AR.RI - r;
  if (u < 4.2) return ((th * 9 + u) % 2 + 2) % 2 < 0.7 ? CX_.cap2 : CX_.cap;   // fibrous cap
  if (v > 1.4) {                                                         // lipid core with cholesterol clefts
    if (fine && ((y * 0.6 + z) % 5.2 + 5.2) % 5.2 < 0.45 && hash2(Math.floor((y * 0.6 + z) / 5.2), 3) < 0.6) return CX_.clef;
    const n = hash2(Math.floor(y / 2.2), Math.floor(z / 2.2));
    return n < 0.22 ? CX_.core2 : n > 0.9 ? CX_.coreD : CX_.core;
  }
  return CX_.fib;
}
function drawXsec(cx, cy, R, kind) {
  const px = AR.RO / (R + 0.5);
  for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) { const c = xsecPix(i * px, j * px, kind, px); if (c) pset(cx + i, cy + j, c); }
}
// a square inset that opens from its centre; accent: the colour of its border (cyan: normal, orange: diseased)
const XSB = 66, XS_BG = hexc('#14070C');
function xsecInset(bx, by, kind, k, accent) {
  if (k <= 0) return;
  const ss = Math.max(4, Math.round(XSB * k)), x0 = Math.round(bx + (XSB - ss) / 2), y0 = Math.round(by + (XSB - ss) / 2);
  rect(x0, y0, x0 + ss + 4, y0 + ss + 4, P.SH, 0.6); rect(x0 - 2, y0 - 2, x0 + ss + 2, y0 + ss + 2, accent); rect(x0, y0, x0 + ss, y0 + ss, XS_BG);
  if (k >= 1) drawXsec(bx + XSB / 2, by + XSB / 2, XSB / 2 - 4, kind);
}
// a slice mark across a vessel between two screen points, with end ticks; kl: 0..1 drawn from the middle outward
function sliceMark(xa, xb, y, kl, c) {
  if (kl <= 0) return;
  const m = (xa + xb) / 2, a = Math.round(lerp(m, xa, kl)), b = Math.round(lerp(m, xb, kl));
  dashLine(a, y + 1, b, y + 1, P.SH, 3, 2, 0); dashLine(a, y, b, y, c, 3, 2, 0);
  if (kl >= 1) { rect(a - 1, y - 3, a + 1, y + 4, c); rect(b - 1, y - 3, b + 1, y + 4, c); }
}
// scene 9: both arteries cut across at the same level — the open ring beside the narrowed one
function xsecCompare(t) {
  const S = sCompare.last, t0 = EV.jet; if (!S || t < t0 || t >= EV.pan10) return;                 // with the jet: long enough on screen to be read
  const kl = clamp((t - t0) / 0.25, 0, 1) * clamp((EV.pan10 - t) / 0.2, 0, 1), k = stepK(t, t0 + 0.2, EV.pan10, 4, 0.25), by = 418;
  for (const [xf, kind, accent, bx, inner] of [[S.xfN, 'normal', P.ACC, 110, 1], [S.xfS, 'sten', P.WARN, 184, -1]]) {
    const a = project(S.cam, mApply(xf, [AR.XS, -AR.RO - 2, 1])), b = project(S.cam, mApply(xf, [AR.XS, AR.RO + 2, 1])); if (!a || !b) continue;
    const xa = Math.min(a[0], b[0]), xb = Math.max(a[0], b[0]), y = Math.round((a[1] + b[1]) / 2), xi = Math.round(inner > 0 ? xb + 3 : xa - 3);
    sliceMark(xa - 2, xb + 2, y, kl, accent);
    if (k >= 1) dashLine(xi, y + 5, xi, by - 3, accent, 2, 2, 0);          // the leader runs down the gap between the two arteries
    xsecInset(bx, by, kind, k, accent);
  }
}
// scene 10: the blocked segment cut across — no channel left inside the wall
function xsecBlock(t) {
  const S = sOcclusion.last, t0 = EV.block10; if (!S || t < t0 || t >= EV.pull11) return;           // with the key term and its low accent
  const kl = clamp((t - t0) / 0.25, 0, 1) * clamp((EV.pull11 - t) / 0.2, 0, 1), k = stepK(t, t0 + 0.2, EV.pull11, 4, 0.25), bx = 238, by = 372;
  const a = project(S.cam, mApply(S.xf, [AR.XO - 28, -AR.RO - 2, 1])), b = project(S.cam, mApply(S.xf, [AR.XO - 28, AR.RO + 2, 1])); if (!a || !b) return;
  const y = Math.round((a[1] + b[1]) / 2);
  sliceMark(Math.max(22, Math.min(a[0], b[0])), Math.min(338, Math.max(a[0], b[0])), y, kl, P.WARN);
  if (k >= 1 && y + 5 < by - 3) dashLine(bx + XSB / 2, y + 5, bx + XSB / 2, by - 3, P.WARN, 2, 2, 0);
  xsecInset(bx, by, 'occ', k, P.WARN);
}
// scene 11: arrows on the detour — out of the channel above the block, round it through the two side channels and
// back into the artery below (the parts of the route hidden behind the wall are shown too)
const COL_ROUTE = () => cached('colroute', () => collatPaths().map(pts => {
  const sg = pts[0][1] > 0 ? 1 : -1, a = pts[0], b = pts[pts.length - 1];
  return [[a[0] - 26, sg * 8], [a[0] - 14, sg * 17], ...pts.map(p => [p[0], p[1]]), [b[0] + 14, sg * 17], [b[0] + 26, sg * 8]];
}));
function collatArrows(t) {
  const S = sOcclusion.last; if (!S || t < EV.colFlow || t >= EV.cut12) return;
  const k = stepK(t, EV.colFlow, EV.cut12, 4, 0.3), clk = flowClock(t, 0.3);
  COL_ROUTE().forEach((pts, pi) => {
    const L = pts.length - 1;
    for (let i = 0; i < 4; i++) {
      const u = (clk + i / 4 + pi * 0.11) % 1, f = u * L, j = Math.min(L - 1, Math.floor(f)), h = f - j, a = pts[j], b = pts[j + 1];
      const p = project(S.cam, mApply(S.xf, [lerp(a[0], b[0], h), lerp(a[1], b[1], h), 2])), q = project(S.cam, mApply(S.xf, [b[0], b[1], 2])), o = project(S.cam, mApply(S.xf, [a[0], a[1], 2]));
      const e = Math.min(1, u / 0.06, (1 - u) / 0.06);                    // arrows grow in at the start of the route and shrink at its end
      if (p && q && o && e > 0.2) chevron(Math.round(p[0]), Math.round(p[1]), q[0] - o[0], q[1] - o[1], 5.2 * k * e, P.INK);
    }
  });
}
// ---------------------------------------------------------------- the contrast's route as a strip of icons (scene 15)
// arm vein → right heart → lungs → left heart → aorta and legs; each station lights up as the contrast front arrives
// in the 3D picture (the same arrival times, 15_circ.js)
const RT_ICON = [
  ['...........', '...........', '...........', '#...#####..', '#...#ooo#..', '#####ooo###', '#...#ooo#..', '#...#####..', '...........', '...........', '...........'],   // syringe: into the arm vein
  ['...........', '..oo...##..', '.oooo.####.', '.ooooo####.', '.ooooo####.', '.ooooo####.', '..oooo###..', '...ooo##...', '....oo#....', '.....o.....', '...........'],   // heart, the right side (on the viewer's left)
  ['.....#.....', '.....#.....', '....###....', '..oo.#.oo..', '.ooo.#.ooo.', '.ooo...ooo.', 'oooo...oooo', 'oooo...oooo', 'oooo...oooo', '.ooo...ooo.', '...........'],   // lungs
  ['...........', '..##...oo..', '.####.oooo.', '.####ooooo.', '.####ooooo.', '.####ooooo.', '..###oooo..', '...##ooo...', '....#oo....', '.....o.....', '...........'],   // heart, the left side
  ['...ooooo...', '...ooooo...', '...oo.oo...', '...oo.oo...', '...oo.oo...', '...oo.oo...', '...oo.oo...', '...oo.oo...', '...oo.oo...', '..ooo.ooo..', '...........'],   // aorta and legs
];
const RT_A = [6.6, 10.6, 12.6, 15.25, 16.55];                           // the front's arrival at each station (CTA-film times → ACLK)
function routeStrip(t) {
  if (t < EV.circ15 + 0.15 || t >= EV.fill16) return;                   // it stays to the cut
  const k = eout(clamp((t - EV.circ15 - 0.15) / 0.25, 0, 1));
  const n = RT_ICON.length, sc = 3, iw = 11 * sc, gap = 22, tw = n * iw + (n - 1) * gap, bw = tw + 26, x0 = Math.round(CX - bw / 2), y0 = 70, bh = 11 * sc + 13;
  band(x0, y0, bw, bh, k, P.ACC);
  if (k < 1) return;
  for (let i = 0; i < n; i++) {
    const x = x0 + 14 + i * (iw + gap), on = clamp((t - ACLK(RT_A[i])) / 0.2, 0, 1), pop = on > 0 && on < 1 ? 2 : 0;
    const lit = on > 0, main = lit ? P.CO3 : P.N5, dim = lit ? P.CO1 : P.N4;
    bmp(RT_ICON[i], x, y0 + 6 - pop, sc, { '#': i === 0 ? (lit ? P.INK : P.N5) : dim, o: i === 0 ? (lit ? P.CO2 : P.N4) : main });
    if (i + 1 < n) {                                                    // the link to the next station fills as the front travels
      const f = clamp((t - ACLK(RT_A[i])) / (ACLK(RT_A[i + 1]) - ACLK(RT_A[i])), 0, 1), xa = x + iw + 4, xb = x + iw + gap - 6, ym = y0 + 6 + Math.floor(11 * sc / 2) - 1;
      rect(xa, ym, xb, ym + 2, P.N4); if (f > 0) rect(xa, ym, Math.round(lerp(xa, xb, f)), ym + 2, P.CO2);
      const c = f >= 1 ? P.CO3 : P.N5; rect(xb - 2, ym - 3, xb, ym + 5, c); rect(xb, ym - 2, xb + 2, ym + 4, c); rect(xb + 2, ym - 1, xb + 3, ym + 3, c); rect(xb + 3, ym, xb + 4, ym + 2, c);      // arrow tip
    }
  }
}
// ---------------------------------------------------------------- all graphic overlays
function drawUI(t) {
  if (t >= EV.glu[0] && t < EV.push6) hourglass(301, 131, 1 - seg(t, EV.glu[0], EV.push6 - 0.1), stepK(t, EV.cap5, EV.push6, 3, 0.15));
  if (t >= EV.grow8 && t < EV.comp9) hourglass(301, 131, 1 - seg(t, EV.grow8, EV.comp9 - 0.1), stepK(t, EV.cap8, EV.comp9, 3, 0.15));
  diveReticle(t);
  locator(t);
  xsecCompare(t);
  xsecBlock(t);
  collatArrows(t);
  demandBars(t);
  routeStrip(t);
  viewerFrame(t);
  axialInset(t);
  axialInsetOcc(t);
  divider(t);
  lesionMarks(t);
}
