'use strict';
// ============================================================================
// VIRAL MACHINERY inside the target cell (cell-local coordinates of C0):
// the injected genome (magenta), the double helix at close range, host RNA
// polymerase making viral mRNA (pink), ribosomes translating it into viral
// parts, genome copies, capsomere tiles, tail rings, fibre rods, the
// prohead assembling on the inner membrane, the packaging motor, tails
// assembling, and the crowd of finished phages.
// ============================================================================
// the injected genome: enters at the top pole and coils near the entry site; a straight stretch passes the transcription site
const VDNA_CP = [0, -246, 1, -236, -6, -225, -18, -217, -25, -203, -16, -190, 0, -194, 13, -207, 24, -201, 23, -188, 8, -181, -8, -176, -15, -163, -6, -152, 9, -158, 14, -170, 24, -176.5, 38, -178, 52, -177.5, 64, -174, 72, -166, 74, -157];
let VDNA = null;              // Path in cell-local coords
const T_SITE = 35;            // arc length along the straight stretch is found at init
function virusInit() { VDNA = new Path(spline(VDNA_CP, 8, false)); VDNA.sT = nearestS(VDNA, 24, -176.5); }
function nearestS(path, x, y) { let best = 0, bd = 1e9; for (let s = 0; s <= path.L; s += 0.5) { const q = path.at(s), d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; best = s; } } return best; }
// world helpers for C0
function C0w(lx, ly) { return cellToWorld(C0, lx, ly); }
// draw the genome strand s0..s1 (cell-local path) — line at range, double helix close up
function dnaStrand(cam, path, s0, s1, t, opt) {
  opt = opt || {};
  const z = cam.z, off = opt.off || [0, 0], bub = opt.bubble || null;
  const W2 = (lx, ly) => { const w = C0w(lx + off[0], ly + off[1]); return [cam.x(w[0]), cam.y(w[1])]; };
  if (z < 1.35 || opt.simple) {
    const step = Math.max(0.6, 1.4 / z), w = z >= 0.8 ? 2 : 1;
    let pv = null;
    for (let s = s0; s <= s1 + 1e-6; s += step) {
      const q = path.at(Math.min(s, s1)), p = W2(q[0] + (opt.wig ? 0.7 * Math.sin(s * 0.4 + t * 2) : 0), q[1]);
      if (pv) {
        if (w > 1) lineW(pv[0], pv[1], p[0], p[1], w + 1.4, P.VD0);
        line(pv[0], pv[1], p[0], p[1], opt.c || P.VD2);
        if (w > 1) { const tw = ((s / 3.4) % 1 + 1) % 1; line(pv[0], pv[1] - 1, p[0], p[1] - 1, tw < 0.5 ? (opt.hi || P.VD3) : P.VD1); }   // twist marks
      }
      pv = p;
    }
    return;
  }
  // double helix: two backbones twisting around the centre line, base-pair rungs between them
  const pitch = 7, rw = 2.1, step = clamp(1.6 / z, 0.3, 1.0), rstep = z >= 3 ? 1.4 : 2.8, lw = z >= 3 ? Math.max(2, 0.7 * z) : (z >= 2 ? 2 : 1);
  let pa = null, pb = null;
  const rungs = [];
  for (let s = s0; s <= s1 + 1e-6; s += step) {
    const q = path.at(s), tg = path.tan(s), nx = -tg[1], ny = tg[0];
    let w = rw;
    if (bub && Math.abs(s - bub.s) < bub.w) w = rw + bub.h * Math.pow(Math.cos((s - bub.s) / bub.w * Math.PI / 2), 2);
    const ph = s / pitch * TAU - (opt.spin || 0) * t, sa = Math.sin(ph);
    const A = W2(q[0] + nx * w * sa, q[1] + ny * w * sa), B = W2(q[0] - nx * w * sa, q[1] - ny * w * sa);
    const front = Math.cos(ph) > 0;
    if (pa) {
      lineW(pa[0], pa[1], A[0], A[1], lw, front ? P.VD2 : P.VD1);
      lineW(pb[0], pb[1], B[0], B[1], lw, front ? P.VD1 : P.VD2);
    }
    const open = bub && Math.abs(s - bub.s) < bub.w * 0.75;
    if (!open && Math.abs((s % rstep) - rstep / 2) < step / 2) rungs.push([A, B, front]);
    pa = A; pb = B;
  }
  for (const [A, B, f] of rungs) { const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2; line(A[0], A[1], mx, my, f ? P.VD4 : P.MR3); line(mx, my, B[0], B[1], f ? P.MR3 : P.VD4); }
}
// host RNA polymerase (a clamp riding on the DNA)
function polymerase(cam, x, y, a, t) {     // a clamp: two jaws around the DNA, a groove where it is read (no eye-like spots)
  const z = cam.z, sx = cam.x(x), sy = cam.y(y);
  if (z < 1.4) { disc(sx, sy, Math.max(1, 2.5 * z), P.EN2); return; }
  const c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c;
  shade(maskEll(sx - nx * 1.6 * z, sy - ny * 1.6 * z, 6.6 * z, 4.4 * z, a), P.EN2, P.EN3, P.EN1, null, { k: Math.max(1, Math.round(z / 3)) });   // upper jaw
  shade(maskEll(sx + nx * 2.4 * z, sy + ny * 2.4 * z, 5.6 * z, 3.0 * z, a), P.EN1, P.EN2, P.EN0, null, { k: Math.max(1, Math.round(z / 3)) });   // lower jaw
  lineW(sx - c * 6 * z + nx * 0.4 * z, sy - s * 6 * z + ny * 0.4 * z, sx + c * 6 * z + nx * 0.4 * z, sy + s * 6 * z + ny * 0.4 * z, Math.max(1, 0.9 * z), P.EN0);   // the groove
}
// small viral parts (world position, angle, size factor)
function partHead(cam, x, y, a, k) { // capsomere: hexagon tile
  const z = cam.z * (k || 1), sx = cam.x(x), sy = cam.y(y), r = 2.5 * z;
  if (r < 1.2) { pset(sx, sy, P.PH3); return; }
  const pts = []; for (let i = 0; i < 6; i++) { const an = a + i / 6 * TAU; pts.push(sx + Math.cos(an) * r, sy + Math.sin(an) * r); }
  poly(pts, P.PH2); disc(sx - r * 0.15, sy - r * 0.15, r * 0.72, P.PH3); if (r > 3) { pset(sx - r * 0.4, sy - r * 0.4, P.PH5); disc(sx, sy, r * 0.22, P.PH1); }
}
function partTail(cam, x, y, a, k) { // tail ring / tube segment
  const z = cam.z * (k || 1), c = Math.cos(a), s = Math.sin(a), sx = cam.x(x), sy = cam.y(y), hw = 3.2 * z, hh = 1.3 * z;
  if (hw < 1.5) { pset(sx, sy, P.SV2); return; }
  const P4 = (u, v) => [sx + u * c - v * s, sy + u * s + v * c];
  const q = [P4(-hw, -hh), P4(hw, -hh), P4(hw, hh), P4(-hw, hh)];
  poly([].concat(...q), P.SV2); line(q[0][0], q[0][1], q[1][0], q[1][1], P.SV3); line(q[3][0], q[3][1], q[2][0], q[2][1], P.SV1);
  if (hw > 4) { const m0 = P4(-0.8 * z, 0), m1 = P4(0.8 * z, 0); line(m0[0], m0[1], m1[0], m1[1], P.SV0); }
}
function partFiber(cam, x, y, a, k) { // fibre protein rod with its receptor knob
  const z = cam.z * (k || 1), c = Math.cos(a), s = Math.sin(a), sx = cam.x(x), sy = cam.y(y), L = 5 * z;
  if (L < 2) { pset(sx, sy, P.OR2); return; }
  lineW(sx - c * L, sy - s * L, sx + c * L, sy + s * L, Math.max(1, 1.3 * z), P.OR1);
  line(sx - c * L, sy - s * L - (z > 2 ? 0.5 : 0), sx + c * L, sy + s * L - (z > 2 ? 0.5 : 0), P.OR2);
  disc(sx + c * L, sy + s * L, Math.max(1, 1.1 * z), P.OR3);
}
const PART_FN = [partHead, partTail, partFiber];
// a genome copy drawn as a short curved double-helix rod (the DNA icon)
function helixRod(cam, x, y, a, len, bend, t, sc) {
  const z = cam.z, c = Math.cos(a), s = Math.sin(a), L = len * sc;
  if (L * z < 4) { pset(cam.x(x), cam.y(y), P.VD2); return; }
  const P_ = u => { const v = bend * Math.sin(u / L * Math.PI * 1.6 - 0.8) * L * 0.18; return [x + (u - L / 2) * c - v * s, y + (u - L / 2) * s + v * c]; };
  const pitch = 7, rw = 2.1 * Math.min(1, sc * 1.4), step = clamp(1.6 / z, 0.3, 1.2), lw = z >= 3 ? Math.max(2, 0.7 * z) : (z >= 1.6 ? 2 : 1);
  let pa = null, pb = null; const rungs = [];
  for (let u = 0; u <= L; u += step) {
    const q = P_(u), q2 = P_(Math.min(L, u + 0.5)), dx = q2[0] - q[0], dy = q2[1] - q[1], dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl;
    const ph = u / pitch * TAU - 0.6 * t, sa = Math.sin(ph), front = Math.cos(ph) > 0;
    const A = [cam.x(q[0] + nx * rw * sa), cam.y(q[1] + ny * rw * sa)], B = [cam.x(q[0] - nx * rw * sa), cam.y(q[1] - ny * rw * sa)];
    if (z < 1.35) { if (pa) { lineW(pa[0], pa[1], (A[0] + B[0]) / 2, (A[1] + B[1]) / 2, 2, P.VD2); } pa = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; continue; }
    if (pa) { lineW(pa[0], pa[1], A[0], A[1], lw, front ? P.VD2 : P.VD1); lineW(pb[0], pb[1], B[0], B[1], lw, front ? P.VD1 : P.VD2); }
    if (Math.abs((u % 2.8) - 1.4) < step / 2) rungs.push([A, B, front]);
    pa = A; pb = B;
  }
  for (const [A, B, f] of rungs) line(A[0], A[1], B[0], B[1], f ? P.VD4 : P.MR3);
}
// terminase packaging motor (a ring of five lobes at the portal vertex), spinning while it pumps
function motor(cam, x, y, a, t, on) {
  const z = cam.z, sx = cam.x(x), sy = cam.y(y);
  if (z < 1.2) { disc(sx, sy, 2, P.OR2); return; }
  for (let i = 0; i < 5; i++) {
    const an = a + Math.PI / 2 + (i - 2) * 0.55, lx = sx + Math.cos(an) * 3.6 * z, ly = sy + Math.sin(an) * 3.6 * z;
    const hot = on && ((Math.floor(t * 18) % 5) === i);
    disc(lx, ly, 2.2 * z, hot ? P.OR3 : P.OR1); disc(lx - 0.5 * z, ly - 0.5 * z, 1.3 * z, hot ? P.LY4 : P.OR2);
  }
}
// ---------------------------------------------------------------- the prohead assembling on the inner membrane
// head-local frame like the phage head (bottom vertex = portal at the origin, head toward -y)
const HEADPOLY = [0, -34, 13, -26, 13, -8, 0, 0, -13, -8, -13, -26];
const TILES = (() => {
  const out = [], sp = 4.3;
  for (let r = -1; r < 10; r++) for (let q = -4; q <= 4; q++) {
    const u = q * sp + (r % 2 ? sp / 2 : 0), v = -1.5 - r * sp * 0.86;
    if (!pointInPolyF(HEADPOLY, u * 1.12, v + (v + 17) * 0.06)) continue;
    out.push({ u, v, d: Math.hypot(u, v * 0.8), h: hash(out.length * 7 + 3) });
  }
  out.sort((a, b) => a.d - b.d + (a.h - b.h) * 2);
  return out;
})();
function pointInPolyF(pts, x, y) {
  let ins = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) { const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; }
  return ins;
}
// prog: 0..1 tiles placed; shell: 0..1 crossfade to the faceted shell; scaf: 0..1 scaffold core present
function prohead(cam, x, y, a, t, prog, shell, scaf, t0, dur) {
  const z = cam.z, c = Math.cos(a), s = Math.sin(a);
  const X = (u, v) => cam.x(x + u * c - v * s), Y = (u, v) => cam.y(y + u * s + v * c);
  if (scaf > 0) {   // scaffold core: orange beads
    for (let i = 0; i < 26; i++) {
      const u = (hash(i * 3 + 1) - 0.5) * 15, v = -17 + (hash(i * 3 + 2) - 0.5) * 22;
      if (!pointInPolyF(HEADPOLY, u * 1.45, v)) continue;
      const out = 1 - scaf, du = u * out * 1.5 + (out > 0 ? (hash(i) - 0.5) * 30 * out : 0), dv = (v + 17) * out * 1.5 + (out > 0 ? -12 * out : 0);
      const r = Math.max(0.8, 1.3 * z * (0.4 + 0.6 * scaf));
      disc(X(u + du, v + dv), Y(u + du, v + dv), r, i % 3 ? P.OR1 : P.OR2);
    }
  }
  if (shell < 1) {
    const n = Math.floor(TILES.length * prog + 1e-6);
    for (let i = 0; i < (t0 !== undefined ? TILES.length : Math.min(n + 1, TILES.length)); i++) {
      const T = TILES[i];
      let k = 1;
      if (t0 !== undefined) { const ti = t0 + dur * i / TILES.length; k = clamp((t - ti) / 0.3, 0, 1); if (k <= 0) continue; }
      else if (i >= n) continue;
      const e = eout(k), fa = hash(i * 13 + 5) * TAU, fd = 16 * (1 - e);
      const u = T.u + Math.cos(fa) * fd, v = T.v + Math.sin(fa) * fd;
      partHead(cam, x + u * c - v * s, y + u * s + v * c, a + 0.5 * (1 - e), 0.82);
      if (k < 1 && k > 0.8) disc(X(T.u, T.v), Y(T.u, T.v), 2.5 * z, P.PH5, 0.5);
    }
  }
  // portal ring at the vertex
  disc(X(0, -0.5), Y(0, -0.5), Math.max(1, 2.2 * z), P.PB1); disc(X(0, -0.8), Y(0, -0.8), Math.max(0.8, 1.2 * z), P.PB2);
  if (shell > 0) {
    const st = { x, y: y, a, s: 0, bp: 0, dna: 0, ghost: 0, parts: { head: 1, sh: 0, tube: 0, bpw: 0, fib: 0, collar: 0 } };
    // draw only the head: place the head's bottom vertex at (x, y) by offsetting the phage origin along the axis
    const g = phageGeom(st), oy = -g.headB, ox = 0;
    st.x = x - oy * s + ox * 0; st.y = y + oy * c;
    if (shell >= 1) drawPhage(cam, st, t);
    else { const main = buf; withBuffer(TMPBUF, () => { TMPBUF.set(main); drawPhage(cam, st, t); }); const k = shell; for (let i = 0; i < W * H; i++) if (TMPBUF[i] !== buf[i] && bay(i % W, (i / W) | 0) < k) buf[i] = TMPBUF[i]; }
  }
}
// a lone head (faceted shell) with its bottom vertex at (x, y): dna fill level, scale
function headAt(cam, x, y, a, t, dna, opt) {
  opt = opt || {};
  const c = Math.cos(a), s = Math.sin(a);
  const st = { x: 0, y: 0, a, s: 0, bp: 0, dna, ghost: 0, parts: { head: 1, sh: 0, tube: 0, bpw: 0, fib: 0, collar: opt.collar ? 1 : 0 }, glint: opt.glint };
  const g = phageGeom(st), oy = -g.headB;
  st.x = x - oy * s; st.y = y + oy * c;
  drawPhage(cam, st, t);
}
