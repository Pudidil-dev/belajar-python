'use strict';
// ============================================================================
// THE FILM: 21 scenes of 3 s on one clock (03_clock.js). Each scene draws its
// voxel world with its own camera; scene changes are cuts, continuous camera
// moves, or ordered-dither dissolves (no blur). The graphic overlays
// (24_ui.js) and the text (25_text.js) are drawn on top.
// One patient, one right leg, one lesion map (13_tree.js) in every view.
// ============================================================================
const ph = (t, a, b, e) => (e || smooth)(seg(t, a, b));
const lin = x => x;
const V = (a, b, f) => [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
const camAB = (e0, t0, e1, t1, f, fov) => camLook(V(e0, e1, f), V(t0, t1, f), [0, 1, 0], fov || 34);
const qg = (x, n) => Math.round(clamp(x, 0, 1) * n) / n;            // quantised disease state (cached meshes)
let G_T = 0;                                                          // the frame's time (for overlays that blink on the grid)
// ---------------------------------------------------------------- 01-02: walking, slowing, stopping, holding the calf
const PT_HOLD_END = 6.0;
function walkState(t) {
  const tt = Math.min(t, 6), w = WALK.at(tt), hold = ph(tt, EV.hold - 0.1, EV.hold + 0.7);
  return { root: [w[0], w[1], 0], q: { ph: gaitPhase(tt), amp: gaitAmp(tt), hold } };
}
function walkCam(t) {
  const w = WALK.at(Math.min(t, 6))[0];
  const A = { e: [w + 300, 760, 2900], g: [w + 160, 620, 0] };                // lateral tracking, lead room ahead of him
  const B = { e: [w + 120, 470, 1500], g: [w + 10, 330, 92] };                 // closer: the right calf
  const f = ph(t, 3.4, 5.6, eio);
  return camLook(V(A.e, B.e, f), V(A.g, B.g, f), [0, 1, 0], 32);
}
function sWalk(t) {
  const s = walkState(t), cam = walkCam(t), pose = patientPose(s.root, 0, s.q);
  drawVox(cam, FLOOR(), null);
  footShadows(cam, pose);
  drawPatient(cam, pose, { pain: ph(t, EV.pain - 0.3, EV.pain + 0.75) * 0.7 });
}
// ---------------------------------------------------------------- 03: into the leg (skin → muscle → arteries → the popliteal)
function holdPose() { const s = walkState(PT_HOLD_END); return patientPose(s.root, 0, s.q); }
function legCam(t, pose) {
  // the calf (where it hurts) → up along the artery → into the thigh artery at the site of the later stenosis (L1)
  const K = mApply(pose.right.sh, [0, 0, 0]), A = treeToWorld(pose, [-76, 690, 4]), c0 = walkCam(PT_HOLD_END);
  const k1 = { e: add3(K, [-700, 60, 640]), g: add3(K, [-60, -170, 0]) };   // behind and beside the knee: the calf
  const k2 = { e: add3(A, [-330, 30, 300]), g: A };
  const k3 = { e: add3(A, [-24, 6, 22]), g: add3(A, [6, -16, -4]) };
  const u = t - EV.reveal;
  if (u < 1.2) return camAB(c0.eye, c0.tg, k1.e, k1.g, eio(u / 1.2), 34);
  if (u < 2.25) return camAB(k1.e, k1.g, k2.e, k2.g, eio((u - 1.2) / 1.05), 34);
  return camAB(k2.e, k2.g, k3.e, k3.g, ein((u - 2.25) / 0.75), 34);
}
function sLeg(t) {
  const pose = holdPose(), cam = legCam(t, pose);
  drawVox(cam, FLOOR(), null);
  // everything but the right leg leaves; the right leg turns see-through layer by layer (skin, then muscle)
  const bodyA = 1 - ph(t, EV.reveal, EV.reveal + 0.75), skinA = 1 - ph(t, EV.reveal + 0.2, EV.muscle + 0.2) * 0.8;
  const musA = 1 - ph(t, EV.artery - 0.2, EV.artery + 0.5) * 0.8;
  if (bodyA > 0.02) drawPatient(cam, pose, { alpha: bodyA, skipXf: [pose.right.th, pose.right.sh, pose.right.ft] });
  drawVox(cam, PART.foot, pose.right.ft, { alpha: skinA });
  drawLeg(cam, pose, { skin: skinA, thigh: skinA, muscle: musA, art: 1, bone: 0.35, pain: 0.35 * (1 - ph(t, EV.artery, EV.dive)) });
}
// ---------------------------------------------------------------- 04-11: the artery, cut lengthwise; blood flows down the screen
const MICRO_XF = mRz(-Math.PI / 2);                                   // model +x (downstream) → screen down
const microAt = x => -x;                                              // world y of model x
function microCam(x, dist, side, tgx) { return camLook([side || 0, microAt(x) + 6, dist], [tgx || 0, microAt(x), -10], [0, 1, 0], 36); }
function pulseScale(t) { const b = (t / BEAT) % 1; return 1 + 0.012 * Math.max(0, Math.sin(TAU * b)) ** 2; }
const FIELD = {};
const fieldOf = (st, n, seed) => { const k = JSON.stringify(st) + n + seed; return FIELD[k] || (FIELD[k] = cellField(st, n, seed)); };
function microState(t) {                                              // the wall through the disease story: one segment, one state at a time
  if (t < EV.ldl[0]) return { g: 0, xc: AR.XS, w: AR.WS, sick: t < EV.push6 ? 0 : qg(ph(t, EV.sick - 0.3, EV.sick + 0.9), 6) };
  if (t < EV.grow8) return { g: qg(0.35 * ph(t, EV.foam - 0.2, EV.grow8), 12), xc: AR.XS, w: AR.WS, sick: 1 };
  if (t < EV.comp9) return { g: qg(lerp(0.35, 1, ph(t, EV.grow8, EV.comp9 - 0.2)), 16), cal: qg(ph(t, EV.calc[0] - 0.2, EV.calc[1] + 0.3), 4), xc: AR.XS, w: AR.WS, sick: 1 };
  return { g: 1, cal: 1, xc: AR.XS, w: AR.WS, sick: 1 };
}
function drawArtery(cam, st, t, xf) {
  const ps = pulseScale(t), xfp = mMul(xf || MICRO_XF, mS(1, ps, ps));
  drawVox(cam, arteryMesh(st), xfp);
  return xfp;
}
function normalCam(t) {
  const x0 = AR.XS, base = microCam(x0, 330, 0), wallE = [-6, microAt(x0) + 4, 120], wallG = [-17, microAt(x0) - 2, -14];
  if (t < EV.cut4 + 0.6) { const f = ph(t, EV.cut4, EV.cut4 + 0.6, eout); return microCam(x0 + 10 * (1 - f), lerp(150, 330, f), 0); }
  if (t >= EV.push6 && t < EV.pull7) return camAB(base.eye, base.tg, wallE, wallG, ph(t, EV.push6, EV.push6 + 0.9, eio), 36);
  if (t >= EV.pull7 && t < EV.grow8) { const c1 = microCam(x0, 260, 30, -6); return camAB(c1.eye, c1.tg, wallE, wallG, 1 - ph(t, EV.pull7, EV.pull7 + 0.9, eio), 36); }
  return base;
}
function sNormal(t) {                                                  // 04-08
  const st = microState(t), cam = normalCam(t), xf = drawArtery(cam, st, t), close = t >= EV.push6 && t < EV.pull7 + 0.6;
  drawCells(cam, xf, st, fieldOf({ g: qg(st.g, 4), xc: st.xc, w: st.w }, 70, 3), t, { rate: 0.075, count: close ? 26 : 70 });
  const S = sprites();
  // glucose: chronic exposure, more with every beat of scene 5; dissolved in the blood, it never forms a plug
  if (t >= EV.glu[0]) {
    const n = t < EV.push6 ? 8 + 14 * EV.glu.filter(e => t >= e).length : close ? 22 : 56, r = mulberry(17);
    for (let i = 0; i < n; i++) { const p0 = r(), eta = (r() * 2 - 1) * 0.8, zz = -r() * 0.8, x = -AR.L / 2 + ((p0 * AR.L + t * 22) % AR.L), k = plaqueAt(x, st.g, st.xc, st.w); drawSprite(cam, xf, S.glu, x, k[1] + eta * AR.RL * k[0] * 0.9, zz * AR.RL * k[0] * 0.7, t * 0.8 + i, 0.4); }
  }
  // white cells roll along the dysfunctional lining and stick
  if (t >= EV.push6 && t < EV.grow8 + 1) EV.wbc.forEach((e, i) => { const stop = st.xc - 20 + i * 26, x = t < e ? stop - (e - t) * 40 : stop, k = plaqueAt(x, st.g, st.xc, st.w); drawSprite(cam, xf, S.wbc, x, k[1] - AR.RL * k[0] + 5, -10 - i * 4, 0, 0); });
  // lipid slips under the lining into the wall; a macrophage takes it up and becomes a foam cell
  if (t >= EV.ldl[0] - 0.4 && t < EV.comp9) {
    EV.ldl.forEach((e, i) => { if (t < e - 0.35) return; for (let j = 0; j < 3; j++) { const x = st.xc - 18 + i * 12 + j * 5, ws = wallSurfY(x, st.g, st.xc, st.w), f = ph(t, e - 0.35, e + 0.25); drawSprite(cam, xf, S.ldl, x, lerp(ws + 7, ws - 2.5 - j * 1.2, f), 0.6, 0, 0); } });
    if (t >= EV.ldl[1]) { const x = st.xc + 6; drawSprite(cam, xf, t >= EV.foam ? S.foam : S.mac, x, (-AR.RI + wallSurfY(x, st.g, st.xc, st.w)) / 2, 0.5, 0, 0); }
  }
}
// 09: normal and narrowed, side by side, same scale
function sCompare(t) {
  const x0 = AR.XS, cam = camLook([0, microAt(x0) + 6, 600], [0, microAt(x0), -10], [0, 1, 0], 36);
  const stN = { g: 0, xc: AR.XS, w: AR.WS }, stS = { g: 1, cal: 1, xc: AR.XS, w: AR.WS, sick: 1 };
  const slide = ph(t, EV.comp9, EV.comp9 + 0.5, eout);
  const xfN = mMul(mT(-58 - 90 * (1 - slide), 0, 0), MICRO_XF), xfS = mMul(mT(58 * slide, 0, 0), MICRO_XF);
  drawVox(cam, arteryMesh(stN), xfN); drawVox(cam, arteryMesh(stS), xfS);
  drawCells(cam, xfN, stN, fieldOf(stN, 90, 5), t, { rate: 0.075 });
  drawCells(cam, xfS, stS, fieldOf({ g: 1, xc: AR.XS, w: AR.WS }, 34, 6), t, { rate: 0.075 });   // less flow overall; faster in the throat
  if (t >= EV.jet) for (let i = 0; i < 10; i++) {                      // the jet through the narrow channel: fast streaks
    const u = (t * 2.6 + i * 0.37) % 1, x = x0 - 20 + u * 64, k = plaqueAt(x, 1, x0, AR.WS), y = k[1] + ((i % 5) - 2) * 0.32 * AR.RL * k[0];
    const a = proj(cam, mApply(xfS, [x, y, 1])), b = proj(cam, mApply(xfS, [x - 9, y, 1]));
    if (a && b) { lineW(a[0], a[1], b[0], b[1], 2, P.C6); }
  }
}
// 10-11: farther down the same artery — the occluded segment, then the side channels around it
const OCC_ST = { g: 1, cal: 1, xc: AR.XS, w: AR.WS, sick: 1, occ: { xc: AR.XO, w: AR.WO } };
function occCam(t) {
  const c0 = microCam(AR.XS, 330, 0), c1 = microCam(AR.XO - 20, 330, 0), c2 = microCam(AR.XO - 30, 200, 0), c3 = microCam(AR.XO - 10, 410, 10, 10);
  if (t < EV.pull11) { const a = camAB(c0.eye, c0.tg, c1.eye, c1.tg, ph(t, EV.pan10, EV.pan10 + 1.0, eio), 36); return camAB(a.eye, a.tg, c2.eye, c2.tg, ph(t, EV.block10, EV.block10 + 0.75, eio), 36); }
  return camAB(c2.eye, c2.tg, c3.eye, c3.tg, ph(t, EV.pull11, EV.pull11 + 1.0, eio), 36);
}
function sOcclusion(t) {
  const cam = occCam(t), xf = drawArtery(cam, OCC_ST, t);
  if (t >= EV.pull11) drawVox(cam, collatMesh(t < EV.colGrow ? 0 : qg(ph(t, EV.colGrow, EV.colFlow), 8)), xf);
  drawStagnant(cam, xf, OCC_ST, t, 60, { creep: 0 });
  drawCollatFlow(cam, xf, t, t > EV.colFlow ? ph(t, EV.colFlow, EV.colFlow + 0.6) : 0);
}
// ---------------------------------------------------------------- 12: walking again — the working calf needs more than the blocked arteries deliver
function demandCam(t) { const x = WALK12.at(t)[0]; return camLook([x + 200, 420, 1750], [x + 110, 330, 92], [0, 1, 0], 32); }
function sDemand(t) {
  const w = WALK12.at(t), pose = patientPose([w[0], w[1], 0], 0, { ph: PH12(t), amp: AMP12() }), cam = demandCam(t);
  drawVox(cam, FLOOR(), null);
  footShadows(cam, pose);
  drawPatient(cam, pose, { skipXf: [pose.right.th, pose.right.sh] });
  drawVox(cam, PART.thigh, pose.right.th, { alpha: 0.3 });
  const pain = clamp(0.3 + 0.2 * EV.steps12.filter(e => t >= e).length, 0, 1);
  const pulse = Math.max(0, Math.sin(TAU * ((t - EV.cut12) / 0.75))) ** 2;
  drawLeg(cam, pose, { skin: 0.22, muscle: 1, art: 1, bone: 0.35, pain, pulse });
}
// ---------------------------------------------------------------- 13: rest — demand falls; the arteries stay as they are
function sRest(t) {
  const s = walkState(PT_HOLD_END), relax = ph(t, EV.relax - 0.4, EV.relax + 1.3, eio);
  const pose = patientPose(s.root, 0, Object.assign({}, s.q, { hold: 1 - relax })), cam = walkCam(5.0);
  drawVox(cam, FLOOR(), null);
  footShadows(cam, pose);
  drawPatient(cam, pose, { pain: 0.7 * (1 - ph(t, EV.relax, EV.rest13 + 2.9)) });
}
// ---------------------------------------------------------------- 14: CT angiography (the patient on the table, contrast into an arm vein)
function sCT(t) {
  const cam = camLook([3400, 2050, 2900], [0, 950, 650], [0, 1, 0], 32);
  drawCT(cam, t, lerp(0, -650, ph(t, EV.ct14, EV.tableStop, eio)), { inject: t >= EV.inject ? ((t - EV.inject) / 0.6) % 1 : 0 });
}
// ---------------------------------------------------------------- 15: the contrast's route: arm vein → heart → lungs → heart → aorta
function sCirc(t) {
  const s = ROUTE_LEN * ph(t, EV.circ15, EV.circ15 + 2.85, lin), u = ph(t, EV.circ15, EV.circ15 + 3, lin);
  const cam = camLook([110 - 60 * u, 1330, 1350], [90 - 50 * u, 1310, 0], [0, 1, 0], 34);
  drawCirc(cam, s);
}
// ---------------------------------------------------------------- 16-21: the arterial tree
// explanatory style: the lumen as a cast (blood red, then contrast white-blue behind the front), the disease solid, the wall see-through
function treeExpl(c, T, o) {
  o = o || {};
  const front = o.front === undefined ? 1e9 : o.front, xf = o.xf || null;
  drawVox(c, T.lum, xf, { rampK: (m, k) => (k >= 0 && k < front) ? MAT[M_CON].r : MAT[M_BLD].r, id: front >= 1e8 ? M_CON : undefined });
  drawVox(c, T.inner, xf);
  for (const sl of o.hot || []) if (sl.k > 0) drawVox(c, T.inner, xf, { ramp: () => MAT[M_HOT].r, clip: [0, 1, 0, sl.y0], clip2: [0, -1, 0, -sl.y1], alpha: sl.k, depthBias: 1e-6 });
  drawVox(c, T.wall, xf, { alpha: o.wallA === undefined ? 0.3 : o.wallA, ramp: () => MAT[M_WALLG].r, id: M_WALLG });
}
// CTA style: grayscale — contrast-filled lumen light grey, calcium white with a dark rim, bone mid grey; no colours
function treeCTA(c, T, o) {
  o = o || {};
  drawVox(c, T.lum, null, { ramp: () => MAT[M_CTL].r, id: M_CTL });
  drawVox(c, T.inner, null, { ramp: m => m === M_CAL ? MAT[M_CTC].r : null, id: M_CTC });
  if (o.boneA) drawVox(c, BONES(), null, { alpha: o.boneA, ramp: () => MAT[M_CTB].r, id: M_CTB });
  if (o.ghost) drawVox(c, T.wall, null, { alpha: o.ghost, ramp: m => m === M_WALL ? MAT[M_WALLG].r : null, id: M_WALLG, clip: [0, 1, 0, LES.L2.y0 + 8], clip2: [0, -1, 0, -(LES.L2.y1 - 8)] });   // the wall outline of the blocked segment
}
function sFill(t) {                                                    // 16: pelvis to foot, the front moving down both legs
  const u = t - EV.fill16, front = 120 + 620 * u;
  const yc = lerp(1060, 250, ph(t, EV.fill16, EV.fill16 + 2.75, eio)), z = lerp(1450, 1850, ph(t, EV.fill16, EV.fill16 + 2.9));
  const c = camLook([-160, yc + 120, z], [-50, yc, 0], [0, 1, 0], 34);
  ghostBody(c, null, ['torso', 'pelvis', 'R', 'L']); voxBegin();                // the body as a flat backdrop, then the vessels over it
  treeExpl(c, TREE(), { front, wallA: 0.22 });
}
function ctaRotCam(ang, dist, yc) { return camLook([-10 + dist * Math.sin(ang), yc + 60, dist * Math.cos(ang)], [-10, yc, 0], [0, 1, 0], 34); }
const CTA_FAR = () => ctaRotCam(0.3, 2150, 560);
function sCTA(t) {                                                     // 17: the reconstruction turns slowly; both legs, aorta to feet
  treeCTA(ctaRotCam(lerp(-0.32, 0.3, ph(t, EV.cta17, EV.cta17 + 3, lin)), lerp(1750, 2150, ph(t, EV.cta17, EV.cta17 + 1.2, eout)), 560), TREE(), { boneA: 0.5 });
}
const L1W = [-76, 690, 4], L2W = [-75, 520, -40];
// a slow orbit-and-drift around a target after a camera move has landed (keeps a held CTA view alive)
function orbit(eye, tg, a, k) { const dx = eye[0] - tg[0], dz = eye[2] - tg[2], c = Math.cos(a), s_ = Math.sin(a); return camLook([tg[0] + (dx * c + dz * s_) * k, tg[1] + (eye[1] - tg[1]) * k, tg[2] + (-dx * s_ + dz * c) * k], tg, [0, 1, 0], 34); }
const nearL1 = (a, k) => orbit([L1W[0] - 170, L1W[1] + 20, L1W[2] + 360], [L1W[0] - 4, L1W[1] - 6, L1W[2]], a || 0, k || 1);
const L1_DRIFT = t => [0.16 * ph(t, EV.zoom18 + 0.5, EV.pan19, lin), 1 - 0.07 * ph(t, EV.zoom18 + 0.5, EV.pan19, lin)];
function ctaStenCam(t) { const f = ph(t, EV.zoom18, EV.zoom18 + 0.5, ein), a = CTA_FAR(), d = L1_DRIFT(t), b = nearL1(d[0], d[1]); return camLook(V(a.eye, b.eye, f), V(a.tg, b.tg, f), [0, 1, 0], 34); }
function sCTAStenosis(t) {                                             // 18: fast push to the SFA stenosis, the axial slice through it
  const c = ctaStenCam(t);
  treeCTA(c, TREE(), { boneA: 0.25 });
  if (t >= EV.inset18) { const a = proj(c, [L1W[0] - 17, L1W[1], L1W[2]]), b = proj(c, [L1W[0] + 17, L1W[1], L1W[2]]); if (a && b) { lineW(a[0], a[1], b[0], b[1], 2, P.WARN); } }
}
function sCTAOcclusion(t) {                                            // 19: down to the popliteal: no contrast through the block, collaterals around it
  const d = L1_DRIFT(EV.pan19), c0 = nearL1(d[0], d[1]), u = ph(t, EV.pan19 + 1.0, EV.comp20, lin), c1 = orbit([L2W[0] - 300, L2W[1] + 10, L2W[2] + 420], [L2W[0] + 6, L2W[1] - 4, L2W[2]], -0.2 * u, 1 - 0.08 * u), f = ph(t, EV.pan19, EV.pan19 + 1.0, eio);
  treeCTA(camAB(c0.eye, c0.tg, c1.eye, c1.tg, f, 34), TREE(), { boneA: 0.22, ghost: ph(t, EV.cutoff19, EV.cutoff19 + 0.5) * 0.6 });
}
// 20-21: the normal teaching model (left) and this patient's right leg (right): same scale, same angle, turning together
function sCompareTrees(t) {
  const yaw = lerp(-0.17, 0.17, ph(t, EV.comp20, DUR, lin)), d = lerp(1850, 2244, ph(t, EV.comp20, EV.comp20 + 0.9, eout));   // both trees keep turning slowly together
  const c = camLook([0, 597, d], [0, 597, 0], [0, 1, 0], 34);
  const xL = mMul(mT(-193, 0, 0), mMul(mRy(yaw), mT(83, 0, 0))), xR = mMul(mT(193, 0, 0), mMul(mRy(yaw), mT(83, 0, 0)));
  ghostBody(c, xL, ['R']); ghostBody(c, xR, ['R']); voxBegin();
  treeExpl(c, TREE_N(), { xf: xL, wallA: 0.35 });
  const hot = [{ y0: LES.L1.y0 + 14, y1: LES.L1.y1 - 14, k: stepK(t, EV.hl21[0], DUR + 1, 3, 0.15) }, { y0: LES.L2.y0 + 4, y1: LES.L2.y1 - 4, k: stepK(t, EV.hl21[1], DUR + 1, 3, 0.15) }];
  treeExpl(c, TREE_R(), { xf: xR, wallA: 0.35, hot });
  sCompareTrees.last = { c, xL, xR };
}
// ---------------------------------------------------------------- scene table and transitions
function drawScene(t) {
  voxBegin();
  const i = sceneIndex(t);
  clear(i >= 16 && i <= 18 ? P.K0 : P.BG);                           // the CTA display is black
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
  voxOutlines();
}
// ordered-dither dissolves across a scene boundary B: the dive into the lumen, the scan into the body, the body into the CTA display
// (before B the old scene runs and the new one waits on its first frame; after B the old one holds its last frame)
const DISSOLVE = [[EV.cut4 - 0.25, EV.cut4 + 0.2, EV.cut4], [EV.circ15 - 0.2, EV.circ15 + 0.2, EV.circ15], [EV.cta17 - 0.2, EV.cta17 + 0.3, EV.cta17]];
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-6); G_T = t;
  const d = DISSOLVE.find(([a, b]) => t >= a && t < b);
  if (d) {
    drawScene(Math.min(t, d[2] - 1e-4)); SPARE[2].set(buf.subarray(0, W * H)); drawScene(Math.max(t, d[2]));
    const k = seg(t, d[0], d[1]); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const j = y * W + x; if (bay(x, y) >= k) buf[j] = SPARE[2][j]; }
  } else drawScene(t);
  drawUI(t);
  overlays(t);
}
// one frame for both versions: draws the clean frame, returns a copy of it, then adds the text on top (buf = labeled frame)
function renderPair(t) { const ui = UI_ON; UI_ON = false; renderFrame(t); const clean = buf.slice(0, W * H); UI_ON = true; overlays(t); UI_ON = ui; return clean; }
function engineInit() { buildParts(); }
