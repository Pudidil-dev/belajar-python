'use strict';
// ============================================================================
// ATOM world (units "au", y down): inside the ion source at the cyclotron's
// centre. Left of x = 0: hydrogen gas (each atom one proton and one electron);
// a fast electron of the discharge knocks the electron off one atom, leaving a
// bare proton (H+). The chimney wall with its slit at x = 0..14; right of it the
// near-empty vacuum chamber. The electric field draws the protons through the
// slit one after another. Not to scale.
// ============================================================================
const AT = { orb: 15, wall0: 0, wall1: 14, slit: 9 };
const ASTAR = { x: -180, y: 0 };                                     // the atom we follow
const ATOMS = (() => {
  const o = [], r = mulberry(91);
  for (let i = 0; i < 13; i++) for (let j = -8; j <= 8; j++) {
    const x = -34 - i * 52 + (r() - 0.5) * 26, y = j * 50 + (r() - 0.5) * 24;
    if (Math.hypot(x - ASTAR.x, y - ASTAR.y) < 44) continue;
    o.push({ x, y, ph: r() * TAU, sp: 1.6 + r() * 1.2, w: r() * TAU, ion: Infinity });
  }
  o.push({ x: ASTAR.x, y: ASTAR.y, ph: 0.6, sp: 2.0, w: 0, ion: EV.ionize, star: true });
  return o;
})();
// the protons that go through the slit: [atom index, time it passes the slit]
const INJ = (() => {
  const near = ATOMS.map((a, i) => [i, a]).filter(([, a]) => !a.star && a.x > -150 && Math.abs(a.y) < 110).sort((p, q) => Math.hypot(p[1].x, p[1].y) - Math.hypot(q[1].x, q[1].y));
  const pick = near.slice(0, 3).map(([i]) => i), star = ATOMS.findIndex(a => a.star);
  const list = [[pick[0], EV.inject[0]], [star, EV.inject[1]], [pick[1], EV.inject[2]], [pick[2], EV.inject[3]]];
  list.forEach(([i], k) => { if (!ATOMS[i].star) ATOMS[i].ion = 9.5 + 0.25 * k; });
  return list;
})();
// slow wobble of an atom in the gas
function atomPos(a, t) { return [a.x + 3 * Math.sin(t * 0.9 + a.w), a.y + 3 * Math.cos(t * 0.7 + a.w * 1.3)]; }
// a proton leaving its atom: drifts, then is pulled to the slit, then flies on into the vacuum chamber
function injPos(i, tIn, t) {
  const a = ATOMS[i], [x0, y0] = atomPos(a, Math.min(t, EV.pull));
  if (t < EV.pull) return [x0, y0];
  const tStart = EV.pull, u = clamp((t - tStart) / (tIn - tStart), 0, 1);
  if (t <= tIn) { const e = u * u; return [lerp(x0, AT.wall0 - 2, e), lerp(y0, 0, Math.min(1, e * 1.2))]; }
  const dt = t - tIn, sp = 2 * (AT.wall0 - 2 - x0) / (tIn - tStart);   // keeps the speed it had at the slit
  return [AT.wall0 - 2 + sp * dt, (i % 3 - 1) * 6 * dt];
}
function atomBG(cam) {
  clear(P.BG);
  // the source interior glows faintly (the discharge); the vacuum chamber is dark
  const xw = cam.x(AT.wall0);
  if (xw > 0) { rect(0, 0, Math.min(W, xw), H, P.N2); for (let y = 0; y < H; y += 2) for (let x = 0; x < Math.min(W, xw); x += 2) if (bay(x >> 1, y >> 1) < 0.18 + 0.12 * Math.sin((x + y) * 0.02)) buf[y * W + x] = P.N3; }
  if (cam.x(AT.wall1) < W) rect(Math.max(0, cam.x(AT.wall1)), 0, W, H, P.K0);
  // the chimney wall with its slit
  const a = cam.x(AT.wall0), b = cam.x(AT.wall1), s0 = cam.y(-AT.slit), s1 = cam.y(AT.slit);
  shade(maskRR(a, -10, b, s0, 2), P.M4, P.M5, P.M2, P.M1, { k: Math.max(1, Math.round(cam.z)) });
  shade(maskRR(a, s1, b, H + 10, 2), P.M4, P.M5, P.M2, P.M1, { k: Math.max(1, Math.round(cam.z)) });
}
function drawAtom(cam, a, t, k) {
  const [x, y] = atomPos(a, t), sx = cam.x(x), sy = cam.y(y), z = cam.z;
  if (sx < -30 || sy < -30 || sx > W + 30 || sy > H + 30) return;
  const ionised = t >= a.ion;
  if (!ionised) {
    const R = AT.orb * z;
    if (R > 6) withDither(0.35 * k, () => ring(sx, sy, R, 1, P.N5));
    const ang = a.ph + t * a.sp, ex = sx + Math.cos(ang) * R, ey = sy + Math.sin(ang) * R * 0.92;
    electron(ex, ey, Math.max(1, 1.8 * z), k);
  }
  proton(sx, sy, Math.max(1.3, 3.4 * z), k);
}
// the fast electron of the discharge that ionises the atom we follow, and the electron it knocks out
function fastElectron(t) { // -> [x, y] or null
  if (t < EV.fast - 0.25 || t > EV.ionize + 0.8) return null;
  if (t <= EV.ionize) { const u = seg(t, EV.fast - 0.25, EV.ionize); return [lerp(ASTAR.x - 230, ASTAR.x - 8, u), lerp(ASTAR.y - 150, ASTAR.y - 13, u)]; }
  const u = t - EV.ionize; return [ASTAR.x - 8 - 120 * u, ASTAR.y - 13 + 240 * u];
}
function freedElectron(t) {
  if (t < EV.ionize) return null;
  const u = t - EV.ionize, a0 = 0.6 + 2.0 * EV.ionize, x0 = ASTAR.x + Math.cos(a0) * AT.orb, y0 = ASTAR.y + Math.sin(a0) * AT.orb * 0.92;
  return [x0 + 150 * u, y0 + 110 * u - 20 * u * u];
}
function atomWorld(cam, t, opt) {
  opt = opt || {};
  atomBG(cam);
  for (const a of ATOMS) {
    const inj = INJ.find(q => q[0] === ATOMS.indexOf(a));
    if (inj && t >= a.ion) continue;                       // drawn below as a travelling proton
    drawAtom(cam, a, t, 1);
  }
  // the extraction field: faint arrows toward the slit
  const fk = smooth(seg(t, EV.pull, EV.pull + 0.3));
  if (fk > 0) for (let y = -60; y <= 60; y += 30) for (const x of [-70, -38]) { const x0 = cam.x(x), y0 = cam.y(y * (x === -70 ? 1 : 0.6)), x1 = cam.x(x + 26), y1 = cam.y(y * (x === -70 ? 0.6 : 0.25)); rfArrow(x0, y0, x1, y1, 0.55 * fk); }
  // protons (bare, H+) travelling to the slit and into the vacuum chamber
  for (const [i, tIn] of INJ) {
    const a = ATOMS[i]; if (t < a.ion) continue;
    const [x, y] = injPos(i, tIn, t), sx = cam.x(x), sy = cam.y(y);
    const pk = a.star ? pulse(t, EV.bare, 0.6) : 0;
    if (pk > 0) glow(sx, sy, 16 * cam.z, P.PC2, P.PC4, pk);
    if (t > EV.pull) { const v = t <= tIn ? 1 : 0.6; streak(sx - 10 * cam.z * v, sy, sx, sy, P.PC0, P.PC1, Math.max(1, cam.z)); }
    proton(sx, sy, Math.max(1.4, 3.4 * cam.z));
  }
  // the discharge electron and the electron it frees
  const fe = fastElectron(t);
  if (fe) { const sx = cam.x(fe[0]), sy = cam.y(fe[1]); const back = t <= EV.ionize ? [-0.84, -0.54] : [0.45, -0.9]; streak(sx + back[0] * 18 * cam.z, sy + back[1] * 18 * cam.z, sx, sy, P.EL0, P.EL1, Math.max(1, cam.z)); electron(sx, sy, Math.max(1, 1.8 * cam.z)); }
  const fr = freedElectron(t);
  if (fr && t < EV.ionize + 1.2) { const sx = cam.x(fr[0]), sy = cam.y(fr[1]); streak(sx - 12 * cam.z, sy - 9 * cam.z, sx, sy, P.EL0, P.EL1, Math.max(1, cam.z)); electron(sx, sy, Math.max(1, 1.8 * cam.z)); }
  // a few residual gas molecules drifting in the vacuum chamber (almost empty)
  for (let i = 0; i < 5; i++) { const x = 60 + i * 95 + 20 * Math.sin(t * 0.4 + i), y = -220 + i * 110 + 15 * Math.cos(t * 0.5 + i * 2); const sx = cam.x(x), sy = cam.y(y); if (sx > cam.x(AT.wall1) + 4) { disc(sx, sy, Math.max(1, 2.2 * cam.z), P.M3); disc(sx + 2.5 * cam.z, sy, Math.max(1, 1.6 * cam.z), P.M3); } }
}
