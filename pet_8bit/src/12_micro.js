'use strict';
// ============================================================================
// MICRO WORLDS — tissue cells (um), the FDG molecule (Haworth projection of
// 2-deoxy-2-[18F]fluoro-D-glucose), water-filled tissue at atomic scale for
// the positron track, blood with biconcave red cells, cellular uptake via
// GLUT transporters + hexokinase trapping, the dose vial in its shield, and
// the forearm IV injection.
// ============================================================================
// ---------------------------------------------------------------- tissue (um world, cells ~14 um)
const TS = 14;
function cellSeed(i, j) { return [(i + 0.2 + 0.6 * hash3(i, j, 51)) * TS, (j + 0.2 + 0.6 * hash3(i, j, 52)) * TS]; }
function cellNear(x, y) { // nearest + second-nearest cell seeds
  const ix = Math.floor(x / TS), iy = Math.floor(y / TS); let e1 = 1e9, e2 = 1e9, bi = 0, bj = 0;
  for (let j = iy - 1; j <= iy + 1; j++) for (let i = ix - 1; i <= ix + 1; i++) { const s = cellSeed(i, j), dx = x - s[0], dy = y - s[1], e = dx * dx + dy * dy; if (e < e1) { e2 = e1; e1 = e; bi = i; bj = j; } else if (e < e2) e2 = e; }
  return [bi, bj, Math.sqrt(e1), Math.sqrt(e2)];
}
// uptake level of a cell (0..1): the lesion region around the origin is avid
function cellUptake(i, j) { const d = Math.hypot(i + 0.5, j + 0.5); return clamp(1.1 - d * 0.16, 0.15, 1) * (0.6 + 0.4 * hash3(i, j, 53)); }
function drawTissue(cam, t, opt) {
  opt = opt || {};
  const z = cam.z, mw = Math.max(0.5, 1.1 / z);
  for (let py = 0; py < H; py++) {
    const wy = cam.wy(py + 0.5), row = py * W;
    for (let px = 0; px < W; px++) {
      const wx = cam.wx(px + 0.5), [i, j, d1, d2] = cellNear(wx, wy), b = bay(px, py);
      let c;
      if (d2 - d1 < mw * 2) c = P.TI4;                                                             // membrane
      else if (d2 - d1 < mw * 4.5) c = b < 0.5 ? P.TI3 : P.TI2;
      else {
        const s = cellSeed(i, j), nx = wx - s[0] - 1.2, ny = wy - s[1] + 0.8, nr = 3.2 + 0.8 * hash3(i, j, 54);
        const dn = Math.hypot(nx, ny * 1.15);
        if (dn < nr) c = dn < 0.9 ? P.TI3 : (dn > nr - mw * 1.5 ? P.TI3 : (b < 0.3 ? P.TI0 : P.TI1));   // nucleus + nucleolus
        else c = b < 0.18 + 0.2 * vn2(wx * 0.6, wy * 0.6, 55) ? P.TI3 : P.TI2;                    // granular cytoplasm
      }
      buf[row + px] = c;
    }
  }
  if (opt.hlCell) { const [i, j] = opt.hlCell, s = cellSeed(i, j); ring(cam.x(s[0]), cam.y(s[1]), cam.s(TS * 0.62), 1.5, P.TR3, opt.hlK === undefined ? 1 : opt.hlK); }
  // tracer molecules accumulated in cells (more in avid cells)
  if (z > 1.2) {
    const x0 = Math.floor(cam.wx(0) / TS) - 1, x1 = Math.ceil(cam.wx(W) / TS) + 1, y0 = Math.floor(cam.wy(0) / TS) - 1, y1 = Math.ceil(cam.wy(H) / TS) + 1;
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      const u = cellUptake(i, j), n = Math.round(u * 7), s = cellSeed(i, j);
      for (let k = 0; k < n; k++) {
        const a = hash3(i * 7 + k, j, 56) * TAU, r = (2.5 + 3.5 * hash3(i, j * 7 + k, 57)) + 0.4 * Math.sin(t * 3 + k);
        const mx = s[0] + Math.cos(a) * r + 0.3 * Math.sin(t * 5 + k * 2), my = s[1] + Math.sin(a) * r * 0.9;
        tracerIcon(cam.x(mx), cam.y(my), Math.max(1, z * 0.42), a);
      }
    }
  }
}
// small tracer icon: cyan ring + orange F-18 marker
function tracerIcon(x, y, s, a) {
  if (s < 1.6) { pset(x, y, P.TR2); pset(x + 1, y, P.FO2); return; }
  const r = s * 1.2;
  for (let k = 0; k < 6; k++) { const a0 = a + k / 6 * TAU, a1 = a + (k + 1) / 6 * TAU; line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, P.TR2); }
  disc(x + Math.cos(a + 2.1) * r * 1.5, y + Math.sin(a + 2.1) * r * 1.5, Math.max(1, s * 0.55), P.FO2);
}
// ---------------------------------------------------------------- FDG, Haworth projection (unit = 1 C-C bond)
const FDG_RING = { O5: [0.95, -0.45], C1: [1.45, 0.15], C2: [0.75, 0.6], C3: [-0.35, 0.6], C4: [-1.05, 0.15], C5: [-0.45, -0.45] };
// substituents: [atom, dy (up -1 / down +1), label]
const FDG_SUB = [['C1', 1, 'OH'], ['C2', 1, 'F'], ['C3', -1, ''], ['C4', 1, 'OH'], ['C5', -1, 'CH2OH']];   // ring H atoms omitted for clarity
function fdgF(cx, cy, s) { const p = FDG_RING.C2; return [cx + p[0] * s, cy + (p[1] + 0.95) * s]; }
function drawFDG(cx, cy, s, opt) {
  opt = opt || {};
  const at = k => [cx + FDG_RING[k][0] * s, cy + FDG_RING[k][1] * s];
  const ring = ['O5', 'C1', 'C2', 'C3', 'C4', 'C5', 'O5'];
  for (let k = 0; k + 1 < ring.length; k++) { // front edge (C1-C2-C3-C4) drawn bold, as in a Haworth projection
    const a = at(ring[k]), b = at(ring[k + 1]), front = ['C1C2', 'C2C3', 'C3C4'].includes(ring[k] + ring[k + 1]);
    lineW(a[0], a[1], b[0], b[1], front ? Math.max(2, s * 0.16) : Math.max(1, s * 0.06), front ? P.TR2 : P.TR1);
  }
  for (const [k, dy, lab] of FDG_SUB) {
    const a = at(k), len = (lab === 'H' ? 0.5 : 0.8) * s, ex = a[0], ey = a[1] + dy * len;
    line(a[0], a[1], ex, ey, P.TR1);
    if (lab === 'F') {
      const f = opt.fGlow || 0; if (f > 0) glow(ex, ey + 4, s * 0.9, P.FO0, P.FO1, f);
      disc(ex, ey + 4, Math.max(2, s * 0.26), P.FO2); disc(ex - 1, ey + 3, Math.max(1, s * 0.1), P.FO3);
      if (opt.labels !== false) text(FM, '18F', ex + s * 0.3, ey + 1, { c: P.FO3, ol: P.SH });
    } else if (lab === '') disc(ex, ey, Math.max(1.5, s * 0.08), P.TR3);   // C3-OH (unlabelled, keeps the ring readable)
    else if (opt.labels !== false && s > 16) text(FM, lab, ex - textW(FM, lab, 2) / 2, dy < 0 ? ey - 13 : ey + 2, { c: P.TR3, ol: P.SH });
  }
  for (const k of ['C1', 'C2', 'C3', 'C4', 'C5']) { const a = at(k); disc(a[0], a[1], Math.max(1.5, s * 0.1), P.TR2); }
  const o = at('O5'); disc(o[0], o[1], Math.max(2, s * 0.16), P.TR3); if (opt.labels !== false && s > 16) text(FM, 'O', o[0] - 3, o[1] - 5, { c: P.BG, ol: null });
}
// ---------------------------------------------------------------- atomic-scale tissue (water) + the positron's track
// world units: arbitrary "atomic" units; the positron starts at the origin (its nucleus)
const PTRACK = [];
(function () {
  let x = 0, y = 0, a = -0.25;
  PTRACK.push([x, y]);
  for (let i = 0; i < 15; i++) {
    const step = lerp(34, 7, i / 14) * (0.8 + 0.4 * hash(i * 3 + 1));
    a += (hash(i * 3 + 2) - 0.5) * 2.3 * (0.4 + i / 14);       // larger deflections as it slows
    a = clamp(a, -1.6, 1.4);
    x += Math.cos(a) * step; y += Math.sin(a) * step; PTRACK.push([x, y]);
  }
})();
const PTRACK_P = new Path(PTRACK.flat());
// positron position after slowing: u in [0,1] -> path point (decelerating)
function ptrackAt(u) { return PTRACK_P.at(PTRACK_P.L * eout(clamp(u, 0, 1))); }
function waterField(cam, t, lv) {
  lv = lv === undefined ? 1 : lv;
  const g = 36, x0 = Math.floor(cam.wx(0) / g) - 1, x1 = Math.ceil(cam.wx(W) / g) + 1, y0 = Math.floor(cam.wy(0) / g) - 1, y1 = Math.ceil(cam.wy(H) / g) + 1;
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
    const ox = (i + hash3(i, j, 61)) * g + Math.sin(t * 2 + i) * 0.8, oy = (j + hash3(i, j, 62)) * g + Math.cos(t * 1.7 + j) * 0.8, a = hash3(i, j, 63) * TAU;
    const X = cam.x(ox), Y = cam.y(oy), r = cam.s(4.2);
    if (X < -20 || X > W + 20 || Y < -20 || Y > H + 20) continue;
    for (const s of [-1, 1]) { const ha = a + s * 0.91, hx = X + Math.cos(ha) * r * 1.5, hy = Y + Math.sin(ha) * r * 1.5; line(X, Y, hx, hy, P.EL1, 0.6 * lv); disc(hx, hy, r * 0.62, P.EL0, 0.5 * lv); disc(hx, hy, Math.max(1, r * 0.22), P.SL0, lv); } // 2 H at 104.5 deg
    disc(X, Y, r * 1.35, P.EL0, 0.45 * lv); disc(X, Y, r * 0.85, P.EL1, 0.5 * lv); disc(X, Y, Math.max(1, r * 0.3), P.SL1, lv);   // O atom + its electron cloud
  }
}
// ---------------------------------------------------------------- blood vessel lumen with biconcave red cells (flow +x)
function rbc(x, y, r, phi) { // face-on (phi=0) -> edge-on (phi=pi/2)
  const ry = Math.max(1.2, r * Math.abs(Math.cos(phi))), m = maskEll(x, y, r, ry);
  shade(m, P.RB2, P.RB3, P.RB1, P.RB0);
  if (ry > r * 0.45) ellipse(x + r * 0.08, y + ry * 0.05, r * 0.42, ry * 0.42, P.RB1, 0.7);    // central pallor (thinner centre)
  else { disc(x - r * 0.55, y, ry * 0.9, P.RB2); disc(x + r * 0.55, y, ry * 0.9, P.RB2); }      // dumbbell edge profile
}
function drawBlood(t, opt) {
  opt = opt || {};
  const top = opt.top === undefined ? 110 : opt.top, bot = opt.bot === undefined ? 390 : opt.bot, mid = (top + bot) / 2, half = (bot - top) / 2;
  clear(P.TI1);
  rect(0, top, W, bot, P.RB0); rect(0, top, W, bot, P.TI0, 0.35);
  for (const [y0, d] of [[top, -1], [bot, 1]]) { // vessel wall: endothelium, then smooth muscle
    rect(0, y0 - (d < 0 ? 6 : 0), W, y0 + (d < 0 ? 0 : 6), P.TI4); rect(0, y0 - (d < 0 ? 14 : -6), W, y0 - (d < 0 ? 6 : -14), P.TI3);
    for (let x = -((t * 20) % 18); x < W; x += 18) rect(x, y0 - (d < 0 ? 12 : -8), x + 9, y0 - (d < 0 ? 11 : -9), P.TI2);
  }
  // laminar flow: faster at the centre; cells + tracer move with the plasma
  const N = 40;
  for (let k = 0; k < N; k++) {
    const yy = mid + (hash(k * 5 + 1) * 2 - 1) * (half - 16), v = 120 * (1 - ((yy - mid) / half) ** 2) + 25;
    const x = ((hash(k * 5 + 2) * (W + 80) + t * v) % (W + 80)) - 40, r = 11 + 2 * hash(k * 5 + 3), phi = (hash(k * 5 + 4) * 3 + t * 1.3 * (hash(k) - 0.5)) % Math.PI;
    rbc(x, yy, r, phi);
  }
  const M = opt.tracer === undefined ? 18 : opt.tracer;
  for (let k = 0; k < M; k++) {
    const yy = mid + (hash(k * 7 + 31) * 2 - 1) * (half - 10), v = 120 * (1 - ((yy - mid) / half) ** 2) + 25;
    const x = ((hash(k * 7 + 32) * (W + 40) + t * v) % (W + 40)) - 20;
    tracerIcon(x, yy, 2.6, t * 2 + k);
  }
}
// ---------------------------------------------------------------- FDG uptake: capillary -> GLUT transporter -> hexokinase -> trapped FDG-6-phosphate
const UP_CELLS = [{ y: 92, kind: 'NORMAL', rate: 0.25 }, { y: 214, kind: 'INFLAMED', rate: 0.6 }, { y: 336, kind: 'TUMOR', rate: 1.0 }];
function drawUptake(t, opt) {
  opt = opt || {};
  clear(P.TI1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (bay(x, y) < 0.15 + 0.15 * vn2(x * 0.05, y * 0.05, 71)) buf[y * W + x] = P.TI2;   // interstitium
  // capillary (left), blood flowing down
  rect(14, 0, 64, H, P.RB0); rect(10, 0, 14, H, P.TI4); rect(64, 0, 68, H, P.TI4);
  for (let k = 0; k < 9; k++) { const y = ((hash(k + 3) * (H + 60) + t * 60) % (H + 60)) - 30; rbc(39, y, 11, Math.PI / 2 * 0.15 + 0.2 * hash(k)); }
  const u = opt.u || 0;                                                                              // time-lapse progress 0..1
  UP_CELLS.forEach((C, ci) => {
    const cx = 178, cy = C.y, rx = 74, ry = 52, m = maskEll(cx, cy, rx, ry);
    shade(m, P.TI2, P.TI3, P.TI1, P.TI4);
    ring(cx, cy, Math.min(rx, ry) - 0.5, 0.01, P.TI4);
    ellipse(cx + 18, cy + 4, 20, 16, P.TI0); ellipse(cx + 18, cy + 4, 18, 14, P.TI1); disc(cx + 22, cy + 2, 4, P.TI3);    // nucleus
    // GLUT transporters on the membrane facing the capillary
    const ng = 2 + Math.round(C.rate * 3);
    for (let g = 0; g < ng; g++) { const a = Math.PI + (g - (ng - 1) / 2) * 0.32, gx = cx + Math.cos(a) * rx, gy = cy + Math.sin(a) * ry; shade(maskRR(gx - 4, gy - 6, gx + 4, gy + 6, 3), P.CR1, P.CR2, P.CR0, P.TR0); rect(gx - 1, gy - 4, gx + 1, gy + 4, P.TR0); }
    // hexokinase (enzyme) near the membrane
    shade(maskEll(cx - 40, cy + 14, 9, 7), P.C2, P.C3, P.C1, P.C0);
    // trapped FDG-6-phosphate accumulates (time-lapse); each gets a small yellow phosphate tag
    const n = Math.round(u * 14 * C.rate);
    for (let k = 0; k < n; k++) {
      const a = hash3(ci, k, 72) * TAU, r = 0.25 + 0.55 * hash3(ci, k, 73), x = cx - 12 + Math.cos(a) * r * (rx - 30) + Math.sin(t * 3 + k) * 1.2, y = cy + Math.sin(a) * r * (ry - 16) + Math.cos(t * 2.6 + k) * 1.2;
      tracerIcon(x, y, 2.4, a); pset(x + 3, y - 3, P.Y2); pset(x + 4, y - 3, P.Y2);
    }
    // molecules in transit: capillary -> GLUT -> inside
    for (let k = 0; k < 3; k++) {
      const ph = ((t * (0.8 + C.rate) + k / 3 + ci * 0.21) % 1), gy = cy + (k - 1) * 14;
      const x = ph < 0.5 ? lerp(60, cx - rx, ph / 0.5) : lerp(cx - rx, cx - 40, (ph - 0.5) / 0.5), y = ph < 0.5 ? lerp(cy - 30 + k * 30, gy, ph / 0.5) : gy;
      tracerIcon(x, y, 2.4, k + t);
    }
    if (UI_ON && opt.tags) tag(C.kind, cx + 2, cy - ry - 13, opt.tags + ci * 0.15, t, { align: 'center', c: P.TI4 });
  });
}
// ---------------------------------------------------------------- the dose: F-18 FDG vial in a tungsten shield (stage px)
function trefoil(x, y, r, c, bg) {
  disc(x, y, r, bg);
  for (let k = 0; k < 3; k++) { const a0 = -Math.PI / 2 + k * TAU / 3 - 0.52, a1 = a0 + 1.05; const pts = [x, y]; for (let i = 0; i <= 6; i++) { const a = lerp(a0, a1, i / 6); pts.push(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86); } poly(pts, c); }
  disc(x, y, r * 0.3, bg); disc(x, y, r * 0.2, c);
}
function drawVial(t, opt) {
  opt = opt || {};
  clear(P.BG);
  rect(0, 352, W, H, P.N2); rect(0, 352, W, 353, P.N4);                                             // bench
  // tungsten shield (cut open) and its lid set aside
  const sh = maskRR(70, 168, 200, 352, 12); shade(sh, P.T2, P.T4, P.T1, P.T0, { k: 3 });
  rect(98, 176, 172, 352, P.T0); rect(100, 176, 170, 350, P.N1);                                     // cavity (cutaway)
  shade(maskRR(208, 316, 262, 352, 8), P.T2, P.T4, P.T1, P.T0); rect(212, 312, 258, 318, P.T3);      // lid
  // glass vial: crimp cap, septum, shoulder, liquid with tracer
  const vx0 = 106, vx1 = 164, top = 196;
  shade(maskRR(vx0 + 12, top - 22, vx1 - 12, top - 6, 3), P.C3, P.C5, P.C1, P.C0);                    // aluminium crimp cap
  rect(vx0 + 20, top - 24, vx1 - 20, top - 20, P.R1 || P.TI3);                                         // rubber septum
  const glass = maskPoly(splineClosed([vx0 + 14, top - 6, vx1 - 14, top - 6, vx1 - 12, top + 2, vx1, top + 16, vx1, 344, vx0, 344, vx0, top + 16, vx0 + 12, top + 2], 2));
  mFill(glass, P.N3); mOutline(glass, P.SL1);
  const ly = 250;                                                                                      // liquid level
  for (let y = ly; y < 343; y++) for (let x = vx0 + 2; x < vx1 - 1; x++) if (glass.get(x, y)) buf[y * W + x] = bay(x, y) < 0.35 ? P.TR1 : P.TR0;
  rect(vx0 + 2, ly, vx1 - 1, ly + 1, P.TR3);
  rect(vx0 + 4, top + 20, vx0 + 6, 336, P.SL2, 0.6);                                                  // glass highlight
  // label with the radiation trefoil
  rect(vx0 + 4, 276, vx1 - 4, 318, P.SC3); rect(vx0 + 4, 276, vx1 - 4, 284, P.Y2);
  trefoil(vx0 + 16, 298, 9, P.K0, P.Y2);
  text(FM, 'F-18', vx0 + 28, 288, { c: P.K0, ol: null }); text(FM, 'FDG', vx0 + 28, 302, { c: P.K0, ol: null });
  // molecules visible only in the magnified inset (they are far too small to see)
  if (opt.inset > 0) {
    const k = opt.inset, R = 8 + 34 * eout(k), ix = 135, iy = 300;
    disc(ix, iy, R + 3, P.CR2); disc(ix, iy, R + 1, P.SL2); disc(ix, iy, R, P.TR0);
    for (let n = 0; n < 9; n++) { const a = n * 2.4 + t, rr = R * 0.6 * hash(n + 5); if (R > 14) tracerIcon(ix + Math.cos(a) * rr, iy + Math.sin(a) * rr, 2.4, a); }
  }
}
// ---------------------------------------------------------------- forearm IV injection (seen from above, arm on an arm board)
// world = stage px at zoom 1 (forearm ~26 cm -> 130 px); pass a Cam to frame it
const ARM_UP = [-10, 222, 40, 220, 78, 224, 94, 230, 120, 227, 170, 232, 214, 238, 226, 236, 246, 230, 262, 236, 268, 248, 262, 262, 246, 268, 226, 263, 214, 261, 170, 266, 120, 270, 94, 270, 78, 276, 40, 282, -10, 284];
function drawArm(cam, t, opt) {
  opt = opt || {};
  const X = v => cam.x(v), Y = v => cam.y(v), S = v => Math.max(1, cam.s(v)), PT = a => cam.pts(a);
  clear(P.BG);
  shade(maskRR(X(-30), Y(206), X(300), Y(300), S(10)), P.SC1, P.SC2, P.SC0, P.SH);                       // padded arm board
  shade(maskPoly(PT(splineClosed(ARM_UP, 3))), P.SK2, P.SK3, P.SK1, P.SK0, { k: 2 });
  for (const [x, y] of [[242, 232], [252, 238], [258, 246], [252, 256]]) line(X(x), Y(y), X(x + 12), Y(y + 1), P.SK1);   // fingers
  const vein = [-20, 236, 50, 237, 90, 240, 130, 241, 170, 244, 210, 246];                               // cephalic vein
  for (let i = 0; i + 3 < vein.length; i += 2) lineW(X(vein[i]), Y(vein[i + 1]), X(vein[i + 2]), Y(vein[i + 3]), S(3), P.GW0, 0.55);
  lineW(X(70), Y(262), X(96), Y(240), S(3), P.GW0, 0.5);                                                 // median cubital vein
  rect(X(118), Y(232), X(150), Y(252), P.SL2, 0.25);                                                     // clear dressing
  lineW(X(108), Y(240), X(132), Y(241), S(2), P.SC3); shade(maskRR(X(132), Y(236), X(144), Y(246), S(2)), P.TI4, P.SL2, P.TI3, P.TI2);   // catheter + hub
  polyline(PT([144, 241, 160, 236, 176, 220, 186, 196, 192, 176]), P.SC3);                               // extension line
  const k = opt.push || 0, sx = 192, sy = 176, ang = -1.08, c = Math.cos(ang), s = Math.sin(ang);
  const Q = (u, v) => [X(sx + u * c - v * s), Y(sy + u * s + v * c)];
  shade(maskPoly([...Q(0, -9), ...Q(70, -9), ...Q(70, 9), ...Q(0, 9)]), P.T2, P.T4, P.T1, P.T0);        // tungsten syringe shield
  poly([...Q(14, -4), ...Q(52, -4), ...Q(52, 4), ...Q(14, 4)], P.TR1);                                    // lead-glass window
  const f = lerp(1, 0.15, k); poly([...Q(14, -3), ...Q(14 + 38 * f, -3), ...Q(14 + 38 * f, 3), ...Q(14, 3)], P.TR2);
  poly([...Q(70, -12), ...Q(74, -12), ...Q(74, 12), ...Q(70, 12)], P.T3);                                 // finger flange
  const pr = 74 + 24 * (1 - k); lineW(...Q(74, 0), ...Q(pr, 0), S(3), P.SC3); lineW(...Q(pr, -6), ...Q(pr, 6), S(3), P.SC2);   // plunger
  // nitrile-gloved hand: index + middle fingers hook the flange, thumb pushes the plunger
  for (const v of [-1, 1]) shade(maskPoly([...Q(66, v * 10), ...Q(78, v * 10), ...Q(80, v * 22), ...Q(68, v * 24)]), P.GL1, P.GL2, P.GL0, P.GL0);
  shade(maskPoly([...Q(78, -24), ...Q(98, -30), ...Q(112, -18), ...Q(104, 16), ...Q(82, 26)]), P.GL1, P.GL2, P.GL0, P.GL0);          // palm
  shade(maskPoly([...Q(pr + 1, -5), ...Q(pr + 9, -6), ...Q(110, -14), ...Q(104, -2), ...Q(pr + 9, 5), ...Q(pr + 1, 4)]), P.GL1, P.GL2, P.GL0, P.GL0);   // thumb
}
