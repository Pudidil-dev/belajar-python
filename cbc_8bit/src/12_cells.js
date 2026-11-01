'use strict';
// ============================================================================
// BLOOD CELLS (screen px; scale set by the caller). Relative sizes follow the
// real cells: red cell ~7.5 µm, platelet ~2.5 µm, white cells 10–15 µm.
// Red cell: a biconcave disc with no nucleus — face-on it reads as a bright rim
// round a dimpled centre, edge-on as a dumbbell; it tumbles as it flows.
// White cell: off-white with granules and a purple nucleus whose shape depends
// on the type (segmented neutrophil, round lymphocyte, kidney monocyte,
// bilobed eosinophil with orange granules, basophil with dark granules).
// Platelet: a small irregular violet fragment with a few granules.
// ============================================================================
const UM = 4;                              // world units per micrometre (1 µm = 4 px at z = 1)
const R_RBC = 3.75 * UM, R_PLT = 1.25 * UM, R_WBC = 6.2 * UM;
// red cell: (x, y) centre, r radius px, tilt 0 (face-on) .. 1 (edge-on), rot (in-plane angle)
function rbc(x, y, r, tilt, rot, o) {
  o = o || {};
  const asp = Math.max(0.26, Math.cos(tilt * Math.PI / 2)), rx = r, ry = r * asp;
  const c0 = o.ghost ? P.RB1 : P.RB0, c1 = o.ghost ? P.RB1 : P.RB1, c2 = o.ghost ? P.RB1 : P.RB2, c3 = o.ghost ? P.RB2 : P.RB3;
  if (o.ghost) { ellipse(x, y, rx + 1, ry + 1, c0, o.lv === undefined ? 0.55 : o.lv, rot); ellipse(x, y, rx - 1.5, ry - 1.5, P.BG, o.lv === undefined ? 0.55 : o.lv, rot); return; }
  ellipse(x, y, rx + 1, ry + 1, c0, o.lv, rot);
  if (asp > 0.45) {
    // face-on-ish: bright rim, darker dimpled centre, highlight on the upper-left rim
    ellipse(x, y, rx, ry, c3, o.lv, rot);
    const ca = Math.cos(rot), sa = Math.sin(rot);
    ellipse(x + ca * r * 0.06, y + sa * r * 0.06 + r * 0.05, rx * 0.56, ry * 0.56, c2, o.lv, rot);
    ellipse(x + ca * r * 0.1, y + sa * r * 0.1 + r * 0.08, rx * 0.34, ry * 0.34, c1, o.lv, rot);
    if (r > 6) disc(x - rx * 0.5, y - ry * 0.55, Math.max(1, r * 0.12), P.RB4, o.lv);
  } else {
    // edge-on: a dumbbell, thick rims at both ends, thin in the middle
    ellipse(x, y, rx, ry, c2, o.lv, rot);
    const ca = Math.cos(rot), sa = Math.sin(rot);
    for (const s of [-1, 1]) { disc(x + ca * rx * 0.66 * s, y + sa * rx * 0.66 * s, ry * 1.25, c0, o.lv); disc(x + ca * rx * 0.66 * s, y + sa * rx * 0.66 * s, ry * 1.12, c3, o.lv); disc(x + ca * rx * 0.66 * s - ry * 0.3, y + sa * rx * 0.66 * s - ry * 0.3, ry * 0.45, P.RB4, o.lv); }
    ellipse(x, y, rx * 0.5, ry * 0.55, c1, o.lv, rot);
  }
}
// white cell: kind 'neut' | 'lymph' | 'mono' | 'eo' | 'baso'; o: { pores, dye (0..1 bound), glow (0..1 excited), cut (show nucleic acids) }
function wbc(x, y, r, kind, rot, o) {
  o = o || {};
  const lv = o.lv;
  // membrane (slightly lumpy), cytoplasm
  for (let i = 0; i < 9; i++) { const a = rot + i * TAU / 9, rr = r * (0.9 + 0.08 * Math.sin(i * 2.7 + 1)); disc(x + Math.cos(a) * rr * 0.18, y + Math.sin(a) * rr * 0.18, rr + 1, P.WB0, lv); }
  for (let i = 0; i < 9; i++) { const a = rot + i * TAU / 9, rr = r * (0.9 + 0.08 * Math.sin(i * 2.7 + 1)); disc(x + Math.cos(a) * rr * 0.18, y + Math.sin(a) * rr * 0.18, rr, P.WB2, lv); }
  disc(x - r * 0.12, y - r * 0.14, r * 0.78, P.WB3, lv); disc(x - r * 0.42, y - r * 0.46, r * 0.14, P.WB4, lv);
  // granules
  const gcol = kind === 'eo' ? P.SO1 : kind === 'baso' ? P.NU0 : P.WB1, ng = kind === 'eo' || kind === 'baso' ? 26 : 14;
  for (let i = 0; i < ng; i++) { const a = hash(i + 50) * TAU, d = Math.sqrt(hash(i + 51)) * r * 0.82; disc(x + Math.cos(a + rot) * d, y + Math.sin(a + rot) * d, Math.max(1, r * (kind === 'eo' ? 0.07 : 0.05)), gcol, lv); }
  // nucleus
  const ca = Math.cos(rot), sa = Math.sin(rot), R = (dx, dy) => [x + (dx * ca - dy * sa) * r, y + (dx * sa + dy * ca) * r];
  const lobes = kind === 'neut' ? [[-0.36, 0.08, 0.26], [0.02, -0.22, 0.27], [0.36, 0.1, 0.25]]
    : kind === 'lymph' ? [[0.04, 0.02, 0.64]]
    : kind === 'mono' ? [[-0.2, -0.1, 0.4], [0.16, -0.18, 0.36], [0.28, 0.16, 0.3], [-0.24, 0.24, 0.3]]
    : kind === 'eo' ? [[-0.3, 0.05, 0.3], [0.3, 0.02, 0.3]]
    : [[-0.1, 0, 0.36], [0.2, 0.08, 0.3]];
  const L = lobes.map(([dx, dy, rr]) => { const [px, py] = R(dx, dy); return [px, py, rr * r]; });
  if (kind === 'neut') for (let i = 0; i + 1 < L.length; i++) lineW(L[i][0], L[i][1], L[i + 1][0], L[i + 1][1], Math.max(1.5, r * 0.12), P.NU1, lv);
  for (const [px, py, rr] of L) disc(px, py, rr + 1, P.NU0, lv);
  for (const [px, py, rr] of L) disc(px, py, rr, P.NU1, lv);
  for (const [px, py, rr] of L) disc(px - rr * 0.25, py - rr * 0.28, rr * 0.55, P.NU2, lv);
  for (const [px, py, rr] of L) if (rr > 4) disc(px - rr * 0.4, py - rr * 0.42, Math.max(1, rr * 0.16), P.NU3, lv);
  // after the lysis reagent: small pores in the membrane
  if (o.pores > 0) for (let i = 0; i < 10; i++) { const a = rot + i * TAU / 10 + 0.2; disc(x + Math.cos(a) * r * 0.93, y + Math.sin(a) * r * 0.93, Math.max(1, r * 0.05) * o.pores, P.BG, lv); }
  // dye bound to nucleic acids (DNA in the nucleus, RNA in the cytoplasm): dim until excited
  if (o.dye > 0) {
    const n = Math.floor(o.dye * 40);
    for (let i = 0; i < n; i++) {
      const inNuc = i % 3 !== 0, lb = L[i % L.length], a = hash(i + 300) * TAU, d = Math.sqrt(hash(i + 301));
      const px = inNuc ? lb[0] + Math.cos(a) * d * lb[2] * 0.8 : x + Math.cos(a) * d * r * 0.8, py = inNuc ? lb[1] + Math.sin(a) * d * lb[2] * 0.8 : y + Math.sin(a) * d * r * 0.8;
      const lit = o.glow > 0;
      disc(px, py, Math.max(1, r * 0.045), lit ? P.EM2 : P.DY1, lv);
    }
  }
  if (o.glow > 0) glow(x, y, r * 1.6, P.EM1, P.EM2, o.glow * 0.7);
}
// platelet: small irregular fragment
function platelet(x, y, r, rot, o) {
  o = o || {};
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const parts = [[0, 0, 1], [0.5, -0.2, 0.62], [-0.45, 0.25, 0.58]];
  for (const [dx, dy, s] of parts) disc(x + (dx * ca - dy * sa) * r, y + (dx * sa + dy * ca) * r, r * s + 1, P.PL0, o.lv);
  for (const [dx, dy, s] of parts) disc(x + (dx * ca - dy * sa) * r, y + (dx * sa + dy * ca) * r, r * s, P.PL2, o.lv);
  disc(x - r * 0.25, y - r * 0.3, r * 0.4, P.PL3, o.lv);
  if (r > 4) { disc(x + r * 0.2, y + r * 0.15, Math.max(1, r * 0.16), P.PL0, o.lv); disc(x - r * 0.3, y + r * 0.3, Math.max(1, r * 0.12), P.PL1, o.lv); }
}
// ---------------------------------------------------------------- a flowing suspension (world coords)
// cells move with the fluid at speed v (world units / s) along +x, wrap inside [x0, x1]; density by kind
function makeSuspension(seed, n, kinds, x0, x1, y0, y1) {
  const r = mulberry(seed), out = [];
  for (let i = 0; i < n; i++) {
    const u = r(); let k = 'rbc'; let acc = 0; for (const [kk, p] of kinds) { acc += p; if (u < acc) { k = kk; break; } }
    out.push({ k, x: x0 + r() * (x1 - x0), y: y0 + r() * (y1 - y0), ph: r() * TAU, sp: 0.75 + 0.5 * r(), tilt: r(), wt: ['neut', 'neut', 'lymph', 'mono', 'eo'][Math.floor(r() * 5)] });
  }
  return { cells: out, x0, x1, y0, y1 };
}
function cellPos(c, S, t, v) {
  const W_ = S.x1 - S.x0;
  let x = c.x + t * v * c.sp; x = S.x0 + (((x - S.x0) % W_) + W_) % W_;
  return [x, c.y + 6 * Math.sin(t * 0.9 + c.ph)];
}
// draw a suspension through a camera; o: { v, scale, only (filter), spread (0..1 dilution), cx, cy (spread centre) }
function drawSuspension(cam, S, t, o) {
  o = o || {};
  const z = cam.z * (o.scale || 1), v = o.v === undefined ? 40 : o.v, sp = o.spread || 0;
  for (const c of S.cells) {
    if (o.only && !o.only(c)) continue;
    let [x, y] = cellPos(c, S, t, v);
    if (sp > 0) { const cx = o.cx || 0, cy = o.cy || 0; x = cx + (x - cx) * (1 + sp * 1.6); y = cy + (y - cy) * (1 + sp * 1.6); }
    const sx = cam.x(x), sy = cam.y(y); if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    const tilt = 0.5 + 0.5 * Math.sin(t * 1.3 * c.sp + c.ph * 3);
    if (c.k === 'rbc') rbc(sx, sy, R_RBC * z, tilt, c.ph + t * 0.4, { lv: o.lv });
    else if (c.k === 'plt') platelet(sx, sy, R_PLT * z, c.ph + t, { lv: o.lv });
    else wbc(sx, sy, R_WBC * z, c.wt, c.ph * 2 + t * 0.3, { lv: o.lv });
  }
}
