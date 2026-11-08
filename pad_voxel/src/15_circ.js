'use strict';
// ============================================================================
// THE CONTRAST'S ROUTE (scene 15), as a simplified anatomical diagram in the
// standing anatomical position (tree coordinates: x patient-left, y up, z
// forward): left arm vein → subclavian → superior vena cava → right atrium →
// right ventricle → pulmonary arteries → lungs → pulmonary veins → left atrium
// → left ventricle → aorta → abdominal aorta (where the leg tree begins).
// The white-blue colour is a teaching overlay: contrast does not glow.
// ============================================================================
const M_VEIN = mat('vein', ['#141C2E', '#22304A', '#33486A', '#48628A', '#6680A8']);
const M_HEART = mat('heart', ['#3A1016', '#6A2028', '#97343C', '#B44C52', '#CC7076'], { speck: 0.06 });
const M_LUNG = mat('lung', ['#3A2A30', '#5E444C', '#866470', '#A68490', '#C6A8B2'], { speck: 0.04, ol: 0 });
const M_BODYG = mat('bodyGhost', ['#1A2A3A', '#24384C', '#30485E', '#3E5A72', '#506E88'], { ol: 0 });
// the route as one polyline (arc length = arrival order)
const ROUTE = [
  [300, 1100, 25, 6], [262, 1260, 10, 6.5], [210, 1420, 0, 7.5], [120, 1468, 10, 8.5], [45, 1452, 22, 10], [-18, 1420, 22, 11],   // arm vein → SVC
  [-38, 1360, 30, 15], [-8, 1318, 52, 15],                                                                                           // right atrium, right ventricle
  [14, 1400, 44, 10], [60, 1420, 20, 7], [112, 1400, 0, 6], [96, 1380, -10, 6], [40, 1372, -12, 8],                                // pulmonary loop (left lung) and back
  [22, 1366, -8, 14], [42, 1318, 28, 15],                                                                                            // left atrium, left ventricle
  [8, 1420, 30, 11], [-6, 1486, 4, 11], [-10, 1420, -38, 10], [-4, 1300, -44, 10], [0, 1180, -40, 9.5],                             // aorta: ascending, arch, descending
];
const ROUTE_CUM = (() => { const c = [0]; for (let i = 1; i < ROUTE.length; i++) c.push(c[i - 1] + Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1], ROUTE[i][2] - ROUTE[i - 1][2])); return c; })();
const ROUTE_LEN = ROUTE_CUM[ROUTE_CUM.length - 1];
function routeAt(s) { s = clamp(s, 0, ROUTE_LEN); let i = 0; while (i + 2 < ROUTE_CUM.length && ROUTE_CUM[i + 1] < s) i++; const f = (s - ROUTE_CUM[i]) / Math.max(1e-6, ROUTE_CUM[i + 1] - ROUTE_CUM[i]); return [lerp(ROUTE[i][0], ROUTE[i + 1][0], f), lerp(ROUTE[i][1], ROUTE[i + 1][1], f), lerp(ROUTE[i][2], ROUTE[i + 1][2], f)]; }
function buildCirc() {
  const vs = 4, C = {};
  // vessels of the route (with arrival distance) — the right lung's pulmonary branch mirrors the left one
  const g = new VoxGrid(-200, 1080, -120, 360, 1540, 130, vs); g.aux = new Float32Array(g.d.length).fill(-1);
  const paintPath = (pts, mat0, s0) => {
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
    g.tube(pts, (s, x, y, z, d, r) => { const seg_ = Math.floor(s), h = s - seg_, arc = s0 + lerp(cum[seg_], cum[Math.min(seg_ + 1, cum.length - 1)], h); const id = g.idx(Math.floor((x - g.ox) / vs), Math.floor((y - g.oy) / vs), Math.floor((z - g.oz) / vs)); if (g.aux[id] < 0 || arc < g.aux[id]) g.aux[id] = arc; return mat0(arc); });
  };
  paintPath(ROUTE.map(p => [p[0], p[1], p[2], p[3]]), arc => arc < ROUTE_CUM[6] ? M_VEIN : arc < ROUTE_CUM[15] ? M_HEART : M_ART, 0);
  paintPath([[14, 1400, 44, 9], [-50, 1418, 20, 7], [-108, 1400, 0, 6], [-92, 1380, -10, 6], [10, 1370, -12, 8]].map(p => p), () => M_HEART, ROUTE_CUM[8]);
  C.vessels = meshWithArc(g);
  // heart chambers and lungs (solid shapes) — the heart is coloured by the front too (aux = arrival distance)
  const h = new VoxGrid(-200, 1180, -120, 200, 1560, 130, vs); h.aux = new Float32Array(h.d.length).fill(-1);
  h.paint(-200, 1180, -120, 200, 1560, 130, (x, y, z) => {
    const ra = sdE(x, y, z, -38, 1360, 30, 30, 34, 30), rv = sdE(x, y, z, -8, 1318, 52, 34, 36, 30), la = sdE(x, y, z, 22, 1366, -8, 30, 30, 28), lv = sdE(x, y, z, 42, 1318, 28, 32, 40, 30);
    const hd = Math.min(ra, rv, la, lv);
    if (hd < 0) { const id = h.idx(Math.floor((x - h.ox) / vs), Math.floor((y - h.oy) / vs), Math.floor((z - h.oz) / vs)); h.aux[id] = ra < 0 ? ROUTE_CUM[6] : rv < 0 ? ROUTE_CUM[7] : la < 0 ? ROUTE_CUM[13] : ROUTE_CUM[14]; return M_HEART; }
    return 0;
  });
  C.heart = meshWithArc(h);
  const lg = new VoxGrid(-200, 1220, -110, 200, 1580, 110, 6);
  lg.paint(-200, 1220, -110, 200, 1580, 110, (x, y, z) => { const ax = Math.abs(x), l = sdE(ax, y, z, 112, 1410, -6, 70, 150, 78); return l < 0 && !(ax < 60 && y < 1420) ? M_LUNG : 0; });
  C.lungs = voxMesh(lg);
  // a ghost of the trunk and the left arm for orientation
  const bg = new VoxGrid(-260, 980, -150, 400, 1620, 150, 10);
  bg.paint(-260, 980, -150, 400, 1620, 150, (x, y, z) => {
    const trunk = smin(sdE(x, y, z, 0, 1350, -6, 190, 260, 125), sdE(x, y, z, 0, 1110, -10, 170, 150, 115), 60), arm = sdC(x, y, z, 220, 1480, 0, 300, 1080, 30, 58, 44);
    const d = Math.min(trunk, arm); return d < 0 && d > -12 ? M_BODYG : 0;
  });
  C.ghost = voxMesh(bg);
  return C;
}
const CIRC = () => cached('circ', buildCirc);
// draw with the contrast front at route distance s
function drawCirc(cam, s, o) {
  o = o || {};
  const C = CIRC(), front = (m, k) => k >= 0 && k < s ? MAT[M_CON].r : MAT[m].r;
  drawVox(cam, C.lungs, null, { alpha: 0.38 });
  drawVoxK(cam, C.heart, front);
  drawVoxK(cam, C.vessels, front);
  drawVox(cam, C.ghost, null, { alpha: o.ghost === undefined ? 0.16 : o.ghost });
}
