'use strict';
// ============================================================================
// Procedural meshes (from the CTA film's engine): tubes along 3D paths
// (arteries, veins, IV tubing, collaterals), spheres and ellipsoids (the heart,
// cells), lathe rings (the CT gantry), boxes, quads with uv (the floor, the
// artery's cut face). A mesh: positions p, normals n, one scalar attribute a
// per vertex (contrast arrival, plaque, pain — a second ramp mixes in by it),
// uv, triangles t. Outward faces are wound so the
// renderer sees them counter-clockwise from outside.
// ============================================================================
class MB {
  constructor() { this.p = []; this.n = []; this.a = []; this.uv = []; this.t = []; }
  v(x, y, z, nx, ny, nz, a, u, w) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.a.push(a || 0); this.uv.push(u || 0, w || 0); return this.p.length / 3 - 1; }
  tri(a, b, c) { this.t.push(a, b, c); }
  quad(a, b, c, d) { this.t.push(a, b, c, a, c, d); }
  build() { return { p: Float32Array.from(this.p), n: Float32Array.from(this.n), a: Float32Array.from(this.a), uv: Float32Array.from(this.uv), t: Uint32Array.from(this.t), nv: this.p.length / 3, nt: this.t.length / 3 }; }
}
// smooth a polyline of [x,y,z] control points (Catmull-Rom) into ~step-mm pieces
function smoothPath(ctrl, step) {
  const out = [], n = ctrl.length;
  for (let i = 0; i + 1 < n; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n - 1, i + 2)];
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]), m = Math.max(1, Math.ceil(L / (step || 2)));
    for (let k = 0; k < m; k++) {
      const t = k / m, t2 = t * t, t3 = t2 * t, q = [];
      for (let c = 0; c < 3; c++) q.push(0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3));
      out.push(q);
    }
  }
  out.push(ctrl[n - 1].slice());
  return out;
}
function pathLength(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); return L; }
// a tube along pts; rad(i, u) radius at point i (u = 0..1 along); attr(i, u) the scalar attribute; sides around
function tubeInto(mb, pts, rad, attr, sides, caps) {
  const n = pts.length; if (n < 2) return;
  const T = [], Nn = [], Bn = [];
  for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; T.push(norm3(sub3(b, a))); }
  let ref = Math.abs(T[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let N0 = norm3(cross3(cross3(T[0], ref), T[0]));
  for (let i = 0; i < n; i++) { if (i > 0) { const d = dot3(N0, T[i]); N0 = norm3(sub3(N0, mul3(T[i], d))); } Nn.push(N0); Bn.push(cross3(T[i], N0)); }
  const cum = [0]; for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  const L = cum[n - 1] || 1, base = mb.p.length / 3;
  for (let i = 0; i < n; i++) {
    const u = cum[i] / L, r = typeof rad === 'number' ? rad : rad(i, u), at = attr ? attr(i, u) : 0;
    for (let k = 0; k < sides; k++) {
      const th = k / sides * TAU, c = Math.cos(th), s = Math.sin(th), nx = c * Nn[i][0] + s * Bn[i][0], ny = c * Nn[i][1] + s * Bn[i][1], nz = c * Nn[i][2] + s * Bn[i][2];
      mb.v(pts[i][0] + r * nx, pts[i][1] + r * ny, pts[i][2] + r * nz, nx, ny, nz, at, k / sides, u);
    }
  }
  for (let i = 0; i + 1 < n; i++) for (let k = 0; k < sides; k++) {
    const a = base + i * sides + k, b = base + i * sides + (k + 1) % sides, c = base + (i + 1) * sides + k, d = base + (i + 1) * sides + (k + 1) % sides;
    mb.tri(a, b, c); mb.tri(b, d, c);
  }
  if (caps) for (const end of [0, n - 1]) {
    const sg = end === 0 ? -1 : 1, tn = mul3(T[end], sg), r = typeof rad === 'number' ? rad : rad(end, end ? 1 : 0), at = attr ? attr(end, end ? 1 : 0) : 0;
    const c0 = mb.v(pts[end][0], pts[end][1], pts[end][2], tn[0], tn[1], tn[2], at), ring = [];
    for (let k = 0; k < sides; k++) { const th = k / sides * TAU, c = Math.cos(th), s = Math.sin(th); ring.push(mb.v(pts[end][0] + r * (c * Nn[end][0] + s * Bn[end][0]), pts[end][1] + r * (c * Nn[end][1] + s * Bn[end][1]), pts[end][2] + r * (c * Nn[end][2] + s * Bn[end][2]), tn[0], tn[1], tn[2], at)); }
    for (let k = 0; k < sides; k++) { if (end === 0) mb.tri(c0, ring[(k + 1) % sides], ring[k]); else mb.tri(c0, ring[k], ring[(k + 1) % sides]); }
  }
}
// an ellipsoid (radii rx, ry, rz) around c, deformed by def(dirx, diry, dirz) -> radial scale; nu around, nv pole to pole
function ellipsoidInto(mb, c, rx, ry, rz, nu, nv, def, attr) {
  const base = mb.p.length / 3, grid = [];
  for (let j = 0; j <= nv; j++) {
    const v = j / nv, th = v * Math.PI, sy = Math.cos(th), sr = Math.sin(th);
    for (let i = 0; i < nu; i++) {
      const ph = i / nu * TAU, dx = sr * Math.cos(ph), dz = sr * Math.sin(ph), dy = sy, k = def ? def(dx, dy, dz) : 1;
      grid.push([c[0] + rx * dx * k, c[1] + ry * dy * k, c[2] + rz * dz * k]);
    }
  }
  for (let j = 0; j <= nv; j++) for (let i = 0; i < nu; i++) { const q = grid[j * nu + i]; mb.v(q[0], q[1], q[2], 0, 0, 0, attr ? attr(q) : 0, i / nu, j / nv); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = base + j * nu + i, b = base + j * nu + (i + 1) % nu, cc = base + (j + 1) * nu + i, d = base + (j + 1) * nu + (i + 1) % nu;
    mb.tri(a, b, cc); mb.tri(b, d, cc);
  }
  return base;
}
// recompute smooth normals from the faces (after deformations)
function computeNormals(m) {
  const n = new Float32Array(m.nv * 3), p = m.p, t = m.t;
  for (let k = 0; k < m.nt; k++) {
    const a = t[3 * k], b = t[3 * k + 1], c = t[3 * k + 2];
    const ux = p[3 * b] - p[3 * a], uy = p[3 * b + 1] - p[3 * a + 1], uz = p[3 * b + 2] - p[3 * a + 2], vx = p[3 * c] - p[3 * a], vy = p[3 * c + 1] - p[3 * a + 1], vz = p[3 * c + 2] - p[3 * a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const i of [a, b, c]) { n[3 * i] += nx; n[3 * i + 1] += ny; n[3 * i + 2] += nz; }
  }
  for (let i = 0; i < m.nv; i++) { const l = Math.hypot(n[3 * i], n[3 * i + 1], n[3 * i + 2]) || 1; n[3 * i] /= l; n[3 * i + 1] /= l; n[3 * i + 2] /= l; }
  m.n = n; return m;
}
// a ring made by revolving a profile [[r, y], ...] about the y axis, between angles a0..a1 (radians; full turn if omitted)
function latheInto(mb, prof, seg, a0, a1, attr) {
  const full = a0 === undefined, A0 = full ? 0 : a0, A1 = full ? TAU : a1, n = full ? seg : seg + 1, base = mb.p.length / 3, np = prof.length;
  for (let i = 0; i < n; i++) { const a = lerp(A0, A1, i / seg), c = Math.cos(a), s = Math.sin(a); for (let j = 0; j < np; j++) { const [r, y] = prof[j]; mb.v(r * c, y, r * s, 0, 0, 0, attr || 0, i / seg, j / (np - 1)); } }
  for (let i = 0; i < (full ? seg : seg); i++) for (let j = 0; j + 1 < np; j++) {
    const i2 = full ? (i + 1) % seg : i + 1, a = base + i * np + j, b = base + i2 * np + j, c = base + i * np + j + 1, d = base + i2 * np + j + 1;
    mb.tri(a, c, b); mb.tri(b, c, d);
  }
}
// an axis-aligned box
function boxInto(mb, c, s, attr) {
  const [x, y, z] = c, [a, b, d] = [s[0] / 2, s[1] / 2, s[2] / 2];
  const F = [[[1, 0, 0], [[x + a, y - b, z - d], [x + a, y + b, z - d], [x + a, y + b, z + d], [x + a, y - b, z + d]]], [[-1, 0, 0], [[x - a, y - b, z + d], [x - a, y + b, z + d], [x - a, y + b, z - d], [x - a, y - b, z - d]]],
    [[0, 1, 0], [[x - a, y + b, z - d], [x - a, y + b, z + d], [x + a, y + b, z + d], [x + a, y + b, z - d]]], [[0, -1, 0], [[x - a, y - b, z + d], [x - a, y - b, z - d], [x + a, y - b, z - d], [x + a, y - b, z + d]]],
    [[0, 0, 1], [[x + a, y - b, z + d], [x + a, y + b, z + d], [x - a, y + b, z + d], [x - a, y - b, z + d]]], [[0, 0, -1], [[x - a, y - b, z - d], [x - a, y + b, z - d], [x + a, y + b, z - d], [x + a, y - b, z - d]]]];
  for (const [nrm, q] of F) { const i = q.map(v => mb.v(v[0], v[1], v[2], nrm[0], nrm[1], nrm[2], attr || 0)); mb.tri(i[0], i[1], i[2]); mb.tri(i[0], i[2], i[3]); }
}
// a flat textured quad: corner p0, edge vectors eu (u direction) and ev (v direction)
function quadMesh(p0, eu, ev) {
  const mb = new MB(), n = norm3(cross3(ev, eu));
  const c = [p0, add3(p0, eu), add3(add3(p0, eu), ev), add3(p0, ev)], uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const i = c.map((q, k) => mb.v(q[0], q[1], q[2], n[0], n[1], n[2], 0, uv[k][0], uv[k][1]));
  mb.tri(i[0], i[1], i[2]); mb.tri(i[0], i[2], i[3]);
  return mb.build();
}
// a texture from a function (w × h) -> {w, h, d}
function makeTex(w, h, fn) { const d = new Uint32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d[y * w + x] = fn(x, y) >>> 0; return { w, h, d }; }
// a lofted body: superellipse cross-sections along y; sec = [[y, halfWidth, top, bottom, exponent], ...] (z measured from zc)
function loftInto(mb, sec, zc, nu) {
  const base = mb.p.length / 3, rows = [];
  const S = []; for (let i = 0; i + 1 < sec.length; i++) for (let k = 0; k < 6; k++) { const u = k / 6, a = sec[i], b = sec[i + 1], e = smooth(u); S.push([lerp(a[0], b[0], u), lerp(a[1], b[1], e), lerp(a[2], b[2], e), lerp(a[3], b[3], e), lerp(a[4], b[4], e)]); }
  S.push(sec[sec.length - 1]);
  for (const [y, w, top, bot, ex] of S) for (let i = 0; i < nu; i++) {
    const th = i / nu * TAU, c = Math.cos(th), s = Math.sin(th), r = 1 / Math.pow(Math.pow(Math.abs(c), ex) + Math.pow(Math.abs(s), ex), 1 / ex);
    mb.v(w * c * r, y, zc + (s > 0 ? top : bot) * s * r, 0, 0, 0);
  }
  for (let j = 0; j + 1 < S.length; j++) for (let i = 0; i < nu; i++) { const a = base + j * nu + i, b = base + j * nu + (i + 1) % nu, c = a + nu, d = b + nu; mb.tri(a, b, c); mb.tri(b, d, c); }
}
// meshes built once on first use
const MESHC = {};
function cached(key, build) { return MESHC[key] || (MESHC[key] = build()); }
