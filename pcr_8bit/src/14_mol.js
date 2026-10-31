'use strict';
// ============================================================================
// MOLECULES (world units; at z = 1 one nucleotide step is 12 px).
// Nucleic-acid strands are sugar-phosphate backbones with one base rung per
// nucleotide: purines (A, G) are long rungs, pyrimidines (C, T, U) short, so a
// paired rung always spans the same gap; A–T / A–U pairs show 2 hydrogen bonds,
// G–C pairs 3. Letters appear when the camera is close. Strand colour is the
// strand's role (RNA magenta, cDNA electric blue, template deep blue, new DNA
// orange, primer yellow, probe light green). Enzymes are flat shaded blobs with
// a channel for the DNA; no faces.
// ============================================================================
const NT = 12, BB = 17, BBW = 4, RPU = 11, RPY = 8;
const isPur = b => b === 'A' || b === 'G';
const COMP = { A: 'T', T: 'A', G: 'C', C: 'G', U: 'A' };           // DNA partner of a template base
const COMP_R = { A: 'U', U: 'A', G: 'C', C: 'G', T: 'A' };          // RNA partner
const SKC = {};   // strand colours by kind: [outline, shadow, base, light, highlight]
function strandCols(kind) {
  if (!SKC.rna) {
    SKC.rna = [P.RN0, P.RN1, P.RN2, P.RN3, P.RN4]; SKC.cdna = [P.CD0, P.CD1, P.CD2, P.CD3, P.CD4]; SKC.tmpl = [P.TM0, P.TM1, P.TM2, P.TM3, P.TM4];
    SKC.new = [P.NS0, P.NS1, P.NS2, P.NS3, P.NS4]; SKC.primer = [P.PR0, P.PR1, P.PR2, P.PR3, P.PR3]; SKC.probe = [P.PB0, P.PB1, P.PB2, P.PB3, P.PB3];
    SKC.host = [P.DB0, P.DB1, P.DB2, P.DB3, P.DB3];
  }
  return SKC[kind];
}
// illustrative sequences (random, seeded; not a real viral sequence)
function randSeq(n, seed, rna) { const A = rna ? 'ACGU' : 'ACGT'; let s = ''; for (let i = 0; i < n; i++) s += A[Math.floor(hash(seed * 131 + i * 7) * 4)]; return s; }
const compSeq = (s, rna) => s.split('').map(b => (rna ? COMP_R : COMP)[b]).join('');
// ---------------------------------------------------------------- one nucleotide
// (bx, by) backbone point in screen px, (nx, ny) unit normal toward the base tip, z zoom
function nucleotide(bx, by, nx, ny, base, cols, z, o) {
  const L = (isPur(base) ? RPU : RPY) * z, w = Math.max(2, 4 * z);
  const sx = bx + nx * (BBW * 0.5) * z, sy = by + ny * (BBW * 0.5) * z;
  const tx = sx + nx * L, ty = sy + ny * L;
  lineW(sx, sy, tx, ty, w, cols[1]);
  lineW(sx, sy, tx - nx * z, ty - ny * z, Math.max(1, w - 2), cols[3]);
  // tip: purines get a darker cap (two rings), pyrimidines a light one
  disc(tx - nx * z, ty - ny * z, w * 0.42, isPur(base) ? cols[2] : cols[4]);
  if (o && o.letters && z >= 1.5) {
    const lx = sx + nx * L * 0.55, ly = sy + ny * L * 0.55;
    text(FS, base, lx, ly - 2.5 * Math.max(1, Math.round(z / 2)), { sc: Math.max(1, Math.round(z / 2)), c: P.SH, ol: null, align: 'center' });
  }
  return [tx, ty];
}
// ---------------------------------------------------------------- strand along a straight line
// s: { kind, seq, x0, y, side (+1 bases point down / -1 up), five ('L' or 'R': where the 5' end is),
//      i0, i1 (range drawn), wave (amp), ph, letters, ends (draw 5'/3' marks), glowEnd }
function strandY(s, i, t) { return s.y + (s.wave ? s.wave * Math.sin(i * 0.55 + (s.ph || 0) + t * 2.2) : 0) + (s.dy ? s.dy(i) : 0); }
function drawStrand(cam, s, t) {
  const cols = strandCols(s.kind), z = cam.z, n = s.seq.length;
  const i0 = Math.max(0, Math.floor(s.i0 === undefined ? 0 : s.i0)), i1 = Math.min(n - 1, Math.floor(s.i1 === undefined ? n - 1 : s.i1));
  if (i1 < i0) return;
  // cull
  const xa = cam.x(s.x0 + i0 * NT) - 30, xb = cam.x(s.x0 + i1 * NT) + 30;
  if (xb < 0 || xa > W) return;
  const pts = [];
  for (let i = i0; i <= i1; i++) pts.push([cam.x(s.x0 + i * NT), cam.y(strandY(s, i, t))]);
  // bases first (behind the backbone)
  for (let k = 0; k < pts.length; k++) {
    const [x, y] = pts[k]; if (x < -20 || x > W + 20) continue;
    nucleotide(x, y, 0, s.side, s.seq[i0 + k], cols, z, s);
  }
  // backbone: sugar-phosphate chain
  const bw = Math.max(2, BBW * z);
  for (let k = 0; k + 1 < pts.length; k++) { lineW(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], bw + 2, cols[0]); }
  for (let k = 0; k + 1 < pts.length; k++) { lineW(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], bw, cols[2]); }
  for (let k = 0; k < pts.length; k++) {
    const [x, y] = pts[k]; if (x < -10 || x > W + 10) continue;
    rect(x - bw * 0.55, y - bw * 0.55, x + bw * 0.55, y + bw * 0.55, cols[1]);          // sugar
    if (k + 1 < pts.length) disc((x + pts[k + 1][0]) / 2, (y + pts[k + 1][1]) / 2, Math.max(1, 1.3 * z), cols[4]);  // phosphate
  }
  if (pts.length === 1) { const [x, y] = pts[0]; rect(x - bw * 0.55, y - bw * 0.55, x + bw * 0.55, y + bw * 0.55, cols[1]); }
  // 5' / 3' end marks
  if (s.ends) {
    const sc = Math.max(1, Math.round(z * 0.8));
    const left = pts[0], right = pts[pts.length - 1], ly = -s.side * 10 * z;
    const lt = s.five === 'R' ? "3'" : "5'", rt = s.five === 'R' ? "5'" : "3'";
    text(FS, lt, left[0] - 8 * z, left[1] + ly - 3 * sc, { sc, c: cols[3], ol: P.SH, align: 'center' });
    text(FS, rt, right[0] + 8 * z, right[1] + ly - 3 * sc, { sc, c: cols[3], ol: P.SH, align: 'center' });
  }
  if (s.glowEnd) { const e = s.five === 'R' ? pts[0] : pts[pts.length - 1]; glow(e[0], e[1], 6 * z, cols[3], cols[4], s.glowEnd); }
}
// hydrogen bonds between a top strand (side +1, backbone yTop) and a bottom strand (side -1, backbone yBot)
// for nucleotides i0..i1 of the bottom strand starting at x0; k (0..1) fraction formed; sep (extra separation)
function drawHBonds(cam, x0, seqB, i0, i1, yTop, yBot, k, lvFn) {
  const z = cam.z; if (k <= 0) return;
  for (let i = Math.max(0, i0); i <= Math.min(seqB.length - 1, i1); i++) {
    const lv = lvFn ? lvFn(i) : 1; if (lv <= 0.02) continue;
    const b = seqB[i], nb = (b === 'G' || b === 'C') ? 3 : 2;
    const x = cam.x(x0 + i * NT);
    const yb = cam.y(yBot) - (BBW * 0.5 + (isPur(b) ? RPU : RPY)) * z;
    const yt = cam.y(yTop) + (BBW * 0.5 + (isPur(COMP[b] || 'A') ? RPU : RPY)) * z;
    if (yb - yt < 1) continue;
    for (let j = 0; j < nb; j++) {
      const xx = x + (j - (nb - 1) / 2) * Math.max(1.5, 1.6 * z);
      dashLine(xx, yt + 1, xx, yb - 1, P.C4, Math.max(1, z), Math.max(1, z), 0);
    }
    if (lv < 1) rect(x - 3 * z, yt, x + 3 * z, yb, P.BG, 1 - lv);
  }
}
// ---------------------------------------------------------------- free nucleotide (dNTP) and pyrophosphate
// (x, y) screen, a: angle of the base direction, base letter, z zoom; np: phosphates (3 = dNTP, 2 = PPi only)
function dNTP(x, y, a, base, z, o) {
  o = o || {};
  const ca = Math.cos(a), sa = Math.sin(a), cols = o.cols || [P.DN0, P.DN1, P.DN2, P.DN2, P.C6];
  // base rung
  nucleotide(x, y, ca, sa, base, cols, z, { letters: o.letters });
  // sugar
  rect(x - 2.2 * z, y - 2.2 * z, x + 2.2 * z, y + 2.2 * z, cols[1]); rect(x - 1.4 * z, y - 1.4 * z, x + 1.4 * z, y + 1.4 * z, cols[2]);
  // triphosphate tail, opposite the base
  const np = o.np === undefined ? 3 : o.np;
  for (let k = 0; k < np; k++) {
    const d = (4.2 + k * 3.6) * z, px = x - ca * d, py = y - sa * d;
    disc(px, py, 1.9 * z, P.PH0); disc(px, py, 1.4 * z, k === 0 ? P.PH2 : P.PH1);
    if (o.greek && z >= 1.6) text(FS, ['α', 'β', 'γ'][k], px + sa * 5 * z, py - ca * 5 * z - 2, { sc: 1, c: P.PH2, ol: P.SH, align: 'center' });
  }
}
function pyrophosphate(x, y, a, z) {
  const ca = Math.cos(a), sa = Math.sin(a);
  for (let k = 0; k < 2; k++) { const px = x + ca * k * 3.6 * z, py = y + sa * k * 3.6 * z; disc(px, py, 1.9 * z, P.PH0); disc(px, py, 1.4 * z, P.PH1); }
}
function mgIon(x, y, z, k) { disc(x, y, 2.6 * z, P.MG0); disc(x, y, 2.0 * z, P.MG1); disc(x - 0.6 * z, y - 0.6 * z, 0.9 * z, P.MG2); if (k) glow(x, y, 5 * z, P.MG1, P.MG2, k); }
// ---------------------------------------------------------------- probe ends: reporter (5') and quencher (3')
function reporter(x, y, z, lit) {
  // a small fused-ring dye: three hexagon-ish rings
  if (lit > 0) glow(x, y, (9 + 5 * lit) * z, P.EM1, P.EM2, Math.min(1, lit));
  for (const [dx, dy] of [[-2.6, 0], [0, -1.6], [2.6, 0]]) { disc(x + dx * z, y + dy * z, 2.3 * z, P.RP0); disc(x + dx * z, y + dy * z, 1.7 * z, lit > 0.3 ? P.RP3 : P.RP2); }
  disc(x, y - 1.6 * z, 0.8 * z, P.RP1);
}
function quencher(x, y, z) {
  for (const [dx, dy] of [[-1.8, 0.4], [1.6, -0.6]]) { disc(x + dx * z, y + dy * z, 2.5 * z, P.QU0); disc(x + dx * z, y + dy * z, 1.9 * z, P.QU2); }
  disc(x - 0.4 * z, y - 0.6 * z, 0.8 * z, P.QU3);
}
// ---------------------------------------------------------------- enzymes
// smooth union of ellipses -> mask; parts: [cx, cy, rx, ry, rot] in screen px
function blobMask(parts, k) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [cx, cy, rx, ry] of parts) { const R = Math.max(rx, ry) + 2; x0 = Math.min(x0, cx - R); y0 = Math.min(y0, cy - R); x1 = Math.max(x1, cx + R); y1 = Math.max(y1, cy + R); }
  x0 = Math.max(-2, x0); y0 = Math.max(-2, y0); x1 = Math.min(W + 2, x1); y1 = Math.min(H + 2, y1);
  const pre = parts.map(([cx, cy, rx, ry, r]) => [cx, cy, 1 / rx, 1 / ry, Math.cos(r || 0), Math.sin(r || 0), Math.min(rx, ry)]);
  return maskFn(x0, y0, x1, y1, (x, y) => {
    let s = 0;
    for (const [cx, cy, irx, iry, c, sn, m] of pre) { const dx = x - cx, dy = y - cy, u = (dx * c + dy * sn) * irx, v = (-dx * sn + dy * c) * iry, q = u * u + v * v; if (q < 1) return true; s += Math.exp(-(q - 1) * (k || 3)); }
    return s > 1.15;
  });
}
function enzymeShade(m, cols) { shade(m, cols[2], cols[3], cols[1], cols[0], { k: 2, kh: 1 }); }
// lumpy protein: stacked discs (outline, shadow, base, lit side, highlights); lumps: [x, y, r] screen px
function proteinLumps(L, cols, lv) {
  for (const [x, y, r] of L) disc(x, y, r + 1, cols[0], lv);
  for (const [x, y, r] of L) disc(x, y, r, cols[1], lv);
  for (const [x, y, r] of L) disc(x - r * 0.12, y - r * 0.14, r * 0.86, cols[2], lv);
  for (const [x, y, r] of L) disc(x - r * 0.3, y - r * 0.34, r * 0.46, cols[3], lv);
  for (const [x, y, r] of L) if (r > 5) disc(x - r * 0.42, y - r * 0.46, Math.max(1, r * 0.14), cols[4], lv);
}
const POL_C = () => [P.PO0, P.PO1, P.PO2, P.PO3, P.PO4], RT_C = () => [P.RT0, P.RT1, P.RT2, P.RT3, P.RT4];
// lump layouts relative to the active site (world units): the duplex runs through the cleft between y -22 and +22
const POL_L = {
  back: [[-14, 0, 30], [-44, 0, 22], [14, 2, 18]],
  palm: [[-46, 32, 15], [-24, 37, 16], [-2, 33, 14], [-62, 24, 12], [18, 28, 11]],
  thumb: [[-52, -30, 14], [-34, -36, 12], [-62, -14, 10]],
  fingers: [[10, -38, 12], [22, -30, 10], [2, -50, 9]],
  nuc: [[48, -34, 11], [60, -24, 10], [44, -20, 7]],
};
const RT_L = {
  back: [[-20, 0, 32], [-62, 0, 24], [12, 2, 18]],
  palm: [[-40, 32, 15], [-18, 36, 15], [2, 31, 12], [16, 24, 9]],
  thumb: [[-44, -32, 14], [-26, -38, 11]],
  fingers: [[10, -38, 12], [22, -29, 10], [0, -50, 9]],
  rnase: [[-80, 8, 15], [-72, 26, 12], [-92, -10, 11], [-66, -16, 9]],
};
function lumpsAt(list, jx, jy, z, rot, hx, hy) {
  const c = Math.cos(rot || 0), s = Math.sin(rot || 0);
  return list.map(([dx, dy, r]) => { let x = dx, y = dy; if (rot) { const ux = dx - hx, uy = dy - hy; x = hx + ux * c - uy * s; y = hy + ux * s + uy * c; } return [jx + x * z, jy + y * z, r * z]; });
}
// DNA polymerase (cyan / silver), (jx, jy) = screen position of the active site, z zoom
// o: { fingers 0 open .. 1 closed, nuclease glow, active glow }
function polymeraseBack(jx, jy, z, o) {
  proteinLumps(lumpsAt(POL_L.back, jx, jy, z), POL_C(), 0.55);
}
function polymeraseFront(jx, jy, z, o) {
  o = o || {};
  const cols = POL_C(), f = o.fingers === undefined ? 0 : o.fingers;
  proteinLumps(lumpsAt(POL_L.palm, jx, jy, z), cols);
  proteinLumps(lumpsAt(POL_L.thumb, jx, jy, z), cols);
  proteinLumps(lumpsAt(POL_L.fingers, jx, jy, z, 0.55 * f, -6, -30), cols);
  // linker to the 5' nuclease domain, then the domain itself
  lineW(jx + 24 * z, jy - 28 * z, jx + 42 * z, jy - 30 * z, 3 * z, P.PO1);
  proteinLumps(lumpsAt(POL_L.nuc, jx, jy, z), cols);
  disc(jx + 45 * z, jy - 21 * z, 2.2 * z, P.PO0);                     // the nuclease active site
  if (o.nuclease > 0) glow(jx + 45 * z, jy - 21 * z, 8 * z, P.PO3, P.PO4, o.nuclease);
  if (o.active > 0) glow(jx + 2 * z, jy - 8 * z, 7 * z, P.PO3, P.PO4, o.active);
}
// reverse transcriptase (purple): polymerase domain at the junction + RNase H domain behind
function rtBack(jx, jy, z, o) {
  proteinLumps(lumpsAt(RT_L.back, jx, jy, z), RT_C(), 0.55);
}
function rtFront(jx, jy, z, o) {
  o = o || {};
  const cols = RT_C(), f = o.fingers === undefined ? 0 : o.fingers;
  proteinLumps(lumpsAt(RT_L.rnase, jx, jy, z), cols);
  proteinLumps(lumpsAt(RT_L.palm, jx, jy, z), cols);
  proteinLumps(lumpsAt(RT_L.thumb, jx, jy, z), cols);
  proteinLumps(lumpsAt(RT_L.fingers, jx, jy, z, 0.55 * f, -6, -30), cols);
  if (o.active > 0) glow(jx + 2 * z, jy - 8 * z, 7 * z, P.RT3, P.RT4, o.active);
}
// ---------------------------------------------------------------- free molecules for mixtures (icons at small zoom)
function primerIcon(x, y, a, z, kind) {
  const ca = Math.cos(a), sa = Math.sin(a), cols = strandCols(kind || 'primer'), L = 26 * z;
  lineW(x - ca * L / 2, y - sa * L / 2, x + ca * L / 2, y + sa * L / 2, Math.max(2, 3 * z), cols[1]);
  for (let k = 0; k < 6; k++) { const u = -0.4 + k * 0.16, bx = x + ca * L * u, by = y + sa * L * u; lineW(bx, by, bx - sa * 4 * z, by + ca * 4 * z, Math.max(1, 1.6 * z), cols[3]); }
  lineW(x - ca * L / 2, y - sa * L / 2, x + ca * L / 2, y + sa * L / 2, Math.max(1, 1.6 * z), cols[2]);
  arrowHead(x + ca * L / 2 + ca * 2 * z, y + sa * L / 2 + sa * 2 * z, a, 2.6 * z, cols[2]);
}
function probeIcon(x, y, a, z, lit) {
  const ca = Math.cos(a), sa = Math.sin(a), L = 30 * z;
  primerIcon(x, y, a, z * 1.1, 'probe');
  reporter(x - ca * (L / 2 + 4 * z), y - sa * (L / 2 + 4 * z), z * 0.75, lit || 0);
  quencher(x + ca * (L / 2 + 4 * z), y + sa * (L / 2 + 4 * z), z * 0.75);
}
function enzymeIcon(x, y, z, kind, rot) {
  const L = kind === 'rt' ? [...RT_L.back, ...RT_L.palm, ...RT_L.thumb, ...RT_L.fingers, ...RT_L.rnase] : [...POL_L.back, ...POL_L.palm, ...POL_L.thumb, ...POL_L.fingers, ...POL_L.nuc];
  const k = 0.32, c = Math.cos(rot || 0), s = Math.sin(rot || 0);
  proteinLumps(L.map(([dx, dy, r]) => [x + (dx * c - dy * s) * z * k, y + (dx * s + dy * c) * z * k, r * z * k]), kind === 'rt' ? RT_C() : POL_C());
}
// a short wiggly RNA / DNA fragment icon for crowded scenes (no letters)
function strandIcon(x, y, len, a, z, kind, ph) {
  const cols = strandCols(kind), ca = Math.cos(a), sa = Math.sin(a);
  let px_ = null, py_ = null;
  for (let k = 0; k <= len; k++) {
    const u = k * 5 * z, w = Math.sin(k * 0.7 + (ph || 0)) * 3 * z;
    const bx = x + ca * u - sa * w, by = y + sa * u + ca * w;
    if (px_ !== null) lineW(px_, py_, bx, by, Math.max(2, 2.6 * z), cols[2]);
    if (k % 2 === 0) lineW(bx, by, bx - sa * 4 * z, by + ca * 4 * z, Math.max(1, 1.4 * z), cols[3]);
    px_ = bx; py_ = by;
  }
}
// ---------------------------------------------------------------- a strand rotated about (cx, cy) by ang (world units)
// local layout as drawStrand: nucleotide i at (i*NT - mid, 0), bases toward local +side*y
function drawStrandRot(cam, s, cx, cy, ang, t) {
  const cols = strandCols(s.kind), z = cam.z, n = s.seq.length, mid = (n - 1) * NT / 2;
  const c = Math.cos(ang), sn = Math.sin(ang), nx = -sn * s.side, ny = c * s.side;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const lx = i * NT - mid, ly = s.wave ? s.wave * Math.sin(i * 0.55 + (s.ph || 0) + t * 2.2) : 0;
    pts.push([cam.x(cx + lx * c - ly * sn), cam.y(cy + lx * sn + ly * c)]);
  }
  const C = i => s.kindAt ? strandCols(s.kindAt(i)) : cols;
  for (let i = 0; i < n; i++) nucleotide(pts[i][0], pts[i][1], nx, ny, s.seq[i], C(i), z, s);
  const bw = Math.max(2, BBW * z);
  for (let i = 0; i + 1 < n; i++) lineW(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], bw + 2, C(i)[0]);
  for (let i = 0; i + 1 < n; i++) lineW(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], bw, C(i)[2]);
  for (let i = 0; i < n; i++) { const [x, y] = pts[i]; rect(x - bw * 0.55, y - bw * 0.55, x + bw * 0.55, y + bw * 0.55, C(i)[1]); }
  if (s.ends) {
    const sc = Math.max(1, Math.round(z * 0.8)), a = pts[0], b = pts[n - 1], ox = -nx * 10 * z, oy = -ny * 10 * z;
    const lt = s.five === 'R' ? "3'" : "5'", rt = s.five === 'R' ? "5'" : "3'";
    const ex = (b[0] - a[0]) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1), ey = (b[1] - a[1]) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1);
    text(FS, lt, a[0] - ex * 9 * z + ox, a[1] - ey * 9 * z + oy - 3 * sc, { sc, c: cols[3], ol: P.SH, align: 'center' });
    text(FS, rt, b[0] + ex * 9 * z + ox, b[1] + ey * 9 * z + oy - 3 * sc, { sc, c: cols[3], ol: P.SH, align: 'center' });
  }
}
