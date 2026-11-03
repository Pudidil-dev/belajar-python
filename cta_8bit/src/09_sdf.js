'use strict';
// ============================================================================
// SDF MODELLING: organic shapes (brain lobes and gyri, the heart, lungs, head,
// the body under its sheet, the gantry housing) are written as signed
// distance functions — smooth unions of ellipsoids, capsules and boxes, with
// carved fissures and surface folds — and turned into meshes by marching
// tetrahedra. Normals come from the field's gradient, so shading is smooth.
// ============================================================================
// approximate ellipsoid distance (Quilez): centre (cx,cy,cz), radii (rx,ry,rz)
function sdE(x, y, z, cx, cy, cz, rx, ry, rz) {
  const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz, k0 = Math.sqrt(px * px + py * py + pz * pz);
  const qx = px / rx, qy = py / ry, qz = pz / rz, k1 = Math.sqrt(qx * qx + qy * qy + qz * qz) || 1e-6;
  return k0 * (k0 - 1) / k1;
}
// capsule from a to b with radius r (r may taper from ra to rb)
function sdC(x, y, z, ax, ay, az, bx, by, bz, ra, rb) {
  const px = x - ax, py = y - ay, pz = z - az, ex = bx - ax, ey = by - ay, ez = bz - az, ee = ex * ex + ey * ey + ez * ez || 1e-6;
  const h = clamp((px * ex + py * ey + pz * ez) / ee, 0, 1), dx = px - ex * h, dy = py - ey * h, dz = pz - ez * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - lerp(ra, rb === undefined ? ra : rb, h);
}
// rounded box centred at c with half sizes (hx,hy,hz) and corner radius r
function sdB(x, y, z, cx, cy, cz, hx, hy, hz, r) {
  const qx = Math.abs(x - cx) - hx + r, qy = Math.abs(y - cy) - hy + r, qz = Math.abs(z - cz) - hz + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
function smin(a, b, k) { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); }
function smax(a, b, k) { return -smin(-a, -b, k); }
// smooth 3-D value noise in [-1, 1] (for folds and gyri)
function vn3(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const h = (a, b, c) => hash3(i + a, j + b, k + c) * 2 - 1;
  const x00 = lerp(h(0, 0, 0), h(1, 0, 0), u), x10 = lerp(h(0, 1, 0), h(1, 1, 0), u), x01 = lerp(h(0, 0, 1), h(1, 0, 1), u), x11 = lerp(h(0, 1, 1), h(1, 1, 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}
// marching tetrahedra over a box; f(x,y,z) < 0 inside. attr(x,y,z) gives the per-vertex attribute.
const MT_C = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
const MT_T = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];
function isoMesh(f, x0, y0, z0, x1, y1, z1, h, attr) {
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, nz = Math.ceil((z1 - z0) / h) + 1, NT = nx * ny * nz, V = new Float32Array(NT);
  const id = (i, j, k) => (k * ny + j) * nx + i;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) V[id(i, j, k)] = f(x0 + i * h, y0 + j * h, z0 + k * h);
  const mb = new MB(), cv = new Float32Array(8), cg = new Int32Array(8), cp = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], e = h * 0.5, shared = new Map();
  // one vertex per grid edge crossing (shared by all triangles around it), normal from the field's gradient
  const vert = (a, b) => {
    const ga = cg[a], gb = cg[b], key = ga < gb ? ga * NT + gb : gb * NT + ga, hit = shared.get(key);
    if (hit !== undefined) return hit;
    const va = cv[a], vb = cv[b], t = va / (va - vb), p = cp[a], q = cp[b], x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t, z = p[2] + (q[2] - p[2]) * t;
    const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e), gl = Math.hypot(gx, gy, gz) || 1;
    const idx = mb.v(x, y, z, gx / gl, gy / gl, gz / gl, attr ? attr(x, y, z) : 0); shared.set(key, idx); return idx;
  };
  const emit = (i0, i1, i2) => {
    const P_ = mb.p, ux = P_[3 * i1] - P_[3 * i0], uy = P_[3 * i1 + 1] - P_[3 * i0 + 1], uz = P_[3 * i1 + 2] - P_[3 * i0 + 2], vx = P_[3 * i2] - P_[3 * i0], vy = P_[3 * i2 + 1] - P_[3 * i0 + 1], vz = P_[3 * i2 + 2] - P_[3 * i0 + 2];
    const nx_ = uy * vz - uz * vy, ny_ = uz * vx - ux * vz, nz_ = ux * vy - uy * vx, N_ = mb.n;
    if (i0 === i1 || i1 === i2 || i0 === i2) return;
    if (nx_ * (N_[3 * i0] + N_[3 * i1] + N_[3 * i2]) + ny_ * (N_[3 * i0 + 1] + N_[3 * i1 + 1] + N_[3 * i2 + 1]) + nz_ * (N_[3 * i0 + 2] + N_[3 * i1 + 2] + N_[3 * i2 + 2]) < 0) mb.tri(i0, i2, i1); else mb.tri(i0, i1, i2);
  };
  for (let k = 0; k + 1 < nz; k++) for (let j = 0; j + 1 < ny; j++) for (let i = 0; i + 1 < nx; i++) {
    let neg = 0;
    for (let c = 0; c < 8; c++) { const o = MT_C[c], g = id(i + o[0], j + o[1], k + o[2]), v = V[g]; cv[c] = v; cg[c] = g; if (v < 0) neg++; cp[c][0] = x0 + (i + o[0]) * h; cp[c][1] = y0 + (j + o[1]) * h; cp[c][2] = z0 + (k + o[2]) * h; }
    if (neg === 0 || neg === 8) continue;
    for (const T of MT_T) {
      let ni = 0; const ins = [], outs = []; for (const c of T) { if (cv[c] < 0) { ins.push(c); ni++; } else outs.push(c); }
      if (ni === 0 || ni === 4) continue;
      if (ni === 1) emit(vert(ins[0], outs[0]), vert(ins[0], outs[1]), vert(ins[0], outs[2]));
      else if (ni === 3) emit(vert(outs[0], ins[0]), vert(outs[0], ins[1]), vert(outs[0], ins[2]));
      else { const a = vert(ins[0], outs[0]), b = vert(ins[0], outs[1]), c = vert(ins[1], outs[1]), d = vert(ins[1], outs[0]); emit(a, b, c); emit(a, c, d); }
    }
  }
  return mb.build();
}
