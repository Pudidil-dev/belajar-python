'use strict';
// ============================================================================
// FLUIDICS (lab world px inside the analyzer, plus two microscopic views).
// The needle's tubing runs to a sampling valve driven by a syringe pump (the
// pump's piston is what moves the blood); a measured portion goes to a mixing
// chamber where conductive diluent is added; three outlets carry measured
// aliquots to the RBC/PLT impedance detector, the hemoglobin photometer and the
// WBC flow cytometer (separate reagents, separate measurements). Reagent
// bottles sit at the bottom of the housing.
// ============================================================================
const FLU = {
  tube: [279, 270, 279, 232, 276, 216, 252, 210, 214, 210],   // needle carriage → valve
  valve: [200, 212], pump: [96, 204, 170, 220],
  tube2: [186, 220, 160, 236, 142, 262, 140, 300],            // valve → mixing chamber
  mix: [140, 318, 26],                                       // chamber centre and radius
  outA: [160, 340, 196, 372, 222, 398],                       // → RBC/PLT detector
  outB: [158, 330, 230, 330, 286, 342],                       // → HGB photometer
  outC: [136, 344, 132, 400, 160, 444],                       // → WBC flow cytometer
  detA: [210, 386, 252, 418], detB: [278, 330, 322, 360], detC: [150, 432, 214, 470],
  bottles: [[30, 'EC2', 'DILUENT'], [62, 'LY2', 'SLS'], [94, 'WB2', 'LYSE'], [126, 'DY1', 'DYE']],
};
const FLU_P = { tube: new Path(FLU.tube), tube2: new Path(FLU.tube2), A: new Path(FLU.outA), B: new Path(FLU.outB), C: new Path(FLU.outC) };
function pathPx(cam, p, w, col, lv) { const pts = p.sub(0, p.L, 2); for (let i = 0; i + 3 < pts.length; i += 2) lineW(cam.x(pts[i]), cam.y(pts[i + 1]), cam.x(pts[i + 2]), cam.y(pts[i + 3]), w, col, lv); }
// a slug of liquid inside a path: from s0 to s1 (world length units)
function slug(cam, p, s0, s1, w, col) { s0 = clamp(s0, 0, p.L); s1 = clamp(s1, 0, p.L); if (s1 <= s0) return; const pts = p.sub(s0, s1, 1.5); for (let i = 0; i + 3 < pts.length; i += 2) lineW(cam.x(pts[i]), cam.y(pts[i + 1]), cam.x(pts[i + 2]), cam.y(pts[i + 3]), w, col); }
// o: { blood (0..1 slug progress along tube+tube2), piston (0..1), mixFill (0..1), dil (0..1), alq [a, b, c] (0..1 each), hi ('A'|'B'|'C'), labels }
function machineInterior(cam, t, o) {
  o = o || {};
  const X = v => cam.x(v), Y = v => cam.y(v), z = cam.z;
  rect(X(ANZ.x0 + 4), Y(ANZ.y0 + 4), X(ANZ.x1 - 4), Y(ANZ.y1 - 4), P.K0);
  for (let y = ANZ.y0 + 10; y < ANZ.y1; y += 24) rect(X(ANZ.x0 + 4), Y(y), X(ANZ.x1 - 4), Y(y + 1), P.N1);
  // reagent bottles
  for (const [bx, col, nm_] of FLU.bottles) {
    rect(X(bx), Y(470), X(bx + 26), Y(496), P.TB0); rect(X(bx + 2), Y(476), X(bx + 24), Y(494), P[col]); rect(X(bx + 8), Y(462), X(bx + 18), Y(470), P.TB0);
    if (z > 1.4) text(FS, nm_, X(bx + 13), Y(498), { sc: Math.max(1, Math.round(z * 0.7)), c: P.SUB, ol: null, align: 'center' });
  }
  lineW(X(43), Y(462), X(43), Y(330), 1.6 * z, P.EC1); lineW(X(43), Y(330), X(FLU.mix[0] - 24), Y(326), 1.6 * z, P.EC1);  // diluent line
  // syringe pump: barrel, piston (its movement drives the fluid)
  const [p0, p1, p2, p3] = FLU.pump, pk = o.piston || 0;
  rect(X(p0), Y(p1), X(p2), Y(p3), P.TB1); rect(X(p0 + 2), Y(p1 + 2), X(p2 - 2), Y(p3 - 2), P.TB2);
  const px = lerp(p2 - 10, p0 + 18, pk); rect(X(px), Y(p1 + 1), X(px + 4), Y(p3 - 1), P.M4); rect(X(px + 4), Y((p1 + p3) / 2 - 1.5), X(p2 + 26), Y((p1 + p3) / 2 + 1.5), P.M3);
  rect(X(p2 + 26), Y(p1 - 4), X(p2 + 30), Y(p3 + 4), P.M4);
  if (z > 1.4) text(FS, 'PUMP', X(p0 + 4), Y(p1 - 9), { sc: Math.max(1, Math.round(z * 0.7)), c: P.SUB, ol: null });
  // sampling valve
  const [vx, vy] = FLU.valve; disc(X(vx), Y(vy), 9 * z, P.M4); disc(X(vx), Y(vy), 7 * z, P.M3); lineW(X(vx - 5 * Math.cos(t * 2)), Y(vy - 5 * Math.sin(t * 2)), X(vx + 5 * Math.cos(t * 2)), Y(vy + 5 * Math.sin(t * 2)), 2 * z, P.M5);
  // tubing (clear) and the blood slug
  pathPx(cam, FLU_P.tube, 4 * z, P.TB0); pathPx(cam, FLU_P.tube, 2.4 * z, P.TB2);
  pathPx(cam, FLU_P.tube2, 4 * z, P.TB0); pathPx(cam, FLU_P.tube2, 2.4 * z, P.TB2);
  const L1 = FLU_P.tube.L, L2 = FLU_P.tube2.L, bp = (o.blood || 0) * (L1 + L2), len = 26;
  slug(cam, FLU_P.tube, bp - len, bp, 2.4 * z, P.BL3); if (bp > L1) slug(cam, FLU_P.tube2, bp - L1 - len, bp - L1, 2.4 * z, P.BL3);
  // mixing chamber: blood in, diluent in, mixing
  const [mx, my, mr] = FLU.mix;
  rect(X(mx - mr), Y(my - mr), X(mx + mr), Y(my + mr), P.TB0); rect(X(mx - mr + 2), Y(my - mr + 2), X(mx + mr - 2), Y(my + mr - 2), P.TB2);
  const fill = o.mixFill || 0, dil = o.dil || 0;
  if (fill > 0) {
    const ytop = my + mr - 2 - (2 * mr - 4) * fill;
    rect(X(mx - mr + 2), Y(ytop), X(mx + mr - 2), Y(my + mr - 2), dil > 0.5 ? P.RB4 : dil > 0.2 ? P.RB3 : P.BL2);
    if (dil > 0) for (let k = 0; k < 6; k++) { const a = t * 6 + k, rr = mr * 0.5 * (0.4 + 0.6 * ((k * 0.37) % 1)); disc(X(mx + Math.cos(a) * rr * 0.7), Y(my + 6 + Math.sin(a) * rr * 0.5), 1.5 * z, P.EC3); }
  }
  if (z > 1.4) text(FS, 'MIXING CHAMBER', X(mx), Y(my + mr + 4), { sc: Math.max(1, Math.round(z * 0.7)), c: P.SUB, ol: null, align: 'center' });
  // three outlets and detectors
  const outs = [['A', FLU_P.A, FLU.detA, 'RBC/PLT', P.EC2], ['B', FLU_P.B, FLU.detB, 'HGB', P.LG2], ['C', FLU_P.C, FLU.detC, 'WBC', P.LZ2]];
  outs.forEach(([id, p, d, nm_, col], i) => {
    const hi = o.hi === id;
    pathPx(cam, p, 3.4 * z, hi ? P.AC2 : P.TB0); pathPx(cam, p, 2 * z, P.TB2);
    const a = o.alq ? o.alq[i] : 0; if (a > 0) slug(cam, p, a * p.L - 16, a * p.L, 2 * z, P.RB3);
    const m = maskRR(X(d[0]), Y(d[1]), X(d[2]), Y(d[3]), 3 * z); shade(m, P.M5, P.M4, P.M6, hi ? P.AC2 : P.M6, {});
    disc(X((d[0] + d[2]) / 2), Y((d[1] + d[3]) / 2), 4 * z, col);
    if (o.labels > 0 && z > 0.9) text(FS, nm_, X((d[0] + d[2]) / 2), Y(d[3] + 3), { sc: Math.max(1, Math.round(z * 0.8)), c: hi ? P.INK : P.SUB, ol: P.SH, align: 'center', n: o.labels * 10 });
  });
  // processor board (top right)
  rect(X(262), Y(232), X(334), Y(290), P.CB2); rect(X(276), Y(244), X(312), Y(272), P.CH1); frame(X(276), Y(244), X(312), Y(272), o.cpu ? P.DT3 : P.CH3);
}
// the analyzer with an X-ray housing: k = 0 solid .. 1 see-through
function analyzerXray(cam, t, k, o) {
  labBG(cam, t);
  if (k > 0) machineInterior(cam, t, o);
  if (k < 1) withDither(1 - k, () => drawAnalyzer(cam, t, o)); else { drawTube(cam, t, o); drawNeedle(cam, t, o); }
}
// draw fn at opacity lv (a smooth see-through / fade); TMP2 keeps the pixels underneath
function withDither(lv, fn) {
  if (lv >= 1) { fn(); return; }
  if (lv <= 0) return;
  TMP2.set(buf);
  fn();
  const ki = Math.round(lv * 256), kj = 256 - ki;
  for (let i = 0; i < buf.length; i++) {
    const a = TMP2[i], b = buf[i]; if (a === b) continue;
    buf[i] = (0xff000000 | (((((a >>> 16) & 255) * kj + ((b >>> 16) & 255) * ki) >> 8) << 16) | (((((a >>> 8) & 255) * kj + ((b >>> 8) & 255) * ki) >> 8) << 8) | ((((a & 255) * kj + (b & 255) * ki) >> 8))) >>> 0;
  }
}
// ---------------------------------------------------------------- inside the tubing: whole blood flowing (side-follow)
const BLOOD_S = makeSuspension(21, 70, [['rbc', 0.88], ['plt', 0.09], ['wbc', 0.03]], -300, 300, -120, 120);
function tubeFlow(cam, t, o) {
  o = o || {};
  rect(0, 0, W, H, P.AM1); rect(0, 0, W, H, P.AM2, 0.25);
  // tube walls
  rect(0, cam.y(-150), W, cam.y(-136), P.TB1); rect(0, cam.y(-136), W, cam.y(-133), P.TB3);
  rect(0, cam.y(136), W, cam.y(150), P.TB1); rect(0, cam.y(133), W, cam.y(136), P.TB0);
  drawSuspension(cam, BLOOD_S, t, { v: o.v === undefined ? 60 : o.v });
  // a guaranteed white cell and platelets near the centre for the labels
  const wx = o.wx || 0;
  wbc(cam.x(wx), cam.y(-10), R_WBC * cam.z, 'neut', t * 0.3);
  platelet(cam.x(wx + 70), cam.y(48), R_PLT * cam.z * 1.1, t);
  platelet(cam.x(wx - 60), cam.y(70), R_PLT * cam.z, t + 1);
  rbc(cam.x(wx - 70), cam.y(-60), R_RBC * cam.z, 0.1, 0.3);
}
// ---------------------------------------------------------------- inside the mixing chamber: dilution
const MIX_S = makeSuspension(33, 160, [['rbc', 0.9], ['plt', 0.08], ['wbc', 0.02]], -140, 140, -240, 240);
function mixWorld(cam, t, o) {
  o = o || {};
  const d = o.dil || 0;
  // background: dense blood (amber-red) → diluted (soft cyan electrolyte), joined by a swirling mixing front
  const th = d * 1.3 - 0.15;
  for (let by = 0; by < H; by += 2) for (let bx = 0; bx < W; bx += 2) {
    const n = vn2((bx - cam.x(0)) / (36 * cam.z) + t * 0.35, (by - cam.y(0)) / (36 * cam.z) - t * 0.2, 77) * 0.65 + vn2(bx / 13, by / 13, 78) * 0.35;
    const c = n < th - 0.05 ? (bay(bx >> 1, by >> 1) < 0.35 ? P.EC0 : P.EC1) : n < th ? P.EC2 : (bay(bx >> 1, by >> 1) < 0.5 ? P.BL1 : P.AM1);
    buf[by * W + bx] = c; buf[by * W + bx + 1] = c; buf[(by + 1) * W + bx] = c; buf[(by + 1) * W + bx + 1] = c;
  }
  // diluent jets and swirl
  if (d > 0 && d < 1) for (let k = 0; k < 18; k++) { const a = t * 3 + k * 0.7, r_ = 60 + (k * 37) % 180; disc(cam.x(Math.cos(a) * r_), cam.y(Math.sin(a) * r_ * 1.2), 2.4 * cam.z, P.EC3, 0.6); }
  // cells: crowded at first, then spread apart (and fewer per view) as the volume grows
  drawSuspension(cam, MIX_S, t, { v: 8, spread: d, only: c => d < 0.6 || hash(Math.floor(c.x * 7 + c.y)) < 1.25 - d });
}
