'use strict';
// ============================================================================
// HOST MACHINERY inside a cell: the nucleoid (the bacterial chromosome as
// yellow looped domains), ribosomes (purple, two subunits) and the mRNA
// strands they read (host mRNA pale yellow; after the takeover viral mRNA in
// pink). Built once per cell in cell-local coordinates.
// ============================================================================
const NUCL = { cx: 0, cy: 15, rx: 58, ry: 140 };
function hostBuild(cell, nLoops, nPoly, nFree, excl) {
  excl = excl || (() => false);
  const sd = cell.seed * 1000, H_ = { loops: [], poly: [], free: [] };
  for (let k = 0; k < nLoops; k++) {
    const a = hash(sd + k * 3) * TAU, rr = Math.sqrt(hash(sd + k * 3 + 1)) * 0.78;
    const cx = NUCL.cx + Math.cos(a) * rr * NUCL.rx * (cell.r / 100), cy = NUCL.cy + Math.sin(a) * rr * NUCL.ry * (cell.hl / 260);
    const R = 11 + 11 * hash(sd + k * 3 + 2), pts = [];
    for (let i = 0; i < 7; i++) { const th = i / 7 * TAU + 0.4 * hash(sd + k * 17 + i), q = R * (0.55 + 0.6 * hash(sd + k * 23 + i)); pts.push(cx + Math.cos(th) * q, cy + Math.sin(th) * q * 1.25); }
    H_.loops.push({ pts: spline(pts, 6, true), cx, cy, k, cut: 24.35 + 3.1 * hash(sd + k * 5 + 9), ph: hash(sd + k) * TAU });
  }
  // polysomes: an mRNA strand with ribosomes queued along it
  let tries = 0;
  while (H_.poly.length < nPoly && tries++ < 400) {
    const lx = (hash(sd + 500 + tries * 3) - 0.5) * 2 * (cell.r - 26), ly = (hash(sd + 501 + tries * 3) - 0.5) * 2 * (cell.hl - 30);
    if (cellSD(cell, lx, ly) > -24 || excl(lx, ly, 26)) continue;
    const ex = (lx - NUCL.cx) / (NUCL.rx * 0.85), ey = (ly - NUCL.cy) / (NUCL.ry * 0.85); if (ex * ex + ey * ey < 1) continue;
    const ang = hash(sd + 502 + tries) * TAU, L = 26 + 22 * hash(sd + 503 + tries), pts = [];
    for (let i = 0; i <= 4; i++) { const u = i / 4 - 0.5; pts.push(lx + Math.cos(ang) * u * L - Math.sin(ang) * Math.sin(u * 5 + tries) * 4, ly + Math.sin(ang) * u * L + Math.cos(ang) * Math.sin(u * 5 + tries) * 4); }
    const path = new Path(spline(pts, 5, false)), n = 3 + Math.floor(hash(sd + 504 + tries) * 3);
    H_.poly.push({ path, n, sw: 25.0 + 2.6 * hash(sd + 505 + tries), ph: hash(sd + 506 + tries) * TAU, k: H_.poly.length });
  }
  tries = 0;
  while (H_.free.length < nFree && tries++ < 600) {
    const lx = (hash(sd + 900 + tries * 3) - 0.5) * 2 * (cell.r - 20), ly = (hash(sd + 901 + tries * 3) - 0.5) * 2 * (cell.hl - 24);
    if (cellSD(cell, lx, ly) > -19 || excl(lx, ly, 12)) continue;
    const ex = (lx - NUCL.cx) / (NUCL.rx * 0.8), ey = (ly - NUCL.cy) / (NUCL.ry * 0.8); if (ex * ex + ey * ey < 1) continue;
    H_.free.push({ x: lx, y: ly, a: hash(sd + 902 + tries) * TAU, ph: hash(sd + 903 + tries) * TAU });
  }
  return H_;
}
// one ribosome at world (x, y) facing angle a (the mRNA runs along a); size ~9 u
function ribosome(cam, x, y, a, lv) {
  const z = cam.z, sx = cam.x(x), sy = cam.y(y);
  if (sx < -12 * z || sx > W + 12 * z || sy < -12 * z || sy > H + 12 * z) return;
  if (z < 0.75) { pset(sx, sy, P.RB2); return; }
  if (z < 2.0) { disc(sx, sy, 3.6 * z, P.RB1, lv); disc(sx - 0.6 * z, sy - 0.8 * z, 2.6 * z, P.RB2, lv); if (z > 1.2) pset(sx - 1.4 * z, sy - 1.6 * z, P.RB3); return; }
  const c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c;                     // n points to the small subunit side
  const lgx = sx - nx * 1.8 * z, lgy = sy - ny * 1.8 * z, smx = sx + nx * 2.6 * z, smy = sy + ny * 2.6 * z;
  shade(maskEll(smx, smy, 3.9 * z, 2.3 * z, a), P.RB1, P.RB2, P.RB0, null);
  shade(maskEll(lgx, lgy, 4.7 * z, 3.8 * z, a), P.RB2, P.RB3, P.RB1, null, { k: Math.max(1, Math.round(z / 3)) });
  if (z > 3) { disc(lgx - 1.5 * z, lgy - 1.4 * z, 0.9 * z, P.RB3); }
}
// mRNA strand: beaded single strand
function mrnaStrand(cam, path, s0, s1, col, colD, lv) {
  const z = cam.z, step = Math.max(0.8, 1.6 / z);
  let px = null, py = null;
  for (let s = s0; s <= s1; s += step) {
    const q = path.at(s), x = cam.x(q[0]), y = cam.y(q[1]);
    if (px !== null) { if (z >= 2.5) lineW(px, py, x, y, Math.max(2, 0.9 * z), colD, lv); line(px, py, x, y, col, lv); }
    if (z >= 2.5 && Math.floor(s / 1.2) % 2 === 0) { const tg = path.tan ? path.tan(s) : [1, 0]; line(x, y, x - tg[1] * 1.6 * z, y + tg[0] * 1.6 * z, P.MR3, lv); }
    px = x; py = y;
  }
}
// the host chromosome; frag(t) handles the takeover: each loop is cut, its pieces shrink and drift
function drawNucleoid(cam, cell, H_, t, opt) {
  opt = opt || {};
  const z = cam.z, w = z >= 3 ? 2 : 1, deg = opt.degrade !== false;
  for (const L of H_.loops) {
    const pts = L.pts, n = pts.length / 2;
    const age = deg ? t - L.cut : -1;
    if (age > 14) continue;
    const pieces = age < 0 ? 1 : 4, wig = 1.2 * wob(t, 9 + (L.k % 5), L.ph);
    for (let p = 0; p < pieces; p++) {
      let a = Math.floor(p * n / pieces), b = Math.floor((p + 1) * n / pieces);
      const p0 = Math.floor(p * n / pieces), p1 = Math.floor((p + 1) * n / pieces);
      if (age >= 0) { const keep = clamp(1 - Math.max(0, age - 0.3) / (4.5 + 3 * hash(L.k * 7 + p)), 0, 1); const len = (b - a) * (0.25 + 0.75 * keep) * (keep > 0 ? 1 : 0); const mid = (a + b) / 2; a = Math.round(mid - len / 2); b = Math.round(mid + len / 2); if (b - a < 1) continue; }
      const pmx = pts[((p0 + p1) % (2 * n))] - L.cx, pmy = pts[((p0 + p1) % (2 * n)) + 1] - L.cy;
      const spread = age >= 0 ? 0.55 * eout(clamp(age / 1.5, 0, 1)) : 0;
      const dx = pmx * spread, dy = pmy * spread;
      let px = null, py = null;
      const col = age > 2.5 ? P.BD1 : P.BD2;
      for (let i = a; i <= b; i++) {
        const j = (i % n) * 2; const w2 = cellToWorld(cell, pts[j] + dx + wig * Math.sin(i * 0.7), pts[j + 1] + dy + wig * Math.cos(i * 0.6));
        const x = cam.x(w2[0]), y = cam.y(w2[1]);
        if (px !== null) { if (w > 1) lineW(px, py, x, y, w + 1, P.BD0); line(px, py, x, y, col); if (w > 1) line(px + 0.5, py - 0.5, x + 0.5, y - 0.5, age > 4 ? P.BD2 : P.BD3); }
        px = x; py = y;
      }
      if (age >= 0 && age < 0.3 && p === 0) { const j = (p0 % n) * 2, w2 = cellToWorld(cell, pts[j], pts[j + 1]); disc(cam.x(w2[0]), cam.y(w2[1]), (2 + 14 * age) * Math.max(1, z * 0.6), P.VD4, 1 - age / 0.3); }  // the cut flash
    }
  }
}
// ribosomes + their strands; vir(t, k) -> 0..1 how far strand k has switched to viral mRNA
function drawRibosomes(cam, cell, H_, t, opt) {
  opt = opt || {};
  const z = cam.z, vir = opt.vir || (() => 0);
  for (const F of H_.free) { const w2 = cellToWorld(cell, F.x + 0.8 * wob(t, 31, F.ph), F.y + 0.8 * wob(t, 33, F.ph + 1)); ribosome(cam, w2[0], w2[1], F.a + cell.a, opt.lv); }
  for (const Q of H_.poly) {
    const v = vir(t, Q.k), path = Q.path;
    const wpath = { at: s => { const q = path.at(s); return cellToWorld(cell, q[0] + 0.6 * wob(t, 23, Q.ph), q[1] + 0.6 * wob(t, 27, Q.ph)); } };
    // the strand (fades from host-yellow to viral pink)
    const step = Math.max(0.8, 1.6 / z);
    let px = null, py = null;
    for (let s = 0; s <= path.L; s += step) {
      const q = wpath.at(s), x = cam.x(q[0]), y = cam.y(q[1]);
      const isV = bay(x | 0, y | 0) < v;
      if (px !== null) { if (z >= 3) lineW(px, py, x, y, Math.max(1, 0.6 * z), isV ? P.MR1 : P.BD0); line(px, py, x, y, isV ? P.MR2 : P.BD1); }
      px = x; py = y;
    }
    for (let i = 0; i < Q.n; i++) {
      const s = ((i + 0.5) / Q.n * path.L + 2.6 * t) % path.L, q = wpath.at(s), tg = path.tan(s);
      ribosome(cam, q[0], q[1], Math.atan2(tg[1], tg[0]) + cell.a, opt.lv);
    }
  }
}
