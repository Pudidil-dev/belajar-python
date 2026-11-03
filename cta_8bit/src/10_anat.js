'use strict';
// ============================================================================
// ANATOMY — one patient in one frame (millimetres): x = the patient's left,
// y = superior, z = anterior. Head centre near the origin; the patient lies
// supine on the CT table (room "up" is +z).
// Arteries carry a per-vertex arrival time of the contrast (attribute a): the
// renderer turns it into an amber concentration inside the blood.
// One aneurysm: saccular, unruptured, at the LEFT middle cerebral artery
// bifurcation, built once and reused in every sequence.
// ============================================================================
// ---------------------------------------------------------------- the contrast timeline (time-compressed)
// arrival at the cannula 6.6 s → arm veins → SVC → RA 10.5 → RV (beat 10.8) → PA (beat 12.0) → lungs → PV → LA 14.8
// → LV → aorta (beat 15.6) → carotids → ICA 17.6 → MCA bifurcation 18.5 → aneurysm 18.7; washout of the brain's
// arteries after the scan (the anatomical close-up of the ending has no contrast, like the first frame)
function conc(t, a, kind) {
  if (t < a) return 0;
  const rise = smooth(clamp((t - a) / 0.45, 0, 1));
  if (kind === 'vein') return rise * (0.55 + 0.45 * Math.exp(-Math.max(0, t - a - 0.45) / 2.5));
  if (kind === 'brain') return rise * (1 - smooth(seg(t, 54.6, 56.2)));
  return rise;
}
// ---------------------------------------------------------------- the cerebral arteries
const VESS = [];   // {name, pts (dense), r0, r1, a0, a1, kind}
function vessel(name, ctrl, r0, r1, a0, a1, opt) { const pts = smoothPath(ctrl, (opt && opt.step) || 1.6); VESS.push(Object.assign({ name, pts, r0, r1, a0, a1, kind: 'brain' }, opt || {})); return pts; }
const T_L = [14, -12, 6], B_L = [42, -6, 2];                          // left ICA terminus, left MCA bifurcation
const AN_DIR = norm3([1.0, -0.42, 0.5]), AN_NECK = add3(B_L, mul3(AN_DIR, 2.4)), AN_C = add3(B_L, mul3(AN_DIR, 6.6)), AN_R = 4.7;
function brainTree() {
  for (const sg of [1, -1]) {
    const X = p => [p[0] * sg, p[1], p[2]], L = sg > 0, dt = L ? 0 : 0.06;
    vessel('ICA', [[22, -132, -2], [22, -95, 0], [20, -60, 4], [21, -46, 8], [24, -36, 15], [19, -26, 19], [15, -19, 12], [14, -12, 6]].map(X), 2.9, 2.4, 17.6 + dt, 18.15 + dt);
    vessel('M1', [[14, -12, 6], [22, -10.5, 4.5], [31, -8.5, 3.5], [42, -6, 2]].map(X), 2.0, 1.85, 18.15 + dt, 18.5 + dt);
    const sup = vessel('M2s', [[42, -6, 2], [47, 0, 5], [52, 9, 5], [56, 19, 0], [59, 28, -8]].map(X), 1.55, 1.2, 18.5 + dt, 18.8 + dt);
    const inf = vessel('M2i', [[42, -6, 2], [48, -11, -2], [53, -14, -11], [57, -13, -24], [60, -9, -36]].map(X), 1.5, 1.15, 18.5 + dt, 18.82 + dt);
    // cortical branches over the lateral surface (M3/M4)
    const br = [[sup, 0.55, [[60, 30, 14], [63, 42, 22], [60, 54, 26]]], [sup, 0.75, [[61, 38, -2], [62, 50, -6], [57, 62, -10]]], [sup, 1.0, [[61, 36, -20], [60, 46, -34], [54, 54, -46]]],
      [sup, 0.3, [[56, 12, 18], [60, 18, 32], [58, 22, 46]]], [inf, 0.5, [[60, -18, -20], [64, -22, -32], [62, -26, -44]]], [inf, 0.8, [[62, -6, -40], [62, 4, -54], [57, 12, -66]]],
      [inf, 1.0, [[61, -14, -46], [58, -18, -60], [52, -20, -72]]], [inf, 0.3, [[56, -22, -2], [60, -30, -8], [58, -36, -18]]]];
    br.forEach(([par, u, ctrl], k) => { const p0 = par[Math.min(par.length - 1, Math.round(u * (par.length - 1)))]; vessel('M3', [p0, ...ctrl.map(X)], 1.05, 0.6, 18.75 + dt + 0.04 * k, 19.15 + dt + 0.04 * k); });
    vessel('A1', [[14, -12, 6], [9, -9, 13], [2.6, -6.5, 20]].map(X), 1.45, 1.3, 18.15 + dt, 18.35 + dt);
    vessel('A2', [[2.6, -6.5, 20], [3, 4, 30], [3, 24, 35], [3.4, 44, 27], [3.6, 57, 8], [3.6, 60, -18], [3.4, 52, -44]].map(X), 1.3, 0.85, 18.35 + dt, 19.0 + dt);
    vessel('CM', [[3, 24, 35], [4, 40, 43], [4.4, 57, 26], [4.6, 65, 0]].map(X), 0.95, 0.65, 18.6 + dt, 18.95 + dt);
    vessel('PCom', [[15, -16, 7], [12, -18, -4], [8, -21, -13]].map(X), 0.75, 0.75, 18.2, 18.4);
    vessel('PCA', [[0.5, -27, -14], [8, -24, -14], [16, -21, -21], [26, -16, -34], [32, -10, -52], [33, 0, -70]].map(X), 1.35, 0.9, 18.3, 18.9);
    vessel('VA', [[12, -132, -30], [8, -102, -26], [0.5, -80, -22]].map(X), 1.6, 1.6, 17.55, 17.9);
  }
  vessel('ACom', [[2.6, -6.5, 20], [0, -6.4, 21], [-2.6, -6.5, 20]], 0.85, 0.85, 18.35, 18.4);
  vessel('BA', [[0, -80, -22], [0, -54, -18], [0, -28, -14]], 1.85, 1.75, 17.9, 18.3);
}
brainTree();
const AN_A = 18.72;                                                   // contrast reaches the sac a moment after the bifurcation
// contrast concentration for an attribute that may carry the +100 sac mark
const arrOf = a => a >= 100 ? a - 100 : a;
function aneurysmInto(mb) {
  // the neck: a short widening tube from inside the bifurcation out to the sac
  tubeInto(mb, [B_L, add3(B_L, mul3(AN_DIR, 1.4)), AN_NECK, add3(B_L, mul3(AN_DIR, 3.6))], (i, u) => lerp(1.9, 2.5, u), () => AN_A, 12);
  // the sac: a rounded, slightly lobulated outpouching
  const def = (x, y, z) => { const d = x * AN_DIR[0] + y * AN_DIR[1] + z * AN_DIR[2]; return 1 + 0.05 * Math.sin(3 * x + 1.7 * y) + 0.04 * Math.cos(2 * z - y) + (d < -0.6 ? -0.12 * (-0.6 - d) : 0); };
  ellipsoidInto(mb, AN_C, AN_R, AN_R * 0.95, AN_R, 22, 16, def, () => AN_A);
}
const HERO = { x0: 6, x1: 62, y0: -30, y1: 22, z0: -24, z1: 26 };
const inHero = p => p[0] > HERO.x0 + 2 && p[0] < HERO.x1 - 2 && p[1] > HERO.y0 + 2 && p[1] < HERO.y1 - 2 && p[2] > HERO.z0 + 2 && p[2] < HERO.z1 - 2;
const SEGS = (() => {   // vessel segments near the hero region, bucketed: [ax,ay,az,bx,by,bz,ra,rb,ta,tb]
  const cell = 6, map = new Map(), key = (i, j, k) => i * 73856093 ^ j * 19349663 ^ k * 83492791;
  for (const v of VESS) { const n = v.pts.length; for (let i = 0; i + 1 < n; i++) { const a = v.pts[i], b = v.pts[i + 1]; if (Math.max(a[0], b[0]) < HERO.x0 - 6 || Math.min(a[0], b[0]) > HERO.x1 + 6 || Math.max(a[1], b[1]) < HERO.y0 - 6 || Math.min(a[1], b[1]) > HERO.y1 + 6 || Math.max(a[2], b[2]) < HERO.z0 - 6 || Math.min(a[2], b[2]) > HERO.z1 + 6) continue;
    const sg = [a[0], a[1], a[2], b[0], b[1], b[2], lerp(v.r0, v.r1, i / (n - 1)) * 1.25, lerp(v.r0, v.r1, (i + 1) / (n - 1)) * 1.25, lerp(v.a0, v.a1, i / (n - 1)), lerp(v.a0, v.a1, (i + 1) / (n - 1))];
    for (let x = Math.floor((Math.min(a[0], b[0]) - 4) / cell); x <= Math.floor((Math.max(a[0], b[0]) + 4) / cell); x++) for (let y = Math.floor((Math.min(a[1], b[1]) - 4) / cell); y <= Math.floor((Math.max(a[1], b[1]) + 4) / cell); y++) for (let z = Math.floor((Math.min(a[2], b[2]) - 4) / cell); z <= Math.floor((Math.max(a[2], b[2]) + 4) / cell); z++) { const kk = key(x, y, z); if (!map.has(kk)) map.set(kk, []); map.get(kk).push(sg); } } }
  return { cell, map, key };
})();
const sacSide = (x, y, z) => (x - B_L[0]) * AN_DIR[0] + (y - B_L[1]) * AN_DIR[1] + (z - B_L[2]) * AN_DIR[2];
// on the sac itself (beyond the neck and within the dome), not on the neighbouring branches
const onSac = (x, y, z) => sacSide(x, y, z) > 2.9 && Math.hypot(x - AN_C[0], y - AN_C[1], z - AN_C[2]) < AN_R + 1.2;
function heroSDF(x, y, z) {
  const l = SEGS.map.get(SEGS.key(Math.floor(x / SEGS.cell), Math.floor(y / SEGS.cell), Math.floor(z / SEGS.cell)));
  let d = 1e9;
  if (l) for (const s_ of l) d = smin(d, sdC(x, y, z, s_[0], s_[1], s_[2], s_[3], s_[4], s_[5], s_[6], s_[7]), 0.9);
  // the aneurysm: a narrow neck rising from the bifurcation apex into a rounded, slightly lobulated sac
  d = smin(d, sdC(x, y, z, B_L[0], B_L[1], B_L[2], AN_NECK[0], AN_NECK[1], AN_NECK[2], 2.0, 2.3), 0.7);
  const lob = 0.25 * Math.sin(1.9 * x + 1.1 * y) * Math.cos(1.3 * z - 0.6 * x);
  d = smin(d, sdE(x, y, z, AN_C[0], AN_C[1], AN_C[2], AN_R, AN_R * 0.94, AN_R) + lob, 0.9);
  return d;
}
function heroAttr(x, y, z) {   // contrast arrival time (nearest segment); +100 marks the sac (beyond the neck)
  const l = SEGS.map.get(SEGS.key(Math.floor(x / SEGS.cell), Math.floor(y / SEGS.cell), Math.floor(z / SEGS.cell)));
  let best = 1e9, ta = AN_A; if (l) for (const s_ of l) { const m = [(s_[0] + s_[3]) / 2, (s_[1] + s_[4]) / 2, (s_[2] + s_[5]) / 2], dd = Math.hypot(x - m[0], y - m[1], z - m[2]); if (dd < best) { best = dd; ta = (s_[8] + s_[9]) / 2; } }
  return onSac(x, y, z) ? 100 + AN_A : ta;
}
function buildHero() { return isoMesh(heroSDF, HERO.x0, HERO.y0, HERO.z0, HERO.x1, HERO.y1, HERO.z1, 0.85, heroAttr); }
function buildArteries(noSac) {
  const mb = new MB();
  for (const v of VESS) {
    // tubes everywhere except inside the hero region (there the smooth SDF mesh takes over); each run reaches one point into it
    const n = v.pts.length, ins = v.pts.map(p => inHero(p)), inc = ins.map((x, i) => !x || (i > 0 && !ins[i - 1]) || (i + 1 < n && !ins[i + 1]));
    let i = 0;
    // a small ball closes each open tube end, so no gap shows where three vessels meet at a branching
    const ball = k => { const r = lerp(v.r0, v.r1, k / (n - 1)) * 1.25, a = lerp(v.a0, v.a1, k / (n - 1)); ellipsoidInto(mb, v.pts[k], r, r, r, 10, 6, null, () => a); };
    while (i < n) { if (!inc[i]) { i++; continue; } let j = i; while (j + 1 < n && inc[j + 1]) j++; if (j > i) { const i0 = i; tubeInto(mb, v.pts.slice(i, j + 1), (k, u) => lerp(v.r0, v.r1, (i0 + k) / (n - 1)) * 1.25, (k, u) => lerp(v.a0, v.a1, (i0 + k) / (n - 1)), v.r0 > 1.4 ? 12 : 8); ball(i0); ball(j); } i = j + 1; }
  }
  return computeNormals(mb.build());
}
function buildAneurysmOnly() { const mb = new MB(); aneurysmInto(mb); return computeNormals(mb.build()); }
// distance from a point to the vessel tree (for the CT data): a coarse grid of centreline samples
const VGRID = (() => {
  const cell = 8, map = new Map(), key = (i, j, k) => i * 73856093 ^ j * 19349663 ^ k * 83492791;
  const add = (p, r) => { const i = Math.floor(p[0] / cell), j = Math.floor(p[1] / cell), k = Math.floor(p[2] / cell); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const kk = key(i + a, j + b, k + c); if (!map.has(kk)) map.set(kk, []); map.get(kk).push([p[0], p[1], p[2], r]); } };
  for (const v of VESS) v.pts.forEach((p, i) => add(p, lerp(v.r0, v.r1, i / (v.pts.length - 1)) * 1.25));
  for (let s = 0; s <= 1; s += 0.1) add(lerp3(B_L, AN_NECK, s), 2.2);
  add(AN_C, AN_R);
  return { cell, map, key };
})();
function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function vesselInside(x, y, z) { // 0..1 (soft edge) how much the point is inside a vessel lumen
  const g = VGRID, l = g.map.get(g.key(Math.floor(x / g.cell), Math.floor(y / g.cell), Math.floor(z / g.cell))); if (!l) return 0;
  let best = 0; for (const q of l) { const d = Math.hypot(x - q[0], y - q[1], z - q[2]), v = clamp((q[3] + 0.4 - d) / 0.8, 0, 1); if (v > best) best = v; }
  return best;
}
// ---------------------------------------------------------------- brain, cerebellum, head, skull
const BRAIN = { c: [0, 10, -5], r: [68, 58, 82] };
// the brain as a signed distance: four lobes per hemisphere, the longitudinal and Sylvian fissures, gyri as ridged noise,
// the cerebellum with its folia, the brainstem
function brainSDF(x, y, z) {
  const ax = Math.abs(x);
  let d = sdE(ax, y, z, 30, 26, 32, 35, 40, 50);                         // frontal
  d = smin(d, sdE(ax, y, z, 33, 31, -20, 37, 40, 46), 12);                // parietal
  d = smin(d, sdE(ax, y, z, 25, 13, -62, 29, 31, 27), 12);                // occipital
  d = smin(d, sdE(ax, y, z, 46, -17, 5, 23, 21, 42), 8);                  // temporal
  // the longitudinal fissure between the hemispheres (above the corpus callosum)
  d = smax(d, 1.8 - ax + Math.max(0, 8 - y) * 0.6, 1.4);
  // the Sylvian (lateral) fissure separating the temporal lobe, deep on the lateral surface
  const yc = -8 + 0.2 * z, slot = Math.max(Math.abs(y - yc) - 1.8, 46 - ax);
  if (z > -40 && z < 52) d = smax(d, -slot, 1.2);
  // gyri and sulci: ridged noise only in the outer cortex
  if (d > -9 && d < 6) d += 2.1 * (Math.abs(vn3(x * 0.085, y * 0.085, z * 0.085) + 0.5 * vn3(x * 0.17, y * 0.17, z * 0.17)) - 0.32);
  // cerebellum (folia) and brainstem
  let c = sdE(ax, y, z, 23, -40, -57, 27, 19, 25); if (c < 5) c += 0.7 * Math.sin(y * 1.5 - z * 0.25);
  d = smin(d, c, 3);
  d = smin(d, sdC(x, y, z, 0, -26, -16, 0, -96, -24, 14, 10), 6);
  return d;
}
function buildBrain() { return isoMesh(brainSDF, -76, -100, -96, 76, 76, 92, 3.4); }
const HEAD = { c: [0, 4, 0], r: [80, 76, 98] };
// a featureless head (mannequin-like: no eyes or mouth), ears, jaw and neck
function headSDF(x, y, z) {
  const ax = Math.abs(x);
  let d = sdE(x, y, z, 0, 8, -4, 77, 75, 95);
  d = smin(d, sdE(x, y, z, 0, -30, 36, 58, 48, 56), 18);
  d = smin(d, sdE(x, y, z, 0, -60, 44, 40, 22, 34), 12);
  d = smin(d, sdC(x, y, z, 0, -6, 90, 0, -30, 99, 7, 9), 5);
  d = smin(d, sdE(ax, y, z, 77, -14, -8, 8, 16, 11), 3);
  d = smin(d, sdC(x, y, z, 0, -60, -16, 0, -190, -14, 52, 58), 16);
  return d;
}
function hairOf(x, y, z) {
  const hl = lerp(-50, 38, smooth(clamp((z + 70) / 150, 0, 1)));          // the hairline: low at the nape, high on the forehead
  let h = clamp((y - hl) / 9 + 0.35 * vn3(x * 0.08, y * 0.08, z * 0.08), 0, 1);
  if (Math.abs(x) > 63 && y < 10 && y > -42 && z > -36 && z < 24) h = 0;   // the ears stay bare
  return h;
}
function buildHead() { return isoMesh(headSDF, -92, -196, -112, 92, 90, 112, 5.5, hairOf); }
function buildSkull() { const mb = new MB(); ellipsoidInto(mb, [0, 6, -2], 74, 68, 92, 40, 30, (x, y, z) => 1 + 0.02 * Math.sin(5 * z)); return computeNormals(mb.build()); }
// ---------------------------------------------------------------- the patient's body (under a sheet) and the bare right forearm
// the right arm rests abducted on an arm board, palm up; the IV cannula sits in the antecubital vein at the elbow crease
const ARM = { sh: [-200, -250, -36], el: [-366, -488, -92], wr: [-522, -696, -92], hand: [-566, -756, -90] };
const CANNULA = { tip: [-378, -500, -63], hub: [-407, -541, -47] };
function bodySDF(x, y, z) {
  const ax = Math.abs(x);
  let d = sdB(x, y, z, 0, -430, -42, 158, 215, 92, 70);                                       // chest and abdomen
  d = smin(d, sdC(x, y, z, -168, -232, -44, 168, -232, -44, 60), 40);                        // shoulders
  d = smin(d, sdE(x, y, z, 0, -690, -48, 166, 120, 92), 40);                                 // hips
  d = smin(d, sdC(ax, y, z, 92, -740, -52, 104, -1530, -58, 78, 50), 46);                    // legs, the sheet bridging between them
  d = smin(d, sdE(ax, y, z, 104, -1585, 2, 40, 34, 58), 16);                                 // feet tenting the sheet
  d = smin(d, sdC(x, y, z, 205, -250, -34, 232, -770, -32, 48, 38), 24);                     // the left arm under the sheet
  d = smin(d, sdC(x, y, z, -200, -250, -36, -290, -380, -66, 50, 44), 22);                    // the right upper arm in its sleeve
  d += 1.6 * Math.sin(y * 0.045 + Math.sin(x * 0.02) * 2) * (z > -60 ? 1 : 0.3);             // soft folds in the sheet
  return Math.max(d, TABLE_Z - z);
}
const TABLE_Z = -132;
function buildBody() { return isoMesh(bodySDF, -290, -1680, -140, 290, -150, 80, 15); }
function buildForearm() {
  const mb = new MB();
  tubeInto(mb, smoothPath([lerp3(ARM.sh, ARM.el, 0.5), ARM.el, lerp3(ARM.el, ARM.wr, 0.5), ARM.wr], 6), (i, u) => u < 0.45 ? lerp(42, 38, u / 0.45) : lerp(38, 27, (u - 0.45) / 0.55), null, 20, true);
  ellipsoidInto(mb, ARM.hand, 36, 44, 15, 14, 10, (x, y, z) => 1 + 0.1 * Math.max(0, -z));
  return computeNormals(mb.build());
}
// the padded arm board under the forearm
function buildArmBoard() {
  const mb = new MB(); boxInto(mb, [0, 0, 0], [120, 420, 18]);
  const m = mb.build(), R = mMul(mT(-450, -615, -110), mRotAxis([0, 0, 0], [0, 0, 1], -0.62));
  for (let i = 0; i < m.nv; i++) { const q = mApply(R, [m.p[3 * i], m.p[3 * i + 1], m.p[3 * i + 2]]); m.p[3 * i] = q[0]; m.p[3 * i + 1] = q[1]; m.p[3 * i + 2] = q[2]; }
  return computeNormals(m);
}
// ---------------------------------------------------------------- the circulation from the arm to the neck (veins steel blue, arteries red)
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
  circ([[16, -346, 18], [8, -300, 22], [4, -266, 16], [8, -252, 2], [22, -258, -18], [26, -292, -26], [26, -420, -24], [24, -600, -20]], 10, 15.6, 16.4, 'art');
  circ([[3, -258, 12], [-12, -236, 12]], 7, 15.85, 16.0, 'art');
  circ([[-12, -236, 12], [-21, -182, 12], [-23, -150, 8], [-22, -132, -2]], 5, 16.0, 17.6, 'art');
  circ([[-12, -236, 12], [-60, -228, 5], [-120, -242, 0], [-200, -262, -24]], 5, 16.0, 16.6, 'art');
  circ([[10, -254, 6], [18, -200, 10], [22, -150, 6], [22, -132, -2]], 5, 15.9, 17.6, 'art');
  circ([[19, -256, -8], [60, -246, -5], [120, -252, 0], [200, -262, -24]], 5, 15.95, 16.6, 'art');
  for (const sg of [1, -1]) circ([[sg * 52, -246, -4], [sg * 26, -200, -24], [sg * 14, -150, -30], [sg * 12, -132, -30]], 3.6, 16.2, 17.55, 'art');
}
buildCirc();
// meshes of the circulation: one per kind (colour), with arrival times as the attribute
function buildCircMesh(filter) { const mb = new MB(); for (const c of CIRC) if (filter(c)) tubeInto(mb, c.pts, c.r, (i, u) => lerp(c.a0, c.a1, u), c.r > 5 ? 12 : 8); return computeNormals(mb.build()); }
// the heart: the right half (right atrium, right ventricle) and the left half (left atrium, left ventricle with its apex), fused shapes
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
// ---------------------------------------------------------------- the inside of the arm vein (sequence B): the wall, red blood cells, the contrast cloud
function veinAt(u) { // point and tangent along the arm vein, u in [0,1]
  const pts = CIRC[0].pts, n = pts.length - 1, f = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i;
  const p = lerp3(pts[i], pts[i + 1], k), tg = norm3(sub3(pts[i + 1], pts[i])); return { p, tg };
}
function buildRBC() { // a biconcave disc (red blood cell), radius 1
  const mb = new MB(), nu = 16, nv = 8, prof = v => { const r = Math.sin(v * Math.PI / 2); return [r, 0.22 * (1 - Math.pow(r, 2)) + 0.12 * Math.pow(r, 6)]; };
  const base = mb.p.length / 3;
  for (let s = 0; s < 2; s++) for (let j = 0; j <= nv; j++) { const [r, h] = prof(j / nv), y = s ? -Math.max(0.06, 0.35 * r * r * (1 - r) + 0.06) : Math.max(0.06, 0.35 * r * r * (1 - r) + 0.06); for (let i = 0; i < nu; i++) { const a = i / nu * TAU; mb.v(Math.cos(a) * r, y, Math.sin(a) * r, 0, 0, 0); } }
  for (let s = 0; s < 2; s++) for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = base + s * (nv + 1) * nu + j * nu + i, b = base + s * (nv + 1) * nu + j * nu + (i + 1) % nu, c = a + nu, d = b + nu; if (s) { mb.tri(a, b, c); mb.tri(b, d, c); } else { mb.tri(a, c, b); mb.tri(b, c, d); } }
  return computeNormals(mb.build());
}
