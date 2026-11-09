'use strict';
// ============================================================================
// THE RIGHT LEG, LAYER BY LAYER (scenes 3 and 12), CTA-film style: the skin
// turns to glass, the calf and shin muscles are smooth shapes (orange where
// they work and hurt), the bones ivory, and the arteries red tubes taken from
// the same centre-lines and lesion map as the arterial tree (13_tree.js):
// the blocked popliteal segment shows orange-brown, the thigh plaque yellow,
// the genicular collaterals enlarged around the block.
// Frames (body mm): shin frame = origin at the knee joint, forward +x, up +y,
// the patient's right +z (medial = −z); thigh frame = origin at the hip joint.
// ============================================================================
const RL = {
  mus: [P.MU0, P.MU1, P.MU2, P.MU3, P.MU4], ten: ['#6E6458', '#A99C8A', '#D6CAB6', '#F0E8DA'].map(hexc),
  art: [hexc('#2A1020'), hexc('#561C2C'), hexc('#8E3038'), P.AR3, hexc('#F0A48C')],
};
// tree point (x patient-left, y floor-up, z forward) → body frame of the standing patient (hip joint at y 0, right leg +z)
const HIPY = 920;
const treeToBody = p => [p[2], p[1] - HIPY, -p[0]];
const LEG_KNEE_Y = -440, LEG_Z = 92;
const shinSDF = (x, y, z) => smin(sdC(x, y, z, 6, 0, 0, 4, -420, 0, 52, 30), sdE(x, y, z, -30, -130, 0, 50, 120, 48), 30);
function buildLeg() {
  const L = {}, inside = f => (x, y, z) => Math.max(f(x, y, z), shinSDF(x, y, z) + 5);
  const B = [-110, -440, -80, 80, 30, 80], iso5 = (f, b, attr) => isoMesh(f, b[0], b[1], b[2], b[3], b[4], b[5], 5, attr);
  // the calf: the two heads of the gastrocnemius over the soleus (back), tibialis anterior (front), peroneus (side); the Achilles tendon
  const gast = (x, y, z) => smin(sdE(x, y, z, -52, -118, -20, 34, 118, 28), sdE(x, y, z, -50, -108, 22, 30, 104, 26), 6);
  const deep = (x, y, z) => Math.min(sdE(x, y, z, -30, -200, 0, 40, 150, 48), sdE(x, y, z, 30, -180, 22, 20, 160, 18), sdE(x, y, z, -2, -168, 42, 16, 148, 15));
  const fib = (x, y, z) => 0.5 + 0.5 * Math.sin(y * 0.09 + Math.sin(x * 0.05) * 1.5);                 // fibre bands (a soft attribute)
  L.gast = iso5(inside(gast), B, fib); L.deep = iso5(inside(deep), B, fib);
  L.ach = isoMesh((x, y, z) => sdC(x, y, z, -48, -300, 0, -42, -420, 0, 9, 8), -70, -440, -20, -20, -280, 20, 4);
  // bones of the shin and the distal femur (thigh frame)
  const mb = new MB();
  tubeInto(mb, smoothPath([[16, -4, -8], [14, -40, -8], [12, -260, -6], [10, -410, -4]], 6), (i, u) => u < 0.1 ? lerp(26, 20, u / 0.1) : u > 0.9 ? lerp(14, 17, (u - 0.9) / 0.1) : lerp(20, 14, (u - 0.1) / 0.8), null, 12, true);
  tubeInto(mb, smoothPath([[-10, -24, 40], [-8, -200, 42], [-6, -405, 44]], 6), (i, u) => u < 0.5 ? lerp(9, 7, u * 2) : lerp(7, 10, (u - 0.5) * 2), null, 10, true);
  L.bone = computeNormals(mb.build());
  const fb = new MB(); tubeInto(fb, smoothPath([[2, -250, 0], [4, -380, 0], [6, -430, 0]], 6), (i, u) => lerp(18, 32, u * u), null, 12, true); L.femur = computeNormals(fb.build());
  // arteries of the right leg below the groin, in the thigh and shin frames: normal (red, yellow where plaque narrows it) and the blocked segment
  const A = { thigh: new MB(), shin: new MB() }, O = { thigh: new MB(), shin: new MB() };
  for (const k in ART) {
    if (k[0] !== 'R' || /CIA|IIA|EIA|CFA/.test(k)) continue;
    const S = vesselSamples(ART[k], 3), gen = isGen(k);
    const Q = S.map(q => { const b = treeToBody(q); const st = lesionAt(k, q[1], false); return { p: [b[0], b[1], b[2] - LEG_Z], r: q[3] * (gen ? 0.95 : 1), plq: st.occ ? 0 : 1 - smooth(clamp((st.k - 0.55) / 0.42, 0, 1)), occ: st.occ }; });
    for (const fr of ['thigh', 'shin']) {
      const inF = q => fr === 'thigh' ? q.p[1] > LEG_KNEE_Y - 30 : q.p[1] < LEG_KNEE_Y + 30, off = fr === 'thigh' ? 0 : -LEG_KNEE_Y;
      const runs = (pred, mb, rk) => { let i = 0; while (i < Q.length) { if (!pred(Q[i])) { i++; continue; } let j = i; while (j + 1 < Q.length && pred(Q[j + 1])) j++; if (j > i) { const R = Q.slice(i, j + 1); tubeInto(mb, R.map(q => [q.p[0], q.p[1] + off, q.p[2]]), q => R[q].r * rk, q => R[q].plq, 10, true); } i = j + 1; } };
      runs(q => inF(q) && !q.occ, A[fr], 1);
      runs(q => inF(q) && q.occ, O[fr], 1.02);
    }
  }
  for (const fr of ['thigh', 'shin']) { L['art_' + fr] = computeNormals(A[fr].build()); const o = O[fr].build(); L['occ_' + fr] = o.nv ? computeNormals(o) : null; }
  return L;
}
const LEG = () => cached('leg', buildLeg);
// a point given in tree coordinates → world, through the posed thigh / shin
function treeToWorld(pose, p) {
  const b = treeToBody(p), q = [b[0], b[1], b[2] - LEG_Z];
  if (q[1] > LEG_KNEE_Y) return mApply(pose.right.th, q);
  return mApply(pose.right.sh, [q[0], q[1] - LEG_KNEE_Y, q[2]]);
}
// the layered right leg on the posed patient. o: {muscle (0..1 opacity), bone (0..1), art (0..1), pain (0..1), pulse (0..1 muscle bulge), fog}
function drawLeg(cam, pose, o) {
  const L = LEG(), sh = pose.right.sh, th = pose.right.th, fog = o.fog;
  const bulge = o.pulse ? mMul(sh, mMul(mT(-40, -150, 0), mMul(mS(1 + 0.05 * o.pulse, 1, 1 + 0.05 * o.pulse), mT(40, 150, 0)))) : sh;
  if (o.art > 0) {
    const am = { ramp: RL.art, id: newId(P.AR0), amb: 0.3, dif: 0.66, rim: 0.32, spec: 0.5, mix: { ramp: RT.plq, f: a => a }, fog, alpha: o.art < 1 ? o.art : undefined, ao: 2 };
    drawMesh(cam, L.art_thigh, am, th); drawMesh(cam, L.art_shin, am, sh);
    const om = { ramp: RT.occ, id: newId(P.OC0), amb: 0.3, dif: 0.7, rim: 0.25, fog, alpha: am.alpha, ao: 2 };
    if (L.occ_thigh) drawMesh(cam, L.occ_thigh, om, th); if (L.occ_shin) drawMesh(cam, L.occ_shin, om, sh);
  }
  if (o.bone > 0) { const bm = { ramp: RT.bone, id: 0, glass: [0.06 * o.bone, 0.5 * o.bone, 1.6], amb: 0.42, dif: 0.6, fog }; drawMesh(cam, L.bone, bm, sh); drawMesh(cam, L.femur, bm, th); }
  if (o.muscle > 0) {
    const pain = o.pain || 0, mm = { ramp: RL.mus, id: newId(P.MU0), amb: 0.3, dif: 0.68, rim: 0.3, spec: 0.15, mix: { ramp: RP.pain, f: a => pain * (0.75 + 0.25 * a) }, fog };
    if (o.muscle < 1) Object.assign(mm, { id: 0, glass: [0.05 * o.muscle, 0.95 * o.muscle, 1.4] });
    drawMesh(cam, L.gast, mm, bulge); drawMesh(cam, L.deep, Object.assign({}, mm, { mix: { ramp: RP.pain, f: a => pain * 0.6 } }), bulge);
  }
}
