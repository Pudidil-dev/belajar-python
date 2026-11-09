'use strict';
// ============================================================================
// R3D — a small software 3D renderer made for pixel art (the CTA film's engine;
// no WebGL, no browser needed): a perspective camera, near-plane clipping, a
// z-buffer, per-vertex lighting, palette ramps with ordered (Bayer) dithering
// between steps, dithered blends between two ramps (e.g. blood → contrast),
// fresnel glass and screen-door transparency, a clip plane, procedural
// per-pixel surfaces (pixFn: the artery's pixel-art cut face), depth fog, and
// one-pixel outlines from an object-ID buffer. Everything lands on the
// same 360×640 pixel grid as the rest of the film.
// ============================================================================
const ZB = new Float32Array(360 * 640);           // 1/z of the nearest surface (0 = empty)
const IDB = new Uint16Array(360 * 640);           // object id per pixel (outlines)
const OLC = [0];                                  // outline colour per object id
let OBJN = 1;
const MARK = new Uint8Array(360 * 640);
const BAYF = new Float32Array(16); for (let i = 0; i < 16; i++) BAYF[i] = (BAYER[i] + 0.5) / 16;
const BAND = new Float32Array(16); for (let i = 0; i < 16; i++) BAND[i] = 0.5 + ((BAYER[i] + 0.5) / 16 - 0.5) * 0.9;
const bayA = (x, y) => BAND[((y & 3) << 2) | (x & 3)];
const bayB = (x, y) => BAYF[(((y + 1) & 3) << 2) | ((x + 2) & 3)];
const bayC = (x, y, o) => BAYF[(((y + (o >> 2)) & 3) << 2) | ((x + o) & 3)];
function r3dBegin() { ZB.fill(0); IDB.fill(0); OBJN = 1; OLC.length = 1; }
function newId(ol) { const id = OBJN++; OLC[id] = ol === undefined ? null : ol; return id; }
// ---------------------------------------------------------------- camera
function camLook(eye, tg, up, fov) {
  const f = norm3(sub3(tg, eye)); let r = cross3(f, up); if (Math.hypot(r[0], r[1], r[2]) < 1e-6) r = cross3(f, [0, 0, 1]); r = norm3(r); const u = cross3(r, f);
  return { eye, tg, f, r, u, F: (H / 2) / Math.tan((fov || 40) * Math.PI / 360), near: 0.5, light: norm3(add3(add3(mul3(r, -0.45), mul3(u, 0.78)), mul3(f, -0.45))), fog: null };
}
function camPt(cam, p) { const dx = p[0] - cam.eye[0], dy = p[1] - cam.eye[1], dz = p[2] - cam.eye[2]; return [dx * cam.r[0] + dy * cam.r[1] + dz * cam.r[2], dx * cam.u[0] + dy * cam.u[1] + dz * cam.u[2], dx * cam.f[0] + dy * cam.f[1] + dz * cam.f[2]]; }
function project(cam, p) { const c = camPt(cam, p); if (c[2] < cam.near) return null; return [CX + c[0] / c[2] * cam.F, CY - c[1] / c[2] * cam.F, 1 / c[2]]; }
// ---------------------------------------------------------------- per-vertex scratch arrays
let VN = 0, CXa, CYa, CZa, SXa, SYa, IZa, LIa, MXa, CDa, UUa, VVa, GLa, VDa;
function ensureV(n) {
  if (CXa && CXa.length >= n) return;
  const m = Math.max(n, 4096) * 2;
  CXa = new Float32Array(m); CYa = new Float32Array(m); CZa = new Float32Array(m); SXa = new Float32Array(m); SYa = new Float32Array(m); IZa = new Float32Array(m);
  LIa = new Float32Array(m); MXa = new Float32Array(m); CDa = new Float32Array(m); UUa = new Float32Array(m); VVa = new Float32Array(m); GLa = new Float32Array(m); VDa = new Float32Array(m);
}
// ---------------------------------------------------------------- draw a mesh
// mesh: {p, n, a, uv, t, nv, nt}; mat: {ramp, back, ol, alpha, ao (alpha offset), mix: {ramp, f(a)}, unlit, amb, dif, rim, tex, blend, noZ, clip:[nx,ny,nz,d], fog,
//   zBias: visible through up to zBias world units of nearer surface (a vein seen under the skin), geoFacing}
// xf: optional 3×4 row-major matrix applied to positions (and normals)
function drawMesh(cam, mesh, mat, xf) {
  const nv = mesh.nv; ensureV(nv + 64);
  const P = mesh.p, N = mesh.n, A = mesh.a, UV = mesh.uv, r = cam.r, u = cam.u, f = cam.f, e = cam.eye, L = cam.light;
  const amb = mat.amb === undefined ? 0.34 : mat.amb, dif = mat.dif === undefined ? 0.7 : mat.dif, rim = mat.rim === undefined ? 0.22 : mat.rim;
  const mixF = mat.mix ? mat.mix.f : null, cl = mat.clip, cfn = mat.clipFn;
  for (let i = 0; i < nv; i++) {
    let px = P[3 * i], py = P[3 * i + 1], pz = P[3 * i + 2], nx = N[3 * i], ny = N[3 * i + 1], nz = N[3 * i + 2];
    if (xf) { const qx = xf[0] * px + xf[1] * py + xf[2] * pz + xf[3], qy = xf[4] * px + xf[5] * py + xf[6] * pz + xf[7], qz = xf[8] * px + xf[9] * py + xf[10] * pz + xf[11]; px = qx; py = qy; pz = qz; const mx = xf[0] * nx + xf[1] * ny + xf[2] * nz, my = xf[4] * nx + xf[5] * ny + xf[6] * nz, mz = xf[8] * nx + xf[9] * ny + xf[10] * nz, ml = Math.hypot(mx, my, mz) || 1; nx = mx / ml; ny = my / ml; nz = mz / ml; }
    const dx = px - e[0], dy = py - e[1], dz = pz - e[2];
    const cx = dx * r[0] + dy * r[1] + dz * r[2], cy = dx * u[0] + dy * u[1] + dz * u[2], cz = dx * f[0] + dy * f[1] + dz * f[2];
    CXa[i] = cx; CYa[i] = cy; CZa[i] = cz;
    { const dl0 = Math.hypot(dx, dy, dz) || 1; VDa[i] = -(nx * dx + ny * dy + nz * dz) / dl0; }
    if (mat.unlit) LIa[i] = 1;
    else {
      const dl = Math.hypot(dx, dy, dz) || 1, vd = -(nx * dx + ny * dy + nz * dz) / dl, nl = nx * L[0] + ny * L[1] + nz * L[2];
      const fr = 1 - Math.abs(vd); let li = amb + dif * Math.max(0, mat.back ? Math.abs(nl) * (vd < 0 ? 0.6 : 1) : nl) + rim * fr * fr;
      if (mat.spec) { const rx = 2 * nl * nx - L[0], ry = 2 * nl * ny - L[1], rz = 2 * nl * nz - L[2], rv = -(rx * dx + ry * dy + rz * dz) / dl; li = Math.min(mat.cap || 0.78, li) + mat.spec * Math.pow(Math.max(0, rv), 18); }
      LIa[i] = li;
      if (mat.glass) GLa[i] = lerp(mat.glass[0], mat.glass[1], Math.pow(fr, mat.glass[2] || 1.4));
      if (mat.mixFacing) MXa[i] = (mixF ? mixF(A[i], i) : 0) * clamp((Math.abs(vd) - 0.28) / 0.3, 0, 1);
    }
    if (!mat.mixFacing || mat.unlit) MXa[i] = mixF ? mixF(A[i], i) : 0;
    if (cfn) CDa[i] = cfn(px, py, pz); else if (cl) CDa[i] = cl[0] * px + cl[1] * py + cl[2] * pz + cl[3];
    if (UV) { UUa[i] = UV[2 * i]; VVa[i] = UV[2 * i + 1]; }
  }
  const T = mesh.t, near = cam.near;
  for (let k = 0; k < mesh.nt; k++) {
    const a = T[3 * k], b = T[3 * k + 1], c = T[3 * k + 2];
    if ((cl || cfn) && CDa[a] > 0 && CDa[b] > 0 && CDa[c] > 0) continue;
    const za = CZa[a], zb = CZa[b], zc = CZa[c];
    if (za < near && zb < near && zc < near) continue;
    if (za >= near && zb >= near && zc >= near) { projV(cam, a); projV(cam, b); projV(cam, c); rasterTri(a, b, c, mat); continue; }
    clipTri(cam, a, b, c, nv, mat);
  }
}
function projV(cam, i) { const iz = 1 / CZa[i]; SXa[i] = CX + CXa[i] * iz * cam.F; SYa[i] = CY - CYa[i] * iz * cam.F; IZa[i] = iz; }
// clip one triangle against the near plane: the new vertices are written past the mesh's own (scratch slots)
function clipTri(cam, a, b, c, base, mat) {
  const ids = [a, b, c], out = [], near = cam.near; let s = base;
  for (let q = 0; q < 3; q++) {
    const i = ids[q], j = ids[(q + 1) % 3], zi = CZa[i], zj = CZa[j];
    if (zi >= near) out.push(i);
    if ((zi >= near) !== (zj >= near)) {
      const t = (near - zi) / (zj - zi);
      CXa[s] = lerp(CXa[i], CXa[j], t); CYa[s] = lerp(CYa[i], CYa[j], t); CZa[s] = near; LIa[s] = lerp(LIa[i], LIa[j], t); MXa[s] = lerp(MXa[i], MXa[j], t);
      CDa[s] = lerp(CDa[i], CDa[j], t); UUa[s] = lerp(UUa[i], UUa[j], t); VVa[s] = lerp(VVa[i], VVa[j], t); GLa[s] = lerp(GLa[i], GLa[j], t); VDa[s] = lerp(VDa[i], VDa[j], t);
      out.push(s++);
    }
  }
  for (const i of out) projV(cam, i);
  for (let q = 1; q + 1 < out.length; q++) rasterTri(out[0], out[q], out[q + 1], mat);
}
// the rasterizer: pixel centres, top-left inclusive, perspective-correct attributes
function rasterTri(a, b, c, mat) {
  let x0 = SXa[a], y0 = SYa[a], x1 = SXa[b], y1 = SYa[b], x2 = SXa[c], y2 = SYa[c];
  let area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (area === 0 || area !== area) return;
  // front / back: from the smoothed normals (clean silhouettes), or from the triangle's own winding (geoFacing: interiors seen through a cut)
  const front = mat.tex || mat.pixFn || mat.geoFacing ? area < 0 : (VDa[a] + VDa[b] + VDa[c]) > 0;
  if (!front && !mat.back) return;
  if (area < 0) { let t = b; b = c; c = t; x1 = SXa[b]; y1 = SYa[b]; x2 = SXa[c]; y2 = SYa[c]; area = -area; }
  let minX = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
  let minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
  if (minX > maxX || minY > maxY) return;
  const ia = 1 / area;
  const iz0 = IZa[a], iz1 = IZa[b], iz2 = IZa[c];
  const l0 = LIa[a] * iz0, l1 = LIa[b] * iz1, l2 = LIa[c] * iz2;
  const m0 = MXa[a] * iz0, m1 = MXa[b] * iz1, m2 = MXa[c] * iz2, hasMix = !!mat.mix;
  const cl = mat.clip || mat.clipFn, d0 = CDa[a] * iz0, d1 = CDa[b] * iz1, d2 = CDa[c] * iz2;
  const tex = mat.tex, pixFn = mat.pixFn, u0 = UUa[a] * iz0, u1 = UUa[b] * iz1, u2 = UUa[c] * iz2, v0 = VVa[a] * iz0, v1 = VVa[b] * iz1, v2 = VVa[c] * iz2;
  const ramp = front ? mat.ramp : mat.back, nR = ramp.length - 1, ramp2 = hasMix ? (front ? mat.mix.ramp : (mat.mix.back || mat.mix.ramp)) : null, nR2 = ramp2 ? ramp2.length - 1 : 0;
  const alpha = mat.alpha === undefined ? 1 : mat.alpha, ao = mat.ao || 0, blend = mat.blend || 0, noZ = !!mat.noZ, id = mat.id || 0, zb = mat.zBias || 0;
  const fog = mat.fog, fn = fog ? fog[0] : 0, ff = fog ? fog[1] : 1, fc = fog ? fog[2] : 0, glass = !!mat.glass, g0 = GLa[a] * iz0, g1 = GLa[b] * iz1, g2 = GLa[c] * iz2;
  // edge functions (area > 0: inside means all three >= 0; b0 = w0 / area is the weight of vertex a)
  const sx = minX + 0.5, sy = minY + 0.5;
  let w0r = (x2 - x1) * (sy - y1) - (y2 - y1) * (sx - x1);
  let w1r = (x0 - x2) * (sy - y2) - (y0 - y2) * (sx - x2);
  let w2r = (x1 - x0) * (sy - y0) - (y1 - y0) * (sx - x0);
  const dw0x = -(y2 - y1), dw0y = (x2 - x1), dw1x = -(y0 - y2), dw1y = (x0 - x2), dw2x = -(y1 - y0), dw2y = (x1 - x0);
  for (let y = minY; y <= maxY; y++) {
    let w0 = w0r, w1 = w1r, w2 = w2r, row = y * W;
    for (let x = minX; x <= maxX; x++, w0 += dw0x, w1 += dw1x, w2 += dw2x) {
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const b0 = w0 * ia, b1 = w1 * ia, b2 = w2 * ia, iz = b0 * iz0 + b1 * iz1 + b2 * iz2, i = row + x;
      let under = 0;   // how deep under a nearer surface (zBias: fades out with depth)
      if (iz <= ZB[i]) { if (!zb) continue; under = (1 / iz - 1 / ZB[i]) / zb; if (under >= 1) continue; }
      const rz = 1 / iz;
      let cdv = 0; if (cl) { cdv = (b0 * d0 + b1 * d1 + b2 * d2) * rz; if (cdv > 0) continue; }
      if (alpha < 1 && bayC(x, y, ao) >= alpha) continue;
      if (glass && bayC(x, y, ao) >= (b0 * g0 + b1 * g1 + b2 * g2) * rz) continue;
      let col;
      if (tex) {
        const uu = (b0 * u0 + b1 * u1 + b2 * u2) * rz, vv = (b0 * v0 + b1 * v1 + b2 * v2) * rz;
        const tx = Math.min(tex.w - 1, Math.max(0, (uu * tex.w) | 0)), ty = Math.min(tex.h - 1, Math.max(0, (vv * tex.h) | 0));
        col = tex.d[ty * tex.w + tx]; if (!col) continue;
      } else if (pixFn) {                         // a procedural pixel-art surface: colour from the (u, v) under each pixel, crisp at any zoom
        col = pixFn((b0 * u0 + b1 * u1 + b2 * u2) * rz, (b0 * v0 + b1 * v1 + b2 * v2) * rz, x, y); if (!col) continue;
      } else {
        const li = (b0 * l0 + b1 * l1 + b2 * l2) * rz, bd = bayA(x, y);
        if (hasMix) { const mm = (b0 * m0 + b1 * m1 + b2 * m2) * rz; if (mm > 0 && bayB(x, y) < mm) { let k = (li * nR2 + bd) | 0; if (k > nR2) k = nR2; if (k < 0) k = 0; col = ramp2[k]; } else { let k = (li * nR + bd) | 0; if (k > nR) k = nR; if (k < 0) k = 0; col = ramp[k]; } }
        else { let k = (li * nR + bd) | 0; if (k > nR) k = nR; if (k < 0) k = 0; col = ramp[k]; }
      }
      if (cl && mat.cutCol !== undefined && cdv > -(mat.cutW || 0.45)) col = mat.cutCol;
      if (fog) { const fz = (rz - fn) / (ff - fn); if (fz > 0) col = mixc(col, fc, Math.min(0.92, Math.round(fz * 5) / 5)); }
      if (blend) { buf[i] = mixc(buf[i], col, under > 0 ? blend * (1 - under * under) : blend); continue; }
      buf[i] = col; if (!noZ) { ZB[i] = iz; IDB[i] = id; }
    }
    w0r += dw0y; w1r += dw1y; w2r += dw2y;
  }
}
// one-pixel outlines where an object meets something behind it (or the background), plus strong self-occlusion
function r3dOutlines() {
  MARK.fill(0);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, id = IDB[i]; if (!id || OLC[id] === null) continue;
    const z = ZB[i];
    for (const j of [i - 1, i + 1, i - W, i + W]) { const nid = IDB[j]; if ((nid !== id && (nid === 0 || ZB[j] < z * 0.985)) || (nid === id && ZB[j] < z * 0.86)) { MARK[i] = 1; break; } }
  }
  for (let i = 0; i < W * H; i++) if (MARK[i]) buf[i] = OLC[IDB[i]];
}
// ---------------------------------------------------------------- points and lines in 3D
// a shaded sphere sprite (pixel-art ball) with a depth test; rW world radius
function sprite3(cam, p, rW, ramp, opt) {
  opt = opt || {};
  const c = camPt(cam, p); if (c[2] < cam.near) return null;
  const iz = 1 / c[2], sx = CX + c[0] * iz * cam.F, sy = CY - c[1] * iz * cam.F, r = Math.max(opt.min || 0.7, rW * iz * cam.F);
  if (sx < -r - 2 || sy < -r - 2 || sx > W + r + 2 || sy > H + r + 2) return null;
  const x0 = Math.max(0, Math.floor(sx - r)), x1 = Math.min(W - 1, Math.ceil(sx + r)), y0 = Math.max(0, Math.floor(sy - r)), y1 = Math.min(H - 1, Math.ceil(sy + r)), n = ramp.length - 1, id = opt.id || 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = (x + 0.5 - sx) / r, dy = (y + 0.5 - sy) / r, q = dx * dx + dy * dy; if (q > 1) continue;
    const i = y * W + x, zz = iz * (1 + 0.2 * Math.sqrt(1 - q) * rW * iz); if (zz <= ZB[i] && !opt.noZtest) continue;
    if (opt.alpha !== undefined && bayC(x, y, opt.ao || 0) >= opt.alpha) continue;
    const li = clamp(0.55 - 0.45 * dx - 0.5 * dy + 0.1 * Math.sqrt(1 - q), 0, 1); let k = (li * n + bayA(x, y)) | 0; if (k > n) k = n;
    buf[i] = q > 0.82 && opt.ol !== undefined ? opt.ol : ramp[k]; if (!opt.noZ) { ZB[i] = zz; IDB[i] = id; }
  }
  return [sx, sy, r, iz];
}
// a depth-tested line between two 3D points (clipped at the near plane)
function line3(cam, a, b, col, w, opt) {
  opt = opt || {};
  let pa = camPt(cam, a), pb = camPt(cam, b), n = cam.near;
  if (pa[2] < n && pb[2] < n) return;
  if (pa[2] < n) { const t = (n - pa[2]) / (pb[2] - pa[2]); pa = [lerp(pa[0], pb[0], t), lerp(pa[1], pb[1], t), n]; }
  if (pb[2] < n) { const t = (n - pb[2]) / (pa[2] - pb[2]); pb = [lerp(pb[0], pa[0], t), lerp(pb[1], pa[1], t), n]; }
  const ax = CX + pa[0] / pa[2] * cam.F, ay = CY - pa[1] / pa[2] * cam.F, bx = CX + pb[0] / pb[2] * cam.F, by = CY - pb[1] / pb[2] * cam.F, za = 1 / pa[2], zb = 1 / pb[2];
  const L = Math.max(Math.abs(bx - ax), Math.abs(by - ay)), steps = Math.max(1, Math.ceil(L)), ww = Math.max(1, w || 1), h = ww / 2;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps, x = lerp(ax, bx, t), y = lerp(ay, by, t), iz = 1 / lerp(1 / za, 1 / zb, t);
    for (let oy = -Math.floor(h - 0.01); oy <= Math.floor(h); oy++) for (let ox = -Math.floor(h - 0.01); ox <= Math.floor(h); ox++) {
      const px = Math.floor(x + ox), py = Math.floor(y + oy); if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const i = py * W + px; if (!opt.noZtest && iz <= ZB[i]) continue;
      if (opt.alpha !== undefined && bayC(px, py, opt.ao || 0) >= opt.alpha) continue;
      buf[i] = opt.blend ? mixc(buf[i], col, opt.blend) : col;
    }
  }
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
// rotation about the axis through point c with direction k (Rodrigues)
function mRotAxis(c, k, ang) {
  k = norm3(k); const x = k[0], y = k[1], z = k[2], C = Math.cos(ang), S = Math.sin(ang), t = 1 - C;
  const R = [t * x * x + C, t * x * y - S * z, t * x * z + S * y, 0, t * x * y + S * z, t * y * y + C, t * y * z - S * x, 0, t * x * z - S * y, t * y * z + S * x, t * z * z + C, 0];
  return mMul(mT(c[0], c[1], c[2]), mMul(R, mT(-c[0], -c[1], -c[2])));
}
