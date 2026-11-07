'use strict';
// ============================================================================
// MOLECULE SPRITES (drawn procedurally, so they stay crisp at any zoom; sizes
// in level units, s = screen px per unit). Schematic symbols, not structures:
//   antibody  — a Y: stem (Fc) + two arms (Fab); an antigen binds at one arm tip
//   hCG       — a compact magenta two-lobed protein; a detection site on top of
//               the upper lobe, a capture site under the lower lobe
//   gold      — a ruby disk with a thin amber identity outline (teaching convention)
// Angles: a = 0 points up (dir = (sin a, -cos a)), a = PI points down.
// ============================================================================
const AB = { STEM: 4.2, ARM: 5.0, SP: 0.62, TH: 1.9 };
const RG = 6.5, NAB = 7;                       // gold radius, antibodies per conjugate
const HCG = { OFF: 2.1, RA: 3.0, RB: 2.7 };    // lobe offset from centre, upper / lower lobe radius
const dirv = a => [Math.sin(a), -Math.cos(a)];
const RAMP = {
  cy: [P.CY0, P.CY1, P.CY2, P.CY3], mi: [P.MI0, P.MI1, P.MI2, P.MI3], vi: [P.VI0, P.VI1, P.VI2, P.VI3],
  cyD: [P.CY2, P.CY3, P.CY4, P.CY4], miD: [P.MI2, P.MI3, P.MI4, P.MI4], viD: [P.VI2, P.VI3, P.VI4, P.VI4],
};
function segD2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
  let q = ((px - ax) * dx + (py - ay) * dy) / l2; q = q < 0 ? 0 : q > 1 ? 1 : q;
  const ex = ax + q * dx - px, ey = ay + q * dy - py; return ex * ex + ey * ey;
}
// antibody geometry in world units: base (stem end), hinge, the two arm tips (j = -1 left, +1 right of the stem axis)
function abGeom(bx, by, a) {
  const d = dirv(a), hx = bx + d[0] * AB.STEM, hy = by + d[1] * AB.STEM;
  const l = dirv(a - AB.SP), r = dirv(a + AB.SP);
  return { bx, by, hx, hy, lx: hx + l[0] * AB.ARM, ly: hy + l[1] * AB.ARM, rx: hx + r[0] * AB.ARM, ry: hy + r[1] * AB.ARM };
}
const abTip = (g, j) => j < 0 ? [g.lx, g.ly] : [g.rx, g.ry];
// draw an antibody from its world geometry with camera cam; ramp = [light, base, shade, outline]
function drawAbG(cam, g, ramp, o) {
  o = o || {};
  const s = cam.z, w = Math.max(1, AB.TH * s), r2 = (w / 2) * (w / 2);
  const B = [cam.x(g.bx), cam.y(g.by)], Hh = [cam.x(g.hx), cam.y(g.hy)], L = [cam.x(g.lx), cam.y(g.ly)], R = [cam.x(g.rx), cam.y(g.ry)];
  const x0 = Math.min(B[0], Hh[0], L[0], R[0]) - w, x1 = Math.max(B[0], Hh[0], L[0], R[0]) + w;
  const y0 = Math.min(B[1], Hh[1], L[1], R[1]) - w, y1 = Math.max(B[1], Hh[1], L[1], R[1]) + w;
  if (x1 < -4 || x0 > W + 4 || y1 < -4 || y0 > H + 4) return;
  if (w <= 1.5) {                                  // far away: a 1-px Y
    line(B[0], B[1], Hh[0], Hh[1], ramp[1]); line(Hh[0], Hh[1], L[0], L[1], ramp[1]); line(Hh[0], Hh[1], R[0], R[1], ramp[1]);
    return;
  }
  const m = maskFn(x0, y0, x1, y1, (px, py) => segD2(px, py, B[0], B[1], Hh[0], Hh[1]) <= r2 || segD2(px, py, Hh[0], Hh[1], L[0], L[1]) <= r2 || segD2(px, py, Hh[0], Hh[1], R[0], R[1]) <= r2);
  shade(m, ramp[1], ramp[0], ramp[2], ramp[3], { k: w > 4 ? 1 : 1 });
  if (o.hi) mOutline(m, P.LW);                    // binding flash
}
function drawAb(cam, bx, by, a, ramp, o) { const g = abGeom(bx, by, a); drawAbG(cam, g, ramp, o); return g; }

// gold nanoparticle: a 16-bit sphere in ruby with a thin amber outline
function drawGold(cam, gx, gy, o) {
  o = o || {};
  const x = cam.x(gx), y = cam.y(gy), r = RG * cam.z * (o.k === undefined ? 1 : o.k);
  if (x < -r - 3 || x > W + r + 3 || y < -r - 3 || y > H + r + 3) return;
  if (r < 1.6) { pset(x, y, P.RU1); if (r > 0.9) { pset(x + 1, y, P.RU2); pset(x, y + 1, P.RU2); pset(x - 1, y, P.AM2); } return; }
  const m = maskDisc(x, y, r);
  mFill(m, P.RU2);
  disc(x - r * 0.12, y - r * 0.12, r * 0.86, P.RU1);
  if (r > 3) disc(x - r * 0.38, y - r * 0.38, r * 0.3, P.RU0);
  if (r > 5) { pset(x - r * 0.45, y - r * 0.5, P.LW); pset(x - r * 0.45 + 1, y - r * 0.5, P.LW); }
  mOutline(m, P.RU3);
  mOuter(m, o.hi ? P.LW : P.AM1);
}
// a conjugate: gold + NAB antibodies; rot = rotation; returns the antibody geometries (world units)
function conjGeoms(gx, gy, rot) {
  const out = [];
  for (let i = 0; i < NAB; i++) { const a = rot + i * TAU / NAB, d = dirv(a); out.push(abGeom(gx + d[0] * (RG - 0.6), gy + d[1] * (RG - 0.6), a)); }
  return out;
}
function drawConj(cam, gx, gy, rot, o) {
  o = o || {};
  const s = cam.z;
  if (s * (RG + AB.STEM + AB.ARM) < 3) {           // very far: a ruby pixel with a cyan fleck
    const x = cam.x(gx), y = cam.y(gy); pset(x, y, P.RU1); pset(x + 1, y - 1, P.CY2); return null;
  }
  const gs = conjGeoms(gx, gy, rot);
  gs.forEach((g, i) => drawAbG(cam, g, o.dim ? RAMP.cyD : RAMP.cy, { hi: o.hiAb === i }));
  drawGold(cam, gx, gy, { hi: o.hiGold });
  return gs;
}
// hCG: two lobes along axis angle b (upper lobe toward dir(b)); returns world positions of the two binding sites
function hcgSites(cx, cy, b) {
  const d = dirv(b);
  return { top: [cx + d[0] * (HCG.OFF + HCG.RA), cy + d[1] * (HCG.OFF + HCG.RA)], bot: [cx - d[0] * (HCG.OFF + HCG.RB), cy - d[1] * (HCG.OFF + HCG.RB)] };
}
function drawHCG(cam, cx, cy, b, o) {
  o = o || {};
  const s = cam.z, d = dirv(b);
  const ax = cam.x(cx + d[0] * HCG.OFF), ay = cam.y(cy + d[1] * HCG.OFF), bx_ = cam.x(cx - d[0] * HCG.OFF), by_ = cam.y(cy - d[1] * HCG.OFF);
  const ra = HCG.RA * s, rb = HCG.RB * s;
  if (Math.max(ax, bx_) < -ra - 2 || Math.min(ax, bx_) > W + ra + 2 || Math.max(ay, by_) < -ra - 2 || Math.min(ay, by_) > H + ra + 2) return;
  if (ra < 1.4) { pset(ax, ay, P.MG1); pset(bx_, by_, P.MG2); return; }
  const m = maskFn(Math.min(ax, bx_) - ra, Math.min(ay, by_) - ra, Math.max(ax, bx_) + ra, Math.max(ay, by_) + ra,
    (px, py) => (px - ax) * (px - ax) + (py - ay) * (py - ay) <= ra * ra || (px - bx_) * (px - bx_) + (py - by_) * (py - by_) <= rb * rb);
  const ramp = o.dim ? [P.MG2, P.MG2, P.MG3, P.MG4] : [P.MG0, P.MG1, P.MG2, P.MG3];
  shade(m, ramp[1], ramp[0], ramp[2], ramp[3], { k: 1 });
  // the seam between the two subunits
  if (ra > 3) { const mx = (ax + bx_) / 2, my = (ay + by_) / 2, px = -d[1], py = d[0]; line(mx - px * ra * 0.6, my - py * ra * 0.6, mx + px * ra * 0.6, my + py * ra * 0.6, ramp[2]); }
  if (o.hi) mOuter(m, P.LW);
  if (o.sites && ra > 2.5) {                       // two accessible sites: small pale bumps
    const st = hcgSites(cx, cy, b);
    for (const p of [st.top, st.bot]) { const x = cam.x(p[0]), y = cam.y(p[1]); rect(x - 1, y - 1, x + 1, y + 1, P.MG0); }
  }
}
// subdued non-target molecules
function drawJunk(cam, x, y, kind, a) {
  const s = cam.z, sx = cam.x(x), sy = cam.y(y);
  if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) return;
  if (kind === 0) { const d = dirv(a); disc(sx, sy, 1.3 * s, P.DB2); disc(sx + d[0] * 1.8 * s, sy + d[1] * 1.8 * s, 1.0 * s, P.DB1); disc(sx - d[0] * 1.8 * s, sy - d[1] * 1.8 * s, 1.0 * s, P.DB1); }
  else { const m = maskEll(sx, sy, 3.2 * s, 2.2 * s, a); shade(m, P.DB1, P.DB2, P.DB0, P.DB0, { k: 1 }); }
}
// binding sparkle: stepped 4-point star (3 frames big, 3 small, then a dot)
function sparkle(x, y, age, col) {
  if (age < 0 || age > 0.3) return;
  col = col || P.LW;
  const st = Math.floor(age / 0.05), L = st < 2 ? 5 : st < 4 ? 3 : 1;
  x = Math.round(x); y = Math.round(y);
  for (let i = 1; i <= L; i++) { pset(x + i, y, col); pset(x - i, y, col); pset(x, y + i, col); pset(x, y - i, col); }
  pset(x, y, P.LW);
  if (st < 2) { pset(x + 2, y + 2, col); pset(x - 2, y - 2, col); pset(x + 2, y - 2, col); pset(x - 2, y + 2, col); }
}
// game lock-on bracket around (x, y), half size r; shrinks in on t0 in 3 steps, then blinks
function bracket(x, y, r, t0, t, col) {
  if (t < t0) return;
  col = col || P.TE0;
  const age = t - t0, st = Math.min(3, Math.floor(age / 0.06));
  if (st >= 3 && Math.floor(age * 5) % 2 === 1 && age < 1.2) return;
  const rr = Math.round(r * (1 + 0.5 * (3 - st) / 3)), L = Math.max(3, Math.round(rr * 0.4));
  x = Math.round(x); y = Math.round(y);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const cx = x + sx * rr, cy = y + sy * rr;
    rect(Math.min(cx, cx - sx * L), cy, Math.max(cx, cx - sx * L) + 1, cy + 1, col);
    rect(cx, Math.min(cy, cy - sy * L), cx + 1, Math.max(cy, cy - sy * L) + 1, col);
  }
}
