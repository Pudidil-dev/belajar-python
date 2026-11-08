'use strict';
// ============================================================================
// VOX — a small software voxel renderer (no WebGL, no browser needed).
// Models are grids of cubes (one material id per cube). Each grid is turned
// once into its exposed cube faces; at draw time the faces are projected with
// a perspective camera and filled flat (one colour per face from a 5-step
// material ramp: face direction vs. the light, minus one step where the face
// sits in a corner — ambient occlusion). A z-buffer sorts them, an id buffer
// gives 1-px outlines on silhouettes and depth steps, and see-through layers
// (skin, walls) use an ordered-dither screen door. No anti-aliasing, no blur.
// ============================================================================
const ZB = new Float32Array(MAXPIX);              // 1/z of the nearest surface (0 = empty)
const IDB = new Uint16Array(MAXPIX);              // material id per pixel (outlines)
// ---------------------------------------------------------------- materials: 5-step ramps (dark → light)
const MAT = [null];
function mat(name, hexes, o) { o = o || {}; const id = MAT.length; MAT.push({ name, r: hexes.map(hexc), speck: o.speck || 0, ol: o.ol === undefined ? 1 : o.ol, olc: o.olc ? hexc(o.olc) : null }); MAT[name] = id; return id; }
// ---------------------------------------------------------------- the grid
class VoxGrid {
  constructor(x0, y0, z0, x1, y1, z1, vs) {
    this.vs = vs; this.ox = x0; this.oy = y0; this.oz = z0;
    this.nx = Math.max(1, Math.ceil((x1 - x0) / vs)); this.ny = Math.max(1, Math.ceil((y1 - y0) / vs)); this.nz = Math.max(1, Math.ceil((z1 - z0) / vs));
    this.d = new Uint8Array(this.nx * this.ny * this.nz);
  }
  idx(i, j, k) { return i + this.nx * (j + this.ny * k); }
  get(i, j, k) { return i < 0 || j < 0 || k < 0 || i >= this.nx || j >= this.ny || k >= this.nz ? 0 : this.d[i + this.nx * (j + this.ny * k)]; }
  set(i, j, k, m) { if (i >= 0 && j >= 0 && k >= 0 && i < this.nx && j < this.ny && k < this.nz) this.d[i + this.nx * (j + this.ny * k)] = m; }
  // world centre of cell
  wx(i) { return this.ox + (i + 0.5) * this.vs; } wy(j) { return this.oy + (j + 0.5) * this.vs; } wz(k) { return this.oz + (k + 0.5) * this.vs; }
  // paint every cell in a world box: fn(x, y, z, cur) returns a material (0 = leave unchanged, -1 = clear)
  paint(x0, y0, z0, x1, y1, z1, fn) {
    const vs = this.vs;
    const i0 = Math.max(0, Math.floor((x0 - this.ox) / vs)), i1 = Math.min(this.nx - 1, Math.ceil((x1 - this.ox) / vs));
    const j0 = Math.max(0, Math.floor((y0 - this.oy) / vs)), j1 = Math.min(this.ny - 1, Math.ceil((y1 - this.oy) / vs));
    const k0 = Math.max(0, Math.floor((z0 - this.oz) / vs)), k1 = Math.min(this.nz - 1, Math.ceil((z1 - this.oz) / vs));
    for (let k = k0; k <= k1; k++) { const z = this.oz + (k + 0.5) * vs; for (let j = j0; j <= j1; j++) { const y = this.oy + (j + 0.5) * vs, base = this.nx * (j + this.ny * k);
      for (let i = i0; i <= i1; i++) { const x = this.ox + (i + 0.5) * vs, cur = this.d[base + i], m = fn(x, y, z, cur); if (m > 0) this.d[base + i] = m; else if (m < 0) this.d[base + i] = 0; } } }
  }
  // a tube along a polyline [[x,y,z,r], ...] (r may vary per point); m: material or fn(s, x, y, z, d, r) → material
  tube(pts, m, pad) {
    pad = pad || 0;
    for (let s = 0; s + 1 < pts.length; s++) {
      const a = pts[s], b = pts[s + 1], rr = Math.max(a[3], b[3]) + pad + this.vs;
      const ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2], ee = ex * ex + ey * ey + ez * ez || 1e-9;
      this.paint(Math.min(a[0], b[0]) - rr, Math.min(a[1], b[1]) - rr, Math.min(a[2], b[2]) - rr, Math.max(a[0], b[0]) + rr, Math.max(a[1], b[1]) + rr, Math.max(a[2], b[2]) + rr, (x, y, z, cur) => {
        const px = x - a[0], py = y - a[1], pz = z - a[2], h = clamp((px * ex + py * ey + pz * ez) / ee, 0, 1);
        const dx = px - ex * h, dy = py - ey * h, dz = pz - ez * h, d = Math.sqrt(dx * dx + dy * dy + dz * dz), r0 = lerp(a[3], b[3], h);
        if (d > r0 + pad) return 0;
        return typeof m === 'function' ? m(s + h, x, y, z, d, r0, cur, dx, dy, dz) : m;
      });
    }
  }
}
// ---------------------------------------------------------------- meshing: exposed faces only
// dirs: 0 +x, 1 -x, 2 +y, 3 -y, 4 +z, 5 -z
const DIRV = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const DIRC = [ // four corners (cell-relative) per face
  [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
  [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
  [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]];
// tangent axes per face (for the ambient-occlusion neighbours)
const DIRT = [[[0, 1, 0], [0, 0, 1]], [[0, 1, 0], [0, 0, 1]], [[1, 0, 0], [0, 0, 1]], [[1, 0, 0], [0, 0, 1]], [[1, 0, 0], [0, 1, 0]], [[1, 0, 0], [0, 1, 0]]];
function voxMesh(g, opt) {
  opt = opt || {};
  const solid = opt.solidFn || (m => m > 0), emit = opt.emit || (m => m > 0);
  const vmap = new Map(), vx = [], fv = [], fd = [], fm = [], fa = [], fc = [];
  const vid = (i, j, k) => { const key = i + 4096 * (j + 4096 * k); let v = vmap.get(key); if (v === undefined) { v = vx.length / 3; vx.push(g.ox + i * g.vs, g.oy + j * g.vs, g.oz + k * g.vs); vmap.set(key, v); } return v; };
  for (let k = 0; k < g.nz; k++) for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const m = g.d[i + g.nx * (j + g.ny * k)]; if (!m || !emit(m)) continue;
    for (let dd = 0; dd < 6; dd++) {
      const dv = DIRV[dd], nb = g.get(i + dv[0], j + dv[1], k + dv[2]);
      if (nb && solid(nb)) continue;
      const C = DIRC[dd];
      fv.push(vid(i + C[0][0], j + C[0][1], k + C[0][2]), vid(i + C[1][0], j + C[1][1], k + C[1][2]), vid(i + C[2][0], j + C[2][1], k + C[2][2]), vid(i + C[3][0], j + C[3][1], k + C[3][2]));
      fd.push(dd); fm.push(m);
      // ambient occlusion: occupied cells around the face on its outer side
      const T = DIRT[dd]; let occ = 0;
      for (const [s, tt] of [[1, 0], [-1, 0], [1, 1], [-1, 1]]) { const t = T[tt]; if (g.get(i + dv[0] + s * t[0], j + dv[1] + s * t[1], k + dv[2] + s * t[2])) occ++; }
      let sp = 0; const md = MAT[m]; if (md && md.speck && hash3(i, j, k) < md.speck) sp = 1;
      fa.push((occ >= 2 ? 1 : 0) + sp);
      fc.push(g.ox + (i + 0.5 + dv[0] * 0.5) * g.vs, g.oy + (j + 0.5 + dv[1] * 0.5) * g.vs, g.oz + (k + 0.5 + dv[2] * 0.5) * g.vs);
    }
  }
  return { nv: vx.length / 3, nf: fd.length, v: Float32Array.from(vx), fv: Int32Array.from(fv), fd: Uint8Array.from(fd), fm: Uint8Array.from(fm), fa: Uint8Array.from(fa), fc: Float32Array.from(fc), vs: g.vs };
}
// ---------------------------------------------------------------- camera
function camLook(eye, tg, up, fov) {
  const f = norm3(sub3(tg, eye)); let r = cross3(f, up || [0, 1, 0]); if (Math.hypot(r[0], r[1], r[2]) < 1e-6) r = cross3(f, [0, 0, 1]); r = norm3(r); const u = cross3(r, f);
  return { eye, tg, f, r, u, F: (H / 2) / Math.tan((fov || 35) * Math.PI / 360), near: 1 };
}
// light comes from upper left, a little toward the viewer (world space)
let LIGHT = norm3([-0.45, 0.8, 0.4]);
// ---------------------------------------------------------------- frame
function voxBegin() { ZB.fill(0, 0, W * H); IDB.fill(0, 0, W * H); }
let SX = new Float32Array(1 << 16), SY = new Float32Array(1 << 16), SW = new Float32Array(1 << 16), SOK = new Uint8Array(1 << 16);
// xf: 3×4 row-major model matrix (rotation · scale + translation), or null
// o: {alpha (0..1 screen door), ramp: fn(matId) → ramp override, shift: global level shift, clip / clip2: [nx,ny,nz,d] keep n·p < d, id, depthBias}
function drawVox(cam, M, xf, o) {
  o = o || {};
  if (M.nv > SX.length) { const n = M.nv * 2; SX = new Float32Array(n); SY = new Float32Array(n); SW = new Float32Array(n); SOK = new Uint8Array(n); }
  const e = cam.eye, r = cam.r, u = cam.u, f = cam.f, F = cam.F, near = cam.near, V = M.v;
  // transform vertices
  for (let i = 0, n = M.nv; i < n; i++) {
    let x = V[3 * i], y = V[3 * i + 1], z = V[3 * i + 2];
    if (xf) { const qx = xf[0] * x + xf[1] * y + xf[2] * z + xf[3], qy = xf[4] * x + xf[5] * y + xf[6] * z + xf[7], qz = xf[8] * x + xf[9] * y + xf[10] * z + xf[11]; x = qx; y = qy; z = qz; }
    const dx = x - e[0], dy = y - e[1], dz = z - e[2], cz = dx * f[0] + dy * f[1] + dz * f[2];
    if (cz < near) { SOK[i] = 0; continue; }
    SOK[i] = 1; const iz = 1 / cz;
    SX[i] = CX + (dx * r[0] + dy * r[1] + dz * r[2]) * iz * F; SY[i] = CY - (dx * u[0] + dy * u[1] + dz * u[2]) * iz * F; SW[i] = iz;
  }
  // per-direction normals, light levels and facing tests
  const nrm = [], lev = [];
  for (let d = 0; d < 6; d++) {
    let n = DIRV[d]; if (xf) n = norm3([xf[0] * n[0] + xf[1] * n[1] + xf[2] * n[2], xf[4] * n[0] + xf[5] * n[1] + xf[6] * n[2], xf[8] * n[0] + xf[9] * n[1] + xf[10] * n[2]]);
    nrm.push(n); const dl = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
    lev.push(dl > 0.55 ? 4 : dl > 0.12 ? 3 : dl > -0.35 ? 2 : 1);
  }
  const FV = M.fv, FD = M.fd, FM = M.fm, FA = M.fa, FC = M.fc, alpha = o.alpha === undefined ? 1 : o.alpha, cl = o.clip, cl2 = o.clip2, shift = o.shift || 0, rampFn = o.ramp;
  for (let q = 0, nf = M.nf; q < nf; q++) {
    const d = FD[q], n = nrm[d];
    let cx = FC[3 * q], cy = FC[3 * q + 1], cz = FC[3 * q + 2];
    if (xf) { const qx = xf[0] * cx + xf[1] * cy + xf[2] * cz + xf[3], qy = xf[4] * cx + xf[5] * cy + xf[6] * cz + xf[7], qz = xf[8] * cx + xf[9] * cy + xf[10] * cz + xf[11]; cx = qx; cy = qy; cz = qz; }
    if (n[0] * (e[0] - cx) + n[1] * (e[1] - cy) + n[2] * (e[2] - cz) <= 0) continue;          // back face
    if (cl && cl[0] * cx + cl[1] * cy + cl[2] * cz > cl[3]) continue;
    if (cl2 && cl2[0] * cx + cl2[1] * cy + cl2[2] * cz > cl2[3]) continue;
    const a = FV[4 * q], b = FV[4 * q + 1], c = FV[4 * q + 2], dd = FV[4 * q + 3];
    if (!(SOK[a] && SOK[b] && SOK[c] && SOK[dd])) continue;
    const m = FM[q], R = o.rampK && M.fk ? o.rampK(m, M.fk[q]) : rampFn ? rampFn(m) : MAT[m].r;
    if (!R) continue;
    const L = clamp(lev[d] - FA[q] + shift, 0, 4), col = R[L];
    const id = o.id || m;
    tri(SX[a], SY[a], SW[a], SX[b], SY[b], SW[b], SX[c], SY[c], SW[c], col, id, alpha, o.depthBias || 0);
    tri(SX[a], SY[a], SW[a], SX[c], SY[c], SW[c], SX[dd], SY[dd], SW[dd], col, id, alpha, o.depthBias || 0);
  }
}
// flat triangle with z-test (w = 1/z, larger is nearer); screen-door alpha; top-left fill rule
function tri(x0, y0, w0, x1, y1, w1, x2, y2, w2, col, id, alpha, bias) {
  let area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (area === 0) return;
  if (area < 0) { let t = x1; x1 = x2; x2 = t; t = y1; y1 = y2; y2 = t; t = w1; w1 = w2; w2 = t; area = -area; }
  let minx = Math.floor(Math.min(x0, x1, x2)), maxx = Math.ceil(Math.max(x0, x1, x2)), miny = Math.floor(Math.min(y0, y1, y2)), maxy = Math.ceil(Math.max(y0, y1, y2));
  if (maxx < 0 || maxy < 0 || minx >= W || miny >= H) return;
  minx = Math.max(minx, 0); miny = Math.max(miny, 0); maxx = Math.min(maxx, W - 1); maxy = Math.min(maxy, H - 1);
  const ia = 1 / area;
  // edge functions E_i(x, y) for edges (1→2), (2→0), (0→1)
  const A0 = y1 - y2, B0 = x2 - x1, A1 = y2 - y0, B1 = x0 - x2, A2 = y0 - y1, B2 = x1 - x0;
  const bias0 = (A0 > 0 || (A0 === 0 && B0 < 0)) ? 0 : -1e-7, bias1 = (A1 > 0 || (A1 === 0 && B1 < 0)) ? 0 : -1e-7, bias2 = (A2 > 0 || (A2 === 0 && B2 < 0)) ? 0 : -1e-7;
  const px0 = minx + 0.5, py0 = miny + 0.5;
  let e0r = (px0 - x1) * A0 + (py0 - y1) * B0, e1r = (px0 - x2) * A1 + (py0 - y2) * B1, e2r = (px0 - x0) * A2 + (py0 - y0) * B2;
  // edge function sign convention: A = (ya - yb), B = (xb - xa) → E = (x - xa)(ya - yb) + (y - ya)(xb - xa) ... positive inside for our winding
  for (let y = miny; y <= maxy; y++) {
    let e0 = e0r, e1 = e1r, e2 = e2r, row = y * W;
    for (let x = minx; x <= maxx; x++) {
      if (e0 + bias0 >= 0 && e1 + bias1 >= 0 && e2 + bias2 >= 0) {
        const w = (e0 * w0 + e1 * w1 + e2 * w2) * ia + bias, i = row + x;
        if (w > ZB[i] && (alpha >= 1 || bay(x, y) < alpha)) { ZB[i] = w; buf[i] = col; IDB[i] = id; }
      }
      e0 += A0; e1 += A1; e2 += A2;
    }
    e0r += B0; e1r += B1; e2r += B2;
  }
}
// 1-px outlines: silhouette (next to empty) and depth steps (next to something much farther)
function voxOutlines(k) {
  k = k === undefined ? 0.94 : k;
  const n = W * H, out = TMP2;
  for (let i = 0; i < n; i++) out[i] = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, z = ZB[i]; if (z === 0) continue;
    const m = MAT[IDB[i]]; if (!m || !m.ol) continue;
    const zl = ZB[i - 1], zr = ZB[i + 1], zu = ZB[i - W], zd = ZB[i + W];
    if (zl === 0 || zr === 0 || zu === 0 || zd === 0 || zl < z * k || zr < z * k || zu < z * k || zd < z * k) out[i] = m.olc || m.r[0];
  }
  for (let i = 0; i < n; i++) if (out[i]) buf[i] = out[i];
}
// ---------------------------------------------------------------- matrices (3×4 row-major)
const M_ID = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
function mMul(a, b) { const o = new Array(12); for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) o[4 * r + c] = a[4 * r] * b[c] + a[4 * r + 1] * b[4 + c] + a[4 * r + 2] * b[8 + c]; o[4 * r + 3] = a[4 * r] * b[3] + a[4 * r + 1] * b[7] + a[4 * r + 2] * b[11] + a[4 * r + 3]; } return o; }
function mT(x, y, z) { return [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z]; }
function mS(s, sy, sz) { sy = sy === undefined ? s : sy; sz = sz === undefined ? s : sz; return [s, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0]; }
function mRx(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0]; }
function mRy(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0]; }
function mRz(a) { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0]; }
function mApply(m, p) { return [m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3], m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7], m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11]]; }
// rotation about a pivot point
const mAbout = (p, R) => mMul(mT(p[0], p[1], p[2]), mMul(R, mT(-p[0], -p[1], -p[2])));
// project a world point to the screen (null if behind the camera)
function proj(cam, p) {
  const dx = p[0] - cam.eye[0], dy = p[1] - cam.eye[1], dz = p[2] - cam.eye[2], cz = dx * cam.f[0] + dy * cam.f[1] + dz * cam.f[2];
  if (cz < cam.near) return null;
  return [CX + (dx * cam.r[0] + dy * cam.r[1] + dz * cam.r[2]) / cz * cam.F, CY - (dx * cam.u[0] + dy * cam.u[1] + dz * cam.u[2]) / cz * cam.F, 1 / cz];
}
// per-face ramp from the face's stored value (arrival distance of the contrast front)
function drawVoxK(cam, M, fn, o) { o = o || {}; drawVox(cam, M, o.xf || null, Object.assign({ rampK: fn }, o)); }
// cached meshes: build once on first use
const MESH = {};
function cached(key, build) { return MESH[key] || (MESH[key] = build()); }
