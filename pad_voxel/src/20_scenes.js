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
const qg = (x, n) => Math.round(clamp(x, 0, 1) * n) / n;            // disease state on a fine grid (finer than a frame's change: it grows smoothly)
let G_T = 0;                                                          // the frame's time (for overlays that blink on the grid)
// ---------------------------------------------------------------- 01-02: walking, slowing, stopping, holding the calf
const PT_HOLD_END = 6.0, FOG_W = [2400, 9000, P.N2];
// the stop and the reach for the calf as overlapping actions: the knees give first, the back bends, the arm follows
function walkState(t) {
  const tt = Math.min(t, 6), g = WALK.sample(tt);
  const holdLeg = ph(tt, EV.hold + 0.1, EV.hold + 0.8, eio), holdTorso = ph(tt, EV.hold + 0.2, EV.hold + 1.0, eio), holdArm = ph(tt, EV.hold + 0.3, EV.hold + 1.1, eio);
  return { root: g.p, q: { g, holdLeg, holdTorso, holdArm, t, effort: ph(t, EV.slow, EV.hold + 0.6) } };
}
// a camera operator follows the walker smoothly: the hips speed up and slow down within every step, the camera
// tracks their running average (a Gaussian over about half a second), so the body breathes inside the frame
function smoothX(tab, t, lo, hi) { let s = 0, w = 0; for (let k = -7; k <= 7; k++) { const g = Math.exp(-k * k / 24); s += g * tab.at(clamp(t + k * 0.05, lo, hi))[0]; w += g; } return s / w; }
function walkCam(t) {
  const w = smoothX(WALK, Math.min(t, 6), -0.5, 6);
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
  const s = walkState(t), cam = walkCam(t), pose = plantedPose(s.root, s.q), pain = ph(t, EV.pain - 0.3, EV.pain + 0.75);
  skyBG(P.K0, P.N2); drawFloor(cam, FOG_W); footShadows(cam, pose);
  drawPatient(cam, pose, { pain: pain * 0.85, fog: FOG_W });
  r3dOutlines();
  painMarks(cam, pose, ph(t, EV.pain, EV.pain + 0.4, lin), t);
}
// ---------------------------------------------------------------- 03: into the leg (skin → muscle → arteries → the thigh artery)
function holdPose(t) { const s = walkState(PT_HOLD_END); return plantedPose(s.root, Object.assign({}, s.q, { t: t === undefined ? PT_HOLD_END : t })); }
function legCam(t, pose) {
  // the calf (where it hurts) → up along the artery → into the thigh artery at the site of the later stenosis (L1)
  const K = mApply(pose.right.sh, [0, 0, 0]), A = treeToWorld(pose, [-76, 690, 4]), c0 = walkCam(PT_HOLD_END);
  const k1 = { e: add3(K, [-640, 40, 560]), g: add3(K, [-60, -170, 0]) };
  const o2 = [-300, 30, 280], k2 = { e: add3(A, o2), g: A };
  const u = t - EV.reveal;
  if (u < 2.25) return camSpline([{ t: 0, e: c0.eye, g: c0.tg }, { t: 1.2, e: k1.e, g: k1.g }, { t: 2.25, e: k2.e, g: k2.g }], u, 34);   // one glide: down to the calf, up the thigh
  // the dive: the distance shrinks on a log scale (an even push), so the red artery already fills the frame
  // when the crossfade into its lumen starts (EV.cut4 - 0.25): red blends into pink, never the navy room
  const s = eio(clamp((u - 2.25) / 0.75, 0, 1)), o4 = [0, 6, 40];   // ends in front of the SFA, the profunda off to the side
  const d = Math.exp(lerp(Math.log(Math.hypot(...o2)), Math.log(Math.hypot(...o4)), s));
  return camLook(add3(A, mul3(norm3(lerp3(norm3(o2), norm3(o4), s)), d)), lerp3(A, add3(A, [6, -16, -4]), s), [0, 1, 0], 34);
}
function sLeg(t) {
  // during the dive the navy background darkens to black and then warms to the blood-maroon of the artery
  // world, so the crossfade into the lumen blends red into red (navy straight into red or pink would pass
  // through a muddy purple)
  const warm = ph(t, EV.dive + 0.2, EV.cut4, eio), via = (a, b) => warm < 0.5 ? mixc(a, SKY_DARK, 2 * warm) : mixc(SKY_DARK, b, 2 * warm - 1);
  const bot = via(P.N2, MSKY_BOT), pose = holdPose(t), cam = legCam(t, holdPose()), fog = [600, 6000, bot];
  skyBG(via(P.K0, MSKY_TOP), bot); drawFloor(cam, fog);
  // the right leg turns to glass and stays; the rest of the body dissolves pixel by pixel; then the muscle clears
  const glass = ph(t, EV.reveal, EV.reveal + 0.75), bodyA = 1 - ph(t, EV.reveal + 0.2, EV.muscle + 0.2), musA = 1 - ph(t, EV.artery - 0.2, EV.artery + 0.5) * 0.85;
  drawLeg(cam, pose, { muscle: musA, bone: 0, art: 1, pain: 0.55 * (1 - ph(t, EV.artery, EV.dive)), fog });
  if (bodyA > 0.02) drawPatient(cam, pose, { alpha: bodyA, skipXf: [pose.right.th, pose.right.sh, pose.right.ft], fog });
  drawPatient(cam, pose, { glassLeg: glass, glassK: 1 - ph(t, EV.dive + 0.15, EV.dive + 0.4), skipParts: ['pelvis', 'torso', 'head', 'uarm', 'farm'], skipXf: [pose.left.th, pose.left.sh, pose.left.ft], fog });
  r3dOutlines();
}
// ---------------------------------------------------------------- 04-11: the artery, cut lengthwise; blood flows down the screen
const MICRO_XF = mRz(-Math.PI / 2);                                   // model +x (downstream) → screen down
const microAt = x => -x;                                              // world y of model x
function microCam(x, dist, side, tgx) { return camLook([side || 0, microAt(x) + 5, dist], [tgx || 0, microAt(x), -10], [0, 1, 0], 36); }
function pulseScale(t) { const b = (t / BEAT) % 1; return 1 + 0.012 * Math.max(0, Math.sin(TAU * b)) ** 2; }
const FIELD = {};
const fieldOf = (st, n, seed) => { const k = JSON.stringify(st) + n + seed; return FIELD[k] || (FIELD[k] = cellField(st, n, seed)); };
const MSKY_TOP = hexc('#14070C'), MSKY_BOT = hexc('#2A0C14'), MSKY = () => skyBG(MSKY_TOP, MSKY_BOT), SKY_DARK = hexc('#050506');
function microState(t) {                                              // the wall through the disease story: one segment, one state at a time
  if (t < EV.ldl[0]) return { g: 0, xc: AR.XS, w: AR.WS, sick: t < EV.push6 ? 0 : qg(ph(t, EV.sick - 0.3, EV.sick + 0.9), 90) };
  if (t < EV.grow8) return { g: qg(0.35 * ph(t, EV.foam - 0.2, EV.grow8), 240), xc: AR.XS, w: AR.WS, sick: 1 };
  if (t < EV.comp9) return { g: qg(lerp(0.35, 1, ph(t, EV.grow8, EV.comp9 - 0.2)), 240), cal: qg(ph(t, EV.calc[0] - 0.2, EV.calc[1] + 0.3), 90), xc: AR.XS, w: AR.WS, sick: 1 };
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
  const st = microState(t), cam = floatCam(normalCam(t), t, 1.4), xf = vxf(t), close = t >= EV.push6 && t < EV.pull7 + 0.6;
  MSKY(); drawVessel(cam, st, xf);
  drawCells(cam, xf, st, cellField({ g: st.g, xc: st.xc, w: st.w }, 70, 3), t, { rate: 0.075, count: close ? 30 : 70 });
  // white cells roll along the dysfunctional lining and stick
  // white cells roll along the wall (turning as they roll), slow down, flatten a little and stick
  if (t >= EV.push6 && t < EV.grow8 + 1) EV.wbc.forEach((e, i) => {
    const stop = st.xc - 20 + i * 26, tau = e - t, T = 0.6, v = 40, x = tau <= 0 ? stop : tau <= T ? stop - v * tau * tau / (2 * T) : stop - v * T / 2 - v * (tau - T);
    drawWBC(cam, xf, x, wallSurfY(x, st) + 6, -9 - i * 3, 1, -(x - stop) / 5.4, smooth(clamp(-tau / 0.5, 0, 1)));
  });
  // lipid slips under the lining into the wall; a macrophage takes it up and becomes a foam cell
  if (t >= EV.ldl[0] - 0.4 && t < EV.comp9) {
    EV.ldl.forEach((e, i) => { if (t < e - 0.6) return; for (let j = 0; j < 3; j++) {           // lipid drifts in on a curve and slips under the lining
      const x0 = st.xc - 18 + i * 12 + j * 5, f = ph(t, e - 0.6 + 0.06 * j, e + 0.3, eio), x = x0 - 7 * (1 - f) + 1.2 * Math.sin(Math.PI * f) * Math.sin(t * 6 + j), ws = wallSurfY(x, st);
      drawLDL(cam, xf, x, lerp(ws + 7, ws - 2.4 - j * 1.1, f) + 1.6 * Math.sin(Math.PI * f), lerp(-5, 0.4, f)); } });
    if (t >= EV.ldl[1]) { const x = st.xc + 6; drawFoam(cam, xf, x, (-AR.RI + wallSurfY(x, st)) / 2, ph(t, EV.foam - 0.2, EV.foam + 0.4)); }
  }
  r3dOutlines();
  // glucose: chronic exposure, more with every beat of scene 5; dissolved in the blood, it never forms a plug
  if (t >= EV.glu[0]) drawGlucose(cam, xf, st, t, t < EV.push6 ? 8 + 12 * EV.glu.filter(e => t >= e).length : close ? 18 : 46);
}
// 09: normal and narrowed, side by side, same scale
function sCompare(t) {
  const x0 = AR.XS, cam = floatCam(camLook([0, microAt(x0) + 5, lerp(520, 490, ph(t, EV.comp9, EV.comp9 + 3, lin))], [0, microAt(x0), -10], [0, 1, 0], 36), t, 2);
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
  // the pan down the artery runs straight into the slow push to the block (one move, no pause between), then a float
  if (t < EV.pull11) return floatCam(camSpline([{ t: EV.pan10, e: c0.eye, g: c0.tg }, { t: EV.pan10 + 0.95, e: c1.eye, g: c1.tg }, { t: EV.block10 + 0.75, e: c2.eye, g: c2.tg }], t, 36), t, 1.4);
  return floatCam(camAB(c2.eye, c2.tg, c3.eye, c3.tg, ph(t, EV.pull11, EV.pull11 + 1.0, eio), 36), t, 1.4);
}
function sOcclusion(t) {
  const cam = occCam(t), xf = vxf(t);
  MSKY(); drawVessel(cam, OCC_ST, xf);
  if (t >= EV.pull11) drawCollat(cam, xf, t < EV.colGrow ? 0 : ph(t, EV.colGrow, EV.colFlow + 0.4, eio));
  drawStagnant(cam, xf, OCC_ST, t, 56);
  drawCollatFlow(cam, xf, t, t > EV.colFlow ? ph(t, EV.colFlow, EV.colFlow + 0.6) : 0);
  r3dOutlines();
}
// ---------------------------------------------------------------- 12: walking again — the working calf needs more than the blocked arteries deliver
function demandCam(t) { const x = smoothX(WALK12, t, 32.5, 36.6); return camLook([x + 200, 440, 1750], [x + 110, 340, 92], [0, 1, 0], 32); }
function sDemand(t) {
  const g = WALK12.sample(t), pose = patientPose(g.p, 0, { g, t, effort: ph(t, EV.cut12, EV.rest13) }), cam = demandCam(t);
  const pain = clamp(0.35 + 0.2 * EV.steps12.filter(e => t >= e).length, 0, 1), pulse = Math.max(0, Math.sin(TAU * ((t - EV.cut12) / 0.75))) ** 2;
  skyBG(P.K0, P.N2); drawFloor(cam, FOG_W); footShadows(cam, pose);
  drawLeg(cam, pose, { muscle: 1, bone: 0, art: 1, pain, pulse, fog: FOG_W });
  drawPatient(cam, pose, { glassLeg: 1, fog: FOG_W });
  r3dOutlines();
}
// ---------------------------------------------------------------- 13: rest — demand falls; the arteries stay as they are
function sRest(t) {
  // straightening up: the hand lets go first, then the back rises, the knees last; he keeps breathing hard, then calms
  const s = walkState(PT_HOLD_END), q = Object.assign({}, s.q, { t, effort: 1 - ph(t, EV.relax, EV.rest13 + 3, lin),
    holdArm: 1 - ph(t, EV.relax - 0.4, EV.relax + 0.5, eio), holdTorso: 1 - ph(t, EV.relax - 0.25, EV.relax + 1.1, eio), holdLeg: 1 - ph(t, EV.relax - 0.1, EV.relax + 1.25, eio) });
  const pose = plantedPose(s.root, q), c5 = walkCam(5.0), cam = floatCam(camLook(lerp3(c5.eye, add3(c5.tg, mul3(sub3(c5.eye, c5.tg), 0.9)), ph(t, EV.rest13, EV.rest13 + 3, lin)), c5.tg, [0, 1, 0], 32), t, 6);
  skyBG(P.K0, P.N2); drawFloor(cam, FOG_W); footShadows(cam, pose);
  drawPatient(cam, pose, { pain: 0.85 * (1 - ph(t, EV.relax, EV.rest13 + 2.9)), fog: FOG_W });
  r3dOutlines();
}
// ---------------------------------------------------------------- 14: CT angiography — head first, the table glides into the gantry
// the scan plane's place on the patient (patient-frame y): his head and raised arms are already in the bore; the
// table glides on until his belly lies in the plane (tree level 1150, where the scan begins); the laser line runs
// down his body as he passes it
const ctG = t => lerp(-80, 1150 - 1610, ph(t, EV.ct14 + 0.1, EV.tableStop, eio));
function ctCam(t) {
  // fixed in the room at the foot end of the table, a slow push toward the gantry as he glides in
  const u = ph(t, EV.ct14, EV.ct14 + 3, eio), G = ctG(t);
  return camLook([lerp(-1180, -980, u), G + lerp(-2350, -2120, u), lerp(900, 780, u)], [lerp(-70, -40, u), G + lerp(-760, -640, u), -60], [0, 0, 1], 40);
}
function sCT(t) {
  const G = ctG(t), cam = ctCam(t);
  skyBG(P.K0, P.N2);
  drawCTRoom(cam, G, { t, inj: t >= EV.inject ? ph(t, EV.inject, EV.inject + 0.7, lin) : 0, laser: 1 });
  r3dOutlines();
}
// ---------------------------------------------------------------- 15: the contrast's route: arm vein → heart → lungs → heart → aorta → down toward the legs
function sCirc(t) {
  const u = ph(t, EV.circ15, EV.circ15 + 3, eio);
  const cam = camLook([lerp(-70, 40, u), lerp(-300, -560, u), lerp(1200, 1300, u)], [lerp(-50, 30, u), lerp(-300, -560, u), 0], [0, 1, 0], 38);
  skyBG(P.K0, P.N2); drawCirc(cam, t);
}
// ---------------------------------------------------------------- 16: the scan, seen from the control room — the images appear on the console
// the helical scan runs from the belly to the feet at a steady table speed (the table carries him on through the
// bore while the X-ray tube turns); each new axial image shows on the screen, the earlier ones line up below
const SCAN = { t0: EV.fill16 + 0.05, t1: EV.fill16 + 2.85, y0: 1150, y1: 25 };
const scanY = t => lerp(SCAN.y0, SCAN.y1, clamp((t - SCAN.t0) / (SCAN.t1 - SCAN.t0), 0, 1));
const THUMB_T = [0, 0.375, 0.75, 1.125, 1.5, 1.875].map(d => EV.fill16 + d);            // with the score's chimes
const FOG_T = [2200, 6000, P.N2];
const WIN = { x0: 22, y0: 62, x1: 338, y1: 238 };
function sScan(t) {
  // through the control-room window: the gantry, the table carrying the patient on through as the scan runs
  const Y = scanY(t), G = Y - 1610, cam = camLook([2900, G - 1350, 1050], [0, G - 650, -680], [0, 0, 1], 30);   // aimed low: the room shows in the window
  skyBG(P.K0, P.N2);
  drawCTRoom(cam, G, { t, inj: 1, xray: t >= SCAN.t0 && t < SCAN.t1 + 0.1, fog: [1800, 7000, P.N2] });
  r3dOutlines();
  // the control room: the wall around the window, a faint reflection on the glass, the desk below the monitor
  const wall = hexc('#0B121B'), wall2 = hexc('#101A26');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const inWin = x >= WIN.x0 && x < WIN.x1 && y >= WIN.y0 && y < WIN.y1;
    if (!inWin) buf[y * W + x] = ((x >> 3) + (y >> 3)) % 7 === 0 ? wall2 : wall;
    else if (((x + y * 2 + Math.floor(t * 18)) % 97) < 3 + (x > 200 ? 2 : 0)) buf[y * W + x] = mixc(buf[y * W + x], P.ST4, 0.18);
  }
  rect(WIN.x0 - 3, WIN.y0 - 3, WIN.x1 + 3, WIN.y0, hexc('#3A4654')); rect(WIN.x0 - 3, WIN.y1, WIN.x1 + 3, WIN.y1 + 3, hexc('#2A3440'));
  rect(WIN.x0 - 3, WIN.y0, WIN.x0, WIN.y1, hexc('#34404C')); rect(WIN.x1, WIN.y0, WIN.x1 + 3, WIN.y1, hexc('#2A3440'));
  rect(0, 566, W, H, hexc('#141B24')); rect(0, 566, W, 568, hexc('#2C3846'));
  for (let r = 0; r < 3; r++) for (let k = 0; k < 13; k++) rect(86 + k * 14 + r * 3, 584 + r * 10, 97 + k * 14 + r * 3, 591 + r * 10, hexc('#232D3A'));   // keyboard
  rect(296, 590, 312, 606, hexc('#232D3A')); rect(303, 590, 305, 596, hexc('#3A4654'));                                                       // mouse
  // the console screen: topogram with the scan line, the newest axial image, the images taken so far
  const n = THUMB_T.reduce((a, e) => a + clamp((t - e) / 0.22, 0, 1), 0);
  drawConsole(t, Y, n, 1);
}
// ---------------------------------------------------------------- 17: the reconstruction — the slices stack into a volume, the soft tissue falls away, the arteries remain
function ctaRotCam(ang, dist, yc) { return camLook([-10 + dist * Math.sin(ang), yc + 60, dist * Math.cos(ang)], [-10, yc, 0], [0, 1, 0], 34); }
const CTA_FAR = () => ctaRotCam(0.3, 1720, 560);
const CTA_SKY = () => skyBG(hexc('#05070A'), hexc('#0E1218'));
const RECON = { stack: [EV.cta17, EV.cta17 + 1.1], soft: [EV.cta17 + 0.85, EV.cta17 + 1.6], vr: [EV.cta17 + 1.35, EV.cta17 + 2.0] };
function reconCam(t) {
  // from a high three-quarter view (the slabs read as a stack) down to the level CTA view, turning all the way
  const far = CTA_FAR(), a0 = -0.55, e0 = 0.42, d0 = 2050, tg0 = [-10, 600, 0];
  const k0 = { t: EV.cta17, e: add3(tg0, [d0 * Math.cos(e0) * Math.sin(a0), d0 * Math.sin(e0), d0 * Math.cos(e0) * Math.cos(a0)]), g: tg0 };
  const k1 = { t: EV.cta17 + 1.6, e: add3([-10, 580, 0], [1900 * Math.cos(0.18) * Math.sin(-0.05), 1900 * Math.sin(0.18), 1900 * Math.cos(0.18) * Math.cos(-0.05)]), g: [-10, 580, 0] };
  return camSpline([k0, k1, { t: EV.zoom18, e: far.eye, g: far.tg }], t, 34);
}
function sCTA(t) {
  const c = reconCam(t), kStack = SLABS.n * smooth(seg(t, RECON.stack[0], RECON.stack[1])), soft = 1 - ph(t, RECON.soft[0], RECON.soft[1]), vr = ph(t, RECON.vr[0], RECON.vr[1]);
  if (vr < 1) { CTA_SKY(); drawSlabs(c, kStack, soft, 0); r3dOutlines(); }
  if (vr > 0) {
    if (vr < 1) { SPARE[1].set(buf.subarray(0, W * H)); r3dBegin(); }
    CTA_SKY(); drawBones(c, { ramp: RT.vr, glass: [0.08, 0.6, 1.6] }); drawTreeCTA(c, TREE()); r3dOutlines();
    if (vr < 1) mixInto(buf, SPARE[1].subarray(0, W * H), 1 - vr);
  }
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
  else if (i === 15) sScan(t);
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
