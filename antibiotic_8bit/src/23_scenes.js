'use strict';
// ============================================================================
// SCENES: which world is on screen, its camera, the states of the two story
// cells, and the transitions (a match cut at 4.3 s; ordered-dither dissolves
// for every scale jump, so pixels stay crisp — no blur, no flash).
// THE LOOP: the opening cell X is the NEXT bacterium. The micro world runs on
// cyclic time tau (tau = t + 60 for the opening seconds), so 59.983 s flows into
// 0.000 s on the same clockwise orbit at the same angular speed, X's bulge still
// growing; nothing is repaired, reversed, faded or cut at the loop point.
// ============================================================================
const tauOf = t => t < 4.6 ? t + DUR : t;   // the opening seconds continue the end of the film
// ---------------------------------------------------------------- the capillary of sequence B (micro units): it runs across, then curves up and out
const CAPW = x => 40 + 14 * Math.sin(x * 0.004 + 0.5) - 0.02 * Math.pow(Math.max(0, x + 300), 2);
const CAP_LUMEN = 220, CAP_GAPS = [-870, -730, -590, -450, -310];
function drawCapillary(cam, t) {
  if (cam.wx(0) > -150) return;
  const o = 1 / cam.z;
  for (let px = 0; px < W; px++) {
    const wx = cam.wx(px + 0.5), yl = CAPW(wx), yu = yl - CAP_LUMEN;
    const nearGap = CAP_GAPS.some(g => Math.abs(wx - g) < 1.6 + 0.5 * o);
    const cellK = ((wx + 1200) / 140) % 1;
    for (let py = 0; py < H; py++) {
      const wy = cam.wy(py + 0.5); let col = -1;
      if (wy > yu + 11 && wy < yl - 11) col = P.BL1;                                       // plasma in the lumen
      else if (Math.abs(wy - yl) <= 11 || Math.abs(wy - yu) <= 11) {                      // the two walls (endothelial cells)
        const yw = Math.abs(wy - yl) <= 11 ? yl : yu, e = wy - yw, lower = yw === yl;
        const ce = Math.abs(cellK - 0.5) * 2, half = 11 * (ce > 0.9 ? Math.sqrt(Math.max(0, 1 - (ce - 0.9) / 0.1 * ((ce - 0.9) / 0.1))) : 1);   // cells taper at their ends
        const nuc = Math.pow((cellK - 0.5) / 0.17, 2) + Math.pow((e - (lower ? 1 : -1)) / 6.5, 2) < 1;            // a nucleus mid-cell
        if (lower && nearGap) col = P.BL0;                                                 // a cleft between two cells
        else if (Math.abs(e) > half) col = Math.abs(e) <= 11 ? (lower ? P.BL0 : P.BL1) : -1;
        else if (Math.abs(e) > half - o) col = P.MU1;
        else if (nuc) col = Math.pow((cellK - 0.5) / 0.17, 2) + Math.pow((e - (lower ? 1 : -1)) / 6.5, 2) > 0.7 ? P.MU1 : P.MU2;
        else col = e < -half + 2.5 * o ? P.MU5 : e > half - 2.5 * o ? P.MU2 : P.MU3;
      }
      if (col !== -1) buf[py * W + px] = col;
    }
  }
  // a red cell gliding along the lumen
  const rx = -1000 + ((t - 11) * 140) % 900, ry = CAPW(rx) - CAP_LUMEN / 2;
  drawRBC(cam, rx, ry, 92, 1.2, 0.05);
}
// drug molecules that leave the blood through the clefts and wander into the tissue (sequence B)
function seepDot(i, t) {
  const g = CAP_GAPS[2 + (i % 2)], tp = EV.seep + 0.85 * hash2(i, 71) - 0.15, yg = CAPW(g);
  if (t < tp - 0.35) { const k = tp - 0.35 - t; return [g - 70 * k - 10 * hash2(i, 72), yg - 30 - 40 * hash2(i, 73) - 6 * Math.sin(k * 3 + i)]; }
  if (t < tp + 0.2) { const k = smooth(seg(t, tp - 0.35, tp + 0.2)); return [g + (1 - k) * -10 * hash2(i, 72), lerp(yg - 30 - 40 * hash2(i, 73), yg + 16, k)]; }
  const s = t - tp - 0.2, D = 62 * Math.sqrt(s);
  return [g + D * (vnoise(s * 0.55, i * 3) - 0.5) * 2.6, yg + 16 + D * (0.35 + 0.9 * hash2(i, 74)) + D * 0.4 * (vnoise(s * 0.6, i * 3 + 1) - 0.5)];
}
// ---------------------------------------------------------------- the story cells' states
const CX_ = cellById('X'), CY_ = cellById('Y'), CM_ = cellById('M');
function stateX(tau) {
  return {
    weak: Math.min(0.42, 0.42 * smooth(seg(tau, 56.6, 57.6))) + 0.58 * smooth(seg(tau, EV.weak, EV.prePulse)),
    gap: 5 * smooth(seg(tau, EV.weak, EV.prePulse)) + 3 * smooth(seg(tau, EV.prePulse, DUR + EV.tear0)),
    rb: 7 * eout(seg(tau, EV.prePulse, DUR)) + 5 * smooth(seg(tau, DUR, DUR + EV.tear0)) + 1.4 * Math.sin(seg(tau, DUR - 0.05, DUR + 0.35) * Math.PI),
    tear: smooth(seg(tau, DUR + EV.tear0, DUR + EV.tear0 + 0.25)),
    empty: smooth(seg(tau, DUR + EV.spill0, DUR + 3.4)), out: smooth(seg(tau, DUR + EV.tear0 + 0.1, DUR + 2.6)),
  };
}
function stateY(t) {
  return {
    L: 32 + 8 * smooth(seg(t, EV.grow, EV.grow + 1.6)),
    band: t < 18.6 ? smooth(seg(t, EV.band, EV.band + 0.45)) : 0,
    lid: t < 18.6 ? smooth(seg(t, EV.cut, EV.cut + 0.6)) : 0, mem: t < 18.6 ? smooth(seg(t, EV.layers, EV.layers + 0.45)) : 0,
    weak: smooth(seg(t, EV.strain, EV.strain + 0.6)),
    gap: 6 * smooth(seg(t, EV.strain + 0.3, EV.bulge)) + 3 * smooth(seg(t, EV.bulge, EV.lysis)),
    rb: 13 * eout(seg(t, EV.bulge, EV.lysis - 0.05)) + 0.8 * Math.sin(seg(t, EV.bulge, EV.lysis) * Math.PI * 3),
    tear: smooth(seg(t, EV.lysis, EV.lysis + 0.25)),
    empty: smooth(seg(t, EV.outflow, EV.outflow + 2.4)), out: smooth(seg(t, EV.lysis + 0.1, EV.lysis + 1.6)),
  };
}
function drawMicroWorld(cam, t) {
  const tau = tauOf(t);
  microBG(cam, t);
  drawCapillary(cam, t);
  for (const c of CELLS) {
    if (c.id === 'X' && !(tau > 55.4 && tau < 64.6)) continue;
    if (c.id === 'Y' && !(t > 11 && t < 60)) continue;
    const pose = cellPose(c, t), st = c.id === 'X' ? stateX(tau) : c.id === 'Y' ? stateY(t) : {};
    const sx = cam.x(pose.x), sy = cam.y(pose.y), ext = (c.L + c.R + 30) * cam.z; if (sx < -ext || sx > W + ext || sy < -ext || sy > H + ext) continue;
    drawCell(cam, c, pose, st);
    cellInner(cam, c, pose, st, t);
    if (c.id === 'Y') drawCutawayLayers(cam, c, pose, st);
  }
  if (tau > DUR + EV.tear0 && tau < 64.6) drawOutflow(cam, CX_, cellPose(CX_, t), 12, DUR + EV.tear0 + 0.1, tau);
  if (t > EV.lysis && t < 60) drawOutflow(cam, CY_, cellPose(CY_, t), 13, EV.lysis + 0.1, t);
  if (t > 11 && t < 21) { for (let i = 0; i < 30; i++) { const p = seepDot(i, t); drugDot(cam, p[0], p[1]); } }
  else drawAmbientDrug(cam, t);
}
// ---------------------------------------------------------------- cameras
// the orbit around X: the camera circles clockwise at a constant angular speed (with parallax planes behind)
const ORB = { w: 0.6, r: 22, t0: 58.4, psi0: 2.4, z: 2.6 };
function orbitCentre(tau) { const p = cellPose(CX_, tau), a = ORB.psi0 + ORB.w * (tau - ORB.t0); return [p.x + ORB.r * Math.cos(a), p.y + ORB.r * Math.sin(a)]; }
const OC0 = orbitCentre(ORB.t0);
const MIC_B = [[11.8, -560, 30, 2.6], [12.9, -556, 52, 2.4], [13.95, -520, 170, 1.05], [14.55, -472, 296, 1.6], [15.95, -466, 292, 1.85],
  [16.45, -470, 282, 2.5], [17.25, -470, 272, 3.4], [18.65, -470, 266, 6.5]];
const MIC_C = [[52.0, -470, 283, 7.5], [53.9, -470, 292, 2.0], [54.45, -470, 290, 2.15], [54.75, -470, 272, 3.4], [55.5, -468, 262, 2.6], [56.0, -462, 254, 2.2],
  [57.3, -190, 120, 1.35], [ORB.t0, OC0[0], OC0[1], ORB.z]];
function microCam(t) {
  const tau = tauOf(t);
  if (tau >= ORB.t0) { // orbit, then the pull-back toward the match-cut cell
    const oc = orbitCentre(tau), m = cellPose(CM_, tau), k = smooth(seg(tau, 62.9, 64.3)), kz = K75(seg(tau, 62.0, 64.3));
    return new Cam(lerp(oc[0], m.x, k), lerp(oc[1], m.y, k), Math.exp(lerp(Math.log(ORB.z), Math.log(1.0), kz)));
  }
  if (t >= 50) return camTrack(MIC_C, t);
  const c = camTrack(MIC_B, t);
  if (t > 14 && t < 16.4) { const a = (t - 14) * 0.9, k = Math.sin(seg(t, 14, 16.4) * Math.PI); c.cx += 9 * Math.cos(a) * k; c.cy += 9 * Math.sin(a) * k; }   // slow circling around Y
  return c;
}
// body world: the capsule from the lips to the stomach (mm)
const BODY_CAM = [[EV.match, 52, -3, 3.47], [EV.lips, -10, 30, 1.7], [EV.swallow, -50, 110, 1.15], [5.75, -62, 270, 1.0], [6.35, -40, 474, 1.7], [7.9, -22, 506, 3.0], [8.3, 4, 520, 3.6]];
const GUT_CAM = [[7.9, 0, 250, 0.42], [8.7, 0, 220, 0.6], [9.35, 0, 120, 2.0], [10.2, 0, 140, 5.2]];
const BLOOD_CAM = [[9.85, -12, 0, 4.4], [12.2, 104, 0, 5.0]];
// ---------------------------------------------------------------- worlds and transitions
function drawWorld(name, t) {
  if (name === 'micro') drawMicroWorld(microCam(t), t);
  else if (name === 'body') drawBodyWorld(camTrack(BODY_CAM, t), t);
  else if (name === 'gut') drawGutWorld(camTrack(GUT_CAM, t), t);
  else if (name === 'blood') drawBloodWorld(camTrack(BLOOD_CAM, t), t);
  else drawMolWorld(molCam(t), t);
}
// [start, end, from, to]: an ordered-dither dissolve between two worlds (crisp pixels throughout)
const XFADES = [[7.9, 8.25, 'body', 'gut'], [9.85, 10.15, 'gut', 'blood'], [11.8, 12.2, 'blood', 'micro'], [18.3, 18.7, 'micro', 'mol'], [52.1, 52.55, 'mol', 'micro']];
function worldAt(t) {
  if (t < EV.match) return 'micro';
  if (t < 7.9) return 'body';
  if (t < 9.85) return 'gut';
  if (t < 11.8) return 'blood';
  if (t < 18.3) return 'micro';
  if (t < 52.1) return 'mol';
  return 'micro';
}
function visual(t) {
  for (const [a, b, wa, wb] of XFADES) {
    if (t >= a && t < b) {
      drawWorld(wa, t); TMPBUF.set(buf); drawWorld(wb, t);
      const k = smooth(seg(t, a, b));
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (bay(x, y) >= k) buf[y * W + x] = TMPBUF[y * W + x];
      return;
    }
  }
  drawWorld(worldAt(t), t);
}
function renderFrame(t) { t = ((t % DUR) + DUR) % DUR; visual(t); }
function engineInit() { }
