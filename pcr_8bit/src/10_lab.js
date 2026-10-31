'use strict';
// ============================================================================
// THE LAB (world px, z = 1 shows the whole bench): the wall, the bench, the
// connected monitor running the qPCR software, and an original benchtop
// real-time thermal cycler (CFX96-type architecture, own design). The machine
// can turn X-ray: its housing dissolves and the inside shows — optical shuttle,
// heated lid, sealed plate, aluminium block, Peltier modules, heat sink, fan,
// controller board and the block's temperature sensor.
// ============================================================================
const MCH = {
  x0: 52, x1: 308, lidY0: 330, lidY1: 382, baseY0: 380, baseY1: 500,
  wells: 12, wx0: 80, wdx: 18.2, wTop: 366, wBot: 393, wR: 6.2,          // the front row of the 96-well plate
  blkY0: 369, blkY1: 399, pelY0: 399, pelY1: 405, hsY0: 405, hsY1: 446,
  fan: [180, 470, 19], pcb: [64, 452, 142, 492], sensor: [262, 386],
  shY: 342, heatY0: 358, heatY1: 365,
};
const wellX = i => MCH.wx0 + i * MCH.wdx;
const HOOK_WELL = 5;
// ---------------------------------------------------------------- background
const LAB_DUST = Array.from({ length: 40 }, (_, i) => ({ x: hash(i * 3 + 11) * 360, y: hash(i * 3 + 12) * 640, k: 0.3 + hash(i * 3 + 13) * 0.7, ph: hash(i + 900) * TAU }));
function labBG(cam, t) {
  rect(0, 0, W, H, P.BG);
  const X = v => cam.x(v), Y = v => cam.y(v);
  // wall: tall panels, a lit strip, shelves with bottle silhouettes
  for (let i = -2; i < 8; i++) { const x = X(i * 70); rect(x, 0, x + 1, Y(510), P.N1); }
  rect(0, Y(20), W, Y(26), P.N2);
  for (const [sx, sy, sw] of [[-30, 290, 120], [250, 290, 140]]) {
    rect(X(sx), Y(sy), X(sx + sw), Y(sy + 4), P.BE2); rect(X(sx), Y(sy + 4), X(sx + sw), Y(sy + 6), P.K0);
    for (let k = 0; k < 4; k++) { const bx = sx + 10 + k * 26, h = 18 + 10 * hash(k + sx); rect(X(bx), Y(sy - h), X(bx + 14), Y(sy), P.N3); rect(X(bx + 4), Y(sy - h - 5), X(bx + 10), Y(sy - h), P.N3); rect(X(bx + 2), Y(sy - h + 3), X(bx + 4), Y(sy - 3), P.N4); }
  }
  // floating dust in the light (environment motion)
  for (const d of LAB_DUST) { const x = ((d.x + 9 * wob(t, 2, d.ph) - cam.cx * 0.3 * d.k) % 360 + 360) % 360, y = ((d.y - (t / DUR) * 640 * (1 + Math.round(d.k * 2)) - cam.cy * 0.3 * d.k) % 640 + 640) % 640; pset(x, y, d.k > 0.7 ? P.N6 : P.N5); }
  // bench: top edge and front
  rect(0, Y(500), W, Y(506), P.BE4); rect(0, Y(506), W, Y(512), P.BE3); rect(0, Y(512), W, H, P.BE1);
  for (let i = 0; i < 6; i++) rect(0, Y(540 + i * 22), W, Y(541 + i * 22), P.BE0);
}
// bench props: a tube rack and a pipette
function labProps(cam, t) {
  const X = v => cam.x(v), Y = v => cam.y(v);
  // tube rack (left)
  rect(X(-4), Y(478), X(44), Y(500), P.CL1); rect(X(-4), Y(478), X(44), Y(481), P.CL2);
  for (let k = 0; k < 4; k++) { const x = 1 + k * 11; rect(X(x), Y(456), X(x + 7), Y(482), P.TB1); rect(X(x + 1), Y(466), X(x + 6), Y(482), P.LQ2); rect(X(x - 1), Y(452), X(x + 8), Y(457), k % 2 ? P.CP1 : P.CL2); }
  // pipette lying on the bench (right)
  lineW(X(312), Y(497), X(372), Y(488), 3 * cam.z, P.M2); lineW(X(312), Y(497), X(330), Y(494), 4 * cam.z, P.M4); rect(X(350), Y(484), X(356), Y(492), P.CL2);
}
// ---------------------------------------------------------------- monitor + qPCR software plot
const MON = { x0: 34, y0: 58, x1: 326, y1: 262 };
// plot area inside any rectangle (screen coords): o.cyc cycles drawn, o.thr show threshold, o.points, o.ic / o.pos / o.neg curves
function plotUI(x0, y0, x1, y1, o) {
  o = o || {};
  const gx0 = x0 + 22, gx1 = x1 - 8, gy0 = y0 + 8, gy1 = y1 - 16;
  rect(x0, y0, x1, y1, P.DS1);
  for (let i = 0; i <= 8; i++) { const x = lerp(gx0, gx1, i / 8); rect(x, gy0, x + 1, gy1, P.DG); }
  for (let j = 0; j <= 4; j++) { const y = lerp(gy1, gy0, j / 4); rect(gx0, y, gx1, y + 1, P.DG); }
  rect(gx0, gy0, gx0 + 1, gy1 + 1, P.DG2); rect(gx0, gy1, gx1, gy1 + 1, P.DG2);
  const sc = o.sc || 1;
  for (const c of [0, 10, 20, 30, 40]) text(FS, String(c), lerp(gx0, gx1, c / 40), gy1 + 4, { sc, c: P.SUB, ol: null, align: 'center' });
  const fy = f => gy1 - (f / 3800) * (gy1 - gy0), cx = c => lerp(gx0, gx1, c / 40);
  if (o.thr !== false) {
    const ty = fy(AMP.base + AMP.thr);
    dashLine(gx0, ty, gx1, ty, P.YEL, 4, 3, 0);
    if (o.thrLabel) text(FS, 'THRESHOLD', gx1 - 2, ty - 7 * sc, { sc, c: P.YEL, ol: null, align: 'right' });
  }
  const curve = (fn, upto, col, dot) => {
    let px_ = null, py_ = null;
    for (let c = 1; c <= upto + 1e-6; c++) {
      const x = cx(c), y = fy(fn(c));
      if (px_ !== null) line(px_, py_, x, y, col);
      if (dot) rect(x - 1, y - 1, x + 1, y + 1, col);
      px_ = x; py_ = y;
    }
    // partial segment to the current fractional cycle
    const cf = Math.min(upto, 40), c0 = Math.floor(cf);
    if (cf > c0 && c0 >= 1) { const x = lerp(cx(c0), cx(c0 + 1), cf - c0), y = lerp(fy(fn(c0)), fy(fn(c0 + 1)), cf - c0); line(cx(c0), fy(fn(c0)), x, y, col); }
  };
  if (o.neg !== undefined) curve(c => AMP.base + (hash(c * 13) - 0.5) * 14, o.neg, P.SUB, false);
  if (o.ic !== undefined) curve(ampIC, o.ic, P.HT3, false);
  if (o.pos !== undefined) curve(ampPos, o.pos, P.CD3, false);
  const cyc = o.cyc === undefined ? 40 : o.cyc;
  curve(ampRead, cyc, P.RP2, true);
  // the leading point pulses as each reading lands
  if (cyc >= 1 && o.live) { const c = Math.min(40, Math.floor(cyc)); disc(cx(c), fy(ampRead(c)), 2.5, P.RP3); }
  return { cx, fy, gx0, gx1, gy0, gy1 };
}
function drawMonitor(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v);
  // wall arm
  rect(X(176), Y(0), X(184), Y(MON.y0), P.M5); rect(X(178), Y(0), X(182), Y(MON.y0), P.M4);
  // bezel and screen
  const m = maskRR(X(MON.x0), Y(MON.y0), X(MON.x1), Y(MON.y1), 6 * cam.z);
  shade(m, P.M6, P.M5, P.K0, P.K0, {});
  const sx0 = X(MON.x0 + 8), sy0 = Y(MON.y0 + 8), sx1 = X(MON.x1 - 8), sy1 = Y(MON.y1 - 10);
  rect(sx0, sy0, sx1, sy1, P.DS0);
  if (sx1 - sx0 < 30) return;
  // title bar
  const sc = Math.max(1, Math.round(cam.z));
  rect(sx0, sy0, sx1, sy0 + 11 * sc, P.DS2);
  text(FS, 'qPCR RUN · FAM', sx0 + 4 * sc, sy0 + 3 * sc, { sc, c: P.SUB, ol: null });
  rect(sx1 - 9 * sc, sy0 + 3 * sc, sx1 - 4 * sc, sy0 + 8 * sc, o.live ? (Math.floor(t * 2) % 2 ? P.RP2 : P.RP1) : P.SUB);
  const pr = plotUI(sx0 + 2, sy0 + 13 * sc, sx1 - 2, sy1 - 2, { cyc: o.cyc, thrLabel: true, live: o.live, sc });
  text(FS, 'CYCLE', (pr.gx0 + pr.gx1) / 2, sy1 + 2 * sc, { sc, c: P.SUB, ol: null, align: 'center' });
  // the detection banner
  if (o.banner > 0) {
    const k = o.banner, bw = textW(FS, 'TARGET RNA DETECTED', 2) + 22, bx = (sx0 + sx1) / 2 - bw / 2, by = sy0 + 20 * sc;
    const s = backOut(clamp(k * 1.6, 0, 1), 1.4);
    if (s > 0.05) {
      const hw = bw / 2 * s, cxm = (sx0 + sx1) / 2;
      rect(cxm - hw, by, cxm + hw, by + 18, P.RP1); rect(cxm - hw, by + 18, cxm + hw, by + 20, P.RP0);
      if (s > 0.9) { checkMark(bx + 9, by + 9, 4, P.C6); text(FS, 'TARGET RNA DETECTED', bx + 18, by + 4, { sc: 2, c: P.C6, ol: null }); }
    }
  }
}
// ---------------------------------------------------------------- the thermal cycler
// o: { xray 0..1, lidHeat 0..1, blockT (°C), shuttle (0..1 across the row), fan (angle), focus (well index ring), cutRow }
function tempCol(T) {   // block colour by temperature: cool blue → neutral → hot orange
  if (T >= 80) return [P.HT1, P.HT2, P.HT3];
  if (T >= 58) return [P.AL1, P.AL2, P.AL3];
  return [P.CL1, P.CL2, P.CL3];
}
function drawWell(cam, i, o) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  const x = wellX(i), r = MCH.wR;
  const pts = [x - r, MCH.wTop, x + r, MCH.wTop, x + r * 0.62, MCH.wTop + 12, x + 1.6, MCH.wBot, x - 1.6, MCH.wBot, x - r * 0.62, MCH.wTop + 12];
  poly(cam.pts(pts), P.TB2);
  const inner = [x - r + 1.1, MCH.wTop + 6, x + r - 1.1, MCH.wTop + 6, x + r * 0.55, MCH.wTop + 12.5, x + 1, MCH.wBot - 1.4, x - 1, MCH.wBot - 1.4, x - r * 0.55, MCH.wTop + 12.5];
  poly(cam.pts(inner), o.liquid || P.LQ3);
  if (o.glow > 0) { const gy = (MCH.wTop + MCH.wBot) / 2 + 4; disc(X(x), Y(gy), 3.4 * z, P.EM2, Math.min(1, o.glow)); }
  line(X(x - r), Y(MCH.wTop), X(x - r * 0.62), Y(MCH.wTop + 12), P.TB1); line(X(x + r), Y(MCH.wTop), X(x + r * 0.62), Y(MCH.wTop + 12), P.TB1);
  rect(X(x - r - 0.8), Y(MCH.wTop - 1.2), X(x + r + 0.8), Y(MCH.wTop), P.TB1);
}
function machineInside(cam, t, o) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  // cavity
  rect(X(MCH.x0 + 6), Y(MCH.lidY0 + 6), X(MCH.x1 - 6), Y(MCH.baseY1 - 4), P.K0);
  // optical shuttle on its rail (lid)
  rect(X(MCH.x0 + 14), Y(MCH.shY - 1), X(MCH.x1 - 14), Y(MCH.shY + 1), P.M4);
  const sh = lerp(wellX(0), wellX(11), o.shuttle === undefined ? 0.45 : o.shuttle);
  rect(X(sh - 13), Y(MCH.shY - 6), X(sh + 13), Y(MCH.shY + 12), P.M5); rect(X(sh - 13), Y(MCH.shY - 6), X(sh + 13), Y(MCH.shY - 4), P.M3);
  rect(X(sh - 9), Y(MCH.shY + 8), X(sh - 3), Y(MCH.shY + 14), P.XB1); rect(X(sh + 3), Y(MCH.shY + 8), X(sh + 9), Y(MCH.shY + 14), P.PD2);
  if (o.read > 0) { line(X(sh - 6), Y(MCH.shY + 14), X(sh), Y(MCH.wTop + 6), P.XB2); line(X(sh + 6), Y(MCH.shY + 14), X(sh), Y(MCH.wTop + 6), P.EM2); }
  // heated lid
  const lh = o.lidHeat === undefined ? 0.6 : o.lidHeat;
  rect(X(MCH.x0 + 12), Y(MCH.heatY0), X(MCH.x1 - 12), Y(MCH.heatY1), lh > 0.5 ? P.HT1 : P.M4);
  for (let x = MCH.x0 + 16; x < MCH.x1 - 16; x += 6) rect(X(x), Y(MCH.heatY0 + 2), X(x + 3), Y(MCH.heatY0 + 4), lh > 0.5 ? P.HT3 : P.M3);
  for (let i = 0; i < MCH.wells; i++) rect(X(wellX(i) - 2.4), Y(MCH.heatY0), X(wellX(i) + 2.4), Y(MCH.heatY1), P.K0);   // optical openings
  // block
  const [b0, b1, b2] = tempCol(o.blockT === undefined ? 60 : o.blockT);
  rect(X(MCH.wx0 - 12), Y(MCH.blkY0), X(wellX(11) + 12), Y(MCH.blkY1), b1);
  rect(X(MCH.wx0 - 12), Y(MCH.blkY0), X(wellX(11) + 12), Y(MCH.blkY0 + 1.5), b2); rect(X(MCH.wx0 - 12), Y(MCH.blkY1 - 1.5), X(wellX(11) + 12), Y(MCH.blkY1), b0);
  // plate skirt and wells (sealed with clear film)
  rect(X(MCH.wx0 - 10), Y(MCH.wTop - 2), X(wellX(11) + 10), Y(MCH.wTop), P.TB1);
  for (let i = 0; i < MCH.wells; i++) drawWell(cam, i, { glow: o.wellGlow ? o.wellGlow(i) : 0 });
  rect(X(MCH.wx0 - 10), Y(MCH.wTop - 3.2), X(wellX(11) + 10), Y(MCH.wTop - 2), P.TB3);
  // temperature sensor (thermistor) in the block, wire to the board
  const [sx, sy] = MCH.sensor; disc(X(sx), Y(sy), 2.2 * z, P.CH0); line(X(sx), Y(sy), X(sx + 22), Y(sy + 18), P.RED); line(X(sx + 22), Y(sy + 18), X(sx + 22), Y(MCH.pcb[1] + 14), P.RED);
  // Peltier modules
  for (let k = 0; k < 3; k++) {
    const x0 = MCH.wx0 - 10 + k * 70, x1 = x0 + 64;
    rect(X(x0), Y(MCH.pelY0), X(x1), Y(MCH.pelY0 + 1.5), P.CE2); rect(X(x0), Y(MCH.pelY1 - 1.5), X(x1), Y(MCH.pelY1), P.CE1);
    for (let p = 0; p < 10; p++) rect(X(x0 + 3 + p * 6), Y(MCH.pelY0 + 1.5), X(x0 + 6 + p * 6), Y(MCH.pelY1 - 1.5), p % 2 ? P.PN1 : P.PN2);
  }
  // heat sink
  rect(X(MCH.wx0 - 14), Y(MCH.hsY0), X(wellX(11) + 14), Y(MCH.hsY0 + 4), P.AL1);
  for (let x = MCH.wx0 - 12; x < wellX(11) + 13; x += 5) rect(X(x), Y(MCH.hsY0 + 4), X(x + 2.2), Y(MCH.hsY1), P.AL0);
  // fan (face-on) and airflow
  const [fx, fy, fr] = MCH.fan, fa = o.fan || 0;
  disc(X(fx), Y(fy), fr * z, P.M5); disc(X(fx), Y(fy), (fr - 2) * z, P.K0);
  for (let k = 0; k < 5; k++) { const a = fa + k * TAU / 5; poly([X(fx) + Math.cos(a) * 3 * z, Y(fy) + Math.sin(a) * 3 * z, X(fx) + Math.cos(a + 0.5) * (fr - 3) * z, Y(fy) + Math.sin(a + 0.5) * (fr - 3) * z, X(fx) + Math.cos(a + 0.95) * (fr - 4) * z, Y(fy) + Math.sin(a + 0.95) * (fr - 4) * z], P.M3); }
  disc(X(fx), Y(fy), 4 * z, P.M2);
  if (o.air > 0) for (let k = 0; k < 6; k++) { const u = ((t * 1.3 + k / 6) % 1), x = lerp(fx + 26, MCH.x1 + 6, u), y = fy - 8 + (k % 3) * 8; dashLine(X(x - 10), Y(y), X(x), Y(y), P.CL3, 3, 2, 0); }
  // controller board
  const [px0, py0, px1, py1] = MCH.pcb;
  rect(X(px0), Y(py0), X(px1), Y(py1), P.CB2); rect(X(px0), Y(py0), X(px1), Y(py0 + 1.5), P.CB4);
  rect(X(px0 + 8), Y(py0 + 8), X(px0 + 30), Y(py0 + 26), P.CH1); rect(X(px0 + 40), Y(py0 + 12), X(px0 + 56), Y(py0 + 24), P.CH1);
  for (let k = 0; k < 6; k++) rect(X(px0 + 6 + k * 12), Y(py1 - 6), X(px0 + 10 + k * 12), Y(py1 - 3), P.AU1);
  // power supply
  rect(X(232), Y(456), X(296), Y(492), P.M5); for (let k = 0; k < 6; k++) rect(X(238 + k * 9), Y(462), X(242 + k * 9), Y(486), P.M6);
}
function drawMachine(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z, xr = o.xray || 0;
  if (xr > 0) machineInside(cam, t, o);
  const lv = 1 - xr;
  // base housing
  const mb = maskRR(X(MCH.x0), Y(MCH.baseY0), X(MCH.x1), Y(MCH.baseY1), 8 * z);
  if (lv > 0.02) shade(mb, P.M1, P.MW, P.M2, null, { lv, k: Math.max(1, Math.round(z)) });
  mOutline(mb, xr > 0.5 ? P.M3 : P.M4);
  // lid (dark), with a handle and a seam
  const ml = maskRR(X(MCH.x0 + 6), Y(MCH.lidY0), X(MCH.x1 - 6), Y(MCH.lidY1), 10 * z);
  if (lv > 0.02) shade(ml, P.M5, P.M4, P.M6, null, { lv, k: Math.max(1, Math.round(z)) });
  mOutline(ml, xr > 0.5 ? P.M4 : P.K0);
  rect(X(150), Y(MCH.lidY0 - 5), X(210), Y(MCH.lidY0 + 1), P.M4); rect(X(152), Y(MCH.lidY0 - 5), X(208), Y(MCH.lidY0 - 3), P.M3);
  if (lv > 0.02) {
    // front panel: status LCD, LEDs, vents
    const m2 = maskRR(X(70), Y(400), X(186), Y(470), 4 * z); shade(m2, P.DS1, P.M4, P.K0, P.M5, { lv });
    if (lv > 0.6) {
      const sc = Math.max(1, Math.round(z));
      text(FS, 'RUNNING', X(76), Y(406), { sc, c: P.RP2, ol: null });
      text(FS, 'CYCLE ' + String(Math.min(40, Math.max(1, Math.floor(o.cycle || 27)))).padStart(2, '0') + '/40', X(76), Y(418), { sc, c: P.SUB, ol: null });
      text(FS, (o.blockT === undefined ? 60 : o.blockT).toFixed(1) + '°C', X(76), Y(430), { sc, c: (o.blockT || 60) > 80 ? P.HT3 : P.CL3, ol: null });
      rect(X(76), Y(450), X(76) + Math.max(1, (180 - 76) * z * 0.6 * ((o.cycle || 27) / 40)), Y(454), P.RP1);
    }
    for (let k = 0; k < 9; k++) rect(X(206 + k * 10), Y(410), X(210 + k * 10), Y(460), P.M2, lv);
    disc(X(290), Y(484), 3 * z, Math.floor(t * 2) % 2 ? P.RP2 : P.RP1);
  }
  // feet
  rect(X(MCH.x0 + 10), Y(MCH.baseY1), X(MCH.x0 + 30), Y(MCH.baseY1 + 4), P.K0); rect(X(MCH.x1 - 30), Y(MCH.baseY1), X(MCH.x1 - 10), Y(MCH.baseY1 + 4), P.K0);
  // the cable to the monitor
  if (o.cable !== false) { lineW(X(MCH.x1 - 4), Y(420), X(326), Y(420), 2 * z, P.M6); lineW(X(326), Y(420), X(326), Y(MON.y1 - 20), 2 * z, P.M6); }
  // focus ring on one well
  if (o.focus !== undefined && o.focusK > 0) { const x = wellX(o.focus), y = (MCH.wTop + MCH.wBot) / 2; ring(X(x), Y(y), (16 - 6 * o.focusK) * z, 1.5, P.YEL); }
}
function labScene(cam, t, o) {
  o = o || {};
  labBG(cam, t);
  drawMonitor(cam, t, o.mon || {});
  drawMachine(cam, t, o.mach || {});
  labProps(cam, t);
}
// ---------------------------------------------------------------- sample collection: gloved hands, swab, tube
const GLV = () => [P.GL0, P.GL1, P.GL2, P.GL3, P.GL4];
function capsule(x0, y0, x1, y1, r, cols) {
  lineW(x0, y0, x1, y1, 2 * r + 2, cols[0]); disc(x0, y0, r + 1, cols[0]); disc(x1, y1, r + 1, cols[0]);
  lineW(x0, y0, x1, y1, 2 * r, cols[2]); disc(x0, y0, r, cols[2]); disc(x1, y1, r, cols[2]);
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, s = nx * -0.4 + ny * -0.6 > 0 ? 1 : -1;
  lineW(x0 + nx * r * 0.45 * s, y0 + ny * r * 0.45 * s, x1 + nx * r * 0.45 * s, y1 + ny * r * 0.45 * s, Math.max(1, r * 0.55), cols[3]);
  lineW(x0 - nx * r * 0.55 * s, y0 - ny * r * 0.55 * s, x1 - nx * r * 0.55 * s, y1 - ny * r * 0.55 * s, Math.max(1, r * 0.4), cols[1]);
}
const TUBE = { x: 196, rim: 236, body: 466, tip: 520, hw: 24, liq: 398 };
function sampleTube(cam, t, o) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z, T = TUBE;
  const body = [T.x - T.hw, T.rim, T.x + T.hw, T.rim, T.x + T.hw, T.body, T.x + 4, T.tip, T.x - 4, T.tip, T.x - T.hw, T.body];
  poly(cam.pts(body), P.TB1);
  const inner = [T.x - T.hw + 3, T.rim + 2, T.x + T.hw - 3, T.rim + 2, T.x + T.hw - 3, T.body - 1, T.x + 2, T.tip - 4, T.x - 2, T.tip - 4, T.x - T.hw + 3, T.body - 1];
  poly(cam.pts(inner), P.TB2);
  // transport medium (swirls when the swab is in)
  const lq = [T.x - T.hw + 3, T.liq, T.x + T.hw - 3, T.liq, T.x + T.hw - 3, T.body - 1, T.x + 2, T.tip - 4, T.x - 2, T.tip - 4, T.x - T.hw + 3, T.body - 1];
  poly(cam.pts(lq), P.LQ2); rect(X(T.x - T.hw + 3), Y(T.liq), X(T.x + T.hw - 3), Y(T.liq + 3), P.LQ3);
  if (o.swirl > 0) for (let k = 0; k < 4; k++) { const a = t * 6 + k * 1.6, yy = T.liq + 14 + k * 14; line(X(T.x - 16 * Math.cos(a)), Y(yy), X(T.x + 16 * Math.cos(a + 1)), Y(yy + 4), P.LQ3); }
  // label
  rect(X(T.x - T.hw + 4), Y(T.rim + 40), X(T.x + T.hw - 4), Y(T.rim + 120), P.MW); rect(X(T.x - T.hw + 4), Y(T.rim + 40), X(T.x + T.hw - 4), Y(T.rim + 46), P.CP1);
  for (let k = 0; k < 9; k++) rect(X(T.x - 14 + k * 3.4), Y(T.rim + 90), X(T.x - 13 + k * 3.4 + (k % 3 === 0 ? 1 : 0)), Y(T.rim + 112), P.M6);
  text(FS, 'VTM', X(T.x), Y(T.rim + 56), { sc: Math.max(1, Math.round(2 * z)), c: P.M5, ol: null, align: 'center' });
  // glass highlight
  rect(X(T.x - T.hw + 6), Y(T.rim + 4), X(T.x - T.hw + 9), Y(T.body - 10), P.TB3);
  // thread at the rim
  rect(X(T.x - T.hw - 2), Y(T.rim - 2), X(T.x + T.hw + 2), Y(T.rim + 12), P.TB1); for (let k = 0; k < 3; k++) rect(X(T.x - T.hw - 2), Y(T.rim + 2 + k * 3.5), X(T.x + T.hw + 2), Y(T.rim + 3 + k * 3.5), P.TB0);
}
function tubeCap(cam, x, y, rotK, z) {
  const X = cam.x(x), Y = cam.y(y);
  const m = maskRR(X - 30 * z, Y - 14 * z, X + 30 * z, Y + 16 * z, 4 * z); shade(m, P.CP1, P.CP2, P.CP0, P.CP0, { k: Math.max(1, Math.round(z)) });
  for (let k = 0; k < 9; k++) { const u = ((k / 9 + rotK) % 1), xx = X - 26 * z + u * 52 * z; rect(xx, Y - 12 * z, xx + Math.max(1, z), Y + 14 * z, P.CP0); }
}
// the swab: shaft from (hx, hy) (hand) to the tip at (tx, ty); broken: the lower piece only
function swab(cam, hx, hy, tx, ty, o) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  const dx = tx - hx, dy = ty - hy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const bp = o.breakAt === undefined ? 0.55 : o.breakAt;               // the moulded breakpoint, fraction from the tip side
  const sx0 = o.broken ? tx - ux * L * bp : hx, sy0 = o.broken ? ty - uy * L * bp : hy;
  lineW(X(sx0), Y(sy0), X(tx), Y(ty), 4 * z, P.SW0); lineW(X(sx0), Y(sy0), X(tx), Y(ty), 2.4 * z, P.SW2);
  if (!o.broken) { const bx = tx - ux * L * bp, by = ty - uy * L * bp; lineW(X(bx - ux * 3), Y(by - uy * 3), X(bx + ux * 3), Y(by + uy * 3), 5 * z, P.SW1); }
  // flocked tip with the collected sample (a glossy film)
  const m = maskEll(X(tx - ux * 9), Y(ty - uy * 9), 7 * z, 15 * z, Math.atan2(uy, ux) + Math.PI / 2);
  shade(m, P.SWT, P.SW2, P.SWT2, P.SW0, { k: Math.max(1, Math.round(z)) });
  for (let k = 0; k < 8; k++) pset(X(tx - ux * (3 + k * 2)) + (k % 2 ? 2 : -2) * z, Y(ty - uy * (3 + k * 2)), P.SWT2);
  if (o.wet) { disc(X(tx - ux * 6) - 2 * z, Y(ty - uy * 6), 2 * z, P.MU2); disc(X(tx - ux * 12) + 2 * z, Y(ty - uy * 12), 1.6 * z, P.MU2); }
}
// right hand pinching the swab shaft at (hx, hy), the arm leaving toward (ax, ay)
function swabHand(cam, hx, hy, ax, ay) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z, cols = GLV();
  const a = Math.atan2(hy - ay, hx - ax), ca = Math.cos(a), sa = Math.sin(a);
  capsule(X(ax), Y(ay), X(hx - ca * 34), Y(hy - sa * 34), 26 * z, cols);                         // back of the hand / wrist
  capsule(X(hx - ca * 30 - sa * 10), Y(hy - sa * 30 + ca * 10), X(hx + sa * 6), Y(hy - ca * 6), 8 * z, cols);   // index finger over the shaft
  capsule(X(hx - ca * 36 + sa * 12), Y(hy - sa * 36 - ca * 12), X(hx - sa * 4), Y(hy + ca * 6), 8.5 * z, cols); // thumb under it
  capsule(X(hx - ca * 40 - sa * 20), Y(hy - sa * 40 + ca * 20), X(hx - ca * 18 - sa * 22), Y(hy - sa * 18 + ca * 22), 8 * z, cols); // curled middle finger
  rect(X(ax) - 30 * z, Y(ay) - 8 * z, X(ax) + 30 * z, Y(ay) + 8 * z, P.GL1, 0.0);
}
// left hand holding the tube from below-left
function tubeHand(cam) {
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z, cols = GLV(), T = TUBE;
  capsule(X(40), Y(700), X(120), Y(520), 40 * z, cols);                                          // palm / wrist
  capsule(X(132), Y(488), X(T.x + T.hw + 4), Y(472), 9 * z, cols);                                // index wraps the tube
  capsule(X(128), Y(512), X(T.x + T.hw - 2), Y(500), 9 * z, cols);                                // middle
  capsule(X(120), Y(534), X(T.x + 8), Y(526), 8.5 * z, cols);                                     // ring
  capsule(X(110), Y(470), X(T.x - T.hw - 6), Y(420), 10 * z, cols);                               // thumb along the tube
}
// o: { sx, sy (swab tip), ang (shaft angle from vertical), hand, handLift, broken, cap [x, y, rotK], swirl }
function swabScene(cam, t, o) {
  o = o || {};
  const z = cam.z;
  rect(0, 0, W, H, P.BG);
  for (let i = 0; i < 10; i++) { const x = cam.x(-40 + hash(i + 3000) * 440), y = cam.y(hash(i + 3001) * 640); disc(x, y, (30 + hash(i + 3002) * 40) * z, i % 2 ? P.N2 : P.N1, 0.5); }
  rect(0, cam.y(600), W, H, P.BE1);
  sampleTube(cam, t, o);
  if (o.sx !== undefined) {
    const a = o.ang || 0, L = 250, hx = o.sx - Math.sin(a) * L, hy = o.sy - Math.cos(a) * L;
    if (o.broken) {
      // the lower piece stays in the tube; the snapped-off shaft leaves with the hand
      swab(cam, o.sx, TUBE.rim - 6, o.sx, o.sy, { broken: true, breakAt: 1, wet: true });
      const lx = o.handLift || 0, ux = hx - lx, uy = hy - lx * 1.4;
      if (o.hand) {
        lineW(cam.x(ux), cam.y(uy), cam.x(ux + (o.sx - hx) * 0.5), cam.y(uy + (TUBE.rim - 6 - hy) * 0.9), 4 * z, P.SW0); lineW(cam.x(ux), cam.y(uy), cam.x(ux + (o.sx - hx) * 0.5), cam.y(uy + (TUBE.rim - 6 - hy) * 0.9), 2.4 * z, P.SW2);
        swabHand(cam, ux, uy, ux - 110, uy - 120);
      }
    } else {
      swab(cam, hx, hy, o.sx, o.sy, { wet: true, breakAt: (o.sy - TUBE.rim + 6) / L });
      if (o.hand) swabHand(cam, hx, hy, hx - 110, hy - 120);
    }
  }
  tubeHand(cam);
  if (o.cap) tubeCap(cam, o.cap[0], o.cap[1], o.cap[2], z);
}
