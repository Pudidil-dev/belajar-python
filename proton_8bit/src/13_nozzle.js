'use strict';
// ============================================================================
// NOZZLE world (units "nu", y down, the beam axis at x = 0): a cutaway of the
// treatment head. The pencil beam comes down the vacuum pipe, the X scanning
// magnet (field into / out of the picture) swings it left-right, the Y
// scanning magnet (field across the gap) swings it toward / away from us,
// it leaves the vacuum through a thin window, passes the beam monitors
// (position and dose) and the snout, and lands on one spot of the target
// layer below. Not to scale.
// ============================================================================
const NZ = { top: -300, xm: -168, ym: -88, win: -34, mon0: 0, mon1: 30, snout0: 62, snout1: 140, plane: 236 };
const SPOTS19 = [[-45, -14], [-15, -14], [15, -14], [45, -14], [45, 14], [15, 14], [-15, 14], [-45, 14]];
function spotScreen(sp) { return [sp[0] + sp[1] * 0.55, NZ.plane + sp[1] * 0.42]; }   // the target layer seen slightly from above
// the beam's current spot (eased moves between eighth-note spots)
function nozzleSpot(t) {
  const ev = EV.spots19; if (t < ev[0]) return { sp: SPOTS19[0], i: -1 };
  let i = 0; while (i + 1 < ev.length && t >= ev[i + 1]) i++;
  const prev = SPOTS19[Math.max(0, i - 1)], cur = SPOTS19[i], u = smooth(clamp((t - ev[i]) / 0.07, 0, 1));
  return { sp: [lerp(prev[0], cur[0], u), lerp(prev[1], cur[1], u)], i };
}
function nozzleWorld(cam, t, opt) {
  opt = opt || {};
  const z = cam.z, X = x => cam.x(x), Y = y => cam.y(y);
  clear(P.N1);
  // the room below the nozzle and the patient's skin with the target layer drawn through it
  rect(0, Y(NZ.snout1 + 40), W, H, P.N2);
  { const sy = Y(NZ.plane - 26); rect(0, sy, W, H, P.TI3); rect(0, sy, W, sy + Math.max(1, 3 * z), P.TI4); for (let x = -400; x < 400; x += 22) disc(X(x + 8 * Math.sin(x)), Y(NZ.plane + 30 + 6 * Math.cos(x * 0.3)), Math.max(1, 6 * z), P.TI2); }
  const s = nozzleSpot(t), on = opt.beam === undefined ? 1 : opt.beam;
  // the layer's spot grid (rings), dosed spots fill in
  for (let k = 0; k < SPOTS19.length; k++) {
    const [px, py] = spotScreen(SPOTS19[k]), done = t >= EV.spots19[k] + 0.05;
    withDither(0.9, () => ellipse(X(px), Y(py), Math.max(2, 7 * z), Math.max(1.5, 3 * z), done ? P.DE2 : P.TU1));
    if (done) ellipse(X(px), Y(py), Math.max(1.5, 4.5 * z), Math.max(1, 1.8 * z), P.DE3);
  }
  // casing (cut away) and the inner parts
  const cas = [-62, NZ.top + 40, 62, NZ.top + 40, 62, NZ.snout0, 36, NZ.snout1, -36, NZ.snout1, -62, NZ.snout0];
  { const m = maskPoly(cam.pts(cas)); mFill(m, P.M1); mOutline(m, P.M5); }
  // vacuum pipe
  for (const sx of [-9, 9]) rect(X(sx - 2), Y(NZ.top), X(sx + 2), Y(NZ.win), P.M4);
  // X scanning magnet: pole faces in front of and behind the beam (field marks ⊗ / ⊙ alternate with the swing)
  shade(maskRR(X(-56), Y(NZ.xm - 34), X(56), Y(NZ.xm + 34), 4 * z), P.M2, P.M3, P.M1, P.M0);
  rect(X(-44), Y(NZ.xm - 26), X(44), Y(NZ.xm + 26), P.M0);
  for (const sx of [-50, 44]) rect(X(sx), Y(NZ.xm - 28), X(sx + 6), Y(NZ.xm + 28), P.CU2);
  const dir = s.sp[0] >= 0 ? 1 : -1, fk = on * (0.4 + 0.6 * Math.min(1, Math.abs(s.sp[0]) / 30));
  if (fk > 0) withDither(fk, () => { for (let yy = -16; yy <= 16; yy += 16) for (const xx of [-28, 28]) (dir > 0 ? fieldIn : fieldOut)(X(xx), Y(NZ.xm + yy), Math.max(2.5, 3.2 * z), P.MG3); });
  // Y scanning magnet: poles left and right, the field across the gap
  shade(maskRR(X(-56), Y(NZ.ym - 30), X(56), Y(NZ.ym + 30), 4 * z), P.M2, P.M3, P.M1, P.M0);
  rect(X(-30), Y(NZ.ym - 24), X(30), Y(NZ.ym + 24), P.M0);
  for (const sx of [-42, 30]) shade(maskRR(X(sx), Y(NZ.ym - 22), X(sx + 12), Y(NZ.ym + 22), 2 * z), P.M4, P.M5, P.M3, P.M1);
  const ydir = s.sp[1] >= 0 ? 1 : -1;
  if (on > 0) withDither(on * 0.85, () => { for (const yy of [-12, 0, 12]) { const x0 = X(ydir > 0 ? -26 : 26), x1 = X(ydir > 0 ? 26 : -26); line(x0, Y(NZ.ym + yy), x1, Y(NZ.ym + yy), P.MG2); arrowHead(x1, Y(NZ.ym + yy), ydir > 0 ? 0 : Math.PI, 3.5, P.MG3); } });
  // vacuum window, monitors (strips for position, plates for dose), snout aperture
  rect(X(-12), Y(NZ.win) - 1, X(12), Y(NZ.win) + 1, P.M6);
  const blink = t >= EV.spots19[0] && t < EV.spots19[EV.spots19.length - 1] + 0.3 ? pulse(t, EV.spots19[Math.max(0, s.i)], 0.12) : 0;
  for (const [y0, kind] of [[NZ.mon0, 0], [NZ.mon1, 1]]) {
    shade(maskRR(X(-50), Y(y0), X(50), Y(y0 + 16), 2 * z), P.M2, P.M3, P.M1, P.M0);
    for (let k = 0; k < (kind ? 3 : 9); k++) { const xx = kind ? -40 + k * 30 : -42 + k * 10; rect(X(xx), Y(y0 + 5), X(xx + (kind ? 20 : 6)), Y(y0 + 11), kind ? P.EL1 : P.PC1); }
    disc(X(54), Y(y0 + 8), Math.max(1.2, 2.2 * z), blink > 0 ? (kind ? P.EL3 : P.PC4) : P.M2);
  }
  shade(maskPoly(cam.pts([-34, NZ.snout0, 34, NZ.snout0, 26, NZ.snout1, -26, NZ.snout1])), P.M2, P.M3, P.M1, P.M0);
  rect(X(-10), Y(NZ.snout1 - 4), X(10), Y(NZ.snout1), P.M0);
  // the pencil beam: straight down, swung by the X magnet, then by the Y magnet, to its spot
  if (on > 0 && t >= (opt.beamFrom || 0)) {
    const [px, py] = spotScreen(s.sp), xa = s.sp[0] * (NZ.ym - NZ.xm) / (NZ.plane - NZ.xm);
    const pts = [0, NZ.top, 0, NZ.xm, xa, NZ.ym, px, py];
    const q = cam.pts(pts);
    for (let i = 0; i + 3 < q.length; i += 2) { lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(2, 3 * z), P.PC1); }
    for (let i = 0; i + 3 < q.length; i += 2) { lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, 1.4 * z), P.PC3); }
    glow(X(px), Y(py), 12 * z, P.PC2, P.PC4, 0.8);
    // a few protons along the beam
    for (let k = 0; k < 6; k++) { const u = ((t * 2.2 + k / 6) % 1), seg_ = u < 0.25 ? 0 : u < 0.45 ? 1 : 2, f = seg_ === 0 ? u / 0.25 : seg_ === 1 ? (u - 0.25) / 0.2 : (u - 0.45) / 0.55; const a = 2 * seg_; proton(lerp(q[a], q[a + 2], f), lerp(q[a + 1], q[a + 3], f), Math.max(1.2, 1.5 * z)); }
  }
}
