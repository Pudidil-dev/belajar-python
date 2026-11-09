'use strict';
// ============================================================================
// THE ARTERIAL TREE AND THE LESION MAP (world mm: y up from the floor, x toward
// the patient's LEFT, z forward), drawn as smooth tubes like the CTA film.
// Calibres are drawn 2.3x real (3.9x in the whole-tree views, 4.6x in the
// final comparison) so the small
// arteries stay visible on a phone (a stated drawing convention).
//   aorta → common iliac → internal + external iliac → common femoral →
//   profunda femoris + superficial femoral (SFA) → popliteal (POP) →
//   anterior tibial (ATA → dorsalis pedis) + tibioperoneal trunk (TPT) →
//   posterior tibial (PTA → plantar) + peroneal (PER, communicating branches).
// Lesion map (patient's RIGHT leg, fixed for every view):
//   L1  SFA stenosis, mid thigh — eccentric wall plaque with calcium, open channel
//   L2  above-knee popliteal occlusion — no channel; genicular collaterals from
//       the distal SFA and the profunda refill the popliteal below it
//   L3  below the knee — two ATA stenoses, a narrowed peroneal, medial (rail-
//       track) calcification of the tibial arteries; the PTA stays open
// Left leg: milder disease (calcified tibials, one mild ATA stenosis).
// ============================================================================
const EXG = 2.3, HIPY_T = 920;
const ART = {};                       // name → {pts:[[x,y,z,r]...], parent, at (arc length where it leaves the parent)}
function art(name, pts, parent) { ART[name] = { name, pts: pts.map(p => [p[0], p[1], p[2], p[3] * EXG]), parent }; }
function side(sx, tag, L) {           // sx = -1 right leg, +1 left leg (mirrored, then varied)
  const X = x => x * -sx;             // centrelines written for the right leg (x negative)
  const P = (x, y, z, r) => [X(x), y, z, r];
  art(tag + 'CIA', [P(0, 1030, -30, 5), P(-45, 962, -34, 5), P(-60, 926, -30, 4.6)], 'AO');
  art(tag + 'IIA', [P(-60, 926, -30, 2.6), P(-58, 884, -58, 2.3), P(-48, 852, -80, 1.9)], tag + 'CIA');
  art(tag + 'EIA', [P(-60, 926, -30, 4.2), P(-80, 892, -10, 4), P(-88, 860, 0, 4)], tag + 'CIA');
  art(tag + 'CFA', [P(-88, 860, 0, 4), P(-90, 815, 5, 4)], tag + 'EIA');
  art(tag + 'PFA', [P(-90, 815, 5, 3.2), P(-101, 790, -10, 3), P(-108, 720, -25, 2.7), P(-105, 640, -32, 2.2), P(-99, 588, -36, 1.6)], tag + 'CFA');
  art(tag + 'SFA', [P(-90, 815, 5, 3.2), P(-83, 760, 8, 3.1), P(-76, 690, 4, 3), P(-71, 625, -6, 3), P(-72, 570, -25, 3)], tag + 'CFA');
  art(tag + 'POP', [P(-72, 570, -25, 3), P(-75, 520, -40, 2.9), P(-78, 480, -45, 2.8), P(-80, 445, -42, 2.7)], tag + 'SFA');
  art(tag + 'ATA', [P(-80, 445, -42, 1.7), P(-92, 430, -20, 1.6), P(-96, 400, 5, 1.6), P(-98, 300, 15, 1.5), P(-96, 180, 20, 1.4), P(-92, 82, 30, 1.4),
    P(-88, 50, 55, 1.3), P(-80, 30, 100, 1.2), P(-75, 22, 140, 1.1)], tag + 'POP');
  art(tag + 'TPT', [P(-80, 445, -42, 2.2), P(-80, 410, -40, 2.1)], tag + 'POP');
  art(tag + 'PTA', [P(-80, 410, -40, 1.7), P(-72, 330, -35, 1.6), P(-66, 200, -30, 1.5), P(-62, 92, -26, 1.4), P(-62, 58, -8, 1.3), P(-66, 26, 40, 1.15), P(-71, 16, 100, 1.05)], tag + 'TPT');
  art(tag + 'PER', [P(-80, 410, -40, 1.5), P(-90, 330, -28, 1.45), P(-95, 220, -20, 1.35), P(-95, 118, -18, 1.25)], tag + 'TPT');
  art(tag + 'PERc', [P(-95, 118, -18, 0.8), P(-96, 104, 2, 0.75), P(-93, 96, 22, 0.7)], tag + 'PER');          // perforating branch toward the ATA
  // genicular collaterals around the knee (pre-existing small channels; they enlarge where the popliteal is blocked)
  art(tag + 'GEN1', [P(-71, 608, -10, 1.0), P(-60, 585, 2, 1.0), P(-55, 545, 0, 1.0), P(-58, 505, -12, 1.0), P(-66, 478, -30, 1.0), P(-76, 466, -40, 1.0)], tag + 'SFA');
  art(tag + 'GEN2', [P(-100, 600, -35, 0.9), P(-104, 565, -28, 0.9), P(-98, 530, -18, 0.9), P(-96, 500, -26, 0.9), P(-88, 474, -38, 0.9), P(-80, 462, -43, 0.9)], tag + 'PFA');
  art(tag + 'GEN3', [P(-73, 560, -32, 0.75), P(-82, 538, -58, 0.75), P(-84, 510, -60, 0.75), P(-80, 482, -52, 0.75), P(-79, 470, -46, 0.75)], tag + 'POP');
}
art('AO', [[0, 1180, -40, 9], [0, 1100, -36, 9], [0, 1030, -30, 8.6]], null);
side(-1, 'R'); side(1, 'L');
// arc length from the aortic inlet along the tree (how far the contrast front must travel)
function arcLengths() {
  const done = {}, base = {};
  const lenOf = pts => { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2])); return c; };
  const order = Object.keys(ART);
  for (let pass = 0; pass < 4; pass++) for (const k of order) {
    const a = ART[k]; if (done[k]) continue;
    let s0 = 0;
    if (a.parent) { const p = ART[a.parent]; if (!done[a.parent]) continue; s0 = p.s0 + nearestArc(p, a.pts[0]); }
    a.s0 = s0; a.cum = lenOf(a.pts); done[k] = true;
  }
}
function nearestArc(a, q) { let best = 1e9, s = 0; for (let i = 0; i + 1 < a.pts.length; i++) { const p = a.pts[i], n = a.pts[i + 1]; for (let k = 0; k <= 10; k++) { const x = lerp(p[0], n[0], k / 10), y = lerp(p[1], n[1], k / 10), z = lerp(p[2], n[2], k / 10), d = Math.hypot(x - q[0], y - q[1], z - q[2]); if (d < best) { best = d; s = (a.cum ? a.cum[i] : 0) + Math.hypot(x - p[0], y - p[1], z - p[2]); } } } return s; }
// compute cum first (needed by nearestArc), then the arcs
for (const k in ART) { const a = ART[k]; a.cum = [0]; for (let i = 1; i < a.pts.length; i++) a.cum.push(a.cum[i - 1] + Math.hypot(a.pts[i][0] - a.pts[i - 1][0], a.pts[i][1] - a.pts[i - 1][1], a.pts[i][2] - a.pts[i - 1][2])); }
arcLengths();
// ---------------------------------------------------------------- lesions (factor = residual lumen radius / normal)
const LES = {
  L1: { art: 'RSFA', y0: 712, y1: 668, yc: 690, min: 0.3, side: [0.6, 0, -0.8] },             // eccentric plaque toward posteromedial
  L2: { art: 'RPOP', y0: 548, y1: 490 },                                                         // occluded segment
  L3a: { art: 'RATA', yc: 378, h: 14, min: 0.42 }, L3b: { art: 'RATA', yc: 252, h: 12, min: 0.5 }, L3c: { art: 'RPER', yc: 268, h: 40, min: 0.55 },
  LLa: { art: 'LATA', yc: 300, h: 12, min: 0.65 }, LLb: { art: 'LSFA', yc: 700, h: 22, min: 0.8 },
};
const MEDCAL = { RATA: [150, 400], RPTA: [120, 300], RPER: [140, 320], LATA: [160, 380], LPTA: [140, 260] };   // medial calcification (y ranges)
// residual lumen factor of an artery at height y (1 = normal, 0 = occluded)
function lumenK(name, y) {
  let k = 1;
  for (const id in LES) {
    const L = LES[id]; if (L.art !== name) continue;
    if (id === 'L2') { if (y < L.y0 && y > L.y1) return 0; continue; }
    const h = L.h || (L.y0 - L.y1) / 2, yc = L.yc, u = (y - yc) / h;
    if (Math.abs(u) < 1.6) k = Math.min(k, lerp(L.min, 1, smooth(clamp(Math.abs(u) / 1.6, 0, 1))));
  }
  return k;
}
// collateral calibre growth (0 = thin pre-existing channel, 1 = enlarged)
const isGen = n => /GEN/.test(n);
// ---------------------------------------------------------------- ramps
const RT = {
  wall: [hexc('#2A1020'), hexc('#561C2C'), hexc('#8E3038'), P.AR3, hexc('#F0A48C')],
  blood: [P.BL0, P.BL1, P.BL2, P.BL3, P.AR2],
  con: [P.CO0, P.CO1, P.CO2, P.CO3, P.CO4],
  plq: [P.PL0, P.PL1, P.PL2, P.PL3, P.PL4],
  occ: [P.OC0, P.OC1, P.OC2, P.OC3, P.OC4],
  cal: [P.CA1, P.CA2, P.CA3, P.CA4],
  hot: [hexc('#5A1408'), hexc('#A3260E'), hexc('#E4572E'), hexc('#FF8A5C'), hexc('#FFC2A6')],
  vr: [hexc('#24282E'), hexc('#4E5458'), hexc('#868A88'), hexc('#BEBCB0'), hexc('#F4F1E6')],
  bone: [P.BO0, P.BO1, P.BO2, P.BO3],
  ghost: [hexc('#141F2C'), hexc('#1C2C3E'), hexc('#263C52'), hexc('#324E68'), hexc('#42627E')],
};
// ---------------------------------------------------------------- sampling a vessel (Catmull-Rom), with radius and arrival distance
function vesselSamples(a, step) {
  const c = a.pts, n = c.length, out = [];
  for (let i = 0; i + 1 < n; i++) {
    const p0 = c[Math.max(0, i - 1)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(n - 1, i + 2)];
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]), m = Math.max(1, Math.ceil(L / (step || 3)));
    for (let k = 0; k < m; k++) {
      const t = k / m, t2 = t * t, t3 = t2 * t, q = [];
      for (let d = 0; d < 3; d++) q.push(0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3));
      q.push(lerp(p1[3], p2[3], t), a.s0 + a.cum[i] + t * L); out.push(q);
    }
  }
  const e = c[n - 1]; out.push([e[0], e[1], e[2], e[3], a.s0 + a.cum[n - 1]]);
  return out;
}
// per-sample lesion state for this patient's map (normal: the teaching model)
function lesionAt(name, y, normal) {
  if (normal) return { k: 1, occ: false };
  if (name === 'RPOP' && y < LES.L2.y0 && y > LES.L2.y1) return { k: 0, occ: true };
  return { k: lumenK(name, y), occ: false };
}
const ECC = norm3([-0.6, 0, 0.8]);
// the arrival distance of the contrast at a sample (the popliteal below the block and the collaterals fill later)
function arrivalAt(name, q, normal) { let s = q[4] + (isGen(name) ? 140 : 0); if (!normal && name[0] === 'R' && q[1] < LES.L2.y1 + 2 && !/CIA|IIA|EIA|CFA|PFA|SFA/.test(name)) s += 160; return s; }
// ---------------------------------------------------------------- the tree meshes. o: {legs: ['R','L'], aorta, normal, rk}
function buildTreeMeshes(o) {
  const legs = o.legs || ['R', 'L'], RK = o.rk || 1, normal = !!o.normal;
  const W_ = new MB(), LU = new MB(), PQ = new MB(), OC = new MB(), CA = new MB();
  for (const k in ART) {
    const a = ART[k], tag = k[0];
    if (k === 'AO' ? o.aorta === false : !legs.includes(tag)) continue;
    const gen = isGen(k), gk = gen ? (!normal && tag === 'R' ? 1 : 0.55) : 1;
    const S = vesselSamples(a, 3), n = S.length, sides = a.pts[0][3] * RK > 6 ? 14 : 10;
    const r = i => S[i][3] * gk * RK, st = S.map(q => lesionAt(k, q[1], normal));
    // the wall (outer surface; the lesions narrow the channel inside it, not the wall)
    tubeInto(W_, S.map(q => q.slice(0, 3)), i => r(i), i => arrivalAt(k, S[i], normal), sides, false);
    ellipsoidInto(W_, S[0].slice(0, 3), r(0), r(0), r(0), sides, 6, null, () => arrivalAt(k, S[0], normal));
    // the open channel in runs (it stops at the occlusion), shifted toward one side where L1's plaque is eccentric
    let i = 0;
    while (i < n) {
      if (st[i].occ) { i++; continue; }
      let j = i; while (j + 1 < n && !st[j + 1].occ) j++;
      if (j > i) {
        const P_ = [], R_ = [];
        for (let q = i; q <= j; q++) { const kk = st[q].k, ri = r(q) * 0.74, e = (!normal && k === 'RSFA') ? (1 - kk) * 0.42 * ri : 0; P_.push(add3(S[q].slice(0, 3), mul3(ECC, e))); R_.push(Math.max(0.35, ri * kk)); }
        tubeInto(LU, P_, q => R_[q], q => arrivalAt(k, S[i + q], normal), sides, true);
      }
      i = j + 1;
    }
    if (normal) continue;
    // plaque: a sleeve between the narrowed channel and the wall (drawn see-through so the channel shows inside it)
    i = 0;
    while (i < n) {
      if (st[i].k > 0.97 || st[i].occ) { i++; continue; }
      let j = i; while (j + 1 < n && st[j + 1].k <= 0.97 && !st[j + 1].occ) j++;
      if (j > i) tubeInto(PQ, S.slice(i, j + 1).map(q => q.slice(0, 3)), q => r(i + q) * 0.78, null, sides, true);
      i = j + 1;
    }
    // the occluded segment: solid, orange-brown, inside the intact wall
    const oi = []; st.forEach((s_, q) => { if (s_.occ) oi.push(q); });
    if (oi.length > 1) tubeInto(OC, S.slice(oi[0], oi[oi.length - 1] + 1).map(q => q.slice(0, 3)), q => r(oi[0] + q) * 0.8, null, sides, true);
    // calcium: opaque white nodules — rail-track rows in the media of the tibial arteries, clusters in L1 and in the block
    const T = (q) => norm3(sub3(S[Math.min(n - 1, q + 1)].slice(0, 3), S[Math.max(0, q - 1)].slice(0, 3)));
    for (let q = 0; q < n; q++) {
      const y = S[q][1], med = MEDCAL[k] && y > MEDCAL[k][0] && y < MEDCAL[k][1] && Math.floor(y / 7) % 2 === 0;
      const l1 = k === 'RSFA' && Math.abs(y - LES.L1.yc) < 26 && hash2(q, 7) < 0.45, l2 = st[q].occ && hash2(q, 11) < 0.25;
      if (!med && !l1 && !l2) continue;
      const t_ = T(q), nn = norm3(cross3(t_, [0, 0, 1])), bb = cross3(t_, nn), rr = r(q);
      const ang = med ? [0, Math.PI] : [hash2(q, 3) * TAU];
      for (const an of ang) {
        const dir = add3(mul3(nn, Math.cos(an)), mul3(bb, Math.sin(an))), rad = med ? rr * 0.22 : rr * (0.2 + 0.1 * hash2(q, 5));
        const c = add3(S[q].slice(0, 3), mul3(dir, (l2 ? 0.45 : 0.86) * rr));
        ellipsoidInto(CA, c, rad, rad * 0.8, rad, 8, 5, null, () => 0);
      }
    }
  }
  const fin = mb => { const m = mb.build(); return m.nv ? computeNormals(m) : null; };
  return { wall: fin(W_), lum: fin(LU), plq: fin(PQ), occ: fin(OC), cal: fin(CA) };
}
// whole-tree views draw the calibres 1.7x more again (3.9x real; the two-tree comparison 2x, 4.6x real) so the tibial arteries stay readable on a phone
const TREE_RK = 1.7, CMP_RK = 2.0;
const TREE = () => cached('tree', () => buildTreeMeshes({ rk: TREE_RK }));
const TREE_N = () => cached('treeN', () => buildTreeMeshes({ normal: true, legs: ['R'], aorta: false, rk: CMP_RK }));
const TREE_R = () => cached('treeR', () => buildTreeMeshes({ legs: ['R'], aorta: false, rk: CMP_RK }));
const TREE_NN = () => cached('treeNN', () => buildTreeMeshes({ normal: true, rk: TREE_RK }));
// ---------------------------------------------------------------- drawing the tree
// explanatory look: a red see-through wall, the channel as a column (blood red, white-blue behind the contrast front),
// the plaque a see-through yellow sleeve, the block orange-brown, calcium white; o: {xf, front, hot: [{y0,y1,k}], fog, wallGlass}
function drawTreeExpl(cam, T, o) {
  o = o || {};
  const front = o.front === undefined ? 1e9 : o.front, xf = o.xf, fog = o.fog;
  const lumId = newId(P.BL0);
  if (T.lum) drawMesh(cam, T.lum, { ramp: RT.blood, id: lumId, amb: 0.3, dif: 0.66, rim: 0.3, spec: 0.5, mix: { ramp: RT.con, f: a => smooth(clamp((front - a) / 60, 0, 1)) }, fog }, xf);
  if (T.occ) drawMesh(cam, T.occ, { ramp: RT.occ, id: newId(P.OC0), amb: 0.3, dif: 0.7, rim: 0.25, fog, mix: o.hot && o.hot[1] ? { ramp: RT.hot, f: () => o.hot[1].k } : undefined }, xf);
  if (T.cal) drawMesh(cam, T.cal, { ramp: RT.cal, id: newId(P.CA0), amb: 0.45, dif: 0.6, rim: 0.2, spec: 0.4, fog }, xf);
  if (T.plq) {
    const hl = o.hot && o.hot[0] ? o.hot[0].k : 0;
    drawMesh(cam, T.plq, { ramp: RT.plq, id: 0, glass: [0.18, 0.9, 1.4], amb: 0.35, dif: 0.6, fog, mix: hl ? { ramp: RT.hot, f: () => hl } : undefined, clipFn: hl ? null : undefined }, xf);
  }
  if (T.wall) drawMesh(cam, T.wall, { ramp: RT.wall, id: 0, glass: o.wallGlass || [0.0, 0.6, 2.8], amb: 0.3, dif: 0.65, rim: 0.35, spec: 0.3, fog }, xf);
}
// CTA look: the contrast-filled channel in ivory (a volume rendering), calcium brighter white with a dark rim; no wall, no soft plaque
function drawTreeCTA(cam, T, o) {
  o = o || {};
  if (T.lum) drawMesh(cam, T.lum, { ramp: RT.vr, id: newId(P.G1), amb: 0.24, dif: 0.62, rim: 0.4, spec: 0.5, fog: o.fog }, o.xf);
  if (T.cal) drawMesh(cam, T.cal, { ramp: [P.CA2, P.CA3, P.CA4, P.CA4], id: newId(hexc('#101010')), amb: 0.6, dif: 0.5, spec: 0.3, fog: o.fog }, o.xf);
}
// ---------------------------------------------------------------- bones (ivory): femur, tibia, fibula, patella, foot, pelvis
function buildBonesMesh() {
  const mb = new MB();
  for (const sx of [-1, 1]) {
    const X = p => [p[0] * -sx, p[1], p[2], p[3]];
    const tube = ctrl => { const c = ctrl.map(X), pts = smoothPath(c.map(q => q.slice(0, 3)), 6), L = pts.length - 1; tubeInto(mb, pts, (i, u) => { const f = u * (c.length - 1), j = Math.min(c.length - 2, Math.floor(f)); return lerp(c[j][3], c[j + 1][3], f - j); }, null, 12, true); };
    tube([[-92, 868, -12, 20], [-104, 840, -10, 14], [-86, 800, -6, 14], [-70, 600, 0, 12], [-68, 520, 0, 15], [-72, 492, 2, 22]]);                 // femur
    ellipsoidInto(mb, [92 * sx, 868, -12], 24, 24, 24, 12, 8);                                                                                     // femoral head
    tube([[-74, 470, 0, 23], [-72, 440, 4, 18], [-70, 330, 8, 12], [-68, 120, 8, 10], [-64, 82, 10, 15]]);                                           // tibia
    tube([[-104, 452, -10, 7], [-104, 400, -12, 5.5], [-106, 200, -12, 4.5], [-108, 82, -8, 8]]);                                                    // fibula
    ellipsoidInto(mb, [74 * sx, 505, 36], 13, 18, 8, 10, 7);                                                                                       // patella
    ellipsoidInto(mb, [68 * sx, 34, -18], 20, 24, 24, 10, 7);                                                                                      // heel
    for (let r = 0; r < 4; r++) tube([[-70 + (r - 1.5) * 9, 30, 70, 5], [-70 + (r - 1.5) * 11, 10, 158, 3.5]]);                                       // metatarsal rays
  }
  const pel = (x, y, z) => {
    const ax = Math.abs(x), bladeOuter = sdE(ax, y, z, 54, 978, -30, 50, 60, 50), bladeInner = sdE(ax, y, z, 52, 982, -26, 43, 54, 43);
    const blade = Math.max(bladeOuter, -bladeInner, -(y - 912), -(ax - 44), z - 22);
    const acet = Math.max(sdE(ax, y, z, 90, 868, -12, 30, 30, 30), -sdE(ax, y, z, 92, 868, -6, 24, 24, 26));
    const ramus = Math.max(sdE(ax, y, z, 50, 852, 10, 40, 30, 18), -sdE(ax, y, z, 52, 852, 10, 22, 16, 30), -(y - 822));
    return Math.min(blade, acet, ramus, sdE(x, y, z, 0, 935, -82, 34, 70, 18));
  };
  const pm = isoMesh(pel, -150, 815, -110, 150, 1045, 70, 6);
  const m = computeNormals(mb.build());
  return { long: m, pelvis: pm };
}
const BONES = () => cached('bones', buildBonesMesh);
function drawBones(cam, o) {
  o = o || {}; const B = BONES(), m = { ramp: o.ramp || RT.bone, id: 0, glass: o.glass || [0.08, 0.7, 1.6], amb: 0.4, dif: 0.6, fog: o.fog, noZ: true };   // a backdrop behind the vessels
  drawMesh(cam, B.long, m, o.xf); drawMesh(cam, B.pelvis, m, o.xf);
}
// ---------------------------------------------------------------- a standing body silhouette (glass) behind the trees
const TB = [0, 0, -1, 0, 0, 1, 0, HIPY_T, 1, 0, 0, 0];   // body frame (forward x, up y, right z; hips at the origin) → tree frame
function ghostBody(cam, xf, parts, o) {
  buildParts(); o = o || {};
  const base = xf ? mMul(xf, TB) : TB, list = [];
  if (parts.includes('torso')) list.push(['torso', mMul(base, mT(-6, 140, 0))]);
  if (parts.includes('pelvis')) list.push(['pelvis', base]);
  for (const [tag, zs] of [['R', 92], ['L', -92]]) if (parts.includes(tag)) {
    const th = mMul(base, mT(0, 0, zs)), sh = mMul(th, mT(0, -440, 0)), ft = mMul(sh, mT(0, -420, 0));
    list.push(['thighShorts', th], ['thighSkin', th], ['shinSkin', sh], ['sock', sh], ['shoe', ft], ['sole', ft]);
  }
  const m = { ramp: RT.ghost, id: 0, glass: o.glass || [0.22, 0.9, 1.5], amb: 0.42, dif: 0.5, rim: 0.3, fog: o.fog, noZ: true };   // a backdrop: the vessels draw over it
  for (const [n, mm] of list) drawMesh(cam, PART[n], m, mm);
}
