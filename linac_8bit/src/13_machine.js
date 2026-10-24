'use strict';
// ============================================================================
// MACHINE world: side-view cutaway of a C-arm LINAC (stand on the left,
// gantry arm across the top, treatment head on the right over the patient).
// Two separate pathways:
//   RF:        RF source -> klystron -> RF waveguide -> accelerating waveguide
//   electrons: gun -> accelerating waveguide -> transport -> 270 deg magnet -> target
// Head order: target, primary collimator, flattening filter, monitor chamber,
//             jaws, MLC -> patient.  World units; overview at zoom 0.5.
// ============================================================================
const MW = {
  floor: 830, axisY: 280,
  awg0: 112, awg1: 332, cell: 20,
  magC: [420, 258], magR: 22, exitX: 398, targetY: 334,
  iso: [398, 615],
};
const RF_PATH = new Path([158, 466, 184, 466, 184, 248, 226, 248, 226, 262]);
const COAX_PATH = new Path([108, 576, 114, 576]);
const HV_PATH = new Path([172, 752, 172, 632, 136, 632, 136, 624]);
const HVGUN_PATH = new Path([52, 646, 52, 300, 62, 300, 62, 290]);
// beamline: gun -> straight -> 270-degree loop -> down to the target
const BEAM_PATH = (function () {
  const pts = [92, 280, 420, 280];
  const [cx, cy] = MW.magC, R = MW.magR;
  for (let i = 1; i <= 48; i++) { const ph = i / 48 * Math.PI * 1.5; pts.push(cx + R * Math.sin(ph), cy + R * Math.cos(ph)); }
  pts.push(MW.exitX, MW.targetY);
  return new Path(pts);
})();
const S_AWG0 = 20, S_AWG1 = 240, S_MAG0 = 328, S_MAG1 = 328 + 22 * Math.PI * 1.5, S_TGT = BEAM_PATH.L;

function wrr(cam, x0, y0, x1, y1, r) { return maskRR(cam.x(x0), cam.y(y0), cam.x(x1), cam.y(y1), r * cam.z); }
function wpoly(cam, pts) { return maskPoly(cam.pts(pts)); }
function wrect(cam, x0, y0, x1, y1, c, lv) { rect(cam.x(x0), cam.y(y0), cam.x(x1), cam.y(y1), c, lv); }
function wline(cam, x0, y0, x1, y1, c, w, lv) { lineW(cam.x(x0), cam.y(y0), cam.x(x1), cam.y(y1), Math.max(1, (w || 1) * cam.z), c, lv); }
function wdisc(cam, x, y, r, c, lv) { disc(cam.x(x), cam.y(y), Math.max(0.6, r * cam.z), c, lv); }
function wpath(cam, path, w, c, lv) { const q = cam.pts(path.p); for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, w * cam.z), c, lv); }

// ---------------------------------------------------------------- room
function machineRoomBG(cam) {
  clear(P.BG);
  const fy = cam.y(MW.floor);
  if (fy < H) { rect(0, fy, W, H, P.N1); rect(0, fy, W, fy + 1, P.N3); for (let x = -((cam.x(0) | 0) % 24); x < W; x += 24) rect(x, fy + 1, x + 1, H, P.N2); }
  // faint blueprint grid on the back wall
  const g = 40 * cam.z; if (g >= 8) {
    const ox = ((cam.x(0) % g) + g) % g, oy = ((cam.y(0) % g) + g) % g;
    for (let x = ox; x < W; x += g) rect(x, 0, x + 1, Math.min(H, fy), P.N1);
    for (let y = oy; y < Math.min(H, fy); y += g) rect(0, y, W, y + 1, P.N1);
  }
}
// ---------------------------------------------------------------- casing
function casingShapes(cam) {
  return {
    outer: [wrr(cam, 24, 206, 204, 830, 24), wrr(cam, 24, 206, 472, 322, 30), wpoly(cam, [346, 300, 450, 300, 450, 384, 436, 452, 360, 452, 346, 384])],
    inner: [wrr(cam, 28, 210, 200, 826, 20), wrr(cam, 28, 210, 468, 318, 26), wpoly(cam, [350, 304, 446, 304, 446, 384, 433, 448, 363, 448, 350, 384])],
  };
}
function drawShell(cam) { // open cutaway look
  const S = casingShapes(cam);
  for (const m of S.outer) mOuter(m, P.C0);
  for (const m of S.outer) mFill(m, P.C2);
  for (const m of S.outer) mRim(m, P.C3, 1, 1);
  for (const m of S.inner) mFill(m, P.N1);
  for (const m of S.inner) { mRim(m, P.N2, 1, 1); }
}
// ---------------------------------------------------------------- components
function drawModulator(cam, st) {
  const z = cam.z;
  shade(wrr(cam, 40, 640, 188, 812, 4), P.N2, P.N3, P.N1, P.C1);
  // mains input + AC wave
  wline(cam, 28, 706, 56, 706, P.C1, 2.4); wline(cam, 28, 706, 56, 706, P.C2, 1);
  if (st.ac > 0) { for (let x = 30; x < 56; x += 1) { const y = 706 + 3 * Math.sin((x - st.acPh * 40) / 4); psetD(cam.x(x), cam.y(y), P.C5, st.ac); } }
  shade(wrr(cam, 54, 690, 86, 724, 3), P.C2, P.C3, P.C1, P.C0);
  { const pts = []; for (let i = 0; i <= 16; i++) { const x = 60 + i * 20 / 16; pts.push(cam.x(x), cam.y(707 - 4 * Math.sin(i / 16 * TAU))); } polyline(pts, P.C5); }
  // buses
  wline(cam, 86, 674, 168, 674, P.C3, 1.2); wline(cam, 86, 746, 168, 746, P.C2, 1.2); wline(cam, 86, 700, 92, 700, P.C3, 1); wline(cam, 92, 674, 92, 700, P.C3, 1);
  // PFN: 4 capacitors with charge fill, inductors between
  const caps = [96, 112, 128, 144];
  caps.forEach((x, i) => {
    shade(wrr(cam, x, 680, x + 10, 742, 2), P.T2, P.T3, P.T1, P.T0);
    const q = clamp(st.charge * 1.15 - i * 0.05, 0, 1);
    const fh = 54 * q;
    if (fh > 0.5) { wrect(cam, x + 2, 740 - fh, x + 8, 740, P.C4); wrect(cam, x + 2, 740 - fh, x + 8, 740 - fh + 1.5, P.C6); }
    if (q > 0.6 && st.charge > 0.5) glow(cam.x(x + 5), cam.y(712), 9 * z, P.C2, null, (q - 0.6) * 1.4);
    wline(cam, x + 5, 674, x + 5, 680, P.C3, 1.2); wline(cam, x + 5, 742, x + 5, 746, P.C2, 1.2);
  });
  for (let i = 0; i < 3; i++) { // inductor loops
    const x0 = caps[i] + 7, x1 = caps[i + 1] + 3; const pts = [];
    for (let k = 0; k <= 24; k++) { const f = k / 24; pts.push(cam.x(lerp(x0, x1, f)), cam.y(671 - 3 * Math.abs(Math.sin(f * Math.PI * 3)))); }
    polyline(pts, P.C4);
  }
  // thyratron switch (glows when it fires)
  const fire = st.fire || 0;
  shade(wrr(cam, 158, 682, 176, 736, 6), fire > 0.05 ? P.C5 : P.N3, P.C4, P.N2, P.C3);
  if (fire > 0.05) { glow(cam.x(167), cam.y(709), 26 * z, P.C2, P.C4, fire); wrect(cam, 163, 690, 171, 728, P.C6, fire); }
  wline(cam, 167, 686, 167, 698, P.T4, 1.4); wline(cam, 167, 720, 167, 732, P.T4, 1.4); wline(cam, 162, 709, 172, 709, P.T3, 1);
  wline(cam, 167, 674, 167, 682, P.C3, 1.2); wline(cam, 167, 736, 167, 752, P.C3, 1.2);
  // pulse transformer
  shade(wrr(cam, 150, 752, 184, 798, 2), P.T1, P.T2, P.T0, P.T0);
  wrect(cam, 158, 760, 176, 790, P.N2);
  for (let i = 0; i < 6; i++) { wrect(cam, 151, 756 + i * 6.5, 158, 759 + i * 6.5, P.C3); }
  for (let i = 0; i < 9; i++) { wrect(cam, 176, 755 + i * 4.4, 183, 757.5 + i * 4.4, P.C4); }
  // output HV cable to the klystron, gun HV feed
  wpath(cam, HV_PATH, 4, P.C1); wpath(cam, HV_PATH, 1.6, P.C2);
  wpath(cam, HVGUN_PATH, 2.6, P.C1); wpath(cam, HVGUN_PATH, 1, P.C2);
  if (st.pulse !== undefined && st.pulse >= 0 && st.pulse <= 1.2) {
    for (const [pth, w] of [[HV_PATH, 4], [HVGUN_PATH, 2.6]]) {
      const s = st.pulse * pth.L, a = Math.max(0, s - 26), b = Math.min(pth.L, s);
      if (b > a) { const q = cam.pts(pth.sub(a, b, 2)); for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, w * z), P.C6); }
      if (s <= pth.L) { const [x, y] = pth.at(s); glow(cam.x(x), cam.y(y), 10 * z, P.C2, P.C5, 0.9); }
    }
  }
}
function drawRFSource(cam, st) {
  const z = cam.z;
  shade(wrr(cam, 64, 556, 108, 596, 3), P.C2, P.C3, P.C1, P.C0);
  wrect(cam, 70, 564, 100, 588, P.N1);
  const pts = []; for (let i = 0; i <= 30; i++) pts.push(cam.x(70 + i), cam.y(576 - 4 * Math.sin((i / 30) * TAU * 1.5 - (st.ph || 0))));
  polyline(pts, P.V2);
  wdisc(cam, 103, 561, 1.8, st.on ? P.V3 : P.V1);
  wline(cam, 108, 576, 114, 576, P.C1, 3); wline(cam, 108, 576, 114, 576, P.C3, 1);
  if (st.on) rfAlong(cam, COAX_PATH, 0, COAX_PATH.L, 1.2, 4, st.ph || 0, P.V3, P.V2);
}
const KLY_CAV = [576, 540, 504, 466];
function drawKlystron(cam, st) {
  const z = cam.z;
  // collector with fins
  shade(wrr(cam, 116, 394, 156, 432, 6), P.T2, P.T3, P.T1, P.T0);
  for (let y = 400; y < 430; y += 4) wrect(cam, 118, y, 154, y + 1.2, P.T1);
  // drift tube
  shade(wrr(cam, 124, 430, 148, 592, 2), P.T2, P.T4, P.T1, P.T0);
  // focus coils
  for (const y of [558, 522, 485]) { shade(wrr(cam, 118, y - 5, 154, y + 5, 2), P.C2, P.C3, P.C1, P.C0); for (let x = 121; x < 152; x += 3) wrect(cam, x, y - 4, x + 1, y + 4, P.C1); }
  // cavities (cutaway: interior visible), RF field grows toward the output
  KLY_CAV.forEach((y, k) => {
    shade(wrr(cam, 114, y - 8, 158, y + 8, 4), P.C2, P.C3, P.C1, P.C0);
    wrect(cam, 120, y - 5, 152, y + 5, P.N1);
    const a = (st.rf || 0) * [0.2, 0.4, 0.68, 1.0][k];
    if (a > 0.02) {
      const osc = Math.sin((st.ph || 0) * 1.0 - k * 0.9);
      glow(cam.x(136), cam.y(y), 14 * z * a, P.V1, P.V2, 0.9 * a);
      const hw = 15 * a * (0.55 + 0.45 * Math.abs(osc));
      wline(cam, 136 - hw, y, 136 + hw, y, osc > 0 ? P.V3 : P.V2, 1.2);
      wline(cam, 136 - hw * 0.6, y - 2.6, 136 + hw * 0.6, y - 2.6, P.V2, 1);
      wline(cam, 136 - hw * 0.6, y + 2.6, 136 + hw * 0.6, y + 2.6, P.V2, 1);
    }
  });
  // cathode housing + HV bushing
  shade(wrr(cam, 114, 592, 158, 614, 5), P.C3, P.C4, P.C2, P.C0);
  shade(wrr(cam, 128, 612, 144, 626, 3), P.I2, P.I3, P.I1, P.I0);
  if ((st.hv || 0) > 0.05) glow(cam.x(136), cam.y(604), 18 * z, P.C2, P.C5, st.hv);
  // output port to the RF waveguide
  shade(wrr(cam, 156, 459, 186, 473, 2), P.C2, P.C3, P.C1, P.C0);
}
function drawRFGuide(cam, st) {
  const q = cam.pts(RF_PATH.p);
  for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(2, 12 * cam.z), P.C0);
  for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1.5, 10 * cam.z), P.C2);
  for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, 7 * cam.z), P.N1);
  for (let i = 2; i + 1 < q.length - 2; i += 2) disc(q[i], q[i + 1], Math.max(1, 6 * cam.z), P.C2), disc(q[i], q[i + 1], Math.max(0.6, 3.5 * cam.z), P.N1);
  const a = st.rfOut || 0;
  if (a > 0.02) rfAlong(cam, RF_PATH, 0, RF_PATH.L * clamp(st.rfFill === undefined ? 1 : st.rfFill, 0, 1), 3.2 * a, 16, st.ph || 0, P.V3, P.V2);
}
function drawGun(cam, st) {
  const z = cam.z;
  shade(wrr(cam, 56, 262, 66, 298, 2), P.C2, P.C3, P.C1, P.C0);
  shade(wrr(cam, 64, 266, 90, 294, 4), P.I2, P.I3, P.I1, P.I0);
  for (const x of [70, 76, 82]) wrect(cam, x, 267, x + 1.2, 293, P.I1);
  // heater + cathode dish
  const heat = st.heat || 0;
  if (heat > 0.05) glow(cam.x(87), cam.y(280), 6 * z, P.HF1, P.HF2, 0.7 * heat);
  { const pts = []; for (let i = 0; i <= 10; i++) pts.push(cam.x(87 + (i % 2) * 1.6), cam.y(273 + i * 1.4)); polyline(pts, heat > 0.3 ? P.HF3 : P.HF1); }
  shade(wpoly(cam, [89, 270, 92, 271, 93, 280, 92, 289, 89, 290, 90.5, 280]), P.T3, P.T5, P.T1, P.T0);
  // focus electrode
  shade(wpoly(cam, [88, 263, 103, 271, 103, 274, 88, 268]), P.T2, P.T4, P.T1, P.T0);
  shade(wpoly(cam, [88, 297, 103, 289, 103, 286, 88, 292]), P.T2, P.T4, P.T1, P.T0);
  // anode with a hole
  shade(wrr(cam, 105, 262, 110, 277, 1), P.T3, P.T4, P.T1, P.T0);
  shade(wrr(cam, 105, 283, 110, 298, 1), P.T3, P.T4, P.T1, P.T0);
}
function awgField(k, st) { // field sign/strength in cavity k (+ = accelerating for the bunch train)
  const u = st.u === undefined ? -10 : st.u;   // tracked bunch position in cells
  return Math.cos(Math.PI * (u - k - 0.5));
}
function drawAWG(cam, st) {
  const z = cam.z, x0 = MW.awg0, x1 = MW.awg1;
  wrect(cam, x0, 266, x1, 294, P.N1);
  // RF field patterns in the cavities
  const amp = st.rf === undefined ? 1 : st.rf;
  if (amp > 0.02) for (let k = 0; k < 11; k++) {
    const xc = x0 + 10 + 20 * k, a = awgField(k, st) * amp;
    if (a > 0) {
      glow(cam.x(xc), cam.y(280), 10 * z * a, P.V1, P.V2, 0.8 * a);
      for (const dy of [-8, -4, 4, 8]) { const hw = 6.5 * a * (1 - Math.abs(dy) / 14); wline(cam, xc - hw, 280 + dy, xc + hw, 280 + dy, Math.abs(dy) < 6 ? P.V3 : P.V2, 1); }
      wline(cam, xc - 7 * a, 280, xc + 7 * a, 280, P.V3, 1);
    } else if (a < 0) {
      for (const dy of [-6, 6]) { const hw = 5 * -a; wline(cam, xc - hw, 280 + dy, xc + hw, 280 + dy, P.V1, 1); }
    }
  }
  // walls
  shade(wrr(cam, x0 - 2, 260, x1 + 2, 267, 1), P.C3, P.C4, P.C2, P.C0);
  shade(wrr(cam, x0 - 2, 293, x1 + 2, 300, 1), P.C2, P.C3, P.C1, P.C0);
  for (let k = 0; k <= 11; k++) {
    const x = x0 + 20 * k;
    shade(wrr(cam, x - 1.6, 266, x + 1.6, 276, 0.5), P.T3, P.T4, P.T1, P.T0);
    shade(wrr(cam, x - 1.6, 284, x + 1.6, 294, 0.5), P.T3, P.T4, P.T1, P.T0);
  }
  shade(wrr(cam, x0 - 4, 256, x0 + 1, 304, 1), P.C2, P.C3, P.C1, P.C0);
  shade(wrr(cam, x1 - 1, 256, x1 + 4, 304, 1), P.C2, P.C3, P.C1, P.C0);
  // RF coupler from the waveguide (above cavity 5)
  shade(wrr(cam, 220, 252, 232, 262, 1), P.C2, P.C3, P.C1, P.C0);
}
function drawTransport(cam, st) {
  const z = cam.z;
  shade(wrr(cam, 332, 275, 392, 285, 1), P.C2, P.C3, P.C1, P.C0);
  wrect(cam, 332, 277.5, 392, 282.5, P.N1);
  for (const [a, b] of [[342, 356], [364, 378]]) {
    const on = st.coils || 0;
    if (on > 0.05) glow(cam.x((a + b) / 2), cam.y(280), 18 * z, P.T2, P.T4, 0.6 * on);
    shade(wrr(cam, a, 263, b, 275, 2), P.T2, P.T4, P.T1, P.T0);
    shade(wrr(cam, a, 285, b, 297, 2), P.T2, P.T3, P.T1, P.T0);
    for (let x = a + 2; x < b - 1; x += 2.4) { wrect(cam, x, 264, x + 1, 274, on > 0.3 ? P.C5 : P.C3); wrect(cam, x, 286, x + 1, 296, on > 0.3 ? P.C4 : P.C2); }
  }
}
function drawMagnet(cam, st) {
  const z = cam.z, [cx, cy] = MW.magC, R = MW.magR;
  shade(wrr(cam, 388, 224, 454, 300, 10), P.T1, P.T2, P.T0, P.K0, { k: 2 });
  // coils
  wrect(cam, 386, 229, 456, 236, P.C2); wrect(cam, 386, 229, 456, 230.5, P.C4);
  wrect(cam, 386, 288, 456, 295, P.C2); wrect(cam, 386, 288, 456, 289.5, P.C3);
  for (let x = 389; x < 454; x += 3) { wrect(cam, x, 230, x + 1, 236, P.C1); wrect(cam, x, 289, x + 1, 295, P.C1); }
  // vacuum chamber along the loop + legs
  const ring = maskFn(cam.x(cx - R - 7), cam.y(cy - R - 7), cam.x(cx + R + 7), cam.y(cy + R + 7), (x, y) => {
    const wx = cam.wx(x), wy = cam.wy(y), d = Math.hypot(wx - cx, wy - cy);
    return Math.abs(d - R) < 5.5;
  });
  mFill(ring, P.N1); mOuter(ring, P.T0);
  wrect(cam, 384, 275, 420, 285, P.N1); wrect(cam, 393, 258, 403, 300, P.N1);
  // field symbols (out of page) on the pole face inside the loop
  const pulse = 0.5 + 0.5 * Math.sin((st.ph || 0) * 2);
  for (const [x, y] of [[420, 258], [410, 249], [430, 249], [410, 267], [430, 267], [444, 244], [444, 284], [400, 236]]) {
    if (Math.abs(Math.hypot(x - cx, y - cy) - R) < 6) continue;
    const r = Math.max(1.5, 3 * z);
    ring_(cam.x(x), cam.y(y), r, st.field ? P.C4 : P.T3);
    disc(cam.x(x), cam.y(y), Math.max(0.6, r * 0.38), st.field ? (pulse > 0.5 ? P.C6 : P.C5) : P.T3);
  }
}
function ring_(x, y, r, c) { ring(x, y, r, 1, c); }
function drawHeadInternals(cam, st) {
  const z = cam.z;
  // target + cooling block
  shade(wrr(cam, 386, 324, 410, 330, 1), P.C2, P.C3, P.C1, P.C0);
  const hot = st.hot || 0;
  if (hot > 0.02) glow(cam.x(398), cam.y(334), 16 * z, P.HF1, P.HF2, hot);
  shade(wrr(cam, 390, 330, 406, 338, 1), P.T3, P.T5, P.T1, P.T0);
  // primary collimator (conical opening)
  shade(wpoly(cam, [362, 342, 395, 342, 384, 368, 362, 368]), P.T2, P.T3, P.T1, P.T0);
  shade(wpoly(cam, [401, 342, 434, 342, 434, 368, 412, 368]), P.T2, P.T3, P.T1, P.T0);
  // flattening filter
  shade(wpoly(cam, [398, 369, 413, 383, 383, 383]), P.T4, P.T5, P.T2, P.T0);
  wrect(cam, 374, 383, 422, 386, P.C2); wrect(cam, 374, 383, 422, 384, P.C3);
  // monitor ionization chamber
  shade(wrr(cam, 375, 389, 421, 399, 1), P.C3, P.C4, P.C2, P.C0);
  wrect(cam, 377, 390.5, 419, 397.5, P.N2);
  for (const y of [391.5, 394, 396.5]) wrect(cam, 378, y, 418, y + Math.max(0.3, 0.6), (st.ionGlow || 0) > 0.3 && y === 394 ? P.S2 : P.T4);
  wline(cam, 421, 394, 446, 394, P.C1, 1.6); wline(cam, 421, 394, 446, 394, P.C3, 0.6);
  // upper jaws
  const jw = st.jaw === undefined ? 12 : st.jaw;
  shade(wrr(cam, 360, 404, 398 - jw, 417, 1), P.T3, P.T4, P.T1, P.T0);
  shade(wrr(cam, 398 + jw, 404, 436, 417, 1), P.T3, P.T4, P.T1, P.T0);
  // MLC banks (leaf ends)
  const ml = st.mlc === undefined ? 10 : st.mlc;
  shade(wrr(cam, 362, 421, 398 - ml, 436, 2), P.T3, P.T4, P.T1, P.T0);
  shade(wrr(cam, 398 + ml, 421, 434, 436, 2), P.T3, P.T4, P.T1, P.T0);
  if (z > 1.6) for (let x = 364; x < 434; x += 3) if (x < 398 - ml - 1 || x > 398 + ml + 1) wrect(cam, x, 422, x + 0.5, 435, P.T2);
}
function drawCouchSide(cam) {
  shade(wrr(cam, 470, 646, 510, 822, 1), P.C1, P.C2, P.C0, P.K0);
  for (let y = 680; y < 820; y += 34) wrect(cam, 470, y, 510, y + 1, P.C0);
  shade(wrr(cam, 446, 820, 534, 831, 2), P.C2, P.C3, P.C1, P.C0);
  shade(wrr(cam, 290, 636, 640, 647, 2), P.C2, P.C4, P.C0, P.K0);
}
function drawPatientSide(cam, st) {
  shade(wpoly(cam, [338, 612, 352, 598, 380, 593, 440, 593, 480, 597, 520, 601, 545, 606, 640, 607, 640, 636, 338, 636]), P.MU2, P.SK2, P.MU1, P.MU0);
  shade(maskDisc(cam.x(320), cam.y(614), 19 * cam.z), P.SK2, P.SK3, P.SK1, P.SK0);
  wrect(cam, 314, 611, 318, 613, P.SK0);
  if (st.tumor) {
    glow(cam.x(398), cam.y(615), 12 * cam.z, P.R1, P.R2, st.tumor);
    shade(maskDisc(cam.x(398), cam.y(615), Math.max(1.5, 4.5 * cam.z)), P.R3, P.R4, P.R2, P.R1);
  }
}
// photon beam from the head to the patient (cone through the jaws)
function beamCone(cam, t, jaw, lv, rate) {
  const tx = MW.exitX, ty = MW.targetY, yj = 410;
  const spread = jaw / (yj - ty);
  const yA = 452, yB = MW.iso[1] + 30;
  const pts = [tx - spread * (yA - ty), yA, tx + spread * (yA - ty), yA, tx + spread * (yB - ty), yB, tx - spread * (yB - ty), yB];
  poly(cam.pts(pts), P.Y1, 0.18 * lv);
  rate = rate || 40;
  for (let i = Math.floor((t - 2) * rate); i <= Math.floor(t * rate); i++) {
    const age = t - i / rate; if (age < 0) continue;
    const u = (hash(i * 3 + 7) * 2 - 1) * spread;
    const y = yA + age * 180; if (y > yB) continue;
    const x = tx + u * (y - ty);
    photon(cam.x(x), cam.y(y), u, 1, { len: 6, amp: 0, c: P.Y2 });
  }
}
// ---------------------------------------------------------------- composite
// st: {open (sweep 0..1), ...component states}
function drawMachine(cam, t, st) {
  machineRoomBG(cam);
  drawShell(cam);
  drawModulator(cam, st.mod || {});
  drawRFSource(cam, st.rfs || {});
  drawKlystron(cam, st.kly || {});
  drawRFGuide(cam, st.wg || {});
  drawGun(cam, st.gun || {});
  drawAWG(cam, st.awg || {});
  drawTransport(cam, st.tr || {});
  drawMagnet(cam, st.mag || {});
  drawHeadInternals(cam, st.head || {});
  if (st.closed !== undefined && st.closed < W) {
    // closed casing to the right of the sweep (screen x)
    const sweep = st.closed;
    const S = casingShapes(cam);
    const clip = (x) => x >= sweep;
    for (const m of S.outer) mFill(m, P.C4, undefined, clip);
    for (const m of S.outer) { for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) { if (!m.d[j * m.w + i]) continue; const x = m.x0 + i, y = m.y0 + j; if (x < sweep || x < 0 || y < 0 || x >= W || y >= H) continue; const tl = m.get(x - 1, y - 1), br = m.get(x + 1, y + 1), br2 = m.get(x + 2, y + 2); if (!tl) buf[y * W + x] = P.C5; else if (!br || !br2) buf[y * W + x] = P.C2; } }
    const det = [[26, 420, 202, 421.2], [26, 600, 202, 601.2], [40, 226, 190, 229], [212, 300, 440, 301.4], [366, 440, 430, 452]];
    for (const [a, b, c, d] of det) { const x0 = Math.max(cam.x(a), sweep); rect(x0, cam.y(b), cam.x(c), cam.y(d), P.C3); }
    for (let i = 0; i < 6; i++) { const x0 = Math.max(cam.x(60), sweep); rect(x0, cam.y(700 + i * 12), cam.x(168), cam.y(702 + i * 12), P.C3); }
    if (cam.x(182) >= sweep) { wdisc(cam, 182, 244, 3, P.G1); wdisc(cam, 182, 244, 1.5, P.G2); }
    if (sweep > 0 && sweep < W) { for (const m of S.outer) for (let y = 0; y < H; y++) if (m.get(Math.floor(sweep), y)) { buf[y * W + Math.floor(sweep)] = P.C6; } }
  }
  drawCouchSide(cam);
  drawPatientSide(cam, st.pat || {});
}
