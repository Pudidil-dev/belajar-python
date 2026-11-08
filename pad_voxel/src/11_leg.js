'use strict';
// ============================================================================
// THE RIGHT LEG, LAYER BY LAYER (scene 3 and scene 12): skin shell, calf and
// shin muscles, tibia / fibula / distal femur, and the arteries — taken from
// the same centre-lines as the arterial tree (13_tree.js), mapped into the
// patient's thigh and shin frames, so the popliteal block and the tibial
// disease sit exactly where the lesion map puts them.
// Frames (body mm): shin frame = origin at the knee joint, forward +x, up +y,
// the patient's right +z (medial = −z); thigh frame = origin at the hip joint.
// ============================================================================
const M_MUS = mat('muscle', ['#3E1A1A', '#6E2F2C', '#9C4A42', '#B9675A', '#D38E7E'], { speck: 0.16 });
const M_MUSD = mat('muscleDeep', ['#341616', '#5C2826', '#843E38', '#A3584C', '#BF7A6A'], { speck: 0.16 });
const M_TEN = mat('tendon', ['#6E6458', '#A99C8A', '#D6CAB6', '#E8DFCF', '#F6F0E4']);
const M_SKINS = mat('skinShell', ['#4A2C20', '#8A5A44', '#C08466', '#DDA383', '#F2C7A8'], { ol: 0 });
const M_ART = mat('artery', ['#0B3442', '#17627A', '#2E97B4', '#46C6E6', '#9AE6F6']);
// tree point (x patient-left, y floor-up, z forward) → body frame of the standing patient (hip joint at y 0, right leg +z)
const HIPY = 920;
const treeToBody = p => [p[2], p[1] - HIPY, -p[0]];
const LEG_KNEE_Y = -440, LEG_Z = 92;
function shinSDF(x, y, z) { const bone = sdC(x, y, z, 6, 0, 0, 4, -420, 0, 52, 30), calf = sdE(x, y, z, -30, -130, 0, 50, 120, 48); return smin(bone, calf, 30); }
function buildLeg() {
  const vs = 4, L = {};
  // skin shell of the shin (one voxel thick)
  const sk = new VoxGrid(-110, -440, -80, 80, 30, 80, vs);
  sk.paint(-110, -440, -80, 80, 30, 80, (x, y, z) => { const d = shinSDF(x, y, z); return d < 0 && d > -vs * 1.2 && y < -6 ? M_SKINS : 0; });
  L.skin = voxMesh(sk);
  // muscles (posterior calf: gastrocnemius heads over the soleus; front: tibialis anterior; side: peroneus)
  const mu = new VoxGrid(-110, -440, -80, 80, 30, 80, vs);
  mu.paint(-110, -440, -80, 80, 30, 80, (x, y, z) => {
    const inside = shinSDF(x, y, z) < -vs * 1.5; if (!inside) return 0;
    const gm = sdE(x, y, z, -52, -118, -20, 34, 118, 28), gl = sdE(x, y, z, -50, -108, 22, 30, 104, 26), so = sdE(x, y, z, -30, -200, 0, 40, 150, 48);
    const ta = sdE(x, y, z, 30, -180, 22, 20, 160, 18), pl = sdE(x, y, z, -2, -168, 42, 16, 148, 15);
    const ach = sdC(x, y, z, -48, -300, 0, -42, -420, 0, 9, 8);
    if (ach < 0) return M_TEN;
    if (gm < 0 || gl < 0) return (Math.floor((x + z) / 8) & 1) ? M_MUS : M_MUSD;
    if (so < 0 || ta < 0 || pl < 0) return M_MUSD;
    return 0;
  });
  L.muscle = voxMesh(mu);
  // bones of the shin
  const bo = new VoxGrid(-60, -440, -60, 60, 30, 70, vs);
  bo.tube([[16, -4, -8, 26], [14, -40, -8, 20], [12, -260, -6, 14], [10, -410, -4, 17]], M_BONE);
  bo.tube([[-10, -24, 40, 9], [-8, -200, 42, 7], [-6, -405, 44, 10]], M_BONE);
  L.bone = voxMesh(bo);
  // thigh part: distal femur and the popliteal fossa (thigh frame)
  const tb = new VoxGrid(-80, -470, -70, 80, -250, 70, vs);
  tb.tube([[2, -250, 0, 18], [4, -380, 0, 22], [6, -430, 0, 32]], M_BONE);
  L.femur = voxMesh(tb);
  // arteries of the right leg below the mid thigh, in thigh and shin frames (2 mm cubes)
  const ag = { thigh: new VoxGrid(-120, -470, -90, 120, -120, 90, 2), shin: new VoxGrid(-120, -450, -90, 160, 40, 90, 2) };
  for (const k in ART) {
    if (k[0] !== 'R' || /CIA|IIA|EIA|CFA/.test(k)) continue;
    const a = ART[k], gen = isGen(k);
    const pts = a.pts.map(p => { const b = treeToBody(p); return [b[0], b[1], b[2] - LEG_Z, gen ? p[3] * 0.85 : p[3]]; });
    // split at the knee joint: above → thigh frame (y relative to hip), below → shin frame (y relative to knee)
    const up = pts.filter(p => p[1] > LEG_KNEE_Y - 30), dn = pts.filter(p => p[1] < LEG_KNEE_Y + 30).map(p => [p[0], p[1] - LEG_KNEE_Y, p[2], p[3]]);
    if (up.length > 1) ag.thigh.tube(up, M_ART);
    if (dn.length > 1) ag.shin.tube(dn, M_ART);
  }
  L.artThigh = voxMesh(ag.thigh); L.artShin = voxMesh(ag.shin);
  return L;
}
const LEG = () => cached('leg', buildLeg);
// a point given in tree coordinates → world, through the posed thigh / shin
function treeToWorld(pose, p) {
  const b = treeToBody(p), q = [b[0], b[1], b[2] - LEG_Z];
  if (q[1] > LEG_KNEE_Y) return mApply(pose.right.th, q);
  return mApply(pose.right.sh, [q[0], q[1] - LEG_KNEE_Y, q[2]]);
}
// draw the layered leg on the posed patient. o: {skin, thigh (alpha of the thigh, which is drawn as a ghost too), muscle, art, bone (alphas 0..1), pain (0..1), pulse (muscle bulge)}
function drawLeg(cam, pose, o) {
  const L = LEG(), sh = pose.right.sh, th = pose.right.th;
  const bulge = o.pulse ? mMul(sh, mMul(mT(-40, -150, 0), mMul(mS(1 + 0.05 * o.pulse, 1, 1 + 0.05 * o.pulse), mT(40, 150, 0)))) : sh;
  if (o.art > 0) { drawVox(cam, L.artThigh, th, { alpha: o.art }); drawVox(cam, L.artShin, sh, { alpha: o.art }); }
  if (o.bone > 0) { drawVox(cam, L.bone, sh, { alpha: o.bone }); drawVox(cam, L.femur, th, { alpha: o.bone }); }
  if (o.muscle > 0) {
    const painR = o.pain > 0 ? (m => m === M_MUS || m === M_MUSD ? MAT[M_PAIN].r.map((c, i) => o.pain > 0.5 ? c : MAT[m].r[i]) : MAT[m].r) : null;
    drawVox(cam, L.muscle, bulge, { alpha: o.muscle, ramp: painR || undefined });
    if (o.pain > 0 && o.pain <= 0.5) drawVox(cam, L.muscle, bulge, { alpha: o.pain * 1.6, ramp: m => (m === M_MUS || m === M_MUSD) ? MAT[M_PAIN].r : null, depthBias: 2e-6 });
  }
  if (o.skin > 0) drawVox(cam, L.skin, sh, { alpha: o.skin });
  if (o.thigh > 0) { if (!PART.pelvis) buildParts(); drawVox(cam, PART.thigh, th, { alpha: o.thigh }); }
}
// body frame (forward x, up y, right z; hips at the origin) → tree frame (x patient-left, y up from the floor, z forward)
const TB = [0, 0, -1, 0, 0, 1, 0, HIPY, 1, 0, 0, 0];
// a standing silhouette drawn as a flat backdrop for the vessel trees (layer it first, then voxOutlines + voxBegin)
function ghostBody(cam, xf, parts) {
  if (!PART.pelvis) buildParts();
  const base = xf ? mMul(xf, TB) : TB, list = [];
  if (parts.includes('torso')) list.push(['torso', mMul(base, mT(-6, 140, 0))]);
  if (parts.includes('pelvis')) list.push(['pelvis', base]);
  for (const [tag, zs] of [['R', 92], ['L', -92]]) if (parts.includes(tag)) {
    const th = mMul(base, mT(0, 0, zs)), sh = mMul(th, mT(0, -440, 0)), ft = mMul(sh, mT(0, -420, 0));
    list.push(['thigh', th], ['shin', sh], ['foot', ft]);
  }
  for (const [n, m] of list) drawVox(cam, PART[n], m, { ramp: () => MAT[M_BODYG].r, id: M_BODYG });
}
