'use strict';
// ============================================================================
// BLOOD AND HEMOGLOBIN (px world units). The artery's interior with glossy
// biconcave red cells in three depth layers; the inside of one red cell
// packed with hemoglobin; single hemoglobin molecules: four globin subunits,
// each holding a heme group with an iron atom that can bind one O2.
// Oxyhemoglobin is bright red with glowing O2 markers and a tighter
// (relaxed, R) shape; deoxyhemoglobin is dark maroon with the subunits a
// little apart (tense, T) and empty heme pockets.
// ============================================================================
// a red blood cell: a disc of radius R with unit normal (nx, ny, nz) seen from +z; k = depth tint (0 near .. 1 far)
function rbc3(x, y, R, nx, ny, nz, k) {
  if (R < 2) { pset(x, y, P.RB2); return; }
  const tilt = Math.abs(nz), ang = Math.atan2(ny, nx) + Math.PI / 2;
  const rx = R, ry = Math.max(R * 0.18, R * tilt);
  const far = k || 0, base = far > 0.6 ? P.RB1 : P.RB2, lit = far > 0.6 ? P.RB2 : P.RB3, hi = far > 0.6 ? P.RB3 : P.RB4, dark = far > 0.6 ? P.RB0 : P.RB1;
  const m = maskEll(x, y, rx, ry, ang);
  shade(m, base, lit, dark, null, { k: Math.max(1, Math.round(R / 9)), kh: Math.max(1, Math.round(R / 8)) });
  if (tilt > 0.3 && R > 5) {
    ellipse(x + R * 0.05, y + R * 0.06, rx * 0.56, ry * 0.56, dark, 1, ang);
    ellipse(x + R * 0.1, y + R * 0.12, rx * 0.42, ry * 0.4, base, 1, ang);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let a = 3.6; a < 5.4; a += 0.12) { const px = x + (Math.cos(a) * rx * 0.8) * ca - (Math.sin(a) * ry * 0.8) * sa, py = y + (Math.cos(a) * rx * 0.8) * sa + (Math.sin(a) * ry * 0.8) * ca; pset(px, py, hi); if (R > 14) pset(px + 1, py, hi); }
    if (R > 10 && far < 0.6) { const px = x - rx * 0.45 * ca + ry * 0.2 * sa, py = y - rx * 0.45 * sa - ry * 0.2 * ca; disc(px, py, Math.max(1, R * 0.08), P.RB5); }
  } else if (R > 5) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    line(x - rx * 0.8 * ca, y - rx * 0.8 * sa - 1, x + rx * 0.8 * ca, y + rx * 0.8 * sa - 1, hi);
  }
}
// ---------------------------------------------------------------- the artery interior (flow upward, toward the fingertip)
const RBCS = [];
for (let i = 0; i < 120; i++) RBCS.push({ x: (hash(i + 1101) - 0.5) * 330, y: hash(i + 1100) * 1500, layer: i < 26 ? 2 : i < 64 ? 1 : 0, ph: hash(i + 1102) * TAU, sp: 0.8 + 0.4 * hash(i + 1103), tilt: hash(i + 1104) });
function vesselWall(cam, xEdge, sgn) {
  const bumpC = new Float32Array(H), phC = new Float32Array(H);
  for (let sy = 0; sy < H; sy++) { const wy = cam.wy(sy + 0.5); bumpC[sy] = 7 * fsin(wy * 0.045 + sgn) + 4 * fsin(wy * 0.11 + 2); phC[sy] = wy * 0.02 + 3 * fsin(wy * 0.006); }
  for (let sx = 0; sx < W; sx++) {
    const wx = cam.wx(sx + 0.5), d0 = (wx - xEdge) * sgn;
    if (d0 < -14) continue;
    for (let sy = 0; sy < H; sy++) {
      const dd = d0 + bumpC[sy]; if (dd < 0) continue;
      const streak = fsin(phC[sy] + dd * 0.35) > 0.55;
      let c = dd < 6 ? P.WA4 : dd < 14 ? P.WA3 : dd < 40 ? (streak ? P.WA3 : P.WA2) : dd < 90 ? (streak ? P.WA2 : P.WA1) : (streak ? P.WA1 : P.WA0);
      if (dd < 6 && bay(sx, sy) < 0.4) c = P.AR5;
      buf[sy * W + sx] = c;
    }
  }
}
// the lumen: plasma haze, red cells flowing up in three layers; walls at x = +-halfW; o.swell (0..1) widens it with the pulse
function drawVessel(cam, t, o) {
  o = o || {};
  rect(0, 0, W, H, P.RB0); rect(0, 0, W, H, P.AR1, 0.55);
  for (let x = 0; x < W; x++) { const d = 1 - Math.abs(cam.wx(x)) / 190; if (d > 0.35) rect(x, 0, x + 1, H, P.TS1, (d - 0.35) * 0.8); }
  const flow = o.flow === undefined ? t * 110 : o.flow, span = 1500, hw = 190 * (1 + 0.08 * (o.swell || 0));
  for (const layer of [0, 1, 2]) {
    const par = [0.45, 0.72, 1][layer], R = [10, 17, 28][layer] * cam.z;
    for (const c of RBCS) {
      if (c.layer !== layer) continue;
      const y = ((c.y - flow * c.sp - cam.cy * par) % span + span) % span - span / 2;
      const sy = CY + y * cam.z, sx = cam.x(c.x * (0.6 + 0.4 * par) * hw / 190) + 6 * Math.sin(t * 1.3 + c.ph);
      if (sy < -40 || sy > H + 40) continue;
      const a = t * 0.9 * c.sp + c.ph, nz = 0.25 + 0.75 * Math.abs(Math.cos(a * 0.6 + c.tilt * 3));
      rbc3(sx, sy, R, Math.cos(a), Math.sin(a), nz, 1 - layer / 2);
    }
  }
  vesselWall(cam, -hw, -1); vesselWall(cam, hw, 1);
}
// ---------------------------------------------------------------- hemoglobin
// one globin subunit: a lumpy globule, flat-shaded (outline, base, lit side, highlight) from stacked discs
const LUMPS = [[0, 0, 1], [0.42, -0.3, 0.62], [-0.38, 0.36, 0.6], [0.2, 0.5, 0.55]];
function globule(x, y, r, ramp, seed) {
  const a = seed * 2.1, ca = Math.cos(a), sa = Math.sin(a), L = LUMPS.map(([dx, dy, s]) => [x + (dx * ca - dy * sa) * r * 0.7, y + (dx * sa + dy * ca) * r * 0.7, r * s]);
  for (const [cx, cy, rr] of L) disc(cx, cy, rr + 1, ramp[0]);                                   // outline
  for (const [cx, cy, rr] of L) disc(cx, cy, rr, ramp[1]);                                       // shadow side
  for (const [cx, cy, rr] of L) disc(cx - rr * 0.12, cy - rr * 0.12, rr * 0.86, ramp[2]);        // base
  for (const [cx, cy, rr] of L) disc(cx - rr * 0.3, cy - rr * 0.32, rr * 0.5, ramp[3]);          // lit side
  disc(x - r * 0.32, y - r * 0.36, Math.max(1, r * 0.2), ramp[4]);
  if (r > 14) disc(x - r * 0.42, y - r * 0.46, Math.max(1, r * 0.08), ramp[5]);
}
// an O2 molecule: two fused cyan spheres with a soft glow
function o2Mol(x, y, s, ang, glowK) {
  const dx = Math.cos(ang) * s * 0.55, dy = Math.sin(ang) * s * 0.55;
  if (glowK > 0) glow(x, y, s * 2.4, P.OX1, P.OX2, glowK);
  for (const sg of [-1, 1]) { disc(x + dx * sg, y + dy * sg, s * 0.62, P.OX0); disc(x + dx * sg, y + dy * sg, s * 0.52, P.OX2); disc(x + dx * sg - s * 0.15, y + dy * sg - s * 0.18, Math.max(1, s * 0.2), P.OX4); }
}
// hemoglobin at (x, y), radius R; oxy: how many of the 4 hemes hold O2 (0..4, fractional = arriving); state 'oxy'|'deoxy' colours
function hbSprite(x, y, R, rot, nO2, t, opt) {
  opt = opt || {};
  const oxyCol = opt.col === undefined ? nO2 >= 2 : opt.col === 'oxy';
  const rampA = oxyCol ? [P.OH0, P.OH1, P.OH2, P.OH3, P.OH4, P.OH5] : [P.DH0, P.DH1, P.DH2, P.DH3, P.DH4, P.DH5];
  const rampB = oxyCol ? [P.OH0, P.OH1, P.OH1, P.OH2, P.OH3, P.OH4] : [P.DH0, P.DH0, P.DH1, P.DH2, P.DH3, P.DH4];
  const spread = oxyCol ? 0.4 : 0.47, r = R * 0.52;
  // back pair then front pair (alpha subunits lighter, beta darker)
  const subs = [0, 1, 2, 3].map(i => { const a = rot + Math.PI / 4 + i * Math.PI / 2; return { i, x: x + Math.cos(a) * R * spread, y: y + Math.sin(a) * R * spread * 0.9, a }; });
  subs.sort((p, q) => p.y - q.y);
  for (const s of subs) {
    globule(s.x, s.y, r, s.i % 2 ? rampB : rampA, s.i + 1);
    // heme pocket on the outer face, with the iron atom
    const hx = s.x + Math.cos(s.a) * r * 0.55, hy = s.y + Math.sin(s.a) * r * 0.5, hs = Math.max(2, r * 0.28);
    poly([hx - hs, hy, hx, hy - hs * 0.55, hx + hs, hy, hx, hy + hs * 0.55], P.HM1); poly([hx - hs * 0.7, hy, hx, hy - hs * 0.38, hx + hs * 0.7, hy, hx, hy + hs * 0.38], P.HM2);
    disc(hx, hy, Math.max(1, hs * 0.28), P.HM3);
    // bound O2 (sits on the iron, pointing outward)
    const k = clamp(nO2 - s.i, 0, 1);
    if (k > 0) {
      const ox = hx + Math.cos(s.a) * hs * (1.4 + 3 * (1 - k)), oy = hy + Math.sin(s.a) * hs * (1.4 + 3 * (1 - k));
      o2Mol(ox, oy, Math.max(2, r * 0.32), s.a + 0.6, opt.glow === undefined ? 0.45 + 0.25 * Math.sin(t * 6 + s.i) : opt.glow);
    }
  }
}
// ---------------------------------------------------------------- inside a red cell: crowded hemoglobin
const HBF = [];
for (let i = 0; i < 46; i++) HBF.push({ x: (hash(i + 3100) - 0.5) * 420, y: (hash(i + 3101) - 0.5) * 700, z: 0.55 + 0.6 * hash(i + 3102), rot: hash(i + 3103) * TAU, o2: hash(i + 3104) < 0.72 ? 4 : hash(i + 3105) < 0.5 ? 0 : 2, ph: hash(i + 3106) * TAU });
function rbcInterior(cam, t, o) {
  rect(0, 0, W, H, P.RB1); rect(0, 0, W, H, P.RB0, 0.45);
  for (let y = 0; y < H; y += 3) rect(0, y, W, y + 1, P.RB2, 0.12);
  const order = HBF.slice().sort((a, b) => a.z - b.z);
  for (const h of order) {
    const x = cam.x(h.x + 9 * Math.sin(t * 0.8 + h.ph)), y = cam.y(h.y + 7 * Math.cos(t * 0.7 + h.ph)), R = 26 * h.z * cam.z;
    if (x < -R * 2 || x > W + R * 2 || y < -R * 2 || y > H + R * 2) continue;
    hbSprite(x, y, R, h.rot + t * 0.25 * (h.ph > 3 ? 1 : -1), h.o2, t, { glow: h.z > 0.9 ? 0.45 : 0.2 });
    if (h.z < 0.8) rect(x - R, y - R, x + R, y + R, P.RB0, 0.25 * (0.8 - h.z) / 0.25);
  }
  // free O2 drifting between them
  for (let i = 0; i < 14; i++) { const x = cam.x((hash(i + 3300) - 0.5) * 420 + 30 * Math.sin(t * 1.1 + i)), y = cam.y((hash(i + 3301) - 0.5) * 700 - 20 * Math.cos(t * 0.9 + i)); o2Mol(x, y, 4 * cam.z, t + i, 0.25); }
}
