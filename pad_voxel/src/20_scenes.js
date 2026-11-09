'use strict';
// ============================================================================
// THE FILM: 21 scenes of 3 s on one clock (03_clock.js), drawn like the CTA
// film: smooth meshes with dithered ramps, rim light and glass, navy skies,
// fog for depth, one-pixel outlines; the artery close-ups add a pixel-art cut
// face. Scene changes are cuts, continuous camera moves or soft crossfades.
// The graphic overlays (24_ui.js) and the text (25_text.js) come on top.
// One patient, one right leg, one lesion map (13_tree.js) in every view.
// ============================================================================
const ph = (t, a, b, e) => (e || smooth)(seg(t, a, b));
const lin = x => x;
const camAB = (e0, t0, e1, t1, f, fov, up) => camLook(lerp3(e0, e1, f), lerp3(t0, t1, f), up || [0, 1, 0], fov || 34);
const qg = (x, n) => Math.round(clamp(x, 0, 1) * n) / n;            // quantised disease state (cached meshes)
let G_T = 0;                                                          // the frame's time (for overlays that blink on the grid)
// ---------------------------------------------------------------- 01-02: walking, slowing, stopping, holding the calf
const PT_HOLD_END = 6.0, FOG_W = [2400, 9000, P.N2];
function walkState(t) {
  const tt = Math.min(t, 6), w = WALK.at(tt), hold = ph(tt, EV.hold - 0.1, EV.hold + 0.7);
  return { root: [w[0], w[1], 0], q: { ph: gaitPhase(tt), amp: gaitAmp(tt), hold } };
}
function walkCam(t) {
  const w = WALK.at(Math.min(t, 6))[0];
  const A = { e: [w + 300, 780, 2900], g: [w + 160, 640, 0] };                // lateral tracking, lead room ahead of him
  const B = { e: [w + 120, 480, 1450], g: [w + 10, 330, 92] };                 // closer: the right calf
  const f = ph(t, 3.4, 5.6, eio);
  return camLook(lerp3(A.e, B.e, f), lerp3(A.g, B.g, f), [0, 1, 0], 32);
}
// 2D pain marks: short orange strokes flicking out from the calf on the beat (where it hurts)
function painMarks(cam, pose, k, t) {
  if (k <= 0) return;
  const c = project(cam, mApply(pose.right.sh, [-70, -150, 30])); if (!c) return;
  const r = 70 * c[2] * cam.F, beat = (t / BEAT) % 1, puls = 1 + 0.25 * Math.max(0, 1 - beat * 3);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.62 + i * 0.19), r0 = r * 1.05 * puls, r1 = r * (1.4 + 0.12 * (i % 2)) * puls;
    const x0 = c[0] + Math.cos(a) * r0, y0 = c[1] - Math.sin(a) * r0, x1 = c[0] + Math.cos(a) * r1, y1 = c[1] - Math.sin(a) * r1;
    if (k >= 1 || (i + 1) / 5 <= k) { lineW(x0 + 1, y0 + 1, x1 + 1, y1 + 1, 2, P.SH); lineW(x0, y0, x1, y1, 2, i % 2 ? P.PAIN : P.WARN); }
  }
}
function sWalk(t) {
  const s = walkState(t), cam = walkCam(t), pose = patientPose(s.root, 0, s.q), pain = ph(t, EV.pain - 0.3, EV.pain + 0.75);
  skyBG(P.K0, P.N2); drawFloor(cam, FOG_W); footShadows(cam, pose);
  drawPatient(cam, pose, { pain: pain * 0.85, fog: FOG_W });
  r3dOutlines();
  painMarks(cam, pose, ph(t, EV.pain, EV.pain + 0.4, lin), t);
}
// ---------------------------------------------------------------- 03: into the leg (skin → muscle → arteries → the thigh artery)
function holdPose() { const s = walkState(PT_HOLD_END); return patientPose(s.root, 0, s.q); }
function legCam(t, pose) {
  // the calf (where it hurts) → up along the artery → into the thigh artery at the site of the later stenosis (L1)
  const K = mApply(pose.right.sh, [0, 0, 0]), A = treeToWorld(pose, [-76, 690, 4]), c0 = walkCam(PT_HOLD_END);
  const k1 = { e: add3(K, [-640, 40, 560]), g: add3(K, [-60, -170, 0]) };
  const k2 = { e: add3(A, [-300, 30, 280]), g: A };
  const k3 = { e: add3(A, [-22, 6, 20]), g: add3(A, [6, -16, -4]) };
  const u = t - EV.reveal;
  if (u < 1.2) return camAB(c0.eye, c0.tg, k1.e, k1.g, eio(u / 1.2), 34);
  if (u < 2.25) return camAB(k1.e, k1.g, k2.e, k2.g, eio((u - 1.2) / 1.05), 34);
  return camAB(k2.e, k2.g, k3.e, k3.g, ein((u - 2.25) / 0.75), 34);
}
function sLeg(t) {
  const pose = holdPose(), cam = legCam(t, pose), fog = [600, 6000, P.N2];
  skyBG(P.K0, P.N2); drawFloor(cam, fog);
  // the right leg turns to glass and stays; the rest of the body dissolves pixel by pixel; then the muscle clears
  const glass = ph(t, EV.reveal, EV.reveal + 0.75), bodyA = 1 - ph(t, EV.reveal + 0.2, EV.muscle + 0.2), musA = 1 - ph(t, EV.artery - 0.2, EV.artery + 0.5) * 0.85;
  drawLeg(cam, pose, { muscle: musA, bone: 0, art: 1, pain: 0.55 * (1 - ph(t, EV.artery, EV.dive)), fog });
  if (bodyA > 0.02) drawPatient(cam, pose, { alpha: bodyA, skipXf: [pose.right.th, pose.right.sh, pose.right.ft], fog });
  drawPatient(cam, pose, { glassLeg: glass, skipParts: ['pelvis', 'torso', 'head', 'uarm', 'farm'], skipXf: [pose.left.th, pose.left.sh, pose.left.ft], fog });
  r3dOutlines();
}
// ---------------------------------------------------------------- 04-11: the artery, cut lengthwise; blood flows down the screen
const MICRO_XF = mRz(-Math.PI / 2);                                   // model +x (downstream) → screen down
const microAt = x => -x;                                              // world y of model x
function microCam(x, dist, side, tgx) { return camLook([side || 0, microAt(x) + 5, dist], [tgx || 0, microAt(x), -10], [0, 1, 0], 36); }
function pulseScale(t) { const b = (t / BEAT) % 1; return 1 + 0.012 * Math.max(0, Math.sin(TAU * b)) ** 2; }
const FIELD = {};
const fieldOf = (st, n, seed) => { const k = JSON.stringify(st) + n + seed; return FIELD[k] || (FIELD[k] = cellField(st, n, seed)); };
const MSKY = () => skyBG(hexc('#14070C'), hexc('#2A0C14'));
function microState(t) {                                              // the wall through the disease story: one segment, one state at a time
  if (t < EV.ldl[0]) return { g: 0, xc: AR.XS, w: AR.WS, sick: t < EV.push6 ? 0 : qg(ph(t, EV.sick - 0.3, EV.sick + 0.9), 6) };
  if (t < EV.grow8) return { g: qg(0.35 * ph(t, EV.foam - 0.2, EV.grow8), 12), xc: AR.XS, w: AR.WS, sick: 1 };
  if (t < EV.comp9) return { g: qg(lerp(0.35, 1, ph(t, EV.grow8, EV.comp9 - 0.2)), 16), cal: qg(ph(t, EV.calc[0] - 0.2, EV.calc[1] + 0.3), 4), xc: AR.XS, w: AR.WS, sick: 1 };
  return { g: 1, cal: 1, xc: AR.XS, w: AR.WS, sick: 1 };
}
const vxf = (t, xf) => mMul(xf || MICRO_XF, mS(1, pulseScale(t), pulseScale(t)));
function normalCam(t) {
  const x0 = AR.XS, base = microCam(x0, 270, 0), wallE = [-5, microAt(x0) + 4, 105], wallG = [-17, microAt(x0) - 2, -12];
  if (t < EV.cut4 + 0.6) { const f = ph(t, EV.cut4, EV.cut4 + 0.6, eout); return microCam(x0 + 10 * (1 - f), lerp(110, 270, f), 0); }
  if (t >= EV.push6 && t < EV.pull7) return camAB(base.eye, base.tg, wallE, wallG, ph(t, EV.push6, EV.push6 + 0.9, eio), 36);
  if (t >= EV.pull7 && t < EV.grow8) { const c1 = microCam(x0, 215, 26, -6); return camAB(c1.eye, c1.tg, wallE, wallG, 1 - ph(t, EV.pull7, EV.pull7 + 0.9, eio), 36); }
  if (t >= EV.grow8) { const f = ph(t, EV.grow8, EV.comp9, lin); return microCam(x0, 270 - 14 * f, 0); }   // the same angle as scene 4, drifting in a little
  return base;
}
function sNormal(t) {                                                  // 04-08
  const st = microState(t), cam = normalCam(t), xf = vxf(t), close = t >= EV.push6 && t < EV.pull7 + 0.6;
  MSKY(); drawVessel(cam, st, xf);
  drawCells(cam, xf, st, fieldOf({ g: qg(st.g, 4), xc: st.xc, w: st.w }, 70, 3), t, { rate: 0.075, count: close ? 30 : 70 });
  // white cells roll along the dysfunctional lining and stick
  if (t >= EV.push6 && t < EV.grow8 + 1) EV.wbc.forEach((e, i) => { const stop = st.xc - 20 + i * 26, x = t < e ? stop - (e - t) * 40 : stop; drawWBC(cam, xf, x, wallSurfY(x, st) + 6, -9 - i * 3); });
  // lipid slips under the lining into the wall; a macrophage takes it up and becomes a foam cell
  if (t >= EV.ldl[0] - 0.4 && t < EV.comp9) {
    EV.ldl.forEach((e, i) => { if (t < e - 0.35) return; for (let j = 0; j < 3; j++) { const x = st.xc - 18 + i * 12 + j * 5, ws = wallSurfY(x, st), f = ph(t, e - 0.35, e + 0.25); drawLDL(cam, xf, x, lerp(ws + 6, ws - 2.4 - j * 1.1, f), lerp(-4, 0.4, f)); } });
    if (t >= EV.ldl[1]) { const x = st.xc + 6; drawFoam(cam, xf, x, (-AR.RI + wallSurfY(x, st)) / 2, ph(t, EV.foam - 0.2, EV.foam + 0.4)); }
  }
  r3dOutlines();
  // glucose: chronic exposure, more with every beat of scene 5; dissolved in the blood, it never forms a plug
  if (t >= EV.glu[0]) drawGlucose(cam, xf, st, t, t < EV.push6 ? 8 + 12 * EV.glu.filter(e => t >= e).length : close ? 18 : 46);
}
// 09: normal and narrowed, side by side, same scale
function sCompare(t) {
  const x0 = AR.XS, cam = camLook([0, microAt(x0) + 5, 500], [0, microAt(x0), -10], [0, 1, 0], 36);
  const stN = { g: 0, xc: AR.XS, w: AR.WS }, stS = { g: 1, cal: 1, xc: AR.XS, w: AR.WS, sick: 1 };
  const slide = ph(t, EV.comp9, EV.comp9 + 0.5, eout), pS = mS(1, pulseScale(t), pulseScale(t));
  const xfN = mMul(mT(-44 - 80 * (1 - slide), 0, 0), mMul(MICRO_XF, pS)), xfS = mMul(mT(44 * slide, 0, 0), mMul(MICRO_XF, pS));
  MSKY(); drawVessel(cam, stN, xfN); drawVessel(cam, stS, xfS);
  drawCells(cam, xfN, stN, fieldOf(stN, 90, 5), t, { rate: 0.075 });
  drawCells(cam, xfS, stS, fieldOf({ g: 1, xc: AR.XS, w: AR.WS }, 34, 6), t, { rate: 0.075 });   // less flow overall; faster in the throat
  r3dOutlines();
  if (t >= EV.jet) for (let i = 0; i < 10; i++) {                      // the jet through the narrow channel: fast streaks just past the throat
    const u = (t * 2.6 + i * 0.37) % 1, x = x0 - 18 + u * 66, ch = chanAt(x, stS), y = ch[1] + ((i % 5) - 2) * 0.3 * AR.RL * ch[0];
    const a = project(cam, mApply(xfS, [x, y, -2])), b = project(cam, mApply(xfS, [x - 9, y, -2]));
    if (a && b) lineW(a[0], a[1], b[0], b[1], 1.6, P.CO3);
  }
}
// 10-11: farther down the same artery — the occluded segment, then the side channels around it
const OCC_ST = { g: 1, cal: 1, xc: AR.XS, w: AR.WS, sick: 1, occ: { xc: AR.XO, w: AR.WO } };
function occCam(t) {
  const c0 = microCam(AR.XS, 270, 0), c1 = microCam(AR.XO - 20, 270, 0), c2 = microCam(AR.XO - 32, 175, 0), c3 = microCam(AR.XO - 8, 360, 10, 10);
  if (t < EV.pull11) { const a = camAB(c0.eye, c0.tg, c1.eye, c1.tg, ph(t, EV.pan10, EV.pan10 + 1.0, eio), 36); return camAB(a.eye, a.tg, c2.eye, c2.tg, ph(t, EV.block10, EV.block10 + 0.75, eio), 36); }
  return camAB(c2.eye, c2.tg, c3.eye, c3.tg, ph(t, EV.pull11, EV.pull11 + 1.0, eio), 36);
}
function sOcclusion(t) {
  const cam = occCam(t), xf = vxf(t);
  MSKY(); drawVessel(cam, OCC_ST, xf);
  if (t >= EV.pull11) drawCollat(cam, xf, t < EV.colGrow ? 0 : qg(ph(t, EV.colGrow, EV.colFlow), 8));
  drawStagnant(cam, xf, OCC_ST, t, 56);
  drawCollatFlow(cam, xf, t, t > EV.colFlow ? ph(t, EV.colFlow, EV.colFlow + 0.6) : 0);
  r3dOutlines();
}
// ---------------------------------------------------------------- 12: walking again — the working calf needs more than the blocked arteries deliver
function demandCam(t) { const x = WALK12.at(t)[0]; return camLook([x + 200, 440, 1750], [x + 110, 340, 92], [0, 1, 0], 32); }
function sDemand(t) {
  const w = WALK12.at(t), pose = patientPose([w[0], w[1], 0], 0, { ph: PH12(t), amp: AMP12() }), cam = demandCam(t);
  const pain = clamp(0.35 + 0.2 * EV.steps12.filter(e => t >= e).length, 0, 1), pulse = Math.max(0, Math.sin(TAU * ((t - EV.cut12) / 0.75))) ** 2;
  skyBG(P.K0, P.N2); drawFloor(cam, FOG_W); footShadows(cam, pose);
  drawLeg(cam, pose, { muscle: 1, bone: 0, art: 1, pain, pulse, fog: FOG_W });
  drawPatient(cam, pose, { glassLeg: 1, fog: FOG_W });
  r3dOutlines();
}
// ---------------------------------------------------------------- 13: rest — demand falls; the arteries stay as they are
function sRest(t) {
  const s = walkState(PT_HOLD_END), relax = ph(t, EV.relax - 0.4, EV.relax + 1.3, eio);
  const pose = patientPose(s.root, 0, Object.assign({}, s.q, { hold: 1 - relax })), cam = walkCam(5.0);
  skyBG(P.K0, P.N2); drawFloor(cam, FOG_W); footShadows(cam, pose);
  drawPatient(cam, pose, { pain: 0.85 * (1 - ph(t, EV.relax, EV.rest13 + 2.9)), fog: FOG_W });
  r3dOutlines();
}
// ---------------------------------------------------------------- 14: CT angiography (head first into the gantry, contrast into the arm vein)
function ctDY(t) { return lerp(0, 620, ph(t, EV.ct14, EV.tableStop, eio)); }
function sCT(t) {
  const dy = ctDY(t), drift = ph(t, EV.ct14, EV.ct14 + 3, lin);
  // a camera fixed in the room (it moves with the gantry in the patient frame): the patient slides in toward it
  const G = 24 - dy, cam = camLook([-1450 + 160 * drift, G - 2650, 1350], [-120, G - 420, -60], [0, 0, 1], 36);
  skyBG(P.K0, P.N2); drawCTRoom(cam, dy, t >= EV.inject ? ph(t, EV.inject, EV.inject + 0.6, lin) : 0);
  r3dOutlines();
}
// ---------------------------------------------------------------- 15: the contrast's route: arm vein → heart → lungs → heart → aorta → down toward the legs
function sCirc(t) {
  const u = ph(t, EV.circ15, EV.circ15 + 3, eio);
  const cam = camLook([lerp(-70, 40, u), lerp(-360, -560, u), lerp(1150, 1300, u)], [lerp(-50, 30, u), lerp(-360, -560, u), 0], [0, 1, 0], 38);
  skyBG(P.K0, P.N2); drawCirc(cam, t);
}
// ---------------------------------------------------------------- 16-21: the arterial tree
const FOG_T = [2200, 6000, P.N2];
function sFill(t) {                                                    // 16: pelvis to foot, the front moving down both legs
  const u = t - EV.fill16, front = 120 + 640 * u;
  const yc = lerp(1000, 330, ph(t, EV.fill16, EV.fill16 + 2.75, eio)), z = lerp(1350, 1750, ph(t, EV.fill16, EV.fill16 + 2.9));
  const c = camLook([-150, yc + 110, z], [-45, yc, 0], [0, 1, 0], 34);
  skyBG(P.K0, P.N2);
  ghostBody(c, null, ['torso', 'pelvis', 'R', 'L'], { fog: FOG_T });
  drawTreeExpl(c, TREE(), { front, fog: FOG_T });
  r3dOutlines();
}
function ctaRotCam(ang, dist, yc) { return camLook([-10 + dist * Math.sin(ang), yc + 60, dist * Math.cos(ang)], [-10, yc, 0], [0, 1, 0], 34); }
const CTA_FAR = () => ctaRotCam(0.3, 1720, 560);
const CTA_SKY = () => skyBG(hexc('#05070A'), hexc('#0E1218'));
function sCTA(t) {                                                     // 17: the reconstruction turns slowly; both legs, aorta to feet
  const c = ctaRotCam(lerp(-0.32, 0.3, ph(t, EV.cta17, EV.cta17 + 3, lin)), lerp(1380, 1720, ph(t, EV.cta17, EV.cta17 + 1.2, eout)), 560);
  CTA_SKY(); drawBones(c, { ramp: RT.vr, glass: [0.08, 0.6, 1.6] }); drawTreeCTA(c, TREE()); r3dOutlines();
}
const L1W = [-76, 690, 4], L2W = [-75, 520, -40];
// a slow orbit-and-drift around a target after a camera move has landed (keeps a held CTA view alive)
function orbit(eye, tg, a, k) { const dx = eye[0] - tg[0], dz = eye[2] - tg[2], c = Math.cos(a), s_ = Math.sin(a); return camLook([tg[0] + (dx * c + dz * s_) * k, tg[1] + (eye[1] - tg[1]) * k, tg[2] + (-dx * s_ + dz * c) * k], tg, [0, 1, 0], 34); }
const nearL1 = (a, k) => orbit([L1W[0] - 150, L1W[1] + 18, L1W[2] + 320], [L1W[0] - 4, L1W[1] - 6, L1W[2]], a || 0, k || 1);
const L1_DRIFT = t => [0.16 * ph(t, EV.zoom18 + 0.5, EV.pan19, lin), 1 - 0.07 * ph(t, EV.zoom18 + 0.5, EV.pan19, lin)];
function ctaStenCam(t) { const f = ph(t, EV.zoom18, EV.zoom18 + 0.5, ein), a = CTA_FAR(), d = L1_DRIFT(t), b = nearL1(d[0], d[1]); return camLook(lerp3(a.eye, b.eye, f), lerp3(a.tg, b.tg, f), [0, 1, 0], 34); }
function sCTAStenosis(t) {                                             // 18: fast push to the SFA stenosis, the slice line through it
  const c = ctaStenCam(t);
  CTA_SKY(); drawBones(c, { ramp: RT.vr, glass: [0.05, 0.45, 1.6] }); drawTreeCTA(c, TREE()); r3dOutlines();
  if (t >= EV.inset18) { const a = project(c, [L1W[0] - 17, L1W[1], L1W[2]]), b = project(c, [L1W[0] + 17, L1W[1], L1W[2]]); if (a && b) lineW(a[0], a[1], b[0], b[1], 2, P.WARN); }
}
function sCTAOcclusion(t) {                                            // 19: down to the popliteal: no contrast through the block, collaterals around it
  const d = L1_DRIFT(EV.pan19), c0 = nearL1(d[0], d[1]), u = ph(t, EV.pan19 + 1.0, EV.comp20, lin);
  const c1 = orbit([L2W[0] - 270, L2W[1] + 10, L2W[2] + 380], [L2W[0] + 6, L2W[1] - 4, L2W[2]], -0.2 * u, 1 - 0.08 * u), f = ph(t, EV.pan19, EV.pan19 + 1.0, eio);
  const c = camAB(c0.eye, c0.tg, c1.eye, c1.tg, f, 34);
  CTA_SKY(); drawBones(c, { ramp: RT.vr, glass: [0.04, 0.4, 1.6] }); drawTreeCTA(c, TREE()); r3dOutlines();
  const g = ph(t, EV.cutoff19, EV.cutoff19 + 0.5);                     // the blocked segment keeps its wall: a faint cyan outline of its course
  if (g > 0 && TREE().occ) drawMesh(c, TREE().occ, { ramp: [P.CY0, P.CY1, P.CY2, P.CY3], id: 0, glass: [0.02 * g, 0.9 * g, 2.4], amb: 0.4, dif: 0.5 });
}
// 20-21: the normal teaching model (left) and this patient's right leg (right): same scale, same angle, turning together
function sCompareTrees(t) {
  const yaw = lerp(-0.17, 0.17, ph(t, EV.comp20, DUR, lin)), d = lerp(1700, 2050, ph(t, EV.comp20, EV.comp20 + 0.9, eout));
  const c = camLook([0, 626, d], [0, 626, 0], [0, 1, 0], 34);
  const xL = mMul(mT(-150, 0, 0), mMul(mRy(yaw), mT(83, 0, 0))), xR = mMul(mT(150, 0, 0), mMul(mRy(yaw), mT(83, 0, 0)));
  const hot = [{ k: stepK(t, EV.hl21[0], DUR + 1, 3, 0.15) }, { k: stepK(t, EV.hl21[1], DUR + 1, 3, 0.15) }];
  skyBG(P.K0, P.N2);
  ghostBody(c, xL, ['R'], { fog: FOG_T }); ghostBody(c, xR, ['R'], { fog: FOG_T });
  drawTreeExpl(c, TREE_N(), { xf: xL, fog: FOG_T });
  drawTreeExpl(c, TREE_R(), { xf: xR, hot, fog: FOG_T });
  r3dOutlines();
  sCompareTrees.last = { c, xL, xR };
}
// ---------------------------------------------------------------- scene table and transitions
function drawScene(t) {
  r3dBegin();
  const i = sceneIndex(t);
  if (i <= 1) sWalk(t);
  else if (i === 2) sLeg(t);
  else if (i <= 7) sNormal(t);
  else if (i === 8) sCompare(t);
  else if (i <= 10) sOcclusion(t);
  else if (i === 11) sDemand(t);
  else if (i === 12) sRest(t);
  else if (i === 13) sCT(t);
  else if (i === 14) sCirc(t);
  else if (i === 15) sFill(t);
  else if (i === 16) sCTA(t);
  else if (i === 17) sCTAStenosis(t);
  else if (i === 18) sCTAOcclusion(t);
  else sCompareTrees(t);
}
// soft crossfades across a scene boundary B (the dive into the lumen, the scan into the body, the body into the CTA display):
// before B the old scene runs and the new one waits on its first frame; after B the old one holds its last frame
const DISSOLVE = [[EV.cut4 - 0.25, EV.cut4 + 0.2, EV.cut4], [EV.circ15 - 0.2, EV.circ15 + 0.2, EV.circ15], [EV.cta17 - 0.2, EV.cta17 + 0.3, EV.cta17]];
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6); G_T = t;
  const d = DISSOLVE.find(([a, b]) => t >= a && t < b);
  if (d) {
    drawScene(Math.min(t, d[2] - 1e-4)); SPARE[2].set(buf.subarray(0, W * H));
    drawScene(Math.max(t, d[2]));
    mixInto(buf, SPARE[2].subarray(0, W * H), 1 - smooth(seg(t, d[0], d[1])));
  } else drawScene(t);
  drawUI(t);
  overlays(t);
}
// one frame for both versions: draws the clean frame, returns a copy of it, then adds the text on top (buf = labeled frame)
function renderPair(t) { const ui = UI_ON; UI_ON = false; renderFrame(t); const clean = buf.slice(0, W * H); UI_ON = true; overlays(t); UI_ON = ui; return clean; }
function engineInit() { buildParts(); }
