'use strict';
// ============================================================================
// THE PATIENT (one middle-aged man; body mm), drawn like the CTA film: every
// body part is a smooth mesh (marching tetrahedra over signed-distance
// shapes) shaded with dithered palette ramps and soft rim light. The rig:
// rigid parts on a small skeleton, a gait with heel strikes on the beat,
// stance-foot locking, the calf-holding pose with two-bone IK. Model space:
// forward +x, up +y, the patient's RIGHT side +z (the camera sits on his
// right: the symptomatic right leg is always the near leg). He is framed from
// the neck down; the face is never shown. Grey-blue T-shirt, dark knee-length
// shorts, white socks, grey trainers.
// ============================================================================
const RP = {
  skin: [P.SK0, P.SK1, P.SK2, P.SK3, P.SK4],
  shirt: ['#1A2633', '#2B4052', '#41607A', '#5F829E', '#8EAEC6'].map(hexc),
  shorts: ['#0A0E12', '#151C24', '#222C37', '#33404D', '#485666'].map(hexc),
  sock: ['#6E747C', '#A9AFB6', '#D4D9DE', '#F0F3F5'].map(hexc),
  shoe: ['#1A1E24', '#2D333B', '#465059', '#66717D', '#8A95A1'].map(hexc),
  sole: ['#8E949A', '#BEC3C8', '#E2E5E8', '#F6F7F8'].map(hexc),
  hair: ['#120E14', '#21191F', '#33262A', '#4A3733'].map(hexc),
  pain: [P.PA0, P.PA1, P.PA2, P.PA3, P.PA4],
};
const PVS = 6;                                    // meshing grid (mm)
// ---------------------------------------------------------------- parts (local frames: joint at origin)
const PART = {};
const keep = (f, y0, above) => (x, y, z) => Math.max(f(x, y, z), above ? y0 - y : y - y0);   // the part above (or below) y0
const iso = (f, b, attr, h) => isoMesh(f, b[0], b[1], b[2], b[3], b[4], b[5], h || PVS, attr);
const SD = {
  pelvis: (x, y, z) => sdB(x, y, z, -4, 30, 0, 104, 110, 168, 40),
  torso: (x, y, z) => { const belly = sdE(x, y, z, 8, 120, 0, 118, 150, 160), chest = sdE(x, y, z, 14, 300, 0, 112, 150, 182), sh = sdB(x, y, z, 0, 390, 0, 86, 50, 196, 46); return smin(smin(belly, chest, 40), sh, 50); },
  head: (x, y, z) => Math.min(sdC(x, y, z, -4, 0, 0, 0, 90, 0, 54, 50), sdE(x, y, z, 6, 170, 0, 98, 118, 86)),
  uarm: (x, y, z) => sdC(x, y, z, 0, 0, 0, 0, -300, 0, 52, 40),
  farm: (x, y, z) => Math.min(sdC(x, y, z, 0, 0, 0, 0, -250, 0, 38, 28), sdB(x, y, z, 6, -320, 0, 16, 62, 40, 10), sdC(x, y, z, 18, -270, 22, 34, -330, 26, 11, 9)),
  thigh: (x, y, z) => sdC(x, y, z, 6, 0, 0, 0, -440, 0, 90, 58),
  shin: (x, y, z) => smin(sdC(x, y, z, 6, 0, 0, 4, -420, 0, 52, 30), sdE(x, y, z, -30, -130, 0, 50, 120, 48), 30),
  foot: (x, y, z) => smin(sdE(x, y, z, -20, -40, 0, 60, 44, 48), sdE(x, y, z, 110, -52, 0, 104, 32, 50), 30),
};
// the calf (back of the shin) as a 0..1 attribute: where the working, painful muscle glows
const calfAttr = (x, y, z) => clamp(-sdE(x, y, z, -44, -140, 0, 70, 118, 70) / 30, 0, 1);
const hairAttr = (x, y, z) => (y > 185 || (x < -30 && y > 120)) && sdE(x, y, z, 6, 170, 0, 98, 118, 86) < 4 ? 1 : 0;
function buildParts() {
  if (PART.pelvis) return;
  PART.pelvis = iso(SD.pelvis, [-120, -110, -185, 120, 170, 185]);
  PART.torso = iso(SD.torso, [-140, -20, -215, 150, 470, 215]);
  PART.head = iso(SD.head, [-120, -20, -100, 130, 290, 100], hairAttr);
  PART.sleeve = iso(keep(SD.uarm, -160, true), [-60, -320, -60, 60, 50, 60]);
  PART.uarmSkin = iso(keep(SD.uarm, -160, false), [-60, -320, -60, 60, 50, 60]);
  PART.farm = iso(SD.farm, [-50, -460, -50, 60, 40, 50]);
  PART.thighShorts = iso(keep(SD.thigh, -300, true), [-100, -460, -100, 110, 60, 100]);
  PART.thighSkin = iso(keep(SD.thigh, -300, false), [-100, -460, -100, 110, 60, 100]);
  PART.shinSkin = iso(keep(SD.shin, -330, true), [-110, -440, -80, 80, 40, 80], calfAttr);
  PART.sock = iso(keep(SD.shin, -330, false), [-110, -440, -80, 80, 40, 80]);
  PART.shoe = iso(keep(SD.foot, -70, true), [-90, -90, -60, 220, 30, 60]);
  PART.sole = iso(keep(SD.foot, -70, false), [-90, -90, -60, 220, 30, 60]);
}
// which meshes make each rig part, and their materials
const PART_MESH = { pelvis: [['pelvis', 'shorts']], torso: [['torso', 'shirt']], head: [['head', 'skin']], uarm: [['sleeve', 'shirt'], ['uarmSkin', 'skin']], farm: [['farm', 'skin']],
  thigh: [['thighShorts', 'shorts'], ['thighSkin', 'skin']], shin: [['shinSkin', 'skin'], ['sock', 'sock']], foot: [['shoe', 'shoe'], ['sole', 'sole']] };
const OL = { skin: P.SK0, shirt: hexc('#0E1620'), shorts: hexc('#04070A'), sock: hexc('#4A5058'), shoe: hexc('#0C0F12'), sole: hexc('#5A6066') };
// ---------------------------------------------------------------- the gait (heel strikes on the beat)
// right heel strikes at 0.0, 1.5, 3.0, 4.5 s; left at 0.75, 2.25, 3.75 s → one step per beat
const STEPS = [0, 0.75, 1.5, 2.25, 3.0, 3.75, 4.5];
const AMP_K = [[0, 1], [1.6, 1], [2.25, 0.86], [3.0, 0.7], [3.75, 0.5], [4.5, 0.3], [4.85, 0]];
function gaitPhase(t) {                            // right-leg phase (0 = right heel strike)
  if (t <= 0) return t / 1.5;
  for (let i = 0; i + 1 < STEPS.length; i++) if (t < STEPS[i + 1]) return i * 0.5 + 0.5 * (t - STEPS[i]) / (STEPS[i + 1] - STEPS[i]);
  return (STEPS.length - 1) * 0.5;
}
function gaitAmp(t) { for (let i = 0; i + 1 < AMP_K.length; i++) if (t < AMP_K[i + 1][0]) return lerp(AMP_K[i][1], AMP_K[i + 1][1], smooth(seg(t, AMP_K[i][0], AMP_K[i + 1][0]))); return 0; }
const bumpW = (x, c, w) => { let d = ((x - c) % 1 + 1.5) % 1 - 0.5; return Math.exp(-(d * d) / (w * w)); };
function legAngles(ph, amp) {                      // degrees: hip flexion (+ forward), knee flexion, ankle dorsiflexion
  const p = ((ph % 1) + 1) % 1;
  return { hip: amp * (6 + 19 * Math.cos(TAU * p)), knee: amp * (4 + 14 * bumpW(p, 0.12, 0.07) + 52 * bumpW(p, 0.72, 0.11)), ankle: amp * (4 * Math.sin(TAU * (p - 0.1)) - 12 * bumpW(p, 0.6, 0.06)) };
}
// ---------------------------------------------------------------- posing
const D2R = Math.PI / 180;
// pose → world matrices of every part. P0: root (hip midpoint) world position; facing: rotation about y.
// q: {ph, amp, bend (torso forward, deg), hold (0..1 right hand to the calf), relax (0..1), lie (0..1 supine on the table)}
function patientPose(P0, facing, q) {
  const root = q.rootM || mMul(mT(P0[0], P0[1], P0[2]), mRy(facing));
  const out = [];
  const amp = q.amp || 0, R = legAngles(q.ph || 0, amp), L = legAngles((q.ph || 0) + 0.5, amp);
  const hold = q.hold || 0, bob = -8 * amp * Math.cos(2 * TAU * (q.ph || 0));
  const pel = mMul(root, mT(0, bob, 0));
  out.push(['pelvis', pel]);
  // legs: hip (about z), knee, ankle; right leg at +z
  const leg = (A, zs, extra) => {
    const hipF = (A.hip + (extra.hip || 0)) * D2R, kn = (A.knee + (extra.knee || 0)) * D2R, an = (A.ankle + (extra.ankle || 0)) * D2R;
    const th = mMul(pel, mMul(mT(0, 0, zs), mRz(hipF)));
    const sh = mMul(th, mMul(mT(0, -440, 0), mRz(-kn)));
    const ft = mMul(sh, mMul(mT(0, -420, 0), mRz(an)));
    out.push(['thigh', th], ['shin', sh], ['foot', ft]);
    return { th, sh, ft };
  };
  // holding the calf: weight on the left leg (knee bent), the right leg a little forward with the knee bent
  const right = leg(R, 92, { hip: 18 * hold, knee: 34 * hold }), left = leg(L, -92, { hip: 22 * hold, knee: 26 * hold });
  // torso: forward bend — when holding, as deep as needed for the right hand to reach the calf
  let bendDeg = q.bend || 0;
  if (hold > 0) {
    const tgt = mApply(right.sh, [-58, -110, 4]);
    let need = 40;
    for (; need < 88; need += 2) { const tr = mMul(pel, mMul(mT(-6, 140, 0), mRz(-need * D2R))), sh = mApply(tr, [0, 372, 214]); if (Math.hypot(tgt[0] - sh[0], tgt[1] - sh[1], tgt[2] - sh[2]) < 640) break; }
    bendDeg = lerp(bendDeg, need, hold);
  }
  const bend = bendDeg * D2R;
  const tor = mMul(pel, mMul(mT(-6, 140, 0), mRz(-bend)));
  out.push(['torso', tor]);
  out.push(['head', mMul(tor, mT(4, 440, 0))]);
  // arms: swing opposite to the legs (forward kinematics); while holding, two-bone IK takes the hands to
  // the back of the right calf (right hand) and to the front of the left thigh (left hand)
  const swing = 18 * amp * Math.cos(TAU * (q.ph || 0));
  const fkArm = (zs, sw) => {
    const shF = -sw * D2R, el = (14 + 8 * amp) * D2R, ab = 6 * D2R;
    const ua = mMul(tor, mMul(mT(0, 372, zs), mMul(mRx(zs > 0 ? -ab : ab), mRz(shF))));
    const fa = mMul(ua, mMul(mT(0, -300, 0), mRz(el)));
    return { ua, fa };
  };
  const armR = fkArm(214, -swing), armL = fkArm(-214, swing);
  if (hold > 0) {
    const ikArm = (fk, target, pole) => {
      const A = mApply(fk.ua, [0, 0, 0]), hand0 = mApply(fk.fa, [8, -320, 0]);
      const T = [lerp(hand0[0], target[0], hold), lerp(hand0[1], target[1], hold), lerp(hand0[2], target[2], hold)];
      const a = 300, b = 345, dv = sub3(T, A), d = clamp(Math.hypot(dv[0], dv[1], dv[2]), 40, a + b - 1), u = norm3(dv);
      const pl = norm3(sub3(pole, mul3(u, dot3(pole, u))));
      const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
      const E = add3(add3(A, mul3(u, x)), mul3(pl, h));
      const frame = (O, Tg, side) => {                         // local −y toward the target, local x toward "side"
        const yA = norm3(sub3(O, Tg)); let zA = norm3(cross3(side, yA)); const xA = cross3(yA, zA);
        return [xA[0], yA[0], zA[0], O[0], xA[1], yA[1], zA[1], O[1], xA[2], yA[2], zA[2], O[2]];
      };
      const fwd = mApply(tor, [1, 0, 0]), o0 = mApply(tor, [0, 0, 0]), F = norm3(sub3(fwd, o0));
      return { ua: frame(A, E, F), fa: frame(E, T, F) };
    };
    const calfBack = mApply(right.sh, [-58, -110, 4]), thighFront = mApply(left.th, [74, -380, 0]);
    const back = norm3(sub3(mApply(tor, [-1, 0, 0]), mApply(tor, [0, 0, 0])));
    const ir = ikArm(armR, calfBack, add3(mul3(back, 1), [0, 0, 0.6])), il = ikArm(armL, thighFront, add3(mul3(back, 1), [0, 0, -0.4]));
    out.push(['uarm', ir.ua], ['farm', ir.fa], ['uarm', il.ua], ['farm', il.fa]);
  } else out.push(['uarm', armR.ua], ['farm', armR.fa], ['uarm', armL.ua], ['farm', armL.fa]);
  return { parts: out, right, left };
}
// draw the patient; o: {pain (0..1: the calf glows orange), alpha (screen door), glassLeg (0..1: the right thigh and shin turn see-through),
// skipParts (names), skipXf (part matrices, e.g. pose.right.sh), fog}
function drawPatient(cam, pose, o) {
  o = o || {};
  buildParts();
  const ids = {}; for (const k in OL) ids[k] = newId(OL[k]);
  const glassXf = o.glassLeg > 0 ? [pose.right.th, pose.right.sh] : [];
  for (const [name, xf] of pose.parts) {
    if (o.skipParts && o.skipParts.includes(name)) continue;
    if (o.skipXf && o.skipXf.includes(xf)) continue;
    for (const [mesh, mt] of PART_MESH[name]) {
      const m = { ramp: RP[mt], id: ids[mt], amb: 0.32, dif: 0.68, rim: 0.26, fog: o.fog };
      if (mt === 'skin') Object.assign(m, { spec: 0.12, cap: 0.86 });
      if (mesh === 'head') m.mix = { ramp: RP.hair, f: a => a };
      if (mesh === 'shinSkin' && o.pain > 0 && xf === pose.right.sh) m.mix = { ramp: RP.pain, f: a => a * o.pain };
      if (o.alpha !== undefined && o.alpha < 1) { m.alpha = o.alpha; m.ao = 3; }
      if (glassXf.includes(xf)) { const g = o.glassLeg; Object.assign(m, { id: 0, glass: [lerp(1, 0.1, g), lerp(1, 0.88, g), 1.7] }); }
      drawMesh(cam, PART[mesh], m, xf);
    }
  }
}
// contact shadows under the feet (flat dark ellipses on the floor, drawn before the patient)
function footShadows(cam, pose) {
  for (const s of [pose.right, pose.left]) {
    const p = mApply(s.ft, [60, -80, 0]), h = Math.max(0, p[1]);
    const c = project(cam, [p[0], 1, p[2]]); if (!c) continue;
    const k = 1 - clamp(h / 120, 0, 0.8), rx = 160 * c[2] * cam.F * k;
    for (let y = Math.floor(c[1] - rx * 0.3); y <= c[1] + rx * 0.3; y++) for (let x = Math.floor(c[0] - rx); x <= c[0] + rx; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue; const dx = (x + 0.5 - c[0]) / rx, dy = (y + 0.5 - c[1]) / (rx * 0.3), q = dx * dx + dy * dy; if (q > 1) continue;
      buf[y * W + x] = mixc(buf[y * W + x], P.K0, 0.55 * k * (1 - q));
    }
  }
}
// the floor: a large plane of dark tiles (they show the walking speed), procedural so the edges stay crisp at any distance
const FLOOR_Q = [-2500, 7500, -1500, 1500];
const FLOOR = () => cached('floor', () => { const [x0, x1, z0, z1] = FLOOR_Q; return quadMesh([x0, 0, z0], [x1 - x0, 0, 0], [0, 0, z1 - z0]); });
const FLOOR_C = [hexc('#0E1A28'), hexc('#122133')];
function drawFloor(cam, fog) {
  const [x0, x1, z0, z1] = FLOOR_Q;
  drawMesh(cam, FLOOR(), { ramp: [0], back: [0], unlit: true, id: 0, fog, pixFn: (u, v) => { const x = x0 + u * (x1 - x0), z = z0 + v * (z1 - z0); return FLOOR_C[(Math.floor(x / 320) + Math.floor(z / 320)) & 1]; } });
}
// ---------------------------------------------------------------- walking without foot slide
// the root moves so the planted (lowest) foot stays still on the floor; precomputed once at 240 Hz
function walkTable(phF, ampF, t0, t1) {
  const dt = 1 / 240, n = Math.round((t1 - t0) / dt) + 1, X = new Float32Array(n), Y = new Float32Array(n);
  const solePts = (pose) => [pose.right, pose.left].map(s => [mApply(s.ft, [-20, -86, 0]), mApply(s.ft, [160, -86, 0])]);
  let x = 0, prev = null;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * dt, q = { ph: phF(t), amp: ampF(t) };
    const pose = patientPose([0, 0, 0], 0, q), sp = solePts(pose);
    const lowR = Math.min(sp[0][0][1], sp[0][1][1]), lowL = Math.min(sp[1][0][1], sp[1][1][1]);
    const st = lowR <= lowL ? 0 : 1, footX = (sp[st][0][0] + sp[st][1][0]) / 2;
    if (prev && prev.st === st) x += -(footX - prev.footX);
    prev = { st, footX };
    X[i] = x; Y[i] = -Math.min(lowR, lowL);
  }
  return { t0, dt, X, Y, at: t => { const f = clamp((t - t0) / dt, 0, n - 1), i = Math.floor(f), k = f - i, j = Math.min(n - 1, i + 1); return [lerp(X[i], X[j], k), lerp(Y[i], Y[j], k)]; } };
}
const WALK = walkTable(gaitPhase, gaitAmp, -0.5, 6.5);
// scene 12: walking again at an even pace (right heel strikes on 33.0 and 34.5 s, left on 33.75 and 35.25 s)
const PH12 = t => (t - 33) / 1.5, AMP12 = () => 0.82;
const WALK12 = walkTable(PH12, AMP12, 32.5, 36.6);
