'use strict';
// ============================================================================
// THE ARTERY, CUT LENGTHWISE (scenes 4-11) — CTA-film 3D with a pixel-art cut
// face. Local units (a red cell is ~9 across); the axis runs along x, the
// front half (z > 0) is cut away. In 3D: the lining of the back half (softly
// lit, a little plasma haze with depth), red cells as glossy biconcave discs,
// white cells, lipid particles, a macrophage that fills into a foam cell, the
// collateral side channels. In 2D pixel art on the cut face (crisp at every
// zoom): the wall's layers — endothelium with its nuclei, the wavy internal
// elastic lamina, the banded smooth-muscle media, the fibrous adventitia — and
// the disease inside the wall: a fibrous cap over a yellow lipid core with
// cholesterol clefts, opaque white calcium, and the occluded segment filled
// end to end while the wall's layers continue on both sides.
// Disease is a state: g (plaque 0..1), cal, sick (endothelial dysfunction),
// occ {xc, w} (the block). Blood: red cells on streamlines (same flux → faster
// in the narrowing), pulsing at 80 beats a minute; glucose stays dissolved.
// ============================================================================
const AR = { L: 640, RL: 22, RI: 23, RIEL: 24, RM: 30, RO: 35, XS: -95, WS: 34, XO: 105, WO: 40 };
// lumen narrowing at x for plaque growth g: [scale k (0..1), shift s of the channel centre toward +y]
function plaqueAt(x, g, xc, w) { const u = (x - (xc || 0)) / (w || 34), b = Math.exp(-u * u * 1.6); return [1 - 0.66 * g * b, 0.42 * AR.RL * g * b]; }
function occAt(x, o) { if (!o) return 1; const a = Math.abs(x - (o.xc || 0)) / (o.w || 40); return a < 1 ? 0 : a < 1.35 ? (a - 1) / 0.35 : 1; }
function chanAt(x, st) { const p = plaqueAt(x, st.g || 0, st.xc, st.w); return [p[0] * occAt(x, st.occ), p[1]]; }
const wallSurfY = (x, st) => { const c = chanAt(x, st); return c[1] - AR.RL * c[0]; };   // channel edge on the plaque side (−y)
// ---------------------------------------------------------------- colours
const MR = {
  lining: ['#2E0E18', '#5A2030', '#94404E', '#C86A74', '#EC9EA0'].map(hexc),
  outer: ['#2E1A16', '#5A3428', '#8C5A44', '#B78466', '#D8AA88'].map(hexc),
  rbc: [P.BL1, P.BL2, P.AR2, P.AR3, P.AR4], wbc: ['#5A5470', '#8C86A4', '#C2BCD6', '#E6E2F2', '#FAF8FF'].map(hexc),
  nuc: ['#2E1E48', '#4E3878', '#6E56A0', '#9078C0'].map(hexc), ldl: ['#6A4A06', '#B08A18', '#F0C030', '#FFE08A'].map(hexc),
  mac: ['#5E4E3A', '#8E7A5E', '#BCA888', '#DCCCB0', '#F2E8D6'].map(hexc), foam: ['#7A5A10', '#C09A30', '#F0D060', '#FFF0A8'].map(hexc),
  col: ['#5A2030', '#94404E', '#C86A74', '#EC9EA0', '#FFD0D0'].map(hexc), colIn: ['#4E1A28', '#7E3242', '#AC5260'].map(hexc),
};
const CX_ = {}; for (const [k, v] of Object.entries({
  ol: '#1E0C10', adv: '#A87460', adv2: '#B98670', advF: '#DDB094', advN: '#4E2E28',
  med: '#C25E66', med2: '#AE5058', medN: '#4A1E30', iel: '#FFF2EC', ielS: '#E8C8C4',
  endo: '#F2B8B8', endoN: '#6E2E40', sick: '#E8823A', sickN: '#7A3A10', sickG: '#C8682A',
  cap: '#F4E2D4', cap2: '#E4C8B6', fib: '#D8A88E', core: '#E8B630', core2: '#F6D262', coreD: '#C8901C', clef: '#FFF8E0',
  cal: '#F2F4F6', calD: '#B8C0C8', calO: '#3A4048', occ: '#C27236', occ2: '#D8944E', occD: '#86441C',
})) CX_[k] = hexc(v);
// calcium nodules (model x, y, radius) in the plaque (near the internal elastic lamina) and in the block
const CAL_PLQ = [[AR.XS - 14, -19.5, 2.4], [AR.XS + 2, -20.2, 3.0], [AR.XS + 17, -19, 2.2], [AR.XS + 30, -20.4, 1.8], [AR.XS - 28, -20.6, 1.6]];
const CAL_OCC = [[AR.XO - 22, -8, 3.2], [AR.XO + 6, 6, 2.6], [AR.XO + 24, -4, 3.4], [AR.XO - 6, 14, 2.0], [AR.XO + 30, 13, 2.2], [AR.XO - 30, 8, 1.8]];
function calPix(x, y, list, k) {   // white nodule with a grey lower-right shade and a dark rim
  for (const [cx, cy, r0] of list) {
    const r = r0 * k; if (r <= 0.2) continue;
    const dx = (x - cx) / r, dy = (y - cy) / (r * 0.75), q = dx * dx + dy * dy;
    if (q < 1) return q > 0.72 ? CX_.calO : (dx + dy > 0.55 ? CX_.calD : CX_.cal);
  }
  return 0;
}
// ---------------------------------------------------------------- the cut face: one pixel-art colour per model point (x, y) at z = 0
function cutPix(x, y, st) {
  const r = Math.abs(y);
  if (r > AR.RO) return 0;
  if (r > AR.RO - 0.4) return CX_.ol;
  if (r > AR.RM) {                                                     // adventitia: wavy collagen, fibroblast nuclei
    if (((r + 0.9 * Math.sin(x * 0.21 + r)) % 1.7 + 1.7) % 1.7 < 0.42) return CX_.advF;
    const ci = Math.floor(x / 7), cj = Math.floor(r / 1.6), fx = ((x % 7) + 7) % 7 - 3.5;
    if (hash2(ci, cj) < 0.14 && Math.abs(fx) < 1.6 && Math.abs((r % 1.6) - 0.8) < 0.35) return CX_.advN;
    return hash2(Math.floor(x / 3), Math.floor(r / 1.2)) < 0.3 ? CX_.adv2 : CX_.adv;
  }
  const wv = 0.3 * Math.sin(x * 0.95);
  if (r > AR.RIEL + wv) {                                              // media: bands of smooth muscle, rod-like nuclei across the axis
    const bi = Math.floor(x / 2.3), fx = ((x % 2.3) + 2.3) % 2.3;
    if (hash2(bi, Math.floor((r + bi * 0.7) / 2.6)) < 0.32 && Math.abs(fx - 1.15) < 0.42 && ((r + bi * 0.7) % 2.6) > 0.5) return CX_.medN;
    return bi & 1 ? CX_.med2 : CX_.med;
  }
  if (r > AR.RI + wv) return r > AR.RIEL + wv - 0.35 ? CX_.ielS : CX_.iel;   // internal elastic lamina (a bright wavy line)
  // inside the lamina: the channel (transparent: the lining behind it shows), the intima, the plaque or the block
  const c = chanAt(x, st), rho = AR.RL * c[0], s = c[1], dy = y - s;
  if (Math.abs(dy) < rho) return 0;
  const u = Math.abs(dy) - rho;                                        // depth below the channel surface
  const occK = occAt(x, st.occ);
  if (st.occ && occK < 1) {                                            // the occluded segment: organised plaque filling the channel
    const cp = calPix(x, y, CAL_OCC, 1); if (cp) return cp;
    if (u < 0.8 && rho > 0.5) return CX_.cap2;
    if (((y + 0.7 * Math.sin(x * 0.27)) % 2.6 + 2.6) % 2.6 < 0.55) return CX_.occ2;
    return hash2(Math.floor(x / 1.6), Math.floor(y / 1.6)) < 0.07 ? CX_.occD : CX_.occ;
  }
  const side = dy < 0 ? -1 : 1, T = side < 0 ? AR.RI + s - rho : AR.RI - s - rho;   // thickness of the intima on this side
  const cellX = ((x % 7) + 7) % 7, ci = Math.floor(x / 7);
  const sickCell = st.sick > 0 && side < 0 && Math.abs(x - (st.xc || 0)) < 70 && hash2(ci, 3) < st.sick * 0.85;
  if (u < 0.95) {                                                      // endothelium: flat cells with nuclei; orange when dysfunctional
    if (cellX < 0.45) return sickCell ? CX_.sickN : CX_.endoN;
    if (Math.abs(cellX - 3.5) < 1.1 && u > 0.25) return sickCell ? CX_.sickN : CX_.endoN;
    return sickCell ? (hash2(ci, 9) < 0.5 ? CX_.sick : CX_.sickG) : CX_.endo;
  }
  if (T < 2.5) return CX_.endo;                                        // the normal intima is only a thin layer
  const cp = side < 0 ? calPix(x, y, CAL_PLQ, st.cal || 0) : 0; if (cp) return cp;
  const capT = 1.1 + 2.4 * (st.g || 0), v = AR.RI - r;                 // v: height above the lamina
  if (u < 0.95 + capT) return ((x + 2 * u) % 3.2 + 3.2) % 3.2 < 1.1 ? CX_.cap2 : CX_.cap;   // fibrous cap
  if (T > 6.5 && v > 1.1 && u > 1.8 + capT) {                           // lipid core with cholesterol clefts
    const cl = ((x * 0.55 + y * 1.0) % 5.2 + 5.2) % 5.2, cb = Math.floor((x * 0.55 + y) / 5.2);
    if (cl < 0.42 && hash2(cb, Math.floor(x / 9)) < 0.55) return CX_.clef;
    const n = hash2(Math.floor(x / 2.2), Math.floor(y / 2.2));
    return n < 0.22 ? CX_.core2 : n > 0.9 ? CX_.coreD : CX_.core;
  }
  return CX_.fib;                                                      // fibrous shoulders of the plaque
}
// ---------------------------------------------------------------- meshes (state-cached)
// the back half of a surface around the axis: radius / centre from fn(x) → [r, s]; inward normals when inner
function halfTube(fn, inner, attr) {
  const mb = new MB(), nx = 251, na = 18;
  for (let i = 0; i < nx; i++) {
    const x = -AR.L / 2 + AR.L * i / (nx - 1), rs = fn(x), r = Math.max(0.05, rs[0]), s = rs[1];
    for (let j = 0; j <= na; j++) {
      const phi = Math.PI + Math.PI * j / na, cy = Math.cos(phi), cz = Math.sin(phi);
      mb.v(x, s + r * cy, r * cz, 0, inner ? -cy : cy, inner ? -cz : cz, attr ? attr(x, phi, r, s) : 0, i / (nx - 1), j / na);
    }
  }
  const row = na + 1;
  for (let i = 0; i + 1 < nx; i++) for (let j = 0; j < na; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
    if (inner) { mb.tri(a, c, b); mb.tri(b, c, d); } else { mb.tri(a, b, c); mb.tri(b, d, c); }
  }
  return mb.build();
}
const MESHM = {};
function microMeshes(st) {
  const key = [st.g || 0, st.cal || 0, st.sick || 0, st.occ ? 1 : 0, st.xc || 0].map(v => (+v).toFixed(3)).join(':');
  if (MESHM[key]) return MESHM[key];
  const ks = Object.keys(MESHM); if (ks.length > 24) delete MESHM[ks[0]];
  // the lining: yellowish where it covers plaque, orange in dysfunctional patches
  const attr = (x, phi, r, s) => {
    const y = s + r * Math.cos(phi), plq = clamp((AR.RI - 1.5 - Math.hypot(y, r * Math.sin(phi))) / 9, 0, 1);
    const sick = (st.sick || 0) > 0 && Math.abs(x - (st.xc || 0)) < 55 && Math.cos(phi) < 0.3 && hash2(Math.floor(x / 4.5), Math.floor(phi * 6)) < st.sick * 0.45 ? 0.55 : 0;
    return Math.max(plq * 0.9, sick);
  };
  const inner = halfTube(x => { const c = chanAt(x, st); return [AR.RL * c[0], c[1]]; }, true, attr);
  const outer = halfTube(() => [AR.RO, 0], false);
  const cut = quadMesh([-AR.L / 2, -AR.RO, 0.02], [AR.L, 0, 0], [0, 2 * AR.RO, 0]);
  return (MESHM[key] = { inner, outer, cut });
}
const MICRO = () => cached('micro', () => {
  const R = { rbc: buildRBC(), sph: (() => { const mb = new MB(); ellipsoidInto(mb, [0, 0, 0], 1, 1, 1, 14, 9); return computeNormals(mb.build()); })() };
  const mb = new MB(); ellipsoidInto(mb, [0, 0, 0], 1, 1, 1, 18, 12, (x, y, z) => 1 + 0.06 * Math.sin(5 * x + 3 * y) * Math.cos(4 * z), p => (Math.hypot(p[0] - 0.35, p[1] + 0.2, p[2] - 0.5) < 0.55 || Math.hypot(p[0] + 0.3, p[1] - 0.25, p[2] - 0.55) < 0.5) ? 1 : 0);
  R.wbc = computeNormals(mb.build());
  return R;
});
// a red blood cell: a biconcave disc, radius 1 (the CTA film's cell)
function buildRBC() { // a biconcave disc (red blood cell), radius 1
  const mb = new MB(), nu = 16, nv = 8, prof = v => { const r = Math.sin(v * Math.PI / 2); return [r, 0.22 * (1 - Math.pow(r, 2)) + 0.12 * Math.pow(r, 6)]; };
  const base = mb.p.length / 3;
  for (let s = 0; s < 2; s++) for (let j = 0; j <= nv; j++) { const [r, h] = prof(j / nv), y = s ? -Math.max(0.06, 0.35 * r * r * (1 - r) + 0.06) : Math.max(0.06, 0.35 * r * r * (1 - r) + 0.06); for (let i = 0; i < nu; i++) { const a = i / nu * TAU; mb.v(Math.cos(a) * r, y, Math.sin(a) * r, 0, 0, 0); } }
  for (let s = 0; s < 2; s++) for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = base + s * (nv + 1) * nu + j * nu + i, b = base + s * (nv + 1) * nu + j * nu + (i + 1) % nu, c = a + nu, d = b + nu; if (s) { mb.tri(a, b, c); mb.tri(b, d, c); } else { mb.tri(a, c, b); mb.tri(b, c, d); } }
  return computeNormals(mb.build());
}
// ---------------------------------------------------------------- drawing the vessel
const MICRO_FOG = [0, 0, 0];
function drawVessel(cam, st, xf, o) {
  o = o || {};
  const M = microMeshes(st), fog = o.fog;
  drawMesh(cam, M.outer, { ramp: MR.outer, id: newId(CX_.ol), amb: 0.3, dif: 0.6, rim: 0.2, fog }, xf);
  drawMesh(cam, M.inner, { ramp: MR.lining, id: 0, amb: 0.36, dif: 0.62, rim: 0.12, spec: 0.25, fog, mix: { ramp: RT.plq, f: a => a } }, xf);
  drawMesh(cam, M.cut, { ramp: [0], back: [0], id: newId(CX_.ol), unlit: true, pixFn: (u, v) => cutPix(-AR.L / 2 + u * AR.L, -AR.RO + v * 2 * AR.RO, st) }, xf);
}
// ---------------------------------------------------------------- blood
const CELLS = {};
function cellField(st, n, seed) {                  // the cells are fixed per seed; the transit-time map follows the channel every frame
  const ck = n + ':' + seed, cells = CELLS[ck] || (CELLS[ck] = (() => { const r = mulberry(seed || 7), c = []; for (let i = 0; i < n; i++) c.push({ eta: (r() * 2 - 1) * 0.78, zz: 0.15 + r() * 0.6, ph: r(), rot: r() * TAU, tilt: (r() - 0.5) * 1.4, spin: 0.5 + r() }); return c; })());
  const L = AR.L, N = 200, tau = new Float32Array(N + 1); let acc = 0;
  for (let i = 0; i <= N; i++) { const x = -L / 2 - 20 + (L + 40) * i / N, k = Math.max(0.08, chanAt(x, { g: st.g || 0, xc: st.xc, w: st.w })[0]); tau[i] = acc; acc += k * k; }
  return { cells, tau, total: acc, N };
}
function xAtTau(F, u) { const tt = u * F.total; let lo = 0, hi = F.N; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (F.tau[m] <= tt) lo = m; else hi = m; } const f = (tt - F.tau[lo]) / Math.max(1e-6, F.tau[hi] - F.tau[lo]); return -AR.L / 2 - 20 + (AR.L + 40) * (lo + f) / F.N; }
function flowClock(t, rate) { const b = t / BEAT, i = Math.floor(b), f = b - i, surge = f < 0.4 ? (f - Math.sin(TAU * f / 0.4) * 0.4 / TAU) : 0.4; return (i * (0.4 + 0.6 * 0.55) + surge + Math.max(0, f - 0.4) * 0.55) * rate; }
const RBC_R = 4.6;
function rbcMat() { return { ramp: MR.rbc, id: newId(P.BL0), amb: 0.32, dif: 0.66, rim: 0.3, spec: 0.55, cap: 0.8 }; }
function drawRBC(cam, xf, x, y, z, rot, tilt, m, sc) { drawMesh(cam, MICRO().rbc, m, mMul(xf, mMul(mT(x, y, z), mMul(mRy(rot), mMul(mRx(Math.PI / 2 + tilt), mS(RBC_R * (sc || 1))))))); }
function drawCells(cam, xf, st, F, t, o) {
  o = o || {};
  const clk = flowClock(t, o.rate || 0.075), m = rbcMat();
  for (let i = 0; i < (o.count || F.cells.length); i++) {
    const c = F.cells[i], x = xAtTau(F, (c.ph + clk) % 1);
    if (x < -AR.L / 2 + 4 || x > AR.L / 2 - 4) continue;
    const ch = chanAt(x, st), k = ch[0]; if (k < 0.12) continue;
    const eta = clamp(c.eta + 0.07 * Math.sin(t * (0.6 + c.spin) + i * 1.7), -0.85, 0.85);      // cells drift across the stream a little
    const rr = AR.RL * k, y = ch[1] + eta * Math.max(0, rr - RBC_R * 0.8), z = -c.zz * Math.max(1, rr - RBC_R);
    drawRBC(cam, xf, x, y, z, c.rot + t * 0.6 * c.spin, c.tilt + 0.4 * Math.sin(t * c.spin + i), m);
  }
}
// stagnant column above a block: no net flow, a small to-and-fro with each beat
function drawStagnant(cam, xf, st, t, n) {
  const r = mulberry(31), xmax = AR.XO - AR.WO - 6, m = rbcMat();
  for (let i = 0; i < n; i++) {
    const x0 = lerp(-AR.L / 2 + 6, xmax, r()), eta = (r() * 2 - 1) * 0.75, zz = 0.15 + r() * 0.6, rot = r() * TAU, tl = (r() - 0.5) * 1.4;
    const x = Math.min(xmax, x0 + 2.2 * Math.sin(TAU * (t / BEAT) + x0 * 0.05)), ch = chanAt(x, st), rr = AR.RL * ch[0];
    if (ch[0] < 0.25) continue;
    drawRBC(cam, xf, x, ch[1] + eta * Math.max(0, rr - RBC_R * 0.8), -zz * Math.max(1, rr - RBC_R), rot + t * 0.25, tl, m);
  }
}
// glucose: small hexagon rings in pixel art, dissolved in the plasma (never clumping); hidden behind nearer surfaces
function gluSprite(cam, xf, x, y, z, rot) {
  const p = project(cam, mApply(xf, [x, y, z])); if (!p) return;
  const r = Math.max(2.2, 1.6 * p[2] * cam.F), sx = p[0], sy = p[1], ix = Math.round(sx), iy = Math.round(sy);
  if (ix < 0 || iy < 0 || ix >= W || iy >= H || ZB[iy * W + ix] > p[2] * 1.002) return;
  const hex = (rad, col) => { const pts = []; for (let k = 0; k < 6; k++) { const a = rot + k * TAU / 6; pts.push(sx + rad * Math.cos(a), sy + rad * Math.sin(a)); } poly(pts, col); };
  hex(r + 1, hexc('#5A4A12')); hex(r, hexc('#F5E27A')); hex(r * 0.42, hexc('#3A1420'));
}
function drawGlucose(cam, xf, st, t, n) {          // carried by the same pulsing plasma as the cells, jiggling as it goes
  const r = mulberry(17), clk = flowClock(t, 0.075);
  for (let i = 0; i < n; i++) {
    const p0 = r(), eta0 = (r() * 2 - 1) * 0.85, zz = 0.1 + r() * 0.7, sp = 0.8 + 0.4 * r(), x = -AR.L / 2 + (((p0 + clk * sp) % 1 + 1) % 1) * AR.L, ch = chanAt(x, st);
    if (ch[0] < 0.15) continue;
    const eta = clamp(eta0 + 0.05 * Math.sin(t * 5.3 + i * 2.1) + 0.03 * Math.sin(t * 8.9 + i), -0.9, 0.9), rr = AR.RL * ch[0];
    gluSprite(cam, xf, x + 0.6 * Math.sin(t * 7.1 + i), ch[1] + eta * (rr - 2), -zz * Math.max(1, rr - 2), t * (0.6 + 0.5 * sp) + i);
  }
}
// white cells, lipid particles, the macrophage / foam cell
function drawWBC(cam, xf, x, y, z, s, roll, flat) {   // roll: angle rolled along the wall; flat: 0..1 flattened as it sticks
  const k = 5.4 * (s || 1), f = flat || 0;
  drawMesh(cam, MICRO().wbc, { ramp: MR.wbc, id: newId(hexc('#3A3450')), amb: 0.36, dif: 0.62, rim: 0.3, spec: 0.3, mix: { ramp: MR.nuc, f: a => a } }, mMul(xf, mMul(mT(x, y + 0.5 * k * f * 0.18, z), mMul(mS(k * (1 + 0.1 * f), k * (1 - 0.18 * f), k), mRz(roll || 0)))));
}
function drawLDL(cam, xf, x, y, z) { drawMesh(cam, MICRO().sph, { ramp: MR.ldl, id: newId(hexc('#4A3204')), amb: 0.4, dif: 0.6, spec: 0.5 }, mMul(xf, mMul(mT(x, y, z), mS(1.6)))); }
function drawFoam(cam, xf, x, y, k) {             // k: 0 macrophage → 1 foam cell full of lipid droplets
  const z = 0.6, mm = mMul(xf, mMul(mT(x, y, z - 2), mS(6.2, 5.2, 4)));
  drawMesh(cam, MICRO().sph, { ramp: MR.mac, id: newId(hexc('#3A2E20')), amb: 0.38, dif: 0.6, rim: 0.25, mix: { ramp: MR.foam, f: () => 0.25 * k } }, mm);
  const r = mulberry(5);                          // the droplets swell in one after another
  for (let i = 0; i < 8; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 4, g = smooth(clamp(8 * k - i, 0, 1)); if (g < 0.05) continue; drawMesh(cam, MICRO().sph, { ramp: MR.foam, id: 0, amb: 0.4, dif: 0.6, spec: 0.6 }, mMul(xf, mMul(mT(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, z + 1.2), mS(1.3 * g)))); }
}
// ---------------------------------------------------------------- collateral side channels around the block (they widen; they never reopen it)
function collatPaths() {
  const a = AR.XO - 82, b = AR.XO + 82, P1 = [], P2 = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24, x = lerp(a, b, u), bow = Math.sin(Math.PI * u); P1.push([x, AR.RO - 9 + bow * 36 + Math.sin(u * 9) * 2.5, -3]); P2.push([x + 6, -(AR.RO - 9) - bow * 27 - Math.sin(u * 7 + 1) * 2.5, -3]); }
  return [P1, P2];
}
function collatMesh(col) {
  return cached('col' + Math.round(col * 48), () => { const c = Math.round(col * 48) / 48, mb = new MB(); collatPaths().forEach((pts, k) => tubeInto(mb, smoothPath(pts, 2), (k ? 3.4 : 4.0) + c * (k ? 3.6 : 4.6), null, 12, false)); return computeNormals(mb.build()); });
}
function drawCollat(cam, xf, col) { drawMesh(cam, collatMesh(col), { ramp: MR.col, back: MR.colIn, id: newId(P.AR0), amb: 0.3, dif: 0.66, rim: 0.3, spec: 0.4, clip: [0, 0, 1, 0], cutCol: CX_.med, cutW: 0.9 }, xf); }
function drawCollatFlow(cam, xf, t, k) {
  if (k <= 0) return;
  const m = rbcMat(), clk = flowClock(t, 0.33);                       // the same pulse drives the side channels
  collatPaths().forEach((pts, pi) => {
    const n = 11, L = pts.length - 1;
    for (let i = 0; i < n; i++) {
      const g = smooth(clamp(n * k - i, 0, 1)); if (g < 0.05) continue;
      const u = ((clk + i / n + pi * 0.37) % 1), f = u * L, j = Math.floor(f), h = f - j, a = pts[j], b = pts[Math.min(L, j + 1)];
      drawRBC(cam, xf, lerp(a[0], b[0], h), lerp(a[1], b[1], h), -3, t + i, 0.5, m, 0.7 * g);
    }
  });
  const r = mulberry(53), clk2 = flowClock(t, 0.024), span = AR.L / 2 - AR.XO - AR.WO - 12;   // below the block: fewer, slower cells
  for (let i = 0; i < 10; i++) { const r0 = r(), y0 = (r() * 2 - 1) * AR.RL * 0.7, z0 = -(0.2 + r() * 0.5) * AR.RL, rot = r() * TAU, tl = r() - 0.5, g = smooth(clamp(10 * k - i, 0, 1)); if (g < 0.05) continue;
    const x = AR.XO + AR.WO + 8 + ((r0 * 200 + clk2 * span * 6) % span); drawRBC(cam, xf, x, y0, z0, rot + t, tl, m, g); }
}
