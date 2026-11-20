// VOL — the brain as voxels. ANAT's volume is built once; its surface voxels are splatted into a z-buffer every frame
// (the rotating 3D brain), and MRI slices are sampled from the same volume with a T1-weighted contrast.
// Splats write final palette colours (ordered dither in screen space), so the quantizer leaves them untouched.
// Brain frame: x = patient's left, y = anterior, z = superior (mm). View: yaw about z, then pitch (look from above),
// then roll; yaw 0 looks at the face of the brain, yaw +90° at the left hemisphere, −90° at the right.
(() => {
const V = globalThis.VOL = {};
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
V.BAY = (x, y) => BAY[(y & 3) << 2 | (x & 3)];
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
V.ramp = names => names.map(n => hex(globalThis.P[n] || n));

// separable [1 2 1]/4 blur, `passes` times, in place on a copy
function blur(src, nx, ny, nz, passes) {
  let a = Float32Array.from(src), b = new Float32Array(a.length);
  const sx = 1, sy = nx, sz = nx * ny;
  for (let p = 0; p < passes; p++) for (const [st, n] of [[sx, nx], [sy, ny], [sz, nz]]) {
    for (let q = 0; q < a.length; q++) {
      const c = Math.floor(q / st) % n;
      b[q] = (2 * a[q] + (c > 0 ? a[q - st] : a[q]) + (c < n - 1 ? a[q + st] : a[q])) * 0.25;
    }
    [a, b] = [b, a];
  }
  return a;
}

V.init = (vs = 1.25) => {
  const t0 = Date.now();
  const G = ANAT.build(vs); V.G = G;
  const { nx, ny, nz, N, lab, part, hdep } = G;
  const occ = new Float32Array(N); for (let q = 0; q < N; q++) occ[q] = lab[q] ? 1 : 0;
  const Sn = blur(occ, nx, ny, nz, 2), Sa = blur(occ, nx, ny, nz, 6);
  // surface voxels: inside the brain with an outside 6-neighbour
  const list = [];
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const q = (k * ny + j) * nx + i; if (!lab[q]) continue;
    if (lab[q - 1] && lab[q + 1] && lab[q - nx] && lab[q + nx] && lab[q - nx * ny] && lab[q + nx * ny]) continue;
    list.push(q);
  }
  const M = list.length, S = V.S = { n: M, x: new Float32Array(M), y: new Float32Array(M), z: new Float32Array(M), nx: new Float32Array(M), ny: new Float32Array(M), nz: new Float32Array(M),
    part: new Uint8Array(M), dep: new Uint8Array(M), ao: new Float32Array(M), lab: new Uint8Array(M), h: new Float32Array(M) };
  list.forEach((q, m) => {
    const i = q % nx, j = Math.floor(q / nx) % ny, k = Math.floor(q / (nx * ny));
    S.x[m] = G.x0 + i * vs; S.y[m] = G.y0 + j * vs; S.z[m] = G.z0 + k * vs;
    let gx = Sn[q + 1] - Sn[q - 1], gy = Sn[q + nx] - Sn[q - nx], gz = Sn[q + nx * ny] - Sn[q - nx * ny];
    const L = Math.hypot(gx, gy, gz) || 1; S.nx[m] = -gx / L; S.ny[m] = -gy / L; S.nz[m] = -gz / L;
    S.part[m] = part[q]; S.dep[m] = hdep[q]; S.ao[m] = Sa[q]; S.lab[m] = lab[q];
    S.h[m] = ((i * 73856093) ^ (j * 19349663) ^ (k * 83492791)) >>> 0;     // per-voxel hash for dissolves
    S.h[m] = (S.h[m] % 10007) / 10007;
  });
  // T1 intensity volume (0..255), CSF where there is no brain
  const T = V.T1v = new Uint8Array(N);
  for (let q = 0; q < N; q++) T[q] = Math.round(255 * ANAT.T1[lab[q]]);
  // T2-weighted intensities for the contrast comparison: fluid bright, white matter darker than gray
  const T2 = V.T2v = new Uint8Array(N), T2L = [0.92, 0.56, 0.36, 0.56, 0.4, 0.44, 0.47, 0.95];
  for (let q = 0; q < N; q++) T2[q] = Math.round(255 * T2L[lab[q]]);
  V.buildMs = Date.now() - t0;
  return V;
};

// ---------- slices ----------
// T1 at a point of the brain grid (trilinear); outside the grid → CSF
V.gridT1 = (x, y, z) => {
  const G = V.G, fx = (x - G.x0) / G.vs, fy = (y - G.y0) / G.vs, fz = (z - G.z0) / G.vs;
  if (fx < 0 || fy < 0 || fz < 0 || fx >= G.nx - 1 || fy >= G.ny - 1 || fz >= G.nz - 1) return ANAT.T1[0];
  const i = fx | 0, j = fy | 0, k = fz | 0, u = fx - i, v = fy - j, w = fz - k, nx = G.nx, sxy = nx * G.ny, q = (k * G.ny + j) * nx + i, T = V.T1v;
  const c00 = T[q] + (T[q + 1] - T[q]) * u, c10 = T[q + nx] + (T[q + nx + 1] - T[q + nx]) * u;
  const c01 = T[q + sxy] + (T[q + sxy + 1] - T[q + sxy]) * u, c11 = T[q + sxy + nx] + (T[q + sxy + nx + 1] - T[q + sxy + nx]) * u;
  const c0 = c00 + (c10 - c00) * v, c1 = c01 + (c11 - c01) * v;
  return (c0 + (c1 - c0) * w) / 255;
};
// T1 at any point of the head (−1 = air), with a touch of MRI noise and coil shading
V.t1At = (x, y, z) => {
  const dc = ANAT.cavity(x, y, z);
  let v = dc < 0 ? V.gridT1(x, y, z) : (ANAT.face ? ANAT.face(x, y, z, dc) : ANAT.layerT1(dc, x, y, z));
  if (v < 0) return v;
  return clamp(v * (0.94 + 0.06 * Math.tanh(-y / 80)) + 0.022 * ANAT.noise(x * 0.9, y * 0.9, z * 0.9));
};
// an image of the plane p(u, v) = o + u·eu + v·ev, w × h samples over [−fu/2, fu/2] × [−fv/2, fv/2] mm (v downward)
// returns Float32Array intensities (−1 = air)
V.slice = (o, eu, ev, w, h, fu, fv) => {
  const out = new Float32Array(w * h);
  for (let r = 0; r < h; r++) { const v = (r + 0.5) / h * fv - fv / 2;
    for (let c = 0; c < w; c++) { const u = (c + 0.5) / w * fu - fu / 2;
      out[r * w + c] = V.t1At(o[0] + u * eu[0] + v * ev[0], o[1] + u * eu[1] + v * ev[1], o[2] + u * eu[2] + v * ev[2]); } }
  return out;
};
// T2-weighted point sample: brain from the T2 volume, the cranial layers remapped (fatty marrow and scalp mid-gray)
V.t2At = (x, y, z) => {
  const dc = ANAT.cavity(x, y, z), G = V.G;
  if (dc < 0) {
    const fx = (x - G.x0) / G.vs, fy = (y - G.y0) / G.vs, fz = (z - G.z0) / G.vs, i = Math.round(fx), j = Math.round(fy), k = Math.round(fz);
    if (i < 0 || j < 0 || k < 0 || i >= G.nx || j >= G.ny || k >= G.nz) return 0.92;
    return V.T2v[(k * G.ny + j) * G.nx + i] / 255;
  }
  const v = ANAT.layerT1(dc, x, y, z); if (v < 0) return v;
  return v > 0.7 ? 0.55 : v < 0.1 ? 0.05 : v * 0.8;
};
V.sliceWith = (fn, o, eu, ev, w, h, fu, fv) => {
  const out = new Float32Array(w * h);
  for (let r = 0; r < h; r++) { const vv = (r + 0.5) / h * fv - fv / 2;
    for (let c = 0; c < w; c++) { const u = (c + 0.5) / w * fu - fu / 2;
      out[r * w + c] = fn(o[0] + u * eu[0] + vv * ev[0], o[1] + u * eu[1] + vv * ev[1], o[2] + u * eu[2] + vv * ev[2]); } }
  return out;
};
// common planes. Axial: viewed from below like a radiology viewer (patient's right on screen left, anterior up).
V.axial = (z, w, h, fu, fv) => V.slice([0, 0, z], [-1, 0, 0], [0, -1, 0], w, h, fu, fv);
V.sagittal = (x, w, h, fu, fv, cy = -6, cz = -18) => V.slice([x, cy, cz], [0, 1, 0], [0, 0, -1], w, h, fu, fv);
V.coronal = (y, w, h, fu, fv) => V.slice([0, y, -10], [-1, 0, 0], [0, 0, -1], w, h, fu, fv);

// ---------- the 3D render ----------
const RAMPS = {};
const ramps = () => {
  if (RAMPS.ok) return RAMPS;
  RAMPS[1] = RAMPS[2] = V.ramp(['q0', 'q1', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6']);
  RAMPS[3] = V.ramp(['q0', 'q1', 'q2', 'm2', 'm3', 'm4', 'm5']);
  RAMPS[4] = V.ramp(['q0', 'q1', 'g5', 'g7', 'g9', 'ga', 'gb']);
  RAMPS.gray = V.ramp(['k', 'g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'ga', 'gb', 'w']);
  RAMPS.edge = V.ramp(['q0'])[0];
  RAMPS.ok = true; return RAMPS;
};
V.view = o => {
  const cy = Math.cos(o.yaw || 0), sy = Math.sin(o.yaw || 0), cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0), cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0);
  // brain (x, y, z) → view (X right, Y up, D toward the viewer)
  return (x, y, z) => {
    const x1 = x * cy - y * sy, d1 = x * sy + y * cy;
    const d2 = d1 * cp + z * sp, y2 = -d1 * sp + z * cp;
    return [x1 * cr - y2 * sr, x1 * sr + y2 * cr, d2];
  };
};
// project a brain point to the screen for overlays (labels, scan lines): [sx, sy, depth]
V.proj = (o, x, y, z) => { const [X, Y, D] = V.view(o)(x, y, z); return [o.cx + o.s * X, o.cy - o.s * Y, D]; };
let ZB = null, ID = null, VB = null;
// o = {cx, cy, s (px/mm), yaw, pitch, roll, clip: {n: [nx, ny, nz], d} keep n·p ≤ d, show (fn(m) → 0 hide | 1 show),
//      shift (fn(m) → [dx, dy, dz] mm), light, cut: true to draw the cut face in T1 gray, cutCol: fn(v) → ramp position}
V.render = (img, o) => {
  const W = img.width, H = img.height, data = img.data, R = ramps(), S = V.S, vs = V.G.vs;
  if (!ZB || ZB.length !== W * H) { ZB = new Float32Array(W * H); ID = new Int32Array(W * H); }
  ZB.fill(-1e9); ID.fill(-1);
  const view = V.view(o), s = o.s, k = Math.max(1, Math.ceil(s * vs * 1.42)), h0 = Math.floor(k / 2);
  const [rxx, rxy, rxd] = view(1, 0, 0), [ryx, ryy, ryd] = view(0, 1, 0), [rzx, rzy, rzd] = view(0, 0, 1);
  const clip = o.clip, show = o.show, shift = o.shift;
  let bx0 = W, by0 = H, bx1 = -1, by1 = -1;
  const NX = new Float32Array(S.n), NY = new Float32Array(S.n), ND = new Float32Array(S.n);   // view-space normals of drawn voxels
  for (let m = 0; m < S.n; m++) {
    let x = S.x[m], y = S.y[m], z = S.z[m];
    if (clip && clip.n[0] * x + clip.n[1] * y + clip.n[2] * z > clip.d) continue;
    if (show && !show(m)) continue;
    if (shift) { const d = shift(m); if (d) { x += d[0]; y += d[1]; z += d[2]; } }
    const nd = S.nx[m] * rxd + S.ny[m] * ryd + S.nz[m] * rzd;
    if (nd < -0.3) continue;
    const X = x * rxx + y * ryx + z * rzx, Y = x * rxy + y * ryy + z * rzy, D = x * rxd + y * ryd + z * rzd;
    const sx = Math.floor(o.cx + s * X) - h0, sy = Math.floor(o.cy - s * Y) - h0;
    if (sx + k <= 0 || sy + k <= 0 || sx >= W || sy >= H) continue;
    NX[m] = S.nx[m] * rxx + S.ny[m] * ryx + S.nz[m] * rzx; NY[m] = S.nx[m] * rxy + S.ny[m] * ryy + S.nz[m] * rzy; ND[m] = nd;
    for (let yy = Math.max(0, sy); yy < Math.min(H, sy + k); yy++) for (let xx = Math.max(0, sx); xx < Math.min(W, sx + k); xx++) {
      const p = yy * W + xx; if (D > ZB[p]) { ZB[p] = D; ID[p] = m; }
    }
    if (sx < bx0) bx0 = sx; if (sy < by0) by0 = sy; if (sx + k > bx1) bx1 = sx + k; if (sy + k > by1) by1 = sy + k;
  }
  // the cut face: every brain voxel lying on the clip plane, coloured by its T1 intensity
  if (clip && o.cut) {
    const G = V.G, n = clip.n;
    const cut = V.cutList(n, clip.d);
    for (let c = 0; c < cut.n; c++) {
      let x = cut.x[c], y = cut.y[c], z = cut.z[c];
      const X = x * rxx + y * ryx + z * rzx, Y = x * rxy + y * ryy + z * rzy, D = x * rxd + y * ryd + z * rzd;
      const sx = Math.floor(o.cx + s * X) - h0, sy = Math.floor(o.cy - s * Y) - h0;
      if (sx + k <= 0 || sy + k <= 0 || sx >= W || sy >= H) continue;
      for (let yy = Math.max(0, sy); yy < Math.min(H, sy + k); yy++) for (let xx = Math.max(0, sx); xx < Math.min(W, sx + k); xx++) {
        const p = yy * W + xx; if (D >= ZB[p] - 0.6 * vs) { ZB[p] = D; ID[p] = -2 - c; }
      }
      if (sx < bx0) bx0 = sx; if (sy < by0) by0 = sy; if (sx + k > bx1) bx1 = sx + k; if (sy + k > by1) by1 = sy + k;
    }
    V._cut = cut;
  }
  bx0 = Math.max(0, bx0 - 1); by0 = Math.max(0, by0 - 1); bx1 = Math.min(W, bx1 + 1); by1 = Math.min(H, by1 + 1);
  // shading: lambert + soft rim − cavity occlusion − sulcal depth, per pixel, then smoothed over the local surface
  // (a 3×3 average among neighbours on the same surface) so the dither forms clean bands instead of voxel speckle
  const L = o.light || [-0.42, 0.55, 0.72], ln = Math.hypot(...L), lx = L[0] / ln, ly = L[1] / ln, ld = L[2] / ln;
  const amb = o.amb ?? 0.16, gain = o.gain ?? 1, same = 2.2 * vs;
  if (!VB || VB.length !== W * H) { VB = new Float32Array(W * H); }
  for (let yy = by0; yy < by1; yy++) for (let xx = bx0; xx < bx1; xx++) {
    const p = yy * W + xx, m = ID[p]; if (m < 0) continue;
    const lam = Math.max(0, NX[m] * lx + NY[m] * ly + ND[m] * ld);
    VB[p] = amb + 0.95 * lam - 1.3 * Math.max(0, S.ao[m] - 0.47) - Math.max(0, S.dep[m] / 8 - 2) * 0.03 + 0.12 * Math.pow(1 - Math.max(0, ND[m]), 3);
  }
  for (let yy = by0; yy < by1; yy++) for (let xx = bx0; xx < bx1; xx++) {
    const p = yy * W + xx, m = ID[p]; if (m === -1) continue;
    const b = V.BAY(xx, yy), i4 = p * 4;
    let col;
    if (m <= -2) {                                                              // cut face: MRI grayscale
      const v = V._cut.t1[-2 - m] * (o.cutGain ?? 1), r = R.gray, f = clamp(v) * (r.length - 1) + b - 0.5;
      col = r[clamp(Math.round(f), 0, r.length - 1)];
    } else {
      const oc = o.over ? o.over(m) : null;
      if (oc) { data[i4] = oc[0]; data[i4 + 1] = oc[1]; data[i4 + 2] = oc[2]; data[i4 + 3] = 255; continue; }
      const ramp = R[S.part[m]] || R[1], z0 = ZB[p];
      let sum = 0, cnt = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xq = xx + dx, yq = yy + dy; if (xq < 0 || yq < 0 || xq >= W || yq >= H) continue;
        const q = yq * W + xq; if (ID[q] < 0 || Math.abs(ZB[q] - z0) > same) continue;
        sum += VB[q]; cnt++;
      }
      let v = sum / cnt;
      // crease: a neighbour nearer to the viewer than this surface's own slope predicts → the back wall of a fold
      const nd = Math.max(0.25, ND[m]), gx = -NX[m] / nd / s, gy = NY[m] / nd / s, mg = 2.2 * vs;
      if ((xx > 0 && ZB[p - 1] - (z0 - gx) > mg) || (xx < W - 1 && ZB[p + 1] - (z0 + gx) > mg) ||
          (yy > 0 && ZB[p - W] - (z0 - gy) > mg) || (yy < H - 1 && ZB[p + W] - (z0 + gy) > mg)) v -= 0.32;
      v = v * gain;
      if (o.tint) v = o.tint(m, v);
      const f = clamp(v) * (ramp.length - 1) + b - 0.5;
      col = ramp[clamp(Math.round(f), 0, ramp.length - 1)];
    }
    data[i4] = col[0]; data[i4 + 1] = col[1]; data[i4 + 2] = col[2]; data[i4 + 3] = 255;
  }
  // silhouette outline (outside pixels touching the brain)
  if (o.outline !== false) {
    const e = R.edge;
    for (let yy = by0; yy < by1; yy++) for (let xx = bx0; xx < bx1; xx++) {
      const p = yy * W + xx; if (ID[p] !== -1) continue;
      if ((xx > 0 && ID[p - 1] !== -1) || (xx < W - 1 && ID[p + 1] !== -1) || (yy > 0 && ID[p - W] !== -1) || (yy < H - 1 && ID[p + W] !== -1)) {
        const i4 = p * 4; data[i4] = e[0]; data[i4 + 1] = e[1]; data[i4 + 2] = e[2]; data[i4 + 3] = 255;
      }
    }
  }
  return { bx0, by0, bx1, by1, ZB, ID, W };
};
// brain voxels lying on the plane n·p = d (one voxel thick), with their T1 intensity; cached per plane
const CUTS = new Map();
V.cutList = (n, d) => {
  const G = V.G, key = n.map(v => v.toFixed(3)).join(',') + ':' + Math.round(d / G.vs * 2);
  if (CUTS.has(key)) return CUTS.get(key);
  const xs = [], ys = [], zs = [], ts = [];
  // axis-aligned planes: only the layers the plane can touch
  let k0 = 0, k1 = G.nz;
  if (n[0] === 0 && n[1] === 0 && Math.abs(n[2]) === 1) { const zc = d / n[2]; k0 = Math.max(0, Math.floor((zc - G.z0) / G.vs) - 1); k1 = Math.min(G.nz, k0 + 3); }
  for (let k = k0; k < k1; k++) for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) {
    const q = (k * G.ny + j) * G.nx + i; if (!G.lab[q]) continue;
    const x = G.x0 + i * G.vs, y = G.y0 + j * G.vs, z = G.z0 + k * G.vs, e = n[0] * x + n[1] * y + n[2] * z - d;
    if (e > 0 || e <= -G.vs) continue;
    xs.push(x); ys.push(y); zs.push(z); ts.push(V.T1v[q] / 255);
  }
  const c = { n: xs.length, x: Float32Array.from(xs), y: Float32Array.from(ys), z: Float32Array.from(zs), t1: Float32Array.from(ts) };
  if (CUTS.size > 64) CUTS.clear();
  CUTS.set(key, c); return c;
};
})();
