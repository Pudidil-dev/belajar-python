'use strict';
// ============================================================================
// THE PATIENT (one middle-aged man; body mm). Rigid voxel parts on a small
// skeleton, like a voxel game character: pelvis, torso, head, upper arms,
// forearms with hands, thighs, shins, feet. Model space: forward +x, up +y,
// the patient's RIGHT side +z (the camera sits on his right: the symptomatic
// right leg is always the near leg). He is framed from the neck down; the face
// is never shown. Grey-blue T-shirt, dark knee-length shorts, white socks,
// grey trainers.
// ============================================================================
const M_SKIN = mat('skin', ['#4A2C20', '#8A5A44', '#C08466', '#DDA383', '#F2C7A8'], { speck: 0.03 });
const M_SHIRT = mat('shirt', ['#1D2B3A', '#2F4558', '#4A6680', '#6788A3', '#93B0C6'], { speck: 0.03 });
const M_SHORTS = mat('shorts', ['#101418', '#1C232B', '#2C3540', '#3E4956', '#566270'], { speck: 0.03 });
const M_SOCK = mat('sock', ['#6E747C', '#A9AFB6', '#D4D9DE', '#E9EDF0', '#FFFFFF']);
const M_SHOE = mat('shoe', ['#22262C', '#3B4149', '#59616B', '#7A838E', '#A2ABB5'], { speck: 0.03 });
const M_SOLE = mat('sole', ['#6C7076', '#A4A9AE', '#D2D6DA', '#E6E9EC', '#F6F7F8']);
const M_HAIR = mat('hair', ['#121010', '#262120', '#3E3634', '#5A504C', '#7D726C']);
const M_PAIN = mat('pain', ['#6A2106', '#B4400E', '#FF8A3D', '#FFB077', '#FFD9B8'], { ol: 0 });
const M_FLOOR = mat('floor', ['#0A1522', '#0F1E2E', '#142638', '#192E43', '#1F3650'], { ol: 0 });
const M_FLOOR2 = mat('floor2', ['#0B1625', '#112133', '#162A3E', '#1C3349', '#223C55'], { ol: 0 });
const PVS = 7;                                    // body voxel size (mm)
// ---------------------------------------------------------------- parts (local frames: joint at origin)
function partGrid(x0, y0, z0, x1, y1, z1, fn) { const g = new VoxGrid(x0, y0, z0, x1, y1, z1, PVS); g.paint(x0, y0, z0, x1, y1, z1, fn); return g; }
const PART = {};
function buildParts() {
  // pelvis / shorts (origin: midpoint of the hip joints)
  PART.pelvis = voxMesh(partGrid(-120, -110, -185, 120, 170, 185, (x, y, z) => sdB(x, y, z, -4, 30, 0, 104, 110, 168, 40) < 0 ? M_SHORTS : 0));
  // torso (origin: lower back pivot, 140 above the hips)
  PART.torso = voxMesh(partGrid(-140, -20, -215, 150, 470, 215, (x, y, z) => {
    const belly = sdE(x, y, z, 8, 120, 0, 118, 150, 160), chest = sdE(x, y, z, 14, 300, 0, 112, 150, 182), sh = sdB(x, y, z, 0, 390, 0, 86, 50, 196, 46);
    return smin(smin(belly, chest, 40), sh, 50) < 0 ? M_SHIRT : 0;
  }));
  // neck and head (origin: base of the neck); hair on the back and top, no face
  PART.head = voxMesh(partGrid(-120, -20, -100, 130, 290, 100, (x, y, z) => {
    const neck = sdC(x, y, z, -4, 0, 0, 0, 90, 0, 54, 50), head = sdE(x, y, z, 6, 170, 0, 98, 118, 86);
    if (Math.min(neck, head) >= 0) return 0;
    if (head < 0 && (y > 185 || (x < -30 && y > 120))) return M_HAIR;
    return M_SKIN;
  }));
  // upper arm (origin: shoulder joint), sleeve to 150 below
  PART.uarm = voxMesh(partGrid(-60, -320, -60, 60, 50, 60, (x, y, z) => sdC(x, y, z, 0, 0, 0, 0, -300, 0, 52, 40) < 0 ? (y > -160 ? M_SHIRT : M_SKIN) : 0));
  // forearm + hand (origin: elbow)
  PART.farm = voxMesh(partGrid(-50, -460, -50, 60, 40, 50, (x, y, z) => {
    const fa = sdC(x, y, z, 0, 0, 0, 0, -250, 0, 38, 28), palm = sdB(x, y, z, 6, -320, 0, 16, 62, 40, 10), thumb = sdC(x, y, z, 18, -270, 22, 34, -330, 26, 11, 9);
    return Math.min(fa, palm, thumb) < 0 ? M_SKIN : 0;
  }));
  // thigh (origin: hip joint): shorts to 300 below, then skin to the knee
  PART.thigh = voxMesh(partGrid(-100, -460, -100, 110, 60, 100, (x, y, z) => {
    const d = sdC(x, y, z, 6, 0, 0, 0, -440, 0, 90, 58);
    if (d >= 0) return 0;
    return y > -300 ? M_SHORTS : M_SKIN;
  }));
  // shin (origin: knee): calf belly behind (−x), white sock from the ankle up
  PART.shin = voxMesh(partGrid(-110, -440, -80, 80, 40, 80, (x, y, z) => {
    const bone = sdC(x, y, z, 6, 0, 0, 4, -420, 0, 52, 30), calf = sdE(x, y, z, -30, -130, 0, 50, 120, 48);
    if (smin(bone, calf, 30) >= 0) return 0;
    return y < -330 ? M_SOCK : M_SKIN;
  }));
  // the calf region of the shin skin (for the orange highlight)
  PART.calf = voxMesh(partGrid(-110, -300, -80, 80, 0, 80, (x, y, z) => {
    const bone = sdC(x, y, z, 6, 0, 0, 4, -420, 0, 52, 30), calf = sdE(x, y, z, -30, -130, 0, 50, 120, 48);
    return smin(bone, calf, 30) < 0 && sdE(x, y, z, -44, -140, 0, 70, 118, 70) < 0 ? M_PAIN : 0;
  }));
  // foot (origin: ankle): trainer with a white sole
  PART.foot = voxMesh(partGrid(-90, -90, -60, 220, 30, 60, (x, y, z) => {
    const d = smin(sdE(x, y, z, -20, -40, 0, 60, 44, 48), sdE(x, y, z, 110, -52, 0, 104, 32, 50), 30);
    if (d >= 0) return 0;
    return y < -70 ? M_SOLE : M_SHOE;
  }));
}
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
// draw the patient; o: {pain (0..1 orange calf), alpha, skipParts (names), skipXf (part matrices, e.g. pose.right.sh)}
function drawPatient(cam, pose, o) {
  o = o || {};
  if (!PART.pelvis) buildParts();
  for (const [name, xf] of pose.parts) {
    if (o.skipParts && o.skipParts.includes(name)) continue;
    if (o.skipXf && o.skipXf.includes(xf)) continue;
    drawVox(cam, PART[name], xf, { alpha: o.alpha });
  }
  if (o.pain > 0) drawVox(cam, PART.calf, pose.right.sh, { alpha: o.pain, depthBias: 2e-6 });
}
// contact shadows under the feet (flat dark ellipses on the floor)
function footShadows(cam, pose) {
  for (const s of [pose.right, pose.left]) {
    const p = mApply(s.ft, [60, -80, 0]), h = Math.max(0, p[1]);
    const c = proj(cam, [p[0], 1, p[2]]); if (!c) continue;
    const k = 1 - clamp(h / 120, 0, 0.8), rx = 150 * c[2] * cam.F * 0.012 * k + 10 * k;
    ellipse(c[0], c[1], rx * 1.8, rx * 0.45, P.K0, 0.55 * k);
  }
}
// the floor: big dark tiles (they give the walk its speed)
const FLOOR = () => cached('floor', () => { const g = new VoxGrid(-2000, -20, -900, 7000, 0, 900, 50); g.paint(-2000, -20, -900, 7000, 0, 900, (x, y, z) => ((Math.floor(x / 300) + Math.floor(z / 300)) & 1) ? M_FLOOR : M_FLOOR2); return voxMesh(g); });
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
