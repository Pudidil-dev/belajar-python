'use strict';
// ============================================================================
// PLANT world: the facility from above (plan view, units "pu", y down).
// One cyclotron in its shielded vault (centre at 0,0), the extraction, the
// graphite degrader, the energy selection system (dipole + slits), a
// quadrupole doublet, a 90° dipole, and the gantry room with the patient.
// The cyclotron is drawn closed (lid on) or opened (lid off: the two hollow
// electrodes, the gap, the magnetic field, the spiral orbit). Not to scale.
// ============================================================================
const CYC = { R: 118, coil: 98, pole: 92, dee: 86, gap: 3, ex: 96 };
const VAULT = { x0: -190, y0: -180, x1: 190, y1: 172, th: 40 };
// ---------------------------------------------------------------- the orbit model
// half-orbit k (k = 1, 2, …) has radius r1·√k (radius grows with the square root of the energy, energy ∝ number of gap crossings);
// odd k run through the right electrode, even k through the left; each starts on the gap line where the previous one ended.
const ORB = (() => {
  const r1 = 6, NK = 214, rk = k => r1 * Math.sqrt(k), ys = [0];
  for (let k = 1; k <= NK; k++) ys.push(ys[k - 1] + (k % 2 ? -2 : 2) * rk(k));
  const cyOf = k => k % 2 ? ys[k - 1] - rk(k) : ys[k - 1] + rk(k);
  let m = 0; for (let k = 150; k <= 205; k++) m += cyOf(k); m /= 56;
  return { r1, NK, rk, ys: ys.map(v => v - m) };
})();
const orbC = k => ORB.ys[k - 1] + (k % 2 ? -ORB.rk(k) : ORB.rk(k));
// the real half-orbit count at each audible crossing (one per beat while the orbit is small, then the time-lapse)
const KV = (() => {
  const g = EV.gaps, n = g.length, o = [];
  for (let i = 0; i < n; i++) {
    if (i < 12) { o.push(i + 1); continue; }
    let K = Math.round(12 + 193 * Math.pow((g[i] - 19.5) / (g[n - 1] - 19.5), 1.5));
    if ((K - (i + 1)) % 2) K += 1; o.push(Math.max(o[i - 1] + 1, K));
  }
  return o;
})();
const K_LAST = KV[KV.length - 1], R_LAST = ORB.rk(K_LAST), C_LAST = orbC(K_LAST);
const T_DEF = EV.deflect, T_EXT = EV.extract, A_DEF = 135 * Math.PI / 180;
// where the RF cycle is: crossing index i and progress u in [0, 1)
function rfPhase(t) {
  const g = EV.gaps;
  if (t < g[0]) return { i: -1, u: (t - g[0]) / 0.5 };
  for (let i = 0; i + 1 < g.length; i++) if (t < g[i + 1]) return { i, u: (t - g[i]) / (g[i + 1] - g[i]) };
  const n = g.length - 1; return { i: n, u: (t - g[n]) / 0.5 };
}
// the field across the gap: + points right, − left; it always points along the proton's motion at a crossing
function rfField(t) {
  if (t < EV.rfOn) return 0;
  const amp = smooth(seg(t, EV.rfOn, EV.rfOn + 0.4)), ph = rfPhase(t);
  if (ph.i < 0) return amp * Math.cos(Math.PI * ph.u);            // before the first crossing: same rhythm (1 at 14.0)
  const sgn = KV[ph.i] % 2 ? 1 : -1;
  return amp * sgn * Math.cos(Math.PI * ph.u);
}
// the energy (in half-orbits completed) — steps at each crossing, flat in between
function kAt(t) { if (t < EV.gaps[0]) return 0; const ph = rfPhase(t); return ph.i >= 0 ? KV[Math.min(ph.i, KV.length - 1)] : 0; }
// the smooth half-orbit count used for the trail of past orbits
function kTrail(t) { const ph = rfPhase(t); if (ph.i < 0) return 0; if (ph.i >= KV.length - 1) return K_LAST + Math.min(1, ph.u); return lerp(KV[ph.i], KV[ph.i + 1], ph.u); }
// position of a point on half-orbit k at progress u
function orbPos(k, u) { const r = ORB.rk(k), c = orbC(k), a = (k % 2 ? -Math.PI / 2 : Math.PI / 2) + Math.PI * u; return [r * Math.cos(a), c - r * Math.sin(a)]; }
const SRC = [-7, ORB.ys[0]];                                       // the ion source's slit, just left of the gap
// the representative proton in the cyclotron (null when it is not there)
function cycProton(t) {
  if (t < EV.inj) return null;
  const g = EV.gaps;
  if (t < g[0]) { const u = ein(seg(t, EV.inj, g[0])); return { p: [lerp(SRC[0], 0, u), SRC[1]], v: [1, 0] }; }
  const ph = rfPhase(t);
  if (ph.i < KV.length - 1) {
    const S = ORB.ys[KV[ph.i] - 1], E = ORB.ys[KV[ph.i + 1] - 1], cy = (S + E) / 2, r = Math.abs(S - E) / 2, odd = KV[ph.i] % 2;
    const a = (odd ? -Math.PI / 2 : Math.PI / 2) + Math.PI * ph.u;
    return { p: [r * Math.cos(a), cy - r * Math.sin(a)], v: [-Math.sin(a), -Math.cos(a)], r, c: [0, cy] };
  }
  // the outermost orbit, then the deflector peels it off toward the extraction channel
  const t0 = g[g.length - 1];
  if (t < T_DEF) { const a = lerp(Math.PI / 2, A_DEF, seg(t, t0, T_DEF)); return { p: [R_LAST * Math.cos(a), C_LAST - R_LAST * Math.sin(a)], v: [-Math.sin(a), -Math.cos(a)], r: R_LAST, c: [0, C_LAST] }; }
  if (t < T_EXT) { const u = seg(t, T_DEF, T_EXT), a = lerp(A_DEF, Math.PI, u), r = lerp(R_LAST, CYC.ex, smooth(u)); return { p: [r * Math.cos(a), C_LAST - r * Math.sin(a)], v: [-Math.sin(a), -Math.cos(a)] }; }
  return null;
}
// ---------------------------------------------------------------- the beamline path (arc-length parametrised)
function pathBuild(start, th0, ops) {
  let x = start[0], y = start[1], th = th0, L = 0; const pts = [x, y], marks = {};
  for (const op of ops) {
    if (op[0] === 's') { const n = Math.max(1, Math.ceil(op[1] / 4)); for (let i = 1; i <= n; i++) pts.push(x + Math.sin(th) * op[1] * i / n, y + Math.cos(th) * op[1] * i / n); x += Math.sin(th) * op[1]; y += Math.cos(th) * op[1]; L += op[1]; }
    else if (op[0] === 'a') { const dt = op[1] * Math.PI / 180, R = op[2], sg = Math.sign(dt), cx = x + R * Math.cos(th) * sg, cy = y - R * Math.sin(th) * sg, n = Math.ceil(Math.abs(dt) / 0.04); for (let i = 1; i <= n; i++) { const p = th + dt * i / n; pts.push(cx - R * sg * Math.cos(p), cy + R * sg * Math.sin(p)); } th += dt; x = pts[pts.length - 2]; y = pts[pts.length - 1]; L += Math.abs(dt) * R; }
    else marks[op[1]] = { x, y, th, s: L };
  }
  return { path: new Path(pts), marks, end: [x, y], th };
}
const BL = pathBuild([-CYC.ex, C_LAST], 0, [
  ['m', 'start'], ['s', 172], ['m', 'wall'], ['s', 78], ['m', 'deg'], ['s', 22], ['m', 'd1'], ['a', 45, 60], ['m', 'd1e'], ['s', 25], ['m', 'slit'], ['s', 25], ['m', 'd2'], ['a', -45, 60], ['m', 'd2e'],
  ['s', 36], ['m', 'q1'], ['s', 42], ['m', 'q2'], ['s', 48], ['m', 'd3'], ['a', -90, 52], ['m', 'd3e'], ['s', 70], ['m', 'gwall'], ['s', 92], ['m', 'gin'], ['s', 70], ['m', 'iso'],
]);
const BLM = BL.marks;
// the stream of protons along the beamline after extraction: one every twelfth of a second
const V1 = (BLM.deg.s - 2) / (EV.degrader - EV.extract), V2 = V1 * 0.7;
function streamS(age) { const sd = BLM.deg.s; return age * V1 <= sd ? age * V1 : sd + (age - sd / V1) * V2; }
const DELTA = [0, -1, 1, -2, 0, 2, -1, 0, 1, -2, 2, 0];              // energy offset of each proton after the degrader (spread)
const RAY = [0.1, -0.7, 0.5, -0.2, 0.9, -0.5, 0.3, -0.9, 0.7, -0.35, 0.15, 0.6];  // lateral ray parameter in the quadrupoles
// half-widths of the beam in the horizontal (plan) and vertical planes along the doublet
function envX(s) { const a = BLM.q1.s, b = BLM.q2.s; if (s < a - 14) return 7; if (s < a + 14) return lerp(7, 4.2, smooth((s - a + 14) / 28)); if (s < b - 14) return lerp(4.2, 3.4, (s - a - 14) / (b - a - 28)); if (s < b + 14) return lerp(3.4, 3.9, smooth((s - b + 14) / 28)); return Math.max(1.6, 3.9 - (s - b - 14) * 0.05); }
function envY(s) { const a = BLM.q1.s, b = BLM.q2.s; if (s < a - 14) return 7; if (s < a + 14) return lerp(7, 9.6, smooth((s - a + 14) / 28)); if (s < b - 14) return lerp(9.6, 10.4, (s - a - 14) / (b - a - 28)); if (s < b + 14) return lerp(10.4, 4.6, smooth((s - b + 14) / 28)); return Math.max(1.6, 4.6 - (s - b - 14) * 0.06); }
// lateral offset of proton j at arc length s (the energy fan in the selector, the envelope in the doublet)
function streamOff(j, s) {
  const d = DELTA[j % 12];
  let o = 0;
  if (s > BLM.d1.s && s < BLM.d2e.s) { const u = (s - BLM.d1.s) / (BLM.slit.s - BLM.d1.s); o = d * 3.2 * (u <= 1 ? u * u * (3 - 2 * u) * 1.0 : Math.max(0, 2 - u)); }
  if (s > BLM.d2e.s) o = RAY[j % 12] * envX(s);
  return o;
}
const passes = j => DELTA[j % 12] === 0;
// ---------------------------------------------------------------- drawing: the building
function plantBG(cam) {
  clear(P.FL1);
  const z = cam.z;
  // floor grid (1 m tiles, schematic)
  if (z > 0.3) { const step = 40, x0 = Math.floor(cam.wx(0) / step) * step, y0 = Math.floor(cam.wy(0) / step) * step; for (let x = x0; x < cam.wx(W); x += step) { const sx = cam.x(x); line(sx, 0, sx, H, P.FL2); } for (let y = y0; y < cam.wy(H); y += step) { const sy = cam.y(y); line(0, sy, W, sy, P.FL2); } }
  // walls: the cyclotron vault (beam port in the bottom wall), the transport hall, the gantry room (beam port in its wall)
  const wall = (x0, y0, x1, y1) => { const a = cam.x(x0), b = cam.y(y0), c = cam.x(x1), d = cam.y(y1); rect(a, b, c, d, P.CO2); hatch(a, b, c, d, P.CO1, 6); frame(a, b, c, d, P.CO3); };
  const V = VAULT, T = V.th;
  wall(V.x0 - T, V.y0 - T, V.x1 + T, V.y0); wall(V.x0 - T, V.y0, V.x0, V.y1 + T); wall(V.x1, V.y0, V.x1 + T, V.y1 + T);
  wall(V.x0, V.y1, -110, V.y1 + T); wall(-82, V.y1, V.x1, V.y1 + T);
  wall(-190, V.y1 + T, -150, 400); wall(70, V.y1 + T, 110, 760);
  wall(-640, 400, -150, 440); wall(-640, 440, -600, 760); wall(-640, 720, 110, 760);
  wall(-190, 440, -150, 535); wall(-190, 588, -150, 720);
}
// a magnet block in plan: a rotated rectangle around a beamline mark, with a copper coil band and optional field marks
function magBlock(cam, m, len, half, opt) {
  opt = opt || {};
  const ux = Math.sin(m.th), uy = Math.cos(m.th), nx = uy, ny = -ux, c = [m.x + ux * len / 2, m.y + uy * len / 2];
  const P4 = (a, b) => [c[0] + ux * a + nx * b, c[1] + uy * a + ny * b];
  const box = (a0, a1, b0, b1) => { const q = [P4(a0, b0), P4(a1, b0), P4(a1, b1), P4(a0, b1)]; return cam.pts([].concat(...q)); };
  shade(maskPoly(box(-len / 2, len / 2, -half, half)), opt.col || P.M3, P.M4, P.M2, P.M1, { k: Math.max(1, Math.round(cam.z)) });
  for (const sgn of [-1, 1]) poly(box(-len / 2 + 2, len / 2 - 2, sgn * (half - 6), sgn * (half - 2)), P.CU2);
  poly(box(-len / 2, len / 2, -3, 3), P.M1);
}
// a sector (curved) magnet around an arc of the beamline: inner and outer radius around the arc
function sectorMag(cam, m0, m1, w, field) {
  const pts = BL.path.sub(m0.s, m1.s, 3), L = pts.length / 2, inner = [], outer = [];
  for (let i = 0; i < L; i++) {
    const s = lerp(m0.s, m1.s, i / (L - 1)), tn = BL.path.tan(s), nx = -tn[1], ny = tn[0], [x, y] = BL.path.at(s);
    inner.push(x + nx * w, y + ny * w); outer.push(x - nx * w, y - ny * w);
  }
  const ring_ = [...inner]; for (let i = L - 1; i >= 0; i--) ring_.push(outer[2 * i], outer[2 * i + 1]);
  shade(maskPoly(cam.pts(ring_)), P.M3, P.M4, P.M2, P.M1, { k: Math.max(1, Math.round(cam.z)) });
  const gap = []; for (let i = 0; i < L; i++) { const s = lerp(m0.s, m1.s, i / (L - 1)), tn = BL.path.tan(s), [x, y] = BL.path.at(s); gap.push(x - tn[1] * 4, y + tn[0] * 4); }
  for (let i = L - 1; i >= 0; i--) { const s = lerp(m0.s, m1.s, i / (L - 1)), tn = BL.path.tan(s), [x, y] = BL.path.at(s); gap.push(x + tn[1] * 4, y - tn[0] * 4); }
  poly(cam.pts(gap), P.M1);
  if (field > 0 && cam.z > 1.2) withDither(field, () => { for (let s = m0.s + 6; s < m1.s - 3; s += 9) for (const o of [-w * 0.62, w * 0.62]) { const tn = BL.path.tan(s), [x, y] = BL.path.at(s); fieldIn(cam.x(x - tn[1] * o), cam.y(y + tn[0] * o), Math.max(2, 2.2 * cam.z)); } });
}
// the beam pipe along the whole beamline
function beamPipe(cam) {
  const q = cam.pts(BL.path.p), w = Math.max(2, 5 * cam.z);
  for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], w + 2, P.M2);
  for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], w, P.M4);
  for (let i = 0; i + 3 < q.length; i += 2) lineW(q[i], q[i + 1], q[i + 2], q[i + 3], Math.max(1, w - 3), P.M1);
  // flanges every so often
  for (let s = 20; s < BL.path.L; s += 46) { const [x, y] = BL.path.at(s), tn = BL.path.tan(s); lineW(cam.x(x - tn[1] * 5), cam.y(y + tn[0] * 5), cam.x(x + tn[1] * 5), cam.y(y - tn[0] * 5), Math.max(1, 2 * cam.z), P.M4); }
}
// ---------------------------------------------------------------- drawing: the cyclotron
function cycClosed(cam) {
  const cx = cam.x(0), cy = cam.y(0), z = cam.z;
  shade(maskDisc(cx, cy, CYC.R * z), P.M2, P.M3, P.M1, P.M0, { k: Math.max(1, Math.round(2 * z)) });
  ring(cx, cy, (CYC.R - 8) * z, Math.max(1, z), P.M1);
  shade(maskDisc(cx, cy, 96 * z), P.M3, P.M4, P.M2, P.M1, { k: Math.max(1, Math.round(2 * z)) });
  ring(cx, cy, 70 * z, Math.max(1, z), P.M2); ring(cx, cy, 40 * z, Math.max(1, z), P.M2);
  disc(cx, cy, 16 * z, P.M4); ring(cx, cy, 16 * z, Math.max(1, z), P.M2);
  for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + TAU / 8; disc(cam.x(Math.cos(a) * 107), cam.y(Math.sin(a) * 107), Math.max(1, 4 * z), P.M4); disc(cam.x(Math.cos(a) * 107), cam.y(Math.sin(a) * 107), Math.max(0.6, 2 * z), P.M1); }
  for (let i = 0; i < 16; i++) { const a = i * TAU / 16; pset(cam.x(Math.cos(a) * 84), cam.y(Math.sin(a) * 84), P.M5); }
}
// the opened cyclotron: yoke ring, copper coil, pole face, two hollow electrodes (see-through), the gap, RF stems, the source
function deeShape(side) { // side +1 right, −1 left: flat points of the D
  const pts = [], g = CYC.gap * side;
  for (let i = 0; i <= 40; i++) { const a = -Math.PI / 2 + Math.PI * i / 40, x = Math.cos(a) * CYC.dee * side, y = Math.sin(a) * CYC.dee; pts.push(g + (side > 0 ? Math.max(0, x) : Math.min(0, x)), y); }
  return pts;
}
function cycOpen(cam, t, opt) {
  const cx = cam.x(0), cy = cam.y(0), z = cam.z;
  shade(maskDisc(cx, cy, CYC.R * z), P.M2, P.M3, P.M1, P.M0, { k: Math.max(1, Math.round(2 * z)) });
  ring(cx, cy, (CYC.coil + 3) * z, Math.max(2, 6 * z), P.CU1); ring(cx, cy, (CYC.coil + 3) * z, Math.max(1, 3 * z), P.CU2);
  disc(cx, cy, CYC.pole * z, P.M1);
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; line(cam.x(Math.cos(a) * 20), cam.y(Math.sin(a) * 20), cam.x(Math.cos(a) * 90), cam.y(Math.sin(a) * 90), P.M0); }
  // the extraction port through the yoke
  const p0 = [cam.x(-CYC.ex - 5), cam.y(C_LAST + 20)], p1 = [cam.x(-CYC.ex + 5), cam.y(CYC.R + 4)]; rect(p0[0], p0[1], p1[0], p1[1], P.M1); rect(p0[0], p0[1], p0[0] + 1, p1[1], P.M3);
  // RF stems (resonators) leaving the electrodes at 60° and 240°
  for (const a of [Math.PI / 3, Math.PI * 4 / 3]) { const ux = Math.cos(a), uy = -Math.sin(a), nx = -uy, ny = ux, w = 6; const q = cam.pts([ux * 70 + nx * w, uy * 70 + ny * w, ux * 114 + nx * w, uy * 114 + ny * w, ux * 114 - nx * w, uy * 114 - ny * w, ux * 70 - nx * w, uy * 70 - ny * w]); shade(maskPoly(q), P.M3, P.M4, P.M2, P.M1); }
  // magnetic field marks (into the screen): the magnet is on
  const mag = opt.mag === undefined ? 1 : opt.mag;
  if (mag > 0 && z > 1.0) {
    const sp = z > 4 ? 10 : 14, pulse = 0.75 + 0.25 * Math.sin(t * TAU * 0.5);
    withDither(mag * pulse, () => { for (let y = -84; y <= 84; y += sp) for (let x = -84; x <= 84; x += sp) { if (Math.hypot(x, y) > 82 || Math.abs(x) < 7) continue; const sx = cam.x(x + sp / 2), sy = cam.y(y + sp / 2); if (sx < -6 || sy < -6 || sx > W + 6 || sy > H + 6) continue; fieldIn(sx, sy, Math.max(2, Math.min(5, 1.5 * z)), P.MG2); } });
  }
  // the two electrodes ("dees"): see-through plates with bright edges
  for (const side of [-1, 1]) {
    const q = cam.pts(deeShape(side)); const m = maskPoly(q);
    withDither(0.3, () => mFill(m, P.M5));
    mOutline(m, P.M5);
    const inner = cam.pts(deeShape(side).map((v, i) => i % 2 ? v * 0.965 : v === CYC.gap * side ? v + 2 * side : v * 0.965)); polyline(inner, P.M3);
  }
  // the deflector at the outer edge (an electrode that peels the beam off)
  { const a0 = 128, a1 = 182; const o = [], o2 = []; for (let i = 0; i <= 16; i++) { const a = lerp(a0, a1, i / 16) * Math.PI / 180, r = lerp(CYC.dee + 1, CYC.ex + 4, smooth(i / 16)); o.push(cam.x(r * Math.cos(a)), cam.y(C_LAST - r * Math.sin(a))); o2.push(cam.x((r + 4) * Math.cos(a)), cam.y(C_LAST - (r + 4) * Math.sin(a))); } polyline(o, P.M6); polyline(o2, P.M4); }
  // the ion source chimney at the centre (gas fed from below)
  disc(cam.x(SRC[0] - 3), cam.y(SRC[1]), Math.max(1.2, 3.5 * z), P.M5); ring(cam.x(SRC[0] - 3), cam.y(SRC[1]), Math.max(1.2, 3.5 * z), 1, P.M2);
  rect(cam.x(SRC[0] - 0.5), cam.y(SRC[1] - 1.2), cam.x(SRC[0] + 0.4), cam.y(SRC[1] + 1.2), P.M0);
  // RF field across the gap
  const E = opt.rf === undefined ? rfField(t) : opt.rf;
  if (Math.abs(E) > 0.05 && z > 1.6) {
    const sp = z > 4 ? 12 : 22;
    for (let y = -78; y <= 78; y += sp) { if (Math.abs(y - SRC[1]) < 5 && z > 3) continue; const x0 = cam.x(-CYC.gap - 1), x1 = cam.x(CYC.gap + 1), sy = cam.y(y + (z > 4 ? 6 : 0)); if (sy < -10 || sy > H + 10) continue; rfArrow(E > 0 ? x0 - 2 : x1 + 2, sy, E > 0 ? x1 + 2 : x0 - 2, sy, Math.abs(E)); }
  }
}
// the spiral trail of past half-orbits and the protons on it
function orbitTrail(cam, t, opt) {
  const K = kTrail(t); if (K <= 0) return;
  const kmax = Math.min(Math.floor(K), K_LAST), step = kmax <= 24 ? 1 : Math.ceil(kmax / 36);
  for (let k = 1; k <= kmax; k++) {
    const recent = K - k < 2.5;
    if (!recent && Math.floor((kmax - k) / 2) % step) continue;
    const r = ORB.rk(k), c = orbC(k), n = Math.max(8, Math.min(48, Math.round(r * cam.z * 0.5))), a0 = k % 2 ? -Math.PI / 2 : Math.PI / 2;
    const col = recent ? P.PC2 : step > 1 ? P.PC0 : P.PC1;
    let px = null, py = null;
    for (let i = 0; i <= n; i++) { const a = a0 + Math.PI * i / n, x = cam.x(r * Math.cos(a)), y = cam.y(c - r * Math.sin(a)); if (px !== null) line(px, py, x, y, col); px = x; py = y; }
  }
}
function cycProtons(cam, t, opt) {
  const p = cycProton(t);
  // the other bunches on the spiral (time-lapse): same phase, older orbits
  if (opt.many > 0) { const ph = rfPhase(t), K = kTrail(t); if (ph.i >= 0) for (let j = 1; j <= 9; j++) { const k = Math.floor(K) - 22 * j; if (k < 1 || k > K_LAST) continue; const kk = (k % 2) === (Math.floor(K) % 2) ? k : k - 1; if (kk < 1) continue; const q = orbPos(kk, ph.i < KV.length - 1 ? ph.u : 0.5); proton(cam.x(q[0]), cam.y(q[1]), Math.max(1.2, 1.5 * cam.z), opt.many); } }
  if (!p) return null;
  const sx = cam.x(p.p[0]), sy = cam.y(p.p[1]), r = Math.max(1.4, Math.min(5, 1.6 * cam.z));
  if (p.v) streak(sx - p.v[0] * 7 * Math.min(2, cam.z), sy - p.v[1] * 7 * Math.min(2, cam.z), sx, sy, P.PC1, P.PC2, Math.max(1, r * 0.6));
  proton(sx, sy, r);
  return { x: sx, y: sy, p };
}
// ---------------------------------------------------------------- the beamline elements
function drawDegrader(cam, t) {
  const m = BLM.deg, z = cam.z;
  magBlock(cam, { x: m.x, y: m.y - 14, th: 0 }, 28, 26, { col: P.M2 });
  // two graphite wedges (dark), crossing the beam: the overlap sets the thickness
  const slide = 2 * Math.sin(t * 0.8);
  poly(cam.pts([m.x - 20 + slide, m.y - 10, m.x + 3, m.y - 10, m.x + 3, m.y + 2, m.x - 20 + slide, m.y - 2]), P.CO0);
  poly(cam.pts([m.x - 3, m.y - 4, m.x + 20 - slide, m.y + 2, m.x + 20 - slide, m.y + 10, m.x - 3, m.y + 10]), P.CO0);
  if (z > 1.5) { for (let k = 0; k < 6; k++) { line(cam.x(m.x - 18 + k * 4 + slide), cam.y(m.y - 9), cam.x(m.x - 18 + k * 4 + slide), cam.y(m.y - 3), P.CO1); line(cam.x(m.x - 1 + k * 4 - slide), cam.y(m.y + 3), cam.x(m.x - 1 + k * 4 - slide), cam.y(m.y + 9), P.CO1); } }
}
function drawSlits(cam, t) {
  const m = BLM.slit, tn = BL.path.tan(m.s), nx = -tn[1], ny = tn[0];
  for (const sg of [-1, 1]) { const o0 = sg * 2.2, o1 = sg * 13; poly(cam.pts([m.x + nx * o0 - tn[0] * 3, m.y + ny * o0 - tn[1] * 3, m.x + nx * o1 - tn[0] * 3, m.y + ny * o1 - tn[1] * 3, m.x + nx * o1 + tn[0] * 3, m.y + ny * o1 + tn[1] * 3, m.x + nx * o0 + tn[0] * 3, m.y + ny * o0 + tn[1] * 3]), P.M5); }
}
// the protons streaming along the beamline (after the extraction)
function beamStream(cam, t, opt) {
  if (t < EV.extract) return;
  const n = Math.floor((t - EV.extract) * 12);
  for (let j = Math.max(0, n - 200); j <= n; j++) {
    const age = t - (EV.extract + j / 12); if (age < 0) continue;
    const s = streamS(age); if (s > BL.path.L) continue;
    if (!passes(j) && s > BLM.slit.s) continue;
    const [x, y] = BL.path.at(s), tn = BL.path.tan(s), o = streamOff(j, s), px = x - tn[1] * o, py = y + tn[0] * o;
    const sx = cam.x(px), sy = cam.y(py); if (sx < -20 || sy < -20 || sx > W + 20 || sy > H + 20) continue;
    const sp = s < BLM.deg.s ? V1 : V2, L = sp * 0.035 * cam.z;
    streak(sx - tn[0] * L, sy - tn[1] * L, sx, sy, P.PC1, P.PC2, Math.max(1, 0.8 * cam.z));
    proton(sx, sy, Math.max(1.2, Math.min(3.2, 1.1 * cam.z)), opt.dim === undefined ? 1 : opt.dim);
    // stopped at the slit jaws: a small warm puff where it lands
    if (!passes(j) && s > BLM.slit.s - 5) glow(sx, sy, 4 * cam.z, P.DE1, P.DE3, 0.8);
  }
}
// ---------------------------------------------------------------- the gantry room in plan
function gantryPlan(cam, t) {
  const iso = BLM.iso, z = cam.z, Y = iso.y;
  // the couch and the patient's legs under the blanket, coming out of the gantry's bore toward the room
  shade(maskRR(cam.x(iso.x - 230), cam.y(Y - 24), cam.x(iso.x + 30), cam.y(Y + 24), 4 * z), P.CF1, P.CF2, P.CF0, P.CF0);
  const leg = []; for (let i = 0; i <= 20; i++) { const u = i / 20, x = iso.x - 40 - 168 * u, w = lerp(20, 13, u) + (u > 0.92 ? 3 : 0); leg.push(x, Y - w); } for (let i = 20; i >= 0; i--) { const u = i / 20, x = iso.x - 40 - 168 * u, w = lerp(20, 13, u) + (u > 0.92 ? 3 : 0); leg.push(x, Y + w); }
  shade(maskPoly(cam.pts(leg)), P.BK2, P.BK3, P.BK1, P.BK0, { k: Math.max(1, Math.round(z)) });
  line(cam.x(iso.x - 60), cam.y(Y), cam.x(iso.x - 200), cam.y(Y), P.BK1);
  shade(maskRR(cam.x(iso.x - 248), cam.y(Y - 34), cam.x(iso.x - 228), cam.y(Y + 34), 3 * z), P.M5, P.M6, P.M3, P.M1);
  // the gantry: a big rotating cylinder (seen from above), its beamline magnets on top
  const x0 = iso.x - 46, x1 = iso.x + 168, y0 = Y - 132, y1 = Y + 132;
  shade(maskRR(cam.x(x0), cam.y(y0), cam.x(x1), cam.y(y1), 14 * z), P.M3, P.M4, P.M2, P.M1, { k: Math.max(1, Math.round(2 * z)) });
  for (let x = x0 + 22; x < x1 - 8; x += 24) line(cam.x(x), cam.y(y0 + 4), cam.x(x), cam.y(y1 - 4), P.M2);
  rect(cam.x(x0 - 4), cam.y(y0 + 18), cam.x(x0 + 3), cam.y(y1 - 18), P.M5);
  shade(maskRR(cam.x(iso.x + 30), cam.y(Y - 26), cam.x(iso.x + 150), cam.y(Y + 26), 8 * z), P.M2, P.M3, P.M1, P.M0);
  for (const xx of [iso.x + 50, iso.x + 110]) shade(maskRR(cam.x(xx), cam.y(Y - 22), cam.x(xx + 26), cam.y(Y + 22), 4 * z), P.M4, P.M5, P.M3, P.M1);
  disc(cam.x(iso.x), cam.y(Y), Math.max(1, 2 * z), P.PC2);
}
// ---------------------------------------------------------------- the whole plant
// opt: { open (0..1 lid off), mag, rf, trail, many, focus, essK, dim }
function plantWorld(cam, t, opt) {
  opt = opt || {};
  plantBG(cam);
  // hydrogen gas supply: a bottle in the vault and its line to the source
  { const a = [150, -140], b = [70, -96], c = [SRC[0] - 3, SRC[1]]; wline(cam, a[0], a[1], b[0], b[1], P.M4, 1.5); wline(cam, b[0], b[1], c[0], c[1], P.M4, 1.2); shade(maskRR(cam.x(140), cam.y(-160), cam.x(160), cam.y(-122), 8 * cam.z), P.M5, P.M6, P.M3, P.M1); }
  beamPipe(cam);
  const open = opt.open || 0;
  if (open < 1) cycClosed(cam);
  if (open > 0) { if (open >= 1) cycOpen(cam, t, opt); else withDither(open, () => cycOpen(cam, t, Object.assign({}, opt, { rf: 0, mag: 0 }))); }
  let pr = null;
  if (open >= 1) { orbitTrail(cam, t, opt); pr = cycProtons(cam, t, opt); }
  drawDegrader(cam, t);
  sectorMag(cam, BLM.d1, BLM.d1e, 15, opt.essK || 0);
  drawSlits(cam, t);
  sectorMag(cam, BLM.d2, BLM.d2e, 15, opt.essK || 0);
  magBlock(cam, BLM.q1, 22, 20); magBlock(cam, BLM.q2, 22, 20);
  sectorMag(cam, BLM.d3, BLM.d3e, 16, opt.d3K || 0);
  gantryPlan(cam, t);
  beamStream(cam, t, opt);
  return pr;
}
