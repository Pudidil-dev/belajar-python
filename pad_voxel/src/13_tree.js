'use strict';
// ============================================================================
// THE ARTERIAL TREE AND THE LESION MAP (world mm: y up from the floor, x toward
// the patient's LEFT, z forward). Calibres are drawn 2.3x real so the small
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
const EXG = 2.3;
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
// ---------------------------------------------------------------- materials
const M_WALL = mat('wall', ['#0B3442', '#17627A', '#2E97B4', '#46C6E6', '#9AE6F6'], { speck: 0.08 });
const M_WALLG = mat('wallGhost', ['#0B3442', '#17627A', '#2E97B4', '#46C6E6', '#9AE6F6'], { ol: 0 });
const M_PLQ = mat('plaque', ['#5A3208', '#A0600E', '#E08A1F', '#F0A93B', '#FFD27A'], { speck: 0.2 });
const M_CAL = mat('calcium', ['#7D858F', '#B8C0C8', '#DCE2E8', '#F2F4F6', '#FFFFFF'], { speck: 0.1 });
const M_OCC = mat('occlusion', ['#3A1A08', '#6E3410', '#A85418', '#D9782A', '#F0A060'], { speck: 0.25 });
const M_BLD = mat('lumenBlood', ['#3A0C14', '#6A1824', '#A8323E', '#C9505A', '#E07E86']);
const M_CON = mat('contrast', ['#4A7FA6', '#8DBBDC', '#CDEBFF', '#E8F6FF', '#FFFFFF']);
const M_HOT = mat('diseaseHi', ['#5A1408', '#A3260E', '#E4572E', '#FF8A5C', '#FFC2A6']);
// CTA grayscale (lumen with contrast, calcium brightest, bone mid grey)
const M_CTL = mat('ctaLumen', ['#5C5C5C', '#8E8E8E', '#BDBDBD', '#D9D9D9', '#EFEFEF']);
const M_CTC = mat('ctaCalcium', ['#9A9A9A', '#D0D0D0', '#F4F4F4', '#FFFFFF', '#FFFFFF'], { olc: '#202020' });
const M_BONE = mat('bone', ['#1E2730', '#3B4652', '#5E6976', '#808A96', '#A6AFB8'], { speck: 0.12 });
const M_CTB = mat('ctaBone', ['#202020', '#3A3A3A', '#565656', '#727272', '#909090'], { speck: 0.12 });
// ---------------------------------------------------------------- building the grids
// opts.normal: the teaching model (no lesions); opts.legs: ['R'] / ['L'] / ['R','L']; opts.aorta; opts.rk: extra calibre factor
function buildTree(o) {
  o = o || {};
  const vs = o.vs || 2, legs = o.legs || ['R', 'L'], RK = o.rk || 1;
  const xmin = legs.includes('R') ? -135 : -20, xmax = legs.includes('L') ? 135 : 20;
  const wall = new VoxGrid(xmin, 0, -100, xmax, o.aorta === false ? 940 : 1190, 160, vs);
  const lum = new VoxGrid(xmin, 0, -100, xmax, o.aorta === false ? 940 : 1190, 160, vs);
  lum.aux = new Float32Array(lum.d.length).fill(-1);
  for (const k in ART) {
    const a = ART[k], tag = k[0];
    if (k !== 'AO' && !legs.includes(tag)) continue;
    if (k === 'AO' && o.aorta === false) continue;
    const name = k, gen = isGen(name), occl = !o.normal && name === 'RPOP';
    const lr = y => o.normal ? 1 : lumenK(name, y);
    // the eccentric L1 plaque pushes the channel toward the front-outer side
    const ecc = (y, r, k) => (!o.normal && name === 'RSFA' && Math.abs(y - LES.L1.yc) < 40) ? (1 - k) * 0.42 * r : 0;
    const EC = norm3([-0.6, 0, 0.8]);
    // collaterals: thin pre-existing channels; on the right leg they enlarge (collat 0..1) around the block
    const gk = gen ? ((!o.normal && tag === 'R') ? (o.collat === undefined ? 1 : o.collat) : 0) : 1;
    const calib = p => (gen ? p * lerp(0.55, 1, gk) : p) * RK;
    const pts = a.pts.map(p => [p[0], p[1], p[2], calib(p[3])]);
    wall.tube(pts, (s, x, y, z, d, r, cur, dx, dy, dz) => {
      if (cur && cur !== M_WALL) return 0;
      if (occl && y < LES.L2.y0 && y > LES.L2.y1) return d > r * 0.72 ? M_WALL : (hash3(Math.round(x / 2), Math.round(y / 2), Math.round(z / 2)) < 0.14 ? M_CAL : M_OCC);
      if (d > r * 0.72) {                                                 // the wall itself (media / adventitia)
        if (!o.normal && MEDCAL[name] && y > MEDCAL[name][0] && y < MEDCAL[name][1] && (Math.floor(y / 6) % 3 === 0) && hash3(Math.round(x), Math.round(y / 3), Math.round(z)) < 0.55) return M_CAL;   // medial calcification: its own layer
        return M_WALL;
      }
      const k = lr(y); if (k >= 0.98) return 0;
      const e = ecc(y, r * 0.74, k), qx = dx - EC[0] * e, qy = dy - EC[1] * e, qz = dz - EC[2] * e, dq = Math.sqrt(qx * qx + qy * qy + qz * qz);
      if (dq <= r * 0.74 * k) return 0;                                   // the open channel
      const cal = hash3(Math.round(x / 2), Math.round(y / 2), Math.round(z / 2)) < (name === 'RSFA' ? 0.26 : 0.1) && d > r * 0.45;
      return cal ? M_CAL : M_PLQ;                                         // plaque (with calcium) inside the wall
    });
    // lumen column (separate grid so it can show through a see-through wall); aux = arc length from the aorta
    const lumPts = a.pts.map(p => [p[0], p[1], p[2], calib(p[3]) * 0.74]);
    lum.tube(lumPts, (s, x, y, z, d, r, cur, dx, dy, dz) => {
      const k = lr(y); if (k <= 0.001) return 0;
      const e = ecc(y, r, k), qx = dx - EC[0] * e, qy = dy - EC[1] * e, qz = dz - EC[2] * e;
      if (Math.sqrt(qx * qx + qy * qy + qz * qz) > r * k) return 0;
      const seg = Math.floor(s), h = s - seg, arc = a.s0 + lerp(a.cum[seg], a.cum[Math.min(seg + 1, a.cum.length - 1)], h);
      const i = Math.floor((x - lum.ox) / lum.vs), j = Math.floor((y - lum.oy) / lum.vs), kk = Math.floor((z - lum.oz) / lum.vs), id = lum.idx(i, j, kk);
      const v = arc + (gen ? 140 : 0);
      if (lum.aux[id] < 0 || v < lum.aux[id]) lum.aux[id] = v;
      return M_BLD;
    }, Math.max(...a.pts.map(p => p[3])) * 0.3);
  }
  // the popliteal below the occlusion is refilled by the collaterals: its arrival distance is via them
  if (!o.normal) for (let id = 0; id < lum.d.length; id++) {
    if (!lum.d[id]) continue;
    const j = Math.floor(id / lum.nx) % lum.ny, y = lum.oy + (j + 0.5) * lum.vs, i = id % lum.nx, x = lum.ox + (i + 0.5) * lum.vs;
    if (x < 0 && y < LES.L2.y1 + 2 && y > 20) lum.aux[id] += 160;          // right leg, distal to the block: later (via collaterals)
  }
  return { wall, lum };
}
// mesh with the arrival distance per face (lumen) so the contrast front can be drawn
function meshWithArc(g) {
  const M = voxMesh(g); if (!g.aux) return M;
  const fk = new Float32Array(M.nf);
  for (let q = 0; q < M.nf; q++) {
    const x = M.fc[3 * q], y = M.fc[3 * q + 1], z = M.fc[3 * q + 2], d = M.fd[q], dv = DIRV[d];
    const i = Math.floor((x - dv[0] * 0.25 * g.vs - g.ox) / g.vs), j = Math.floor((y - dv[1] * 0.25 * g.vs - g.oy) / g.vs), k = Math.floor((z - dv[2] * 0.25 * g.vs - g.oz) / g.vs);
    fk[q] = g.aux[g.idx(clamp(i, 0, g.nx - 1), clamp(j, 0, g.ny - 1), clamp(k, 0, g.nz - 1))];
  }
  M.fk = fk; return M;
}
// meshes: wall shell (faces wherever a wall cube meets anything that is not wall), the disease inside it
// (plaque, calcium, occlusion: faces toward the lumen space and toward the wall), and the lumen cast
function treeMeshes(t) {
  return {
    wall: voxMesh(t.wall, { emit: m => m === M_WALL, solidFn: m => m === M_WALL }),
    wallAll: voxMesh(t.wall),
    inner: voxMesh(t.wall, { emit: m => m !== M_WALL, solidFn: m => m !== M_WALL && m > 0 }),
    lum: meshWithArc(t.lum),
  };
}
// whole-tree views draw the calibres 1.5x more again (3.45x real) so the tibial arteries stay readable on a phone
const TREE_RK = 1.5;
const TREE = () => cached('tree', () => treeMeshes(buildTree({ rk: TREE_RK })));
const TREE_N = () => cached('treeN', () => treeMeshes(buildTree({ normal: true, legs: ['R'], aorta: false, rk: TREE_RK })));
const TREE_R = () => cached('treeR', () => treeMeshes(buildTree({ legs: ['R'], aorta: false, rk: TREE_RK })));
// ---------------------------------------------------------------- bones (for the CTA display and the leg)
function buildBones(vs) {
  const g = new VoxGrid(-150, 0, -110, 150, 1080, 170, vs || 4);
  for (const sx of [-1, 1]) {
    const X = x => x * -sx;
    g.tube([[X(-92), 868, -12, 22], [X(-104), 840, -10, 15], [X(-86), 800, -6, 15], [X(-70), 600, 0, 13], [X(-68), 520, 0, 16], [X(-72), 492, 2, 24]], M_BONE);     // femur
    g.paint(X(-92) - 26, 846, -36, X(-92) + 26, 892, 14, (x, y, z) => Math.hypot(x - X(-92), y - 868, z + 12) < 24 ? M_BONE : 0);                                     // femoral head
    g.tube([[X(-74), 470, 0, 25], [X(-72), 440, 4, 20], [X(-70), 330, 8, 13], [X(-68), 120, 8, 11], [X(-64), 82, 10, 16]], M_BONE);                                     // tibia
    g.tube([[X(-104), 452, -10, 8], [X(-104), 400, -12, 6], [X(-106), 200, -12, 5], [X(-108), 82, -8, 9]], M_BONE);                                                     // fibula
    g.paint(X(-74) - 14, 485, 26, X(-74) + 14, 525, 46, (x, y, z) => sdE(x, y, z, X(-74), 505, 36, 13, 18, 8) < 0 ? M_BONE : 0);                                          // patella
    g.paint(X(-70) - 40, 0, -50, X(-70) + 40, 80, 175, (x, y, z) => {                                                                                                     // foot: heel, arch, metatarsal rays
      const heel = sdE(x, y, z, X(-68), 34, -18, 20, 26, 26), arch = sdC(x, y, z, X(-68), 46, 0, X(-72), 26, 96, 18, 13);
      let rays = 1e9; for (let r = 0; r < 4; r++) rays = Math.min(rays, sdC(x, y, z, X(-70) + (r - 1.5) * 9 * (sx < 0 ? -1 : 1), 24, 92, X(-70) + (r - 1.5) * 11 * (sx < 0 ? -1 : 1), 10, 158, 4.5, 3.5));
      return Math.min(heel, arch, rays) < 0 ? M_BONE : 0;
    });
  }
  // pelvis: two curved iliac blades, the sacrum, the acetabular rims and the pubic / ischial rami around the obturator openings
  g.paint(-150, 820, -110, 150, 1040, 70, (x, y, z) => {
    const ax = Math.abs(x);
    const bladeOuter = sdE(ax, y, z, 54, 978, -30, 50, 60, 50), bladeInner = sdE(ax, y, z, 52, 982, -26, 43, 54, 43);
    const blade = Math.max(bladeOuter, -bladeInner, -(y - 912), -(ax - 44), z - 22);             // the flaring lateral wall of the bowl (iliac blade)
    const acet = Math.max(sdE(ax, y, z, 90, 868, -12, 30, 30, 30), -sdE(ax, y, z, 92, 868, -6, 24, 24, 26));   // cup around the femoral head
    const ramus = Math.max(sdE(ax, y, z, 50, 852, 10, 40, 30, 18), -sdE(ax, y, z, 52, 852, 10, 22, 16, 30), -(y - 822));
    const sacrum = sdE(x, y, z, 0, 935, -82, 34, 70, 18);
    const d = Math.min(blade, acet, ramus, sacrum);
    return d < 0 ? M_BONE : 0;
  });
  return g;
}
const BONES = () => cached('bones', () => voxMesh(buildBones(4)));
