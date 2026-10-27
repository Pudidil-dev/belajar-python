'use strict';
// ============================================================================
// THE SCANNER (panels 1 and 19) as flat 2-D pixel art, seen from the foot of
// the table: the gantry ring faces us as a true circle, the two detector heads
// (L-mode, 90 deg apart) turn around the patient's chest as plain 2-D
// rotations, and the patient is drawn as layered silhouettes - blanket over
// the feet in front, gown and chest behind, the head (no face details) on the
// pillow inside the bore. No 3-D projection: every shape is drawn by hand in
// scene pixels and only scaled/panned by the 2-D camera.
// ============================================================================
const SCN = { bx: 180, by: 250, R: 152, r: 84, D: 90, hw: 63, ht: 26, floor: 470 };
// helpers in scene coordinates
const cx_ = (c, x) => c.x(x), cy_ = (c, y) => c.y(y);
function sEll(c, x, y, rx, ry, col, lv) { ellipse(c.x(x), c.y(y), Math.max(0.5, rx * c.z), Math.max(0.5, ry * c.z), col, lv); }
function sRect(c, x0, y0, x1, y1, col, lv) { rect(c.x(x0), c.y(y0), c.x(x1), c.y(y1), col, lv); }
function sPoly(c, pts, col, lv) { poly(c.pts(pts), col, lv); }
function sDisc(c, x, y, r, col, lv) { disc(c.x(x), c.y(y), Math.max(0.5, r * c.z), col, lv); }
// a rounded rectangle centred at (x, y), rotated by a (scene units)
function rrPts(x, y, hw, hh, rad, a) {
  const out = [], ca = Math.cos(a), sa = Math.sin(a);
  const corners = [[hw - rad, -hh + rad, -Math.PI / 2], [hw - rad, hh - rad, 0], [-hw + rad, hh - rad, Math.PI / 2], [-hw + rad, -hh + rad, Math.PI]];
  for (const [qx, qy, a0] of corners) for (let i = 0; i <= 4; i++) { const b = a0 + i / 4 * Math.PI / 2, px = qx + Math.cos(b) * rad, py = qy + Math.sin(b) * rad; out.push(x + px * ca - py * sa, y + px * sa + py * ca); }
  return out;
}
// ---------------------------------------------------------------- room
function scannerRoom(c, t) {
  rect(0, 0, W, H, P.BG);
  const fy = c.y(SCN.floor);
  rect(0, 0, W, fy, P.N1);
  for (let i = -6; i <= 6; i++) { const x = Math.round(c.x(SCN.bx + i * 64)); rect(x, 0, x + 1, fy, P.N2); rect(x + 1, 0, x + 2, fy, P.BG); }
  const ls = c.y(52); rect(0, ls, W, ls + Math.max(2, 3 * c.z), P.N3); rect(0, ls, W, ls + Math.max(1, c.z), P.N4);
  // wall monitor (panel 1): body silhouette + two scan rings
  const m0x = c.x(282), m0y = c.y(18), m1x = c.x(350), m1y = c.y(78);
  if (scannerRoom.monitor !== false && m1x > 0 && m0x < W) {
    rect(m0x - 3, m0y - 3, m1x + 3, m1y + 3, P.N4); rect(m0x, m0y, m1x, m1y, P.K0);
    const w = m1x - m0x, h = m1y - m0y;
    sEllAbs(m0x + w * 0.22, m0y + h * 0.2, w * 0.05, h * 0.08, P.SK2);
    rect(m0x + w * 0.16, m0y + h * 0.3, m0x + w * 0.28, m0y + h * 0.62, P.SK2); rect(m0x + w * 0.16, m0y + h * 0.62, m0x + w * 0.21, m0y + h * 0.9, P.SK1); rect(m0x + w * 0.23, m0y + h * 0.62, m0x + w * 0.28, m0y + h * 0.9, P.SK1);
    for (const k of [0, 1]) { const qx = m0x + w * 0.7, qy = m0y + h * (0.28 + 0.44 * k); ring(qx, qy, h * 0.15, 1, P.GB2); disc(qx, qy, h * 0.07, k ? P.RM7 : P.RM6); }
  }
  // floor: dark, perspective lines toward the bore
  rect(0, fy, W, H, P.K0);
  for (let i = -9; i <= 9; i++) { const x0 = c.x(SCN.bx + i * 18), x1 = c.x(SCN.bx + i * 110); line(x0, fy, x1, c.y(SCN.floor + 240), P.BG); }
  for (const d of [8, 22, 44, 80, 140]) { const y = c.y(SCN.floor + d); rect(0, y, W, y + 1, P.BG); }
}
function sEllAbs(x, y, rx, ry, col) { ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), col); }
// ---------------------------------------------------------------- gantry: base block, ring, bore
function drawGantry(c, t) {
  const { bx, by, R, r } = SCN, z = c.z, X = x => c.x(x), Y = y => c.y(y);
  // base under the ring
  const base = rrPts(bx, 430, 132, 44, 14, 0); const bm = maskPoly(c.pts(base));
  shade(bm, P.G2, P.G1, P.G3, P.G4, { k: Math.max(1, Math.round(z)) });
  sRect(c, bx - 96, 446, bx + 96, 452, P.G3); sRect(c, bx - 96, 446, bx + 96, 447, P.G4);
  // ring: outer disc with shading bands (light from the upper left), then the bore
  const om = maskDisc(X(bx), Y(by), R * z);
  for (let j = 0; j < om.h; j++) {
    const yy = om.y0 + j; if (yy < 0 || yy >= H) continue;
    for (let i = 0; i < om.w; i++) {
      if (!om.d[j * om.w + i]) continue; const xx = om.x0 + i; if (xx < 0 || xx >= W) continue;
      const dx = (xx + 0.5 - X(bx)) / (R * z), dy = (yy + 0.5 - Y(by)) / (R * z), d = Math.hypot(dx, dy);
      let v = 1.2 + 0.9 * (dx * 0.62 + dy * 0.78) + (d > 0.955 ? -0.8 : 0) + (d < 0.66 && d > 0.6 ? 0.7 : 0);
      v += (bay(xx, yy) - 0.5) * 0.7;
      buf[yy * W + xx] = v < 0.7 ? P.GW : v < 1.5 ? P.G1 : v < 2.2 ? P.G2 : P.G3;
    }
  }
  mOutline(om, P.G4);
  ring(X(bx), Y(by), (R - 3) * z, Math.max(1, z), P.GW, 0.6);
  // the rotating inner ring with its bolts (turns with the heads)
  ring(X(bx), Y(by), (r + 30) * z, Math.max(1, 2 * z), P.G3);
  ring(X(bx), Y(by), (r + 31.5) * z, Math.max(1, z), P.GW, 0.7);
  const th = roomRot(t)[0];
  for (let k = 0; k < 18; k++) { const a = th + k * TAU / 18; sDisc(c, bx + Math.sin(a) * (r + 15), by - Math.cos(a) * (r + 15), 1.6, P.G3); }
  // panel seams, a logo plate and a status lamp
  for (const a of [2.35, 3.95]) { const ca = Math.cos(a), sa = Math.sin(a); line(X(bx + ca * (r + 34)), Y(by + sa * (r + 34)), X(bx + ca * (R - 4)), Y(by + sa * (R - 4)), P.G2); }
  sRect(c, bx - 26, by - R + 14, bx + 26, by - R + 24, P.G2); sRect(c, bx - 24, by - R + 16, bx + 24, by - R + 22, P.G1);
  for (let i = 0; i < 6; i++) sRect(c, bx - 18 + i * 6, by - R + 18, bx - 15 + i * 6, by - R + 20, P.G3);
  const lpOn = Math.sin(t * 3) > 0; sRect(c, bx + 100, by + 92, bx + 108, by + 96, lpOn ? P.SG2 : P.SG1);
  // the bore: far opening (dark), inner tunnel wall visible below (we look a little down the table)
  const bm2 = maskDisc(X(bx), Y(by), r * z); mFill(bm2, P.G4);
  const far = maskDisc(X(bx), Y(by - 10), (r - 14) * z); mFill(far, P.N2);
  for (let j = 0; j < bm2.h; j++) {            // shading on the tunnel wall: darker at the bottom
    const yy = bm2.y0 + j, dy = (yy + 0.5 - Y(by)) / (r * z); if (yy < 0 || yy >= H) continue;
    for (let i = 0; i < bm2.w; i++) { if (!bm2.d[j * bm2.w + i] || far.get(bm2.x0 + i, yy)) continue; const xx = bm2.x0 + i; if (xx < 0 || xx >= W) continue; if (dy > 0.45 && bay(xx, yy) < (dy - 0.45) * 2) buf[yy * W + xx] = P.G5; if (dy < -0.4) buf[yy * W + xx] = P.G3; }
  }
  ring(X(bx), Y(by), r * z, Math.max(1, 2 * z), P.G5);
  ring(X(bx), Y(by), (r + 2.5) * z, Math.max(1, z), P.GB2);
  ring(X(bx), Y(by), (r + 4) * z, Math.max(1, z * 0.6), P.GB1, 0.5);
}
// ---------------------------------------------------------------- detector heads
function headPos(th) { return [SCN.bx + Math.sin(th) * SCN.D, SCN.by - Math.cos(th) * SCN.D]; }
function drawHead(c, th, t, glowK) {
  const [hx, hy] = headPos(th), a = th, z = c.z, ca = Math.cos(a), sa = Math.sin(a);
  const L = (u, v) => [hx + u * ca + v * sa, hy + u * sa - v * ca];        // u along the head width, v outward (+) / toward the patient (-)
  // bracket back to the rotating ring (behind the head, outward)
  const br = [L(-15, 6), L(15, 6), L(13, 46), L(-13, 46)];
  sPoly(c, [].concat(...br), P.G3); sPoly(c, [].concat(...[L(-15, 6), L(-10, 6), L(-9, 46), L(-13, 46)]), P.G2);
  sPoly(c, [].concat(...[L(-18, 40), L(18, 40), L(18, 48), L(-18, 48)]), P.G4);
  // depth (a darker copy offset down-right), then the housing
  const dep = rrPts(hx + 3, hy + 4, SCN.hw, SCN.ht, 7, a);
  sPoly(c, dep, P.G4);
  const hm = maskPoly(c.pts(rrPts(hx, hy, SCN.hw, SCN.ht, 7, a)));
  mFill(hm, P.G1);
  mRim(hm, P.GW, 1, 1); mRim(hm, P.GW, 2, 2, 0.5); mRim(hm, P.G3, -1, -1); mOutline(hm, P.G4);
  // recessed panel and vents on the outer half
  const pnl = rrPts(...L(0, 8), SCN.hw * 0.62, SCN.ht * 0.42, 3, a); sPoly(c, pnl, P.G2);
  const pnl2 = rrPts(...L(0, 8), SCN.hw * 0.56, SCN.ht * 0.3, 2, a); sPoly(c, pnl2, P.G3);
  for (let i = -3; i <= 3; i++) { const p = L(i * 8, 8), q = L(i * 8, 12); line(c.x(p[0]), c.y(p[1]), c.x(q[0]), c.y(q[1]), P.G2); }
  // the collimator face toward the patient: blue glowing strip
  const f0 = L(-SCN.hw + 5, -SCN.ht), f1 = L(SCN.hw - 5, -SCN.ht), f2 = L(SCN.hw - 5, -SCN.ht + 7), f3 = L(-SCN.hw + 5, -SCN.ht + 7);
  sPoly(c, [...f0, ...f1, ...f2, ...f3], P.GB1);
  const g0 = L(-SCN.hw + 6, -SCN.ht + 1), g1 = L(SCN.hw - 6, -SCN.ht + 1);
  line(c.x(g0[0]), c.y(g0[1]), c.x(g1[0]), c.y(g1[1]), P.GB3);
  const g2 = L(-SCN.hw + 6, -SCN.ht + 4), g3 = L(SCN.hw - 6, -SCN.ht + 4);
  line(c.x(g2[0]), c.y(g2[1]), c.x(g3[0]), c.y(g3[1]), P.GB2);
  if (glowK > 0) { const gc = L(0, -SCN.ht - 6); glow(c.x(gc[0]), c.y(gc[1]), 26 * z * glowK, P.GB1, P.GB2, Math.min(1, glowK)); }
}
// ---------------------------------------------------------------- table (end-on)
function drawTable(c, t) {
  const bx = SCN.bx;
  // pedestal and base plate
  const ped = maskPoly(c.pts([bx - 22, 330, bx + 22, 330, bx + 25, 452, bx - 25, 452])); shade(ped, P.TB1, P.TB2, P.TB0, P.TB0, {});
  sRect(c, bx - 22, 330, bx + 22, 338, P.TB0);
  for (let k = 0; k < 5; k++) sRect(c, bx - 14, 360 + k * 16, bx + 14, 361 + k * 16, P.TB0);
  sRect(c, bx - 58, 452, bx + 58, 470, P.TB1); sRect(c, bx - 58, 452, bx + 58, 455, P.TB3); sRect(c, bx - 58, 467, bx + 58, 470, P.TB0);
  // the table top: far end narrower and higher, near end at the feet
  sPoly(c, [bx - 56, 294, bx + 56, 294, bx + 70, 318, bx - 70, 318], P.TB4);
  sPoly(c, [bx - 70, 318, bx + 70, 318, bx + 70, 330, bx - 70, 330], P.TB2);
  sRect(c, bx - 70, 328, bx + 70, 330, P.TB1); sRect(c, bx - 70, 318, bx + 70, 319, P.C6);
  // blue pad
  sPoly(c, [bx - 50, 295, bx + 50, 295, bx + 62, 315, bx - 62, 315], P.TP2);
  sPoly(c, [bx - 62, 315, bx + 62, 315, bx + 62, 319, bx - 62, 319], P.TP0);
  sRect(c, bx - 62, 315, bx + 62, 316, P.TP3);
}
// ---------------------------------------------------------------- patient (layered, back to front)
function domeMask(c, x, y, rx, ry, flat) {      // upper half-ellipse (flat bottom at y)
  return maskFn(c.x(x - rx) - 1, c.y(y - ry) - 1, c.x(x + rx) + 1, c.y(y + (flat ? 0 : ry)) + 1, (px, py) => {
    const u = (c.wx(px) - x) / rx, v = (c.wy(py) - y) / ry; return u * u + v * v <= 1 && (flat ? c.wy(py) <= y : true);
  });
}
function drawPatient(c, t, opt) {
  opt = opt || {};
  const bx = SCN.bx, z = c.z;
  // pillow
  const pil = maskPoly(c.pts(rrPts(bx, 291, 30, 7, 5, 0))); shade(pil, P.G1, P.GW, P.G2, P.G3, {});
  // head: skin oval framed by hair (crown toward the gantry); only a soft nose shadow, no other features
  const hm = maskEll(c.x(bx), c.y(262), 18 * z, 20 * z, 0);
  organShade(hm, c.x(bx), c.y(262), 18 * z, 20 * z, [P.SK5, P.SK4, P.SK3, P.SK2, P.SK1, P.SK0], -0.4, -0.6);
  const hair = maskFn(c.x(bx - 20), c.y(240), c.x(bx + 20), c.y(284), (px, py) => {
    const u = (c.wx(px) - bx) / 19.5, v = (c.wy(py) - 262) / 21; if (u * u + v * v > 1) return false;
    return v < -0.42 + 0.1 * Math.cos(u * 3.2) || Math.abs(u) > 0.86 - 0.3 * Math.max(0, v);
  });
  mFill(hair, P.HR1); mRim(hair, P.HR2, 1, 1); mOutline(hair, P.HR0);
  mOutline(hm, P.SK1);
  sEll(c, bx + 1.5, 266, 2.2, 3.4, P.SK2); sEll(c, bx, 265, 1.6, 2.8, P.SK4);
  // calm closed eyes (two short arcs) so the face does not read as blank
  for (const sg of [-1, 1]) { const ex = bx + sg * 7.5, ey = 259; for (let i = -2; i <= 2; i++) { const px = ex + i * 1.1, py = ey + 0.28 * i * i; sRect(c, px - 0.55, py - 0.5, px + 0.55, py + 0.5, P.HR1); } }
  // ears
  sEll(c, bx - 19, 266, 2.5, 4, P.SK2); sEll(c, bx + 19, 266, 2.5, 4, P.SK2);
  // shoulders/chest under the gown
  const ch = domeMask(c, bx, 314, 54, 42, true);
  shade(ch, P.BK2, P.BK3, P.BK0, P.BK0, { k: Math.max(1, Math.round(2 * z)) });
  // collar (skin V at the neck) and gown seams
  sPoly(c, [bx - 9, 273, bx + 9, 273, bx, 284], P.SK3); sPoly(c, [bx - 6, 273, bx + 6, 273, bx, 280], P.SK4);
  line(c.x(bx - 30), c.y(284), c.x(bx - 40), c.y(302), P.BK1); line(c.x(bx + 30), c.y(284), c.x(bx + 40), c.y(302), P.BK1);
  // the heart glow (tracer) appears under the gown on the patient's left (screen right)
  if (opt.heartGlow > 0) { glow(c.x(bx + 12), c.y(292), 16 * z, P.OR1, P.OR3, opt.heartGlow); }
  // arms: sleeves at the sides, hands resting on the blanket
  for (const sg of [-1, 1]) {
    const sl = maskEll(c.x(bx + sg * 50), c.y(300), 12 * z, 16 * z, sg * 0.25); shade(sl, P.BK2, P.BK3, P.BK0, P.BK0, {});
    const hn = maskEll(c.x(bx + sg * 54), c.y(315), 9 * z, 7 * z, 0); shade(hn, P.SK3, P.SK4, P.SK2, P.SK1, {});
    for (let k = -1; k <= 1; k++) line(c.x(bx + sg * 54 + k * 3), c.y(318), c.x(bx + sg * 54 + k * 3), c.y(321), P.SK2);
  }
  // belly / hips (gown), slightly nearer
  const bl = domeMask(c, bx, 318, 50, 30, true);
  shade(bl, P.BK1, P.BK2, P.BK0, P.BK0, {});
  // the blanket over the legs: a low white mound whose top rises into two soft peaks (the feet)
  const prof = u => { const f = Math.exp(-((u + 0.3) ** 2) / 0.02) + Math.exp(-((u - 0.3) ** 2) / 0.02); return Math.sqrt(Math.max(0, 1 - u * u)) * (0.62 + 0.22 * f); };
  const bk = maskFn(c.x(bx - 64), c.y(290), c.x(bx + 64), c.y(331), (px, py) => { const u = (c.wx(px) - bx) / 64, y = c.wy(py); return Math.abs(u) <= 1 && y <= 330 && y >= 330 - 46 * prof(u); });
  mFill(bk, P.G1);
  mRim(bk, P.GW, 1, 1); mRim(bk, P.GW, 2, 2, 0.6); mRim(bk, P.G3, -1, -1);
  for (const sg of [-1, 1]) { const x = bx + sg * 19; polyline(c.pts(spline([x - sg * 9, 329, x - sg * 4, 318, x + sg * 1, 306], 5, false)), P.G2); }
  for (const k of [-2, 2]) { const x = bx + k * 21; polyline(c.pts(spline([x, 330, x + k * 1.2, 322, x + k * 2, 314], 4, false)), P.G2); }
  polyline(c.pts(spline([bx - 6, 330, bx, 316, bx + 4, 306], 4, false)), P.G2);
  mOutline(bk, P.G3);
}
// ---------------------------------------------------------------- everything
// o.heads [th1, th2] (default roomRot), o.glow detector faces, o.heartGlow
function drawScanner(c, t, o) {
  o = o || {};
  const ths = o.heads || roomRot(t);
  scannerRoom.monitor = o.monitor; scannerRoom(c, t);
  drawGantry(c, t);
  const below = ths.filter(th => Math.cos(th) < -0.2), above = ths.filter(th => Math.cos(th) >= -0.2);
  for (const th of below) drawHead(c, th, t, o.glow || 0);
  drawTable(c, t);
  drawPatient(c, t, o);
  for (const th of above) drawHead(c, th, t, o.glow || 0);
}
// the point on the chest the hook pushes into (scene px)
const CHEST2 = [SCN.bx + 12, 300];
