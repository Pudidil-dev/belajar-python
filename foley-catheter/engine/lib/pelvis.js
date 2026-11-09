// PELVIS — one adult male pelvis in sagittal section, millimetres, x anterior (screen right), y superior (up), origin at
// the internal urethral orifice (the bladder neck). Signed-distance shapes classify every point: bladder wall and the
// urine inside it, bladder neck, prostate, the urethra (prostatic → membranous through the pelvic floor → bulbar → penile,
// the S-curve of the male urethra), corpus spongiosum and the corpora cavernosa, glans, pubic symphysis, rectum, sacrum,
// and a neutral translucent body shell. Clinical cross-section only: no external detail.
// The film draws it as a 2.5D voxel diorama: the tissue map on a 1.5-mm grid, each tissue raised by its own height and
// extruded toward the upper left (top face flat, side faces one shade darker, a lit edge where a column stands over a lower
// neighbour) — Kurzgesagt's two-tone facets on voxels. The camera maps mm → screen with a scale and a 0° or −90° turn
// (upright section, or the patient lying in bed with the head to the right).
(() => {
const { W, H, P } = PIX;
const PEL = window.PELVIS = { NAME: 'PELVIS' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
// ---------- shapes ----------
const capD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / L2); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); };
const polyD = (x, y, pts) => { let d = 1e9; for (let i = 1; i < pts.length; i++) d = Math.min(d, capD(x, y, pts[i - 1], pts[i])); return d; };
const ell = (x, y, cx, cy, rx, ry, rot = 0) => { const c = Math.cos(rot), s = Math.sin(rot), dx = x - cx, dy = y - cy, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry; return (Math.hypot(u, v) - 1) * Math.min(rx, ry); };
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
// Catmull–Rom resampling of a control polyline (step mm)
const spline = (pts, step = 0.5) => {
  const out = [], Q = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < Q.length - 2; i++) {
    const p0 = Q[i - 1], p1 = Q[i], p2 = Q[i + 1], p3 = Q[i + 2], n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  out.push(pts[pts.length - 1].slice()); return out;
};
PEL.spline = spline;
// the urethra, from the bladder neck to the external meatus (control points)
const UR_C = [[0, 0], [-1, -8], [-3, -18], [-3, -28], [-1, -36], [4, -45], [13, -52], [25, -56], [37, -57], [48, -60], [56, -68], [61, -82], [64, -98], [65, -112], [65, -124]];
const UR = spline(UR_C, 0.5);
PEL.UR = UR; PEL.MEATUS = UR[UR.length - 1];
// the penile shaft's dorsal axis (corpora cavernosa) and the outline of the shaft
const CC = spline([[38, -48], [49, -52], [60, -60], [68, -74], [73, -91], [75, -104]], 1);
const RECT = [[-44, 44], [-46, 10], [-44, -20], [-38, -45], [-30, -62]];
const SACR = [[-76, 76], [-72, 34], [-64, -6], [-54, -36], [-47, -52]];
const BODY = spline([[70, 126], [70, 70], [66, 30], [62, 0], [57, -28], [47, -44], [34, -60], [8, -68], [-26, -74], [-56, -70], [-80, -50], [-94, -14], [-98, 30], [-96, 80], [-92, 126]], 2);
const inPoly = (x, y, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
PEL.bladderSD = (x, y) => smin(ell(x, y, 2, 34, 36, 30), capD(x, y, [0, 2], [0, 16]) - 7, 10);
const C = PEL.C = { OUT: 0, SHELL: 1, MUSCLE: 2, WALL: 3, URINE: 4, PROST: 5, LUMEN: 6, SPONG: 7, CAV: 8, GLANS: 9, SKIN: 10, BONE: 11, RWALL: 12, RLUM: 13, SACR: 14, NECK: 15 };
PEL.cls = (x, y) => {
  const dU = polyD(x, y, UR);
  if (dU < 1.4) return C.LUMEN;
  const bl = PEL.bladderSD(x, y);
  if (bl < 0) return C.URINE;
  if (bl < 4.5) return y < 8 && Math.abs(x) < 16 ? C.NECK : C.WALL;
  if (ell(x, y, -3, -16, 17, 14) < 0) return C.PROST;
  // the penis: glans, corpus spongiosum round the urethra, the paired corpora cavernosa on the dorsal (anterior) side, skin
  const below = y < -40;
  if (ell(x, y, 67, -115, 11, 13) < 0) return C.GLANS;
  if (below && dU < (y > -58 && x < 22 ? 10 : 6.2)) return C.SPONG;
  const dC = polyD(x, y, CC);
  if (dC < 8.2 && y < -46) return C.CAV;
  if (((dC < 10.8 || (dU < 8.8 && y < -60)) && y < -46 && x > 30) || (ell(x, y, 66, -115, 13, 15) < 0)) return C.SKIN;
  if (ell(x, y, 33, -14, 8, 22, -0.35) < 0) return C.BONE;
  const dR = polyD(x, y, RECT); if (dR < 6) return C.RLUM; if (dR < 11.5) return C.RWALL;
  if (polyD(x, y, SACR) < 6) return C.SACR;
  if (Math.abs(y - (-37 + 0.12 * x)) < 3.6 && x > -46 && x < 26) return C.MUSCLE;
  if (inPoly(x, y, BODY)) return C.SHELL;
  return C.OUT;
};
// relief (voxels) and colours (top, side, lit edge)
const HT = [0, 0, 3, 5, 1, 4, 0, 4, 4, 4, 4, 6, 4, 1, 5, 5];
const COL = [null, ['n3', null, 'n4'], ['z2', 'z1', 'z3'], ['z3', 'z1', 'z4'], ['f2', 'f0', 'f3', 'liquid'], ['x2', 'x0', 'x3'], ['k', null, 'k'], ['z4', 'z2', 'z5'], ['z3', 'z1', 'z4'],
  ['z4', 'z2', 'z5'], ['z5', 'z3', 'q6'], ['q4', 'q2', 'q6'], ['u2', 'u0', 'u3'], ['u0', null, 'u1'], ['q3', 'q1', 'q5'], ['z2', 'z0', 'z3']];
PEL.HT = HT; PEL.COL = COL;
// ---------- the voxel diorama: any class map on a grid, drawn as raised columns ----------
// map = {cells (non-empty, with their lit edges), grid, NX, NY, VS, X0, Y0, HT, COL, order cache}
PEL.buildMap = (cls, X0, X1, Y0, Y1, VS, HTs, COLs) => {
  const NX = Math.round((X1 - X0) / VS), NY = Math.round((Y1 - Y0) / VS), grid = new Uint8Array(NX * NY), cells = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) grid[j * NX + i] = cls(X0 + (i + 0.5) * VS, Y0 + (j + 0.5) * VS);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const k = grid[j * NX + i]; if (!k) continue;
    const h = HTs[k], at = (di, dj) => { const ii = i + di, jj = j + dj; return ii < 0 || jj < 0 || ii >= NX || jj >= NY ? 0 : HTs[grid[jj * NX + ii]]; };
    cells.push({ i, j, k, h, lx: at(-1, 0) < h, ly: at(0, 1) < h, x: X0 + i * VS, y: Y0 + j * VS });
  }
  return { cells, grid, NX, NY, VS, X0, Y0, HT: HTs, COL: COLs, order: null, orderRot: null, shellK: 1 };
};
const VS = PEL.VS = 2.0;
let MAP = null;
PEL.init = () => {
  const t0 = performance.now();
  MAP = PEL.MAP = PEL.buildMap(PEL.cls, -102, 92, -152, 128, VS, HT, COL);
  console.log(`PELVIS: ${MAP.cells.length} cells in ${Math.round(performance.now() - t0)} ms`);
};
PEL.cellAt = (x, y) => { const m = MAP, i = Math.floor((x - m.X0) / m.VS), j = Math.floor((y - m.Y0) / m.VS); return i < 0 || j < 0 || i >= m.NX || j >= m.NY ? 0 : m.grid[j * m.NX + i]; };
// ---------- camera: cam = {x, y (world mm at the screen centre), s (px/mm), rot (0 or ±π/2), cx, cy (screen centre)} ----------
PEL.S = (cam, x, y) => {
  const dx = x - cam.x, dy = y - cam.y, r = cam.rot || 0, c = Math.cos(r), s = Math.sin(r);
  const X = dx * c - dy * s, Y = dx * s + dy * c;
  return [(cam.cx ?? W / 2) + X * cam.s, (cam.cy ?? H / 2) - Y * cam.s];
};
// o = {shell (0..1), relief (1), dim(k) → 0..1 extra darkening per class, hide: Set of classes, t (urine shimmer), clip [x0, y0, x1, y1]}
PEL.drawMap = (c, cam, map, o = {}) => {
  const r = cam.rot || 0, VSm = map.VS, COLm = map.COL;
  if (map.orderRot !== r) {                                       // painter's order: the extrusion runs to the upper left, so draw by sx + sy
    const cr = Math.cos(r), sr = Math.sin(r);
    map.order = map.cells.slice().sort((a, b) => ((a.x * cr - a.y * sr) - (a.x * sr + a.y * cr)) - ((b.x * cr - b.y * sr) - (b.x * sr + b.y * cr)));
    map.orderRot = r;
  }
  const cs = VSm * cam.s, ex = -0.38 * cs * (o.relief ?? 1), ey = -0.52 * cs * (o.relief ?? 1), m = cs * 7 + 4, size = Math.ceil(cs) + 1;
  const shellA = o.shell ?? 0.3, t = o.t || 0, grid = cs >= 4, cl = o.clip || [-m, -m, W + m, H + m];
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  if (o.clip) { c.beginPath(); c.rect(cl[0], cl[1], cl[2] - cl[0], cl[3] - cl[1]); c.clip(); }
  for (const e of map.order) {
    if (o.hide && o.hide.has(e.k)) continue;
    const [ax, ay] = PEL.S(cam, e.x, e.y + VSm), [bx, by] = PEL.S(cam, e.x + VSm, e.y);
    const sx = Math.min(ax, bx), sy = Math.min(ay, by);
    if (sx > cl[2] + m || sy > cl[3] + m || sx < cl[0] - m - cs || sy < cl[1] - m - cs) continue;
    const col = COLm[e.k];
    if (e.k === map.shellK) { if (shellA <= 0) continue; c.globalAlpha = shellA; c.fillStyle = P[col[0]]; c.fillRect(Math.floor(sx), Math.floor(sy), size, size); c.globalAlpha = 1; continue; }
    const h = e.h;
    if (h > 0 && col[1]) { c.fillStyle = P[col[1]]; for (let L = 0; L < h; L++) c.fillRect(Math.floor(sx + L * ex), Math.floor(sy + L * ey), size, size); }
    const tx = Math.floor(sx + h * ex), ty = Math.floor(sy + h * ey);
    let top = col[0];
    if (col[3] === 'liquid') { const n = K.vn3(e.i * 0.22, e.j * 0.22 + t * 0.4, t * 0.6, 5); top = n > 0.74 ? 'f3' : 'f2'; }
    c.fillStyle = P[top]; c.fillRect(tx, ty, size, size);
    if (o.dim && o.dim(e.k) > 0) { c.globalAlpha = o.dim(e.k); c.fillStyle = P.k; c.fillRect(tx, ty, size, size); c.globalAlpha = 1; }
    if (grid && h > 0) {
      c.fillStyle = P[col[2]];
      if (r === 0) { if (e.lx) c.fillRect(tx, ty, 1, size - 1); if (e.ly) c.fillRect(tx, ty, size - 1, 1); }
      c.fillStyle = P[col[1] || col[0]]; c.fillRect(tx + size - 1, ty + 1, 1, size - 1); c.fillRect(tx + 1, ty + size - 1, size - 1, 1);
    }
  }
  c.restore();
};
PEL.draw = (c, cam, o = {}) => { if (MAP) PEL.drawMap(c, cam, MAP, o); };
// the screen offset of a feature sitting on top of a tissue of relief h (so devices lie in the raised section, not under it)
PEL.lift = (cam, h, o = {}) => { const cs = VS * cam.s; return [-0.38 * cs * h * (o.relief ?? 1), -0.52 * cs * h * (o.relief ?? 1)]; };
})();
