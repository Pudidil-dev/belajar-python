// TW — one tungsten lattice shared by scenes 5–8, so the camera moves through a single world: electrons arrive at the
// surface (S05), one swings past atom A and radiates (S06), the view pulls back over many passes, pans to atom B for the
// inner-shell event (S07), then zooms out through the hot lattice (S08). World units: px at z = 1; surface at x = 0,
// metal at x > 0. Atomic sizes are not to scale (a real nucleus would be ~1/20,000 of the atom).
(() => {
const TW = window.TW = {};
const h = U.hash, clamp = U.clamp, lerp = U.lerp;
const SP = 46, ROW = 40, R_CLOUD = 20, R_NUC = 3.5;
TW.R = R_CLOUD; TW.RN = R_NUC;
const ATOMS = [];
for (let i = 0; i <= 13; i++) for (let j = -12; j <= 12; j++) ATOMS.push({ x: 30 + i * SP + (Math.abs(j) % 2) * SP / 2, y: j * ROW, i, j, seed: i * 31 + j * 7 });
TW.ATOMS = ATOMS;
TW.atom = (i, j) => ATOMS.find(a => a.i === i && a.j === j);
TW.A = TW.atom(3, 0);                                  // bremsstrahlung close-up
TW.B = TW.atom(5, -2);                                 // characteristic X-ray
// screened Coulomb centres (all nuclei); k = strength (px³/s²), a = screening length (px)
TW.centers = (k = 1300) => ATOMS.map(a => ({ x: a.x, y: a.y, k, a: 13, soft: 1.2 }));
// thermal jitter of an atom (vib in px)
TW.jit = (a, t, vib) => vib <= 0 ? [0, 0] : [(K.vn3(a.i * 1.7, a.j * 1.3, t * 3.4, 61) - 0.5) * 2 * vib, (K.vn3(a.i * 1.7, a.j * 1.3, t * 3.4, 63) - 0.5) * 2 * vib];
// draw the lattice: o = {vib (px), heat 0..1 (red-orange glow between atoms), shells (atom → shells override), excite(a) → 0..1, skipNuc}
TW.draw = (c, cam, t, o = {}) => {
  const { W, H } = PIX;
  K.cam(c, cam);
  if (o.surface !== false) {                            // metal region a touch lighter than vacuum
    c.setTransform(1, 0, 0, 1, 0, 0);
    const [sx0] = K.S(cam, 0, 0);
    if (sx0 < W) K.dith(c, Math.max(0, sx0), 0, W - Math.max(0, sx0), H, 'g1', 0.6, 0);
    if (o.heat > 0 && sx0 < W) { K.dith(c, Math.max(0, sx0), 0, W - Math.max(0, sx0), H, 'r0', Math.min(1, 1.1 * o.heat), 1); K.dith(c, Math.max(0, sx0), 0, W - Math.max(0, sx0), H, 'r1', 0.45 * o.heat, 2); }
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  const img = K.pbegin(c), vis = [];
  for (const a of ATOMS) {
    const [jx, jy] = TW.jit(a, t, o.vib || 0);
    const [sx, sy] = K.S(cam, a.x + jx, a.y + jy), R = R_CLOUD * cam.z;
    if (sx < -R || sx > W + R || sy < -R || sy > H + R) continue;
    const ex = o.excite ? o.excite(a) : 0;
    FX.cloud(img, sx, sy, R, t, { gain: (o.gain ?? 0.82) + 0.5 * ex, seed: a.seed, shells: o.shells ? o.shells(a) : undefined, ramp: o.ramp ? o.ramp(a) : 'w', grain: 0.5, hole: o.hole ? o.hole(a, sx, sy, R) : undefined });
    vis.push([a, sx, sy, R]);
  }
  K.pend(c, img);
  if (o.heat > 0) for (const [a, sx, sy, R] of vis) FX.glowL(c, sx, sy, R * 1.9, ['r1', 'r2', 'o0', 'o1'], o.heat * (0.6 + 0.4 * K.vn3(a.i, a.j, t * 2, 71)), 1.0);
  if (!o.skipNuc) for (const [a, sx, sy] of vis) FX.nuc(c, sx, sy, R_NUC * cam.z * (o.nucScale ? o.nucScale(a) : 1), a.seed, 1, o.heat || 0);
  return vis;
};
// trajectory: o = {x, y, vx, vy, T, k, frac (energy fraction given to the photon at periapsis), near (atom for the
// periapsis test)}. Only nuclei within 90 px of the straight path are used (the screened force is negligible further out).
TW.pass = o => {
  const v = Math.hypot(o.vx, o.vy), L = v * (o.T || 6), ux = o.vx / v, uy = o.vy / v;
  const cs = [];
  let ci = 0;
  for (const a of (o.only || ATOMS)) {
    const px = a.x - o.x, py = a.y - o.y, s = clamp(px * ux + py * uy, -40, L + 40), d = Math.hypot(px - ux * s, py - uy * s);
    if (d > 90) continue;
    if (a === o.near) ci = cs.length;
    cs.push({ x: a.x, y: a.y, k: o.k || 1300, a: 13, soft: 1.2 });
  }
  return PHYS.coulomb({ x: o.x, y: o.y, vx: o.vx, vy: o.vy, centers: cs, T: o.T || 6, emit: o.frac != null ? { frac: o.frac, at: 'peri', center: ci } : null });
};
// a clear approach to atom `a` with impact parameter b: try directions near `pref` (rad) and keep the first whose
// straight path (100 px in, 70 px out) passes every other nucleus by at least `clear` px. Returns {x, y, ux, uy}.
TW.approach = (a, b, side, pref = 0, clear = 15) => {
  for (let k = 0; k < 48; k++) {
    const th = pref + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.07, ux = Math.cos(th), uy = Math.sin(th);
    const px = a.x - uy * b * side, py = a.y + ux * b * side;                     // the point of closest approach (straight line)
    let ok = true;
    for (const q of ATOMS) {
      if (q === a) continue;
      const dx = q.x - px, dy = q.y - py, s = dx * ux + dy * uy;
      if (s < -100 || s > 70) continue;
      if (Math.abs(dx * uy - dy * ux) < clear) { ok = false; break; }
    }
    if (ok) return { x: px - ux * 75, y: py - uy * 75, ux, uy, th };
  }
  const ux = Math.cos(pref), uy = Math.sin(pref);
  return { x: a.x - uy * b * side - ux * 75, y: a.y + ux * b * side - uy * 75, ux, uy, th: pref };
};
// periapsis time of a trajectory around a point (closest approach, s)
TW.periT = (tr, ax, ay) => { let best = 1e9, bt = 0; for (let i = 0; i < tr.n; i++) { const d = Math.hypot(tr.X[i] - ax, tr.Y[i] - ay); if (d < best) { best = d; bt = i * tr.dt; } } return [bt, best]; };
})();
