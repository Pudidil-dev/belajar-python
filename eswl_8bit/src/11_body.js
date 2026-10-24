'use strict';
// ============================================================================
// BODY — mm world, stone centre at the origin, +y towards the feet.
// Patient's left kidney in a frontal section: capsule, cortex, medullary
// pyramids with papillae, renal sinus fat, collecting system (minor + major
// calyces, renal pelvis) filled with urine, ureter, bladder, urethra. The right
// side is mirrored about the midline (x = -45) and sits a little lower.
// ============================================================================
const KID = { cx: 22, cy: -3, a: 26, b: 57, nx: -6, ny: -3, nr: 14, scx: 10, scy: -3, sa: 14, sb: 34 };
const MID = -45;
const CS = [], PYR = [];
const URETER = [-3, 8, -6, 16, -10, 35, -16, 70, -24, 120, -32, 180, -39, 232, -43, 246];
function csCap(x0, y0, x1, y1, r, w) { CS.push({ k: 0, x0, y0, x1, y1, r, w, b: [Math.min(x0, x1) - r - 4, Math.min(y0, y1) - r - 4, Math.max(x0, x1) + r + 4, Math.max(y0, y1) + r + 4] }); }
function csEll(cx, cy, rx, ry, w) { CS.push({ k: 1, cx, cy, rx, ry, w, b: [cx - rx - 5, cy - ry - 5, cx + rx + 5, cy + ry + 5] }); }
function csCup(cx, cy, r, nx, ny, w) { CS.push({ k: 2, cx, cy, r, nx, ny, w, b: [cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4] }); }
function bodyInit() {
  csEll(0, 0, 7.5, 9.5, 1.3);                                  // renal pelvis (the stone sits here)
  csCap(3, -7, 10, -22, 3.0, 1.1); csCap(3, 7, 10, 17, 3.0, 1.1);   // upper / lower major calyx
  csCap(5, -1, 18, -3, 2.3, 1.0);                               // middle calyx
  const cups = [[12.4, -35, 10, -22], [20.7, -25.5, 10, -22], [23, -3, 18, -3], [20.7, 19.5, 10, 17], [12.4, 30.5, 10, 17]];
  for (const [x, y, fx, fy] of cups) {
    let nx = x - KID.scx, ny = y - KID.scy; const l = Math.hypot(nx, ny); nx /= l; ny /= l;
    csCap(fx, fy, x - nx * 1.5, y - ny * 1.5, 2.0, 1.0);            // minor calyx neck
    csCup(x, y, 3.6, nx, ny, 0.9);                                   // cup around the papilla
    const ax = x + nx * 0.4, ay = y + ny * 0.4, bx = x + nx * 15, by = y + ny * 15, px = -ny, py = nx;
    PYR.push({ ax, ay, nx, ny, x1: bx + px * 7.5, y1: by + py * 7.5, x2: bx - px * 7.5, y2: by - py * 7.5, pcx: x + nx * 2.6, pcy: y + ny * 2.6 });
  }
  for (let i = 0; i + 3 < URETER.length; i += 2) csCap(URETER[i], URETER[i + 1], URETER[i + 2], URETER[i + 3], i === 0 ? 2.2 : 1.6, 1.0);
  csEll(MID, 264, 30, 21, 2.6);                                  // bladder
  csCap(MID, 285, MID, 340, 1.3, 1.0);                           // urethra
}
// signed distance (mm) to the urine-filled lumen (negative inside); wall thickness -> _csw
let _csw = 1;
function csDist(x, y) {
  let best = 1e9; _csw = 1;
  for (let i = 0; i < CS.length; i++) {
    const c = CS[i], bb = c.b;
    if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) continue;
    let d;
    if (c.k === 0) {
      const vx = c.x1 - c.x0, vy = c.y1 - c.y0, l2 = vx * vx + vy * vy || 1e-9;
      const h = clamp(((x - c.x0) * vx + (y - c.y0) * vy) / l2, 0, 1);
      d = Math.hypot(x - c.x0 - vx * h, y - c.y0 - vy * h) - c.r;
    } else if (c.k === 1) {
      const dx = x - c.cx, dy = y - c.cy, e = Math.hypot(dx / c.rx, dy / c.ry);
      d = e < 1e-6 ? -Math.min(c.rx, c.ry) : (e - 1) * Math.hypot(dx, dy) / e;
    } else {
      const dc = Math.hypot(x - c.cx, y - c.cy) - c.r, dp = Math.hypot(x - c.cx - c.nx * 2.6, y - c.cy - c.ny * 2.6) - 2.5;
      d = Math.max(dc, -dp);
    }
    if (d < best) { best = d; _csw = c.w; }
  }
  return best;
}
function inPyr(Q, x, y) {
  if ((x - Q.pcx) ** 2 + (y - Q.pcy) ** 2 < 2.5 * 2.5) return true;    // papilla
  const s1 = (Q.x1 - Q.ax) * (y - Q.ay) - (Q.y1 - Q.ay) * (x - Q.ax);
  const s2 = (Q.x2 - Q.x1) * (y - Q.y1) - (Q.y2 - Q.y1) * (x - Q.x1);
  const s3 = (Q.ax - Q.x2) * (y - Q.y2) - (Q.ay - Q.y2) * (x - Q.x2);
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
}
function kidneyCol(x, y, px, py, z, opt) {
  const mm = 1 / z, b = bay(px, py);
  const d = csDist(x, y), w = _csw;
  if (d < 0) {                                                   // urine: transparent amber
    if (d > -Math.max(0.22, 0.8 * mm)) return P.UR3;
    return b < 0.26 + 0.22 * vn2(x * 0.22, y * 0.22, 61) ? P.UR2 : P.UR1;
  }
  if (d < w) {                                                   // urothelium, then smooth muscle
    if (d < Math.max(0.3, mm)) return P.KD4;
    return (Math.sin((x + y) * 5.5) > 0.6 && z > 6) ? P.KD2 : (b < 0.6 ? P.KD3 : P.KD2);
  }
  if (d < w + Math.max(0.3, mm)) return P.KD1;
  const ex = (x - KID.cx) / KID.a, ey = (y - KID.cy) / KID.b, e = ex * ex + ey * ey;
  const dn = Math.hypot(x - KID.nx, y - KID.ny) - KID.nr;
  if (e <= 1 && dn > 0) {
    const se = Math.sqrt(e), rr = Math.hypot(x - KID.cx, y - KID.cy) / (se || 1e-6), edge = Math.min(rr * (1 - se), dn);
    if (edge < Math.max(0.45, mm)) return P.KD4;                 // capsule
    if (edge < Math.max(0.9, 2 * mm)) return P.KD1;
    const s = ((x - KID.scx) / KID.sa) ** 2 + ((y - KID.scy) / KID.sb) ** 2;
    if (s < 1) return b < 0.35 + 0.25 * vn2(x * 0.5, y * 0.5, 63) ? P.FA1 : P.FA0;   // renal sinus fat
    for (let i = 0; i < PYR.length; i++) {
      const Q = PYR[i];
      if (inPyr(Q, x, y)) { const sp = (x - Q.ax) * -Q.ny + (y - Q.ay) * Q.nx; return Math.sin(sp * 2.4) > 0.55 ? P.MD2 : (b < 0.2 ? P.MD0 : P.MD1); }
    }
    return b < 0.3 + 0.3 * vn2(x * 0.7, y * 0.7, 64) ? P.KD3 : P.KD2;   // cortex
  }
  if (dn <= 0 && e <= 1.2) return b < 0.3 ? P.FA1 : P.FA0;    // hilum fat
  if (e < 1.32) return b < 0.3 ? P.FA0 : P.N2;                  // perirenal fat
  if (opt.spine) {
    const sx = Math.abs(x - MID);
    if (sx < 17 && y > -130 && y < 236) {
      const m = ((y + 130) % 32 + 32) % 32;
      if (m < 2 || m > 29) return P.N4;                          // discs
      return sx > 15 || m < 3.5 || m > 27.5 ? P.BO0 : (b < 0.4 ? P.BO2 : P.BO1);
    }
    const pw = 7 + (y + 60) * 0.11;
    if (y > -60 && y < 215 && sx > 18 && sx < 18 + pw) return Math.sin(y * 0.9 + sx * 0.4) > 0.8 ? P.MR1 : (b < 0.3 ? P.MR1 : P.MR0);
  }
  return opt.bg === undefined ? P.BG : opt.bg;
}
// draw the kidney world (any scale); opt: {clip:[x0,y0,x1,y1], spine, bg}
const KWCACHE = [];
function drawKidneyWorld(cam, opt) {
  opt = opt || {};
  const cl = opt.clip || [0, 0, W, H], z = cam.z;
  const X0 = Math.max(0, Math.floor(cl[0])), X1 = Math.min(W, Math.ceil(cl[2])), Y0 = Math.max(0, Math.floor(cl[1])), Y1 = Math.min(H, Math.ceil(cl[3]));
  const key = [cam.cx, cam.cy, z, cam.ax, cam.ay, opt.spine ? 1 : 0, opt.bg === undefined ? -1 : opt.bg, X0, Y0, X1, Y1].join('|');
  for (const c of KWCACHE) if (c.key === key) { for (let py = Y0; py < Y1; py++) buf.set(c.img.subarray(py * W + X0, py * W + X1), py * W + X0); return; }
  drawKidneyWorldRaw(cam, opt, X0, Y0, X1, Y1);
  const img = new Uint32Array(W * H); for (let py = Y0; py < Y1; py++) img.set(buf.subarray(py * W + X0, py * W + X1), py * W + X0);
  KWCACHE.push({ key, img }); if (KWCACHE.length > 6) KWCACHE.shift();
}
function drawKidneyWorldRaw(cam, opt, X0, Y0, X1, Y1) {
  const z = cam.z;
  for (let py = Y0; py < Y1; py++) {
    const wy = cam.wy(py + 0.5), row = py * W;
    for (let px = X0; px < X1; px++) {
      let x = cam.wx(px + 0.5), y = wy;
      if (x < MID) { x = 2 * MID - x; y -= 11 * clamp((150 - y) / 80, 0, 1); }
      buf[row + px] = kidneyCol(x, y, px, py, z, opt);
    }
  }
}
// plain urine backdrop (inside the renal pelvis close-ups)
function urineBG() {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) buf[y * W + x] = bay(x, y) < 0.26 + 0.22 * vn2(x * 0.03, y * 0.03, 61) ? P.UR2 : P.UR1;
}
// a point along the ureter -> bladder -> urethra route, s in mm from the pelvis
const ROUTE = [0, 4, -3, 8, -6, 16, -10, 35, -16, 70, -24, 120, -32, 180, -39, 232, -43, 246, MID, 256, MID, 272, MID, 290, MID, 345];
// ---------------------------------------------------------------- torso, patient supine, seen from above (mm)
const BODY_R = [[-305, 34], [-300, 120], [-292, 165], [-272, 188], [-230, 160], [-150, 152], [-60, 140], [20, 128], [80, 132], [150, 150], [215, 152], [300, 140], [420, 112], [560, 96], [660, 92], [660, 18], [420, 14], [250, 6], [238, 0]];
const GOWN_R = [[-298, 40], [-292, 158], [-272, 182], [-230, 156], [-150, 149], [-60, 137], [20, 125], [80, 129], [150, 147], [226, 150], [226, 0]];
const ARM_R = [[-282, 172], [-262, 208], [-150, 214], [-20, 212], [110, 210], [160, 206], [196, 214], [204, 196], [190, 176], [150, 178], [-20, 176], [-200, 172]];
function mirrorPoly(half, closeMid) {
  const out = [];
  for (const [y, w] of half) out.push(MID + w, y);
  for (let i = half.length - 1; i >= 0; i--) { const [y, w] = half[i]; if (closeMid && w === 0) continue; out.push(MID - w, y); }
  return out;
}
let _bodyPoly = null, _gownPoly = null;
function drawTorso(cam, t, opt) {
  opt = opt || {};
  if (!_bodyPoly) { _bodyPoly = mirrorPoly(BODY_R, true); _gownPoly = mirrorPoly(GOWN_R, true); }
  clear(P.N1);
  // table (top view) + therapy-head opening below the left kidney
  const tb = maskRR(cam.x(-285), cam.y(-480), cam.x(195), cam.y(700), cam.s(40));
  shade(tb, P.C1, P.C2, P.C0, P.SH);
  // arms (both sides), body, head
  for (const sg of [1, -1]) {
    const a = []; for (const [y, w] of ARM_R) a.push(cam.x(MID + sg * w), cam.y(y));
    shade(maskPoly(a), P.SK2, P.SK3, P.SK1, P.SH);
  }
  shade(maskPoly(cam.pts(_bodyPoly)), P.SK2, P.SK3, P.SK1, P.SH);
  shade(maskEll(cam.x(MID), cam.y(-372), cam.s(58), cam.s(70)), P.SK2, P.SK3, P.SK1, P.SH);
  ellipse(cam.x(MID), cam.y(-398), cam.s(52), cam.s(40), P.ST1);                 // hair
  shade(maskPoly(cam.pts(_gownPoly)), P.GW1, P.GW2, P.GW0, P.SH);
  // blanket over the legs
  const bl = maskRR(cam.x(MID - 165), cam.y(236), cam.x(MID + 165), cam.y(690), cam.s(30));
  shade(bl, P.GW0, P.GW1, P.N2, P.SH);
  // cutaway window: urinary tract, spine, psoas
  const wx0 = cam.x(-150), wy0 = cam.y(-84), wx1 = cam.x(64), wy1 = cam.y(302);
  drawKidneyWorld(cam, { clip: [wx0, wy0, wx1, wy1], spine: true, bg: P.N2 });
  frame(Math.round(wx0) - 1, Math.round(wy0) - 1, Math.round(wx1) + 1, Math.round(wy1) + 1, P.C5);
  frame(Math.round(wx0) - 2, Math.round(wy0) - 2, Math.round(wx1) + 2, Math.round(wy1) + 2, P.SH);
  if (opt.stone !== false) drawStone(cam, { D: opt.D || 0 });
  // treatment head is under the table, below the kidney
  if (opt.head) {
    const r = cam.s(72), n = 40;
    for (let i = 0; i < n; i += 2) {
      const a0 = i / n * TAU, a1 = (i + 1) / n * TAU;
      line(cam.x(Math.cos(a0) * 72), cam.y(Math.sin(a0) * 72), cam.x(Math.cos(a1) * 72), cam.y(Math.sin(a1) * 72), P.WC3, opt.head);
    }
    if (r > 6) ring(cam.x(0), cam.y(0), 2, 1, P.WC4, opt.head);
  }
}
// ---------------------------------------------------------------- treatment suite, side view (stage px; stone at 128,226)
const SUITE = { sx: 128, sy: 226 };
function drawSuite(cam, t, opt) {
  opt = opt || {};
  const X = v => cam.x(v), Y = v => cam.y(v), S = v => cam.s(v);
  clear(P.BG);
  rect(0, Y(372), W, H, P.N2); rect(0, Y(372), W, Y(373), P.N4);
  for (let i = 0; i < 6; i++) rect(0, Y(372) + 3 + i * 7 + i * i, W, Y(372) + 4 + i * 7 + i * i, P.N3);
  const hl = opt.hl || {};
  // ultrasound imaging arm (separate from the therapy source)
  rect(X(13), Y(118), X(18), Y(366), P.C2); rect(X(13), Y(118), X(14), Y(366), P.C3);
  shade(maskRR(X(4), Y(362), X(28), Y(372), S(2)), P.C1, P.C2, P.C0, P.SH);
  lineW(X(16), Y(122), X(74), Y(110), Math.max(1, S(3)), P.C3); lineW(X(74), Y(110), X(113), Y(188), Math.max(1, S(3)), P.C3);
  disc(X(74), Y(110), S(3), P.C4); disc(X(16), Y(122), S(3), P.C4);
  const pr = maskPoly([X(109), Y(186), X(117), Y(186), X(121), Y(204), X(113), Y(204)]); shade(pr, P.T3, P.T4, P.T1, P.SH);
  rect(X(113), Y(203), X(121), Y(206), P.WC3);
  // imaging monitor on a ceiling arm
  lineW(X(188), Y(-40), X(188), Y(90), Math.max(1, S(3)), P.C2);
  const mon = maskRR(X(150), Y(88), X(226), Y(144), S(3)); shade(mon, P.C1, P.C3, P.C0, P.SH);
  rect(X(155), Y(93), X(221), Y(139), P.K0);
  { // live mini B-mode
    const ax = X(188), ay = Y(95), R = S(40);
    for (let yy = Math.floor(ay); yy < Y(139); yy++) for (let xx = Math.floor(X(155)); xx < X(221); xx++) {
      const dx = xx - ax, dy = yy - ay, r = Math.hypot(dx, dy); if (dy <= 0 || r > R || Math.abs(dx) > dy * 0.75) continue;
      const g = hash3(xx, yy, Math.floor(t * 12)); pset(xx, yy, g < 0.35 ? P.CT3 : g < 0.6 ? P.CT2 : P.CT1);
    }
    disc(X(190), Y(117), Math.max(1, S(2)), P.CT6); rect(X(189), Y(119), X(192), Y(138), P.K0);
    const c = P.WC3; rect(X(186), Y(117), X(195), Y(118), c); rect(X(190), Y(113), X(191), Y(122), c);
  }
  if (hl.mon > 0) mOuter(mon, hl.mon > 0.5 ? P.WC4 : P.WC2);
  // table + positioning column
  shade(maskRR(X(160), Y(362), X(216), Y(372), S(2)), P.C1, P.C2, P.C0, P.SH);
  const col = maskRR(X(177), Y(244), X(199), Y(364), S(2)); shade(col, P.C2, P.C3, P.C1, P.SH);
  for (let i = 0; i < 4; i++) rect(X(180), Y(262 + i * 24), X(196), Y(263 + i * 24), P.C1);
  const tab = maskRR(X(24), Y(238), X(250), Y(246), S(2)); shade(tab, P.C3, P.C5, P.C1, P.SH);
  rect(X(110), Y(238), X(146), Y(246), P.N1);
  if (hl.tab > 0) { mOuter(tab, hl.tab > 0.5 ? P.WC4 : P.WC2); mOuter(col, hl.tab > 0.5 ? P.WC4 : P.WC2); }
  // treatment head: water cushion touches the skin through the table opening (no incision)
  const head = maskRR(X(100), Y(250), X(156), Y(320), S(7)); shade(head, P.C3, P.C4, P.C1, P.SH, { k: 2 });
  rect(X(106), Y(250), X(150), Y(253), P.C1);
  rect(X(121), Y(320), X(135), Y(362), P.C2); rect(X(121), Y(320), X(123), Y(362), P.C3);
  shade(maskRR(X(100), Y(360), X(156), Y(372), S(2)), P.C1, P.C2, P.C0, P.SH);
  const cu = maskRR(X(111), Y(236), X(145), Y(252), S(3)); shade(cu, P.WC2, P.WC3, P.WC1, P.SH);
  for (let i = 0; i < 4; i++) rect(X(112), Y(240 + i * 3.4), X(144), Y(241 + i * 3.4), P.WC1);
  if (hl.head > 0) { mOuter(head, hl.head > 0.5 ? P.WC4 : P.WC2); mOuter(cu, hl.head > 0.5 ? P.WC4 : P.WC2); }
  // console
  const cs = maskPoly([X(204), Y(306), X(250), Y(300), X(250), Y(372), X(204), Y(372)]); shade(cs, P.C2, P.C3, P.C1, P.SH);
  rect(X(226), Y(296), X(229), Y(304), P.C1);
  const scr = maskRR(X(210), Y(276), X(248), Y(298), S(2)); shade(scr, P.C1, P.C2, P.C0, P.SH);
  rect(X(213), Y(279), X(245), Y(295), P.K0);
  for (let i = 0; i < 4; i++) rect(X(215), Y(281 + i * 3.5), X(215 + 8 + ((i * 7) % 15)), Y(282.5 + i * 3.5), i === 3 ? P.Y2 : P.WC3);
  for (let i = 0; i < 5; i++) rect(X(208 + i * 8), Y(310), X(212 + i * 8), Y(312), [P.G2, P.WC3, P.Y2, P.WC3, P.R3][i]);
  if (hl.con > 0) { mOuter(cs, hl.con > 0.5 ? P.WC4 : P.WC2); mOuter(scr, hl.con > 0.5 ? P.WC4 : P.WC2); }
  // patient (supine, head left): pillow, head, gown, blanket, near arm
  shade(maskRR(X(28), Y(229), X(68), Y(238), S(3)), P.C4, P.C5, P.C2, P.SH);
  shade(maskEll(X(46), Y(219), S(12), S(13)), P.SK2, P.SK3, P.SK1, P.SH);
  ellipse(X(41), Y(224), S(9), S(9), P.ST1); pset(X(52), Y(214), P.SK1);
  rect(X(56), Y(222), X(64), Y(234), P.SK1);
  const torso = maskPoly([X(60), Y(238), X(60), Y(214), X(70), Y(205), X(100), Y(202), X(122), Y(205), X(150), Y(204), X(168), Y(213), X(173), Y(238)]);
  shade(torso, P.GW1, P.GW2, P.GW0, P.SH);
  const legs = maskPoly([X(168), Y(238), X(168), Y(214), X(200), Y(219), X(234), Y(223), X(240), Y(216), X(247), Y(216), X(247), Y(238)]);
  shade(legs, P.GW0, P.GW1, P.N2, P.SH);
  lineW(X(70), Y(215), X(146), Y(221), Math.max(1, S(6)), P.SK1); lineW(X(70), Y(214), X(146), Y(220), Math.max(1, S(4)), P.SK2);
  disc(X(149), Y(220), S(3.5), P.SK2);
  // x-ray style window onto the kidney + stone (the anchor of the zoom)
  const wr = S(10);
  disc(X(SUITE.sx), Y(SUITE.sy), wr + 1, P.C5); disc(X(SUITE.sx), Y(SUITE.sy), wr, P.N1);
  ellipse(X(SUITE.sx + 1), Y(SUITE.sy), S(6.5), S(4), P.KD2); ellipse(X(SUITE.sx + 1), Y(SUITE.sy), S(4), S(2.2), P.UR2);
  disc(X(SUITE.sx), Y(SUITE.sy), Math.max(1, S(1.6)), P.ST4);
  if (opt.pulse > 0) { const k = opt.pulse; ring(X(SUITE.sx), Y(SUITE.sy + 22 * (1 - k)), S(3 + 6 * (1 - k)), 1, P.SW2, 0.8); }
}
