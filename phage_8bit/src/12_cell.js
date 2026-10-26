'use strict';
// ============================================================================
// E. COLI CELL — a capsule drawn as a cutaway at every scale.
// Gram-negative envelope (outside -> in): LPS fringe with OmpC receptor
// barrels, outer membrane (lipid bilayer), periplasm with the peptidoglycan
// cell wall (glycan strands + peptide cross-links), inner membrane, then the
// crowded cytoplasm (nucleoid DNA, ribosomes). Envelope ~13 u (~40 nm).
// Two passes: interior fill first (contents are drawn on top of it), then
// the envelope bands over everything, so contents never cover the membranes.
// Local frame: long axis = local y; pole tips at y = -hl / +hl.
// ============================================================================
const ENV = { om: 4, pe: 9, im: 13 };                 // depth (u) of the band bottoms below the outer surface
const DBUF = new Float32Array(W * H), SBUF = new Float32Array(W * H), LBUF = new Float32Array(W * H);
const CBOX = { x0: 0, y0: 0, x1: 0, y1: 0 };
const LIGHT = [-0.6, -0.8];
function cellToLocal(cell, wx, wy) { const dx = wx - cell.cx, dy = wy - cell.cy, c = Math.cos(cell.a), s = Math.sin(cell.a); return [dx * c + dy * s, -dx * s + dy * c]; }
function cellToWorld(cell, lx, ly) { const c = Math.cos(cell.a), s = Math.sin(cell.a); return [cell.cx + lx * c - ly * s, cell.cy + lx * s + ly * c]; }
function cellR(cell) { return cell.r * (1 + (cell.swell || 0)); }
function cellSD(cell, lx, ly) { const r = cellR(cell), hc = cell.hl - cell.r; const qy = clamp(ly, -hc, hc); return Math.hypot(lx, ly - qy) - r; }
// arc-length coordinate around the outline (continuous everywhere except the lower left seam)
function cellS(cell, lx, ly) {
  const r = cellR(cell), hc = cell.hl - cell.r;
  if (ly < -hc) return Math.atan2(lx, -(ly + hc)) * r;
  if (ly > hc) return (Math.PI / 2) * r + 2 * hc + Math.atan2(ly - hc, lx) * r;
  return lx >= 0 ? (Math.PI / 2) * r + (ly + hc) : -(Math.PI / 2) * r - (ly + hc);
}
function cellPerim(cell) { return 2 * Math.PI * cellR(cell) + 4 * (cell.hl - cell.r); }
// point on the outline at arc-length s, depth dd below the outer surface: world [x, y] and outward normal
function cellAt(cell, s, dd) {
  const r = cellR(cell), hc = cell.hl - cell.r, Lp = cellPerim(cell), q = Math.PI / 2 * r;
  s = ((s + q) % Lp + Lp) % Lp - q;     // wrap into [-q, Lp - q)
  let lx, ly, nx, ny;
  if (s < q && s >= -q) { const th = s / r; nx = Math.sin(th); ny = -Math.cos(th); lx = nx * (r - dd); ly = -hc + ny * (r - dd); }
  else if (s < q + 2 * hc) { nx = 1; ny = 0; lx = r - dd; ly = -hc + (s - q); }
  else if (s < 3 * q + 2 * hc) { const th = (s - q - 2 * hc) / r; nx = Math.cos(th); ny = Math.sin(th); lx = nx * (r - dd); ly = hc + ny * (r - dd); }
  else { nx = -1; ny = 0; lx = -(r - dd); ly = hc - (s - 3 * q - 2 * hc); }
  const w = cellToWorld(cell, lx, ly), c = Math.cos(cell.a), sn = Math.sin(cell.a);
  return [w[0], w[1], nx * c - ny * sn, nx * sn + ny * c];
}
function cellScreenBox(cam, cell, m) {
  const R = cellR(cell) + m, pts = [[-R, -cell.hl - m], [R, -cell.hl - m], [R, cell.hl + m], [-R, cell.hl + m]].map(([x, y]) => cellToWorld(cell, x, y));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { const sx = cam.x(x), sy = cam.y(y); x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
  CBOX.x0 = Math.max(0, Math.floor(x0)); CBOX.y0 = Math.max(0, Math.floor(y0)); CBOX.x1 = Math.min(W, Math.ceil(x1)); CBOX.y1 = Math.min(H, Math.ceil(y1));
  return CBOX.x0 < CBOX.x1 && CBOX.y0 < CBOX.y1;
}
// ---------------------------------------------------------------- pass 1: interior (cytoplasm)
function cellInterior(cam, cell, t) {
  if (!cellScreenBox(cam, cell, 6)) return false;
  const z = cam.z, iz = 1 / z, c = Math.cos(cell.a), s = Math.sin(cell.a), r = cellR(cell), hc = cell.hl - cell.r;
  const needS = (z >= 1.15 && cell.detail) || !!cell.gapFn || !!cell.crackFn || !!cell.bulge;
  const dim = cell.dim || 0, op = cell.open || 0;
  const C0 = P.CY0, C1 = P.CY1, C2 = P.CY2, C3 = P.CY3;
  for (let sy = CBOX.y0; sy < CBOX.y1; sy++) {
    const wy = (sy + 0.5 - cam.ay) * iz + cam.cy, dyw = wy - cell.cy;
    for (let sx = CBOX.x0; sx < CBOX.x1; sx++) {
      const wx = (sx + 0.5 - cam.ax) * iz + cam.cx, dxw = wx - cell.cx;
      const lx = dxw * c + dyw * s, ly = -dxw * s + dyw * c;
      const qy = ly < -hc ? -hc : ly > hc ? hc : ly, vy = ly - qy, dist = Math.sqrt(lx * lx + vy * vy);
      let d = dist - r;
      const i = sy * W + sx;
      if (cell.bulge && d > -40) { const sv0 = cellS(cell, lx, ly); d -= cell.bulge(sv0); SBUF[i] = sv0; }
      DBUF[i] = d;
      if (d > 4) continue;
      const nwx = (lx * c - vy * s) / (dist || 1), nwy = (lx * s + vy * c) / (dist || 1);
      const lit = LIGHT[0] * nwx + LIGHT[1] * nwy;
      LBUF[i] = lit;
      if (needS && !(cell.bulge && d > -40)) SBUF[i] = cellS(cell, lx, ly);
      if (d > -ENV.im) continue;
      if (op > 0 && cell.openFn && cell.openFn(lx, ly, d)) continue;      // ruptured: contents gone, fluid shows through
      let col = C1;
      if (d > -ENV.im - 5 * Math.max(1, iz)) col = lit > 0.25 ? C2 : lit < -0.3 && bay(sx, sy) < 0.6 ? C0 : C1;
      else if (lit < -0.2 && d > -40 && bay(sx, sy) < 0.25) col = C0;
      if (dim > 0 && bay(sx, sy) < dim) col = P.N2;
      buf[i] = col;
    }
  }
  return true;
}
// ---------------------------------------------------------------- pass 2: the envelope bands
function cellEnvelope(cam, cell, t) {
  if (!cellScreenBox(cam, cell, 6)) return;
  const z = cam.z, iz = 1 / z, hi = z >= 2.4 && cell.detail, mid = z >= 1.15 && cell.detail, sOK = mid || !!cell.gapFn || !!cell.crackFn || !!cell.bulge;
  const rec = cell.receptors && z >= 1.6, RS = 15.5, RW = 1.7;
  const hole = cell.hole || null;                 // {s, r}: the wall hole made by the baseplate lysozyme
  const crack = cell.crackFn || null, gap = cell.gapFn || null;
  for (let sy = CBOX.y0; sy < CBOX.y1; sy++) {
    for (let sx = CBOX.x0; sx < CBOX.x1; sx++) {
      const i = sy * W + sx, d = DBUF[i];
      if (d > 3.5 || d <= -ENV.im) continue;
      const lit = LBUF[i], sv = sOK ? SBUF[i] : 0;
      if (gap && gap(sv, d)) continue;
      let col = -1;
      if (!mid) {                                   // far: a simple two-tone membrane rim with a lit edge
        if (d > 0) continue;
        const pw = Math.max(1, iz);
        if (d > -pw) col = lit > 0.35 ? P.BT4 : lit < -0.4 ? P.BT2 : P.BT3;
        else if (d > -Math.max(3.6, 2.2 * pw)) col = lit > 0.2 ? P.BT3 : P.BT2;
        else if (d > -Math.max(5.5, 3.2 * pw)) col = P.BT1;
        else continue;
      } else {
        // receptor barrels (OmpC) poke out of the outer membrane
        let inRec = false;
        if (rec && d > -ENV.om - 0.6 && d < 1.4) { const k = Math.round(sv / RS), u = sv - k * RS - 3.5 * hash(k + 101); if (Math.abs(u) < RW) { inRec = true; col = Math.abs(u) < 0.5 * Math.max(1, iz) ? P.BT2 : (u < 0 ? P.BT4 : P.BT3); } }
        if (!inRec) {
          if (d > 0) {                              // LPS fringe
            if (!hi) continue;
            const u = ((sv / 2.3) % 1 + 1) % 1;
            if (Math.abs(u - 0.5) * 2.3 < 0.3 * Math.max(1, iz)) col = d > 2.3 ? P.BT2 : P.BT1; else continue;
          } else if (d > -ENV.om) {                 // outer membrane
            col = bilayer(d, 0, sv, hi, lit, iz, false);
          } else if (d > -ENV.pe) {                 // periplasm + peptidoglycan
            col = P.CY2;
            const dd = -d;
            if (hole && Math.abs(sv - hole.s) < hole.r) col = P.CY2;
            else if (hi) {
              if (Math.abs(dd - 5.9) < 0.42 || Math.abs(dd - 7.1) < 0.42) col = P.PG2;
              else if (dd > 5.9 && dd < 7.1) { const u = ((sv / 2.4) % 1 + 1) % 1; if (Math.abs(u - 0.5) * 2.4 < 0.32 * Math.max(1, iz)) col = P.PG1; }
            } else if (dd > 5.6 && dd < 7.4) col = lit > 0.3 ? P.PG2 : P.PG1;
          } else {                                  // inner membrane
            col = bilayer(d, -ENV.pe, sv, hi, lit, iz, true);
          }
        }
      }
      if (crack && d > -ENV.im - 1) { const k = crack(sv, d, iz); if (k > 0) col = k > 0.8 ? P.LY4 : k > 0.5 ? P.LY3 : k > 0.25 ? P.LY2 : (bay(sx, sy) < 0.6 ? P.LY1 : col); }
      if (col >= 0) buf[i] = col;
    }
  }
}
// lipid bilayer: head-group beads on both faces, tails in between
function bilayer(d, top, sv, hi, lit, iz, inner) {
  const dd = top - d, th = 4;                       // depth inside this membrane (0 at its outer face)
  const head = inner ? P.BT2 : P.BT3, headL = inner ? P.BT3 : P.BT4, tail = inner ? P.BT1 : P.BT1, core = P.BT0;
  if (!hi) { if (dd < 1.3) return lit > 0.3 ? headL : head; if (dd > th - 1.3) return head; return tail; }
  const u = ((sv / 1.6) % 1 + 1) % 1, cu = Math.abs(u - 0.5) * 1.6;
  if (dd < 1.25 || dd > th - 1.25) {
    const cd = dd < 1.25 ? Math.abs(dd - 0.62) : Math.abs(dd - (th - 0.62));
    if (cu * cu + cd * cd < 0.62 * 0.62 + iz * 0.2) return cu < 0.3 && cd < 0.3 && dd < 1.25 && lit > 0 ? headL : head;
    return core;
  }
  return cu < 0.22 + 0.25 * iz ? tail : core;
}
// ---------------------------------------------------------------- crowding sprites (macromolecules jiggling in the cytoplasm)
function crowding(cam, cell, t, lv) {
  const z = cam.z; if (z < 1.2) return;
  const G = z < 2.5 ? 7 : 4.5, iz = 1 / z;
  const wx0 = cam.wx(0), wx1 = cam.wx(W), wy0 = cam.wy(0), wy1 = cam.wy(H);
  for (let gy = Math.floor(wy0 / G); gy <= Math.floor(wy1 / G); gy++) for (let gx = Math.floor(wx0 / G); gx <= Math.floor(wx1 / G); gx++) {
    const h = hash3(gx, gy, 909); if (h > 0.45) continue;
    const x = (gx + hash3(gx, gy, 910)) * G + 0.8 * wob(t, 40 + (gx & 7), gy), y = (gy + hash3(gx, gy, 911)) * G + 0.8 * wob(t, 44 + (gy & 7), gx);
    const L = cellToLocal(cell, x, y); if (cellSD(cell, L[0], L[1]) > -ENV.im - 1.5) continue;
    const sx = cam.x(x), sy = cam.y(y), rr = (0.45 + 0.5 * h) * z * (z < 2.5 ? 0.9 : 1);
    if (rr < 0.9) { if (lv === undefined || bay(sx | 0, sy | 0) < lv) pset(sx, sy, P.CY3); }
    else { disc(sx, sy, rr, P.CY3, lv); if (rr > 2) pset(sx - rr * 0.35, sy - rr * 0.35, P.CY4); }
  }
}
// ---------------------------------------------------------------- flagella (other cells): slow helical waves (periodic)
function flagella(cam, cell, t, n) {
  for (let k = 0; k < n; k++) {
    const s0 = cellPerim(cell) * hash(cell.seed * 7 + k), base = cellAt(cell, s0, 0);
    const L = 110 + 60 * hash(cell.seed * 11 + k), ph = hash(cell.seed + k * 3) * TAU;
    let px = cam.x(base[0]), py = cam.y(base[1]);
    for (let u = 4; u <= L; u += 4) {
      const off = Math.sin(u * 0.11 - LOOPW(48) * t + ph) * Math.min(1, u / 30) * 7;
      const x = base[0] + base[2] * u - base[3] * off, y = base[1] + base[3] * u + base[2] * off;
      const qx = cam.x(x), qy = cam.y(y); line(px, py, qx, qy, P.N4, u < L * 0.6 ? 1 : 0.5); px = qx; py = qy;
    }
  }
}
