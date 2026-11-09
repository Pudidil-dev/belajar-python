'use strict';
// ============================================================================
// THE CONTRAST'S ROUTE (scene 15), from the CTA film's anatomy: the arm vein,
// the superior vena cava, the right heart (steel blue), the pulmonary arteries
// branching through the see-through lungs, the pulmonary veins back to the
// left heart (red), the aorta — and here the descending aorta continues down
// to its bifurcation into the iliac arteries, toward the legs. Arrival times
// (attribute a) are the CTA film's, mapped onto this film's clock; the contrast
// is drawn in the white-blue teaching colour (it does not glow).
// Patient frame as 14_ct.js (x = left, y = superior, z = anterior).
// ============================================================================
// CTA-film arrival time → this film's clock: cannula at the start of scene 15, the aorta before its end
const ACLK = a => EV.circ15 + (a - 6.6) * (2.55 / (16.4 - 6.6));
function concAt(t, a, kind) {
  const ta = ACLK(a); if (t < ta) return 0;
  const rise = smooth(clamp((t - ta) / 0.18, 0, 1));
  return kind === 'vein' ? rise * (0.6 + 0.4 * Math.exp(-Math.max(0, t - ta - 0.2) / 1.2)) : rise;
}
const CIRC = [];   // {pts, r, a0, a1, kind: 'vein' | 'art', lung}
function circ(ctrl, r, a0, a1, kind, opt) { const pts = smoothPath(ctrl, (opt && opt.step) || 6); CIRC.push(Object.assign({ pts, r, a0, a1, kind }, opt || {})); return pts; }
const HEART = { RA: [-24, -335, 18], RV: [4, -362, 40], LA: [10, -328, -22], LV: [32, -372, 10] };
const LUNG = { R: [-98, -338, -2], L: [96, -344, -2] };
function buildCirc() {
  // the arm vein (cannula tip upward), axillary, subclavian, brachiocephalic, superior vena cava
  circ([CANNULA.tip, [-346, -456, -64], [-302, -392, -60], [-256, -332, -52], [-206, -292, -30], [-146, -252, 2], [-84, -246, 6], [-42, -258, 12], [-23, -282, 16], [-22, -318, 18]], 6, 6.6, 10.4, 'vein', { step: 4 });
  // pulmonary trunk and the two pulmonary arteries
  circ([[12, -342, 50], [16, -320, 44], [18, -306, 26]], 9, 12.0, 12.25, 'pa');
  const rpa = circ([[18, -306, 26], [-18, -306, 20], [-56, -312, 10], [-74, -320, 4]], 7, 12.25, 12.6, 'pa');
  const lpa = circ([[18, -306, 26], [44, -301, 15], [70, -312, 4]], 7, 12.25, 12.55, 'pa');
  // branching pulmonary arteries inside each lung, and pulmonary veins back to the left atrium
  const rnd = mulberry(17);
  for (const [hil, c, sg] of [[[-74, -320, 4], LUNG.R, -1], [[70, -312, 4], LUNG.L, 1]]) {
    const grow = (p, dir, len, r, a, depth, kind) => {
      if (depth === 0) return;
      const q = add3(p, mul3(dir, len)); const mid = add3(lerp3(p, q, 0.5), [(rnd() - 0.5) * 8, (rnd() - 0.5) * 8, (rnd() - 0.5) * 8]);
      const a1 = a + (kind === 'pa' ? 0.32 : 0.3);
      circ([p, mid, q], r, kind === 'pa' ? a : a1 + 0.0, kind === 'pa' ? a1 : a, kind, { step: 5, lung: 1 });
      for (let k = 0; k < 2; k++) { const nd = norm3(add3(dir, [(rnd() - 0.5) * 1.3, (rnd() - 0.5) * 1.5, (rnd() - 0.5) * 1.3])); grow(q, nd, len * 0.68, r * 0.7, a1, depth - 1, kind); }
    };
    for (const d of [[sg * 0.5, 0.8, 0.1], [sg * 0.7, -0.1, 0.2], [sg * 0.45, -0.85, -0.1]]) grow(hil, norm3(d), 34, 4.2, 12.6, 3, 'pa');
    // veins: mirrored fan returning from the periphery to the left atrium (arrival times run toward the LA)
    for (const d of [[sg * 0.6, 0.6, -0.4], [sg * 0.7, -0.4, -0.35]]) { const tip = add3(c, mul3(norm3(d), 52)); circ([tip, lerp3(tip, HEART.LA, 0.45), add3(HEART.LA, [sg * 14, 0, -4])], 5, 13.6, 14.7, 'pv', { step: 5 }); }
  }
  // aorta: ascending, arch, descending; arch branches; carotids up the neck; subclavians; vertebrals
  circ([[16, -346, 18], [8, -300, 22], [4, -266, 16], [8, -252, 2], [22, -258, -18], [26, -292, -26], [26, -420, -24], [24, -600, -20], [14, -660, -18]], 10, 15.6, 16.55, 'art');
  for (const sg of [1, -1]) circ([[14, -660, -18], [14 + sg * 40, -700, -20], [14 + sg * 72, -760, -24], [14 + sg * 88, -830, -20]], 6.5, 16.55, 16.85, 'art');
  circ([[3, -258, 12], [-12, -236, 12]], 7, 15.85, 16.0, 'art');
  circ([[-12, -236, 12], [-21, -182, 12], [-23, -150, 8], [-22, -132, -2]], 5, 16.0, 17.6, 'art');
  circ([[-12, -236, 12], [-60, -228, 5], [-120, -242, 0], [-200, -262, -24]], 5, 16.0, 16.6, 'art');
  circ([[10, -254, 6], [18, -200, 10], [22, -150, 6], [22, -132, -2]], 5, 15.9, 17.6, 'art');
  circ([[19, -256, -8], [60, -246, -5], [120, -252, 0], [200, -262, -24]], 5, 15.95, 16.6, 'art');
  for (const sg of [1, -1]) circ([[sg * 52, -246, -4], [sg * 26, -200, -24], [sg * 14, -150, -30], [sg * 12, -132, -30]], 3.6, 16.2, 17.55, 'art');
}
buildCirc();
function buildCircMesh(filter) { const mb = new MB(); for (const c of CIRC) if (filter(c)) tubeInto(mb, c.pts, c.r, (i, u) => lerp(c.a0, c.a1, u), c.r > 5 ? 12 : 8); return computeNormals(mb.build()); }
function heartRSDF(x, y, z) {
  let d = sdE(x, y, z, -24, -335, 18, 26, 23, 24);
  d = smin(d, sdE(x, y, z, 2, -366, 42, 33, 29, 22), 10);
  d = smin(d, sdE(x, y, z, -6, -318, 36, 11, 8, 9), 4);
  return d;
}
function heartLSDF(x, y, z) {
  let d = sdC(x, y, z, 22, -348, 4, 54, -404, 38, 31, 11);
  d = smin(d, sdE(x, y, z, 10, -328, -22, 27, 19, 19), 9);
  d = smin(d, sdE(x, y, z, 32, -320, 10, 11, 8, 8), 4);
  return d;
}
function buildHeartR() { return isoMesh(heartRSDF, -60, -405, -20, 45, -290, 75, 4, () => 10.6); }
function buildHeartL() { return isoMesh(heartLSDF, -25, -430, -50, 95, -295, 60, 4, () => 15.25); }
function lungSDF(sg) {
  return (x, y, z) => {
    const c = sg < 0 ? LUNG.R : LUNG.L;
    let d = sdE(x, y, z, c[0], c[1], c[2], 64, 120, 78);
    d = smax(d, -sdE(x, y, z, sg < 0 ? 0 : 18, -372, 26, 58, 62, 48), 14);                  // the heart's impression (deeper on the left)
    d = smax(d, -sdE(x, y, z, c[0], -548, 0, 110, 92, 110), 16);                             // the dome of the diaphragm
    const slot = Math.max(Math.abs((y - c[1]) + 0.55 * (z - c[2]) + 10) - 1.6, -sdE(x, y, z, c[0], c[1], c[2], 64, 120, 78) - 9);
    d = smax(d, -slot, 1.5);                                                                // the oblique fissure
    return d;
  };
}
function buildLung(c, sg) { return isoMesh(lungSDF(sg), c[0] - 70, c[1] - 128, c[2] - 84, c[0] + 70, c[1] + 128, c[2] + 84, 7); }
const CIRC_M = () => cached('circ', () => ({ veins: buildCircMesh(q => q.kind === 'vein'), pa: buildCircMesh(q => q.kind === 'pa'), pv: buildCircMesh(q => q.kind === 'pv'), arts: buildCircMesh(q => q.kind === 'art'),
  heartR: buildHeartR(), heartL: buildHeartL(), lungR: buildLung(LUNG.R, -1), lungL: buildLung(LUNG.L, 1), torso: buildTorsoGhost() }));
// a see-through torso for orientation (glass, CTA style)
function buildTorsoGhost() { return isoMesh((x, y, z) => smin(sdE(x, y, z, 0, -400, -20, 190, 280, 120), sdE(x, y, z, 0, -660, -30, 175, 120, 110), 60), -230, -820, -160, 230, -110, 120, 14); }
const CR = { vein: [P.ST0, P.ST1, P.ST2, P.ST3, P.ST5], art: [hexc('#2A1020'), hexc('#561C2C'), hexc('#8E3038'), P.AR3, hexc('#F0A48C')], lung: [P.LU0, P.LU1, P.LU2, P.LU3], con: [P.CO0, P.CO1, P.CO2, P.CO3, P.CO4] };
// the beating heart: a gentle squeeze on the beats of scene 15
function heartScale(t) { let k = 0; for (let b = EV.circ15; b < EV.circ15 + 3; b += BEAT) k = Math.max(k, Math.max(0, 1 - Math.abs(t - b - 0.08) / 0.22)); return 1 - 0.08 * k; }
function drawCirc(cam, t) {
  const M = CIRC_M(), fog = [1500, 3200, P.BG], hs = heartScale(t), hc = [8, -362, 18], sc = mMul(mT(hc[0], hc[1], hc[2]), mMul(mS(hs), mT(-hc[0], -hc[1], -hc[2])));
  const mv = { ramp: CR.con, f: a => concAt(t, a, 'vein') }, ma = { ramp: CR.con, f: a => concAt(t, a, 'art') };
  drawMesh(cam, M.veins, { ramp: CR.vein, id: newId(P.ST0), mix: mv, fog, spec: 0.3 });
  drawMesh(cam, M.pa, { ramp: CR.vein, id: newId(P.ST0), mix: mv, fog, spec: 0.3 });
  drawMesh(cam, M.pv, { ramp: CR.art, id: newId(P.AR0), mix: ma, fog, spec: 0.3 });
  drawMesh(cam, M.arts, { ramp: CR.art, id: newId(P.AR0), mix: ma, fog, spec: 0.4 });
  drawMesh(cam, M.heartR, { ramp: CR.vein, id: newId(P.ST0), mix: mv, mixFacing: true, fog, alpha: 0.85, ao: 1, spec: 0.4 }, sc);
  drawMesh(cam, M.heartL, { ramp: CR.art, id: newId(P.AR0), mix: ma, mixFacing: true, fog, alpha: 0.85, ao: 3, spec: 0.4 }, sc);
  r3dOutlines();
  drawMesh(cam, M.lungR, { ramp: CR.lung, glass: [0.06, 0.8, 1.8], ao: 5, id: 0, fog });
  drawMesh(cam, M.lungL, { ramp: CR.lung, glass: [0.06, 0.8, 1.8], ao: 6, id: 0, fog });
  drawMesh(cam, M.torso, { ramp: RT.ghost, glass: [0.03, 0.55, 2.2], ao: 9, id: 0, fog });
}
