// SKULL — the bone of HEAD as voxels, and the 3D render a CT workstation shows. The volume is sampled once (bone is
// everything above ≈ 300 HU: the SDF's inside); its surface voxels are splatted into a z-buffer every frame with Lambert
// shading, ambient occlusion from a blurred occupancy, crease darkening and a silhouette outline, in a bone-white ramp.
// Splats write final palette colours (ordered dither in screen space), so the quantizer leaves them untouched.
// The same render can: clip at an axial plane and show the CT section there (grey levels from HEAD.hu through a
// window), split into slabs that move apart (each top face a section), assemble upward slice by slice, and tint
// voxels (segmentation). View: yaw about z (0 = looking at the face), then pitch (positive looks from above), roll.
(() => {
const S = globalThis.SKULL = {};
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bay = (x, y) => BAY[(y & 3) << 2 | (x & 3)];
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ramp = names => names.map(n => hex(globalThis.P[n] || n));
let R = null;
const ramps = () => R || (R = {
  bone: ramp(['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'w']),
  tooth: ramp(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'w', 'w']),
  gray: ramp(['k', 'g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'ga', 'gb', 'w']),
  edge: hex(globalThis.P.k),
});
S.ramps = () => ramps();
function blur(src, nx, ny, nz, passes) {
  let a = Float32Array.from(src), b = new Float32Array(a.length);
  for (let p = 0; p < passes; p++) for (const [st, n] of [[1, nx], [nx, ny], [nx * ny, nz]]) {
    for (let q = 0; q < a.length; q++) { const c = Math.floor(q / st) % n; b[q] = (2 * a[q] + (c > 0 ? a[q - st] : a[q]) + (c < n - 1 ? a[q + st] : a[q])) * 0.25; }
    [a, b] = [b, a];
  }
  return a;
}
// ---------- build ----------
S.init = (vs = 1.5) => {
  const t0 = Date.now(), H = HEAD;
  H.noSpine = true;                                   // the 3D skull is segmented without the cervical spine
  const x0 = -80, y0 = -110, z0 = -134, nx = Math.ceil(160 / vs) + 1, ny = Math.ceil(230 / vs) + 1, nz = Math.ceil(236 / vs) + 1, N = nx * ny * nz;
  const lab = new Uint8Array(N);
  // hierarchical fill: evaluate the SDF at the centre of 4×4×4 blocks; skip blocks well clear of the surface
  const B = 4, half = Math.sqrt(3) * B * vs / 2, safe = 1.7 * half;
  let evals = 0;
  for (let bk = 0; bk < nz; bk += B) for (let bj = 0; bj < ny; bj += B) for (let bi = 0; bi < nx; bi += B) {
    const cx = x0 + (bi + B / 2 - 0.5) * vs, cy = y0 + (bj + B / 2 - 0.5) * vs, cz = z0 + (bk + B / 2 - 0.5) * vs;
    const d = H.skullSD(cx, cy, cz); evals++;
    if (d > safe) continue;
    for (let k = bk; k < Math.min(nz, bk + B); k++) for (let j = bj; j < Math.min(ny, bj + B); j++) for (let i = bi; i < Math.min(nx, bi + B); i++) {
      const q = (k * ny + j) * nx + i;
      if (d < -safe) { lab[q] = 1; continue; }
      const v = H.skullSD(x0 + i * vs, y0 + j * vs, z0 + k * vs); evals++;
      if (v < 0) lab[q] = H._tooth ? 2 : 1;
    }
  }
  H.noSpine = false;
  const list = [];
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const q = (k * ny + j) * nx + i; if (!lab[q]) continue;
    if (lab[q - 1] && lab[q + 1] && lab[q - nx] && lab[q + nx] && lab[q - nx * ny] && lab[q + nx * ny]) continue;
    list.push(q);
  }
  const M = list.length, V = S.V = { n: M, x: new Float32Array(M), y: new Float32Array(M), z: new Float32Array(M), nx: new Float32Array(M), ny: new Float32Array(M), nz: new Float32Array(M),
    ao: new Float32Array(M), lab: new Uint8Array(M), h: new Float32Array(M) };
  list.forEach((q, m) => {
    const i = q % nx, j = Math.floor(q / nx) % ny, k = Math.floor(q / (nx * ny));
    V.x[m] = x0 + i * vs; V.y[m] = y0 + j * vs; V.z[m] = z0 + k * vs;
    // normal from the analytic distance field (smooth: no voxel terracing on the vault); then the splat is moved onto the
    // true surface (a voxel centre sits up to ~1.3 mm under it, and those depths form rings on a smooth dome)
    let px = V.x[m], py = V.y[m], pz = V.z[m];
    const e = 0.75;
    H.noSpine = true;
    const gx = H.skullSD(px + e, py, pz) - H.skullSD(px - e, py, pz), gy = H.skullSD(px, py + e, pz) - H.skullSD(px, py - e, pz), gz = H.skullSD(px, py, pz + e) - H.skullSD(px, py, pz - e);
    const L = Math.hypot(gx, gy, gz) || 1; V.nx[m] = gx / L; V.ny[m] = gy / L; V.nz[m] = gz / L;
    const sd0 = Math.max(-vs * 1.2, Math.min(0, H.skullSD(px, py, pz)));
    px -= V.nx[m] * sd0; py -= V.ny[m] * sd0; pz -= V.nz[m] * sd0;
    V.x[m] = px; V.y[m] = py; V.z[m] = pz;
    // ambient occlusion from the distance field itself (Quilez): how much closer than expected the bone gets along the
    // normal at 2, 4, 8 and 13 mm. Smooth (it follows the shape: orbits, nasal cavity, under the arches).
    let occ = 0, wsum = 0;
    for (const [dd, wt] of [[2, 1], [4, 0.8], [8, 0.55], [13, 0.35]]) {
      const sd = H.skullSD(px + V.nx[m] * dd, py + V.ny[m] * dd, pz + V.nz[m] * dd);
      occ += wt * Math.max(0, dd - sd) / dd; wsum += wt;
    }
    H.noSpine = false;
    V.ao[m] = occ / wsum;
  });
  S.G = { x0, y0, z0, nx, ny, nz, vs, lab };
  S.buildMs = Date.now() - t0; S.evals = evals;
  return S;
};
// ---------- view ----------
S.view = o => {
  const cy = Math.cos(o.yaw || 0), sy = Math.sin(o.yaw || 0), cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0), cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0);
  // head (x left, y anterior, z up) → view (X right on screen, Y up, D toward the viewer). yaw 0: we face the patient,
  // so the patient's left (+x) is on screen right... radiological habit puts the patient's right on screen left: same thing.
  return (x, y, z) => {
    const x1 = x * cy + y * sy, d1 = -x * sy + y * cy;
    const d2 = d1 * cp + z * sp, y2 = -d1 * sp + z * cp;
    return [x1 * cr - y2 * sr, x1 * sr + y2 * cr, d2];
  };
};
S.proj = (o, x, y, z) => { const [X, Y, D] = S.view(o)(x, y, z); return [o.cx + o.s * X, o.cy - o.s * Y, D]; };
// ---------- axial sections for cut faces (HU grid on the voxel lattice at height z), cached ----------
const SEC = new Map();
S.section = z => {
  const G = S.G, key = Math.round(z * 4);
  if (SEC.has(key)) return SEC.get(key);
  const xs = [], ys = [], hs = [];
  for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) {
    const x = G.x0 + i * G.vs, y = G.y0 + j * G.vs;
    if (HEAD.skullSD(x, y, z) > 0 && HEAD.cavitySD(x, y, z) > 0) continue;
    xs.push(x); ys.push(y); hs.push(HEAD.hu(x, y, z));
  }
  const s = { n: xs.length, x: Float32Array.from(xs), y: Float32Array.from(ys), hu: Float32Array.from(hs), z };
  if (SEC.size > 80) SEC.clear();
  SEC.set(key, s); return s;
};
S.win = (hu, L, W) => clamp((hu - (L - W / 2)) / W);
let ZB = null, ID = null, VB = null, KB = null;
// o = {cx, cy, s (px/mm), yaw, pitch, roll,
//      clipZ: keep z ≤ clipZ and draw the section there (cutWin: [L, W]),
//      slabs: {z0, T, gap} → slab k = floor((z − z0)/T) moves up by k·gap; its top face shows the section,
//      showZ: only voxels with z ≤ showZ (assembly), front: highlight band height (mm) under showZ,
//      show(m) → bool, tint(m, v) → v, over(m) → rgb or null, light, amb, gain, outline}
S.render = (img, o) => {
  const W = img.width, H = img.height, data = img.data, Rr = ramps(), V = S.V, vs = S.G.vs;
  if (!ZB || ZB.length !== W * H) { ZB = new Float32Array(W * H); ID = new Int32Array(W * H); VB = new Float32Array(W * H); KB = new Int32Array(W * H); }
  ZB.fill(-1e9); ID.fill(-1);
  const view = S.view(o), s = o.s, k = Math.max(1, Math.ceil(s * vs * 1.42)), h0 = Math.floor(k / 2);
  const [rxx, rxy, rxd] = view(1, 0, 0), [ryx, ryy, ryd] = view(0, 1, 0), [rzx, rzy, rzd] = view(0, 0, 1);
  const clipZ = o.clipZ ?? 1e9, showZ = o.showZ ?? 1e9, show = o.show;
  // layers: [{lo, hi, dz, a, face}] — voxels with lo ≤ z < hi move up by dz, show with coverage a (per-voxel dissolve),
  // and face: true draws the CT section on the layer's top (z = hi). clipZ, showZ and slabs are shorthands for layers.
  let layers = o.layers ? o.layers.slice() : null;
  if (!layers) {
    const top = Math.min(clipZ, showZ);
    if (o.slabs) { const sl = o.slabs; layers = [{ lo: -1e9, hi: Math.min(top, sl.z0), dz: 0, face: top > sl.z0 && false }];
      for (let kk = 0; sl.z0 + kk * sl.T < top; kk++) layers.push({ lo: sl.z0 + kk * sl.T, hi: Math.min(top, sl.z0 + (kk + 1) * sl.T), dz: (kk + 1) * sl.gap, face: true });
      layers[0].face = true; layers[0].hi = sl.z0; }
    else layers = [{ lo: -1e9, hi: top, dz: 0, face: top < 1e8 && o.cut !== false }];
  }
  const layerOf = z => { for (let i = 0; i < layers.length; i++) if (z >= layers[i].lo && z < layers[i].hi) return i; return -1; };
  const band = o.band, bandCol = band ? hex(globalThis.P[band.col || 'c4']) : null;
  let bx0 = W, by0 = H, bx1 = -1, by1 = -1;
  const NX = new Float32Array(V.n), NY = new Float32Array(V.n), ND = new Float32Array(V.n), ZO = new Float32Array(V.n);
  const splat = (X, Y, D, id) => {
    const sx = Math.floor(o.cx + s * X) - h0, sy = Math.floor(o.cy - s * Y) - h0;
    if (sx + k <= 0 || sy + k <= 0 || sx >= W || sy >= H) return;
    for (let yy = Math.max(0, sy); yy < Math.min(H, sy + k); yy++) for (let xx = Math.max(0, sx); xx < Math.min(W, sx + k); xx++) {
      const p = yy * W + xx; if (D > ZB[p]) { ZB[p] = D; ID[p] = id; }
    }
    if (sx < bx0) bx0 = sx; if (sy < by0) by0 = sy; if (sx + k > bx1) bx1 = sx + k; if (sy + k > by1) by1 = sy + k;
  };
  for (let m = 0; m < V.n; m++) {
    const z = V.z[m], li = layerOf(z);
    if (li < 0) continue;
    const L_ = layers[li];
    if (L_.a != null && V.h[m] >= L_.a) continue;
    if (show && !show(m)) continue;
    const nd = V.nx[m] * rxd + V.ny[m] * ryd + V.nz[m] * rzd;
    if (nd < -0.35) continue;
    const x = V.x[m], y = V.y[m], zz = z + (L_.dz || 0);
    NX[m] = V.nx[m] * rxx + V.ny[m] * ryx + V.nz[m] * rzx; NY[m] = V.nx[m] * rxy + V.ny[m] * ryy + V.nz[m] * rzy; ND[m] = nd; ZO[m] = z;
    splat(x * rxx + y * ryx + zz * rzx, x * rxy + y * ryy + zz * rzy, x * rxd + y * ryd + zz * rzd, m);
  }
  // section faces on the layer tops (the CT section at that height, inside the skull)
  const secs = [];
  for (const L_ of layers) {
    if (!L_.face || L_.hi > 1e8) continue;
    const zc = L_.hi - 0.01, sec = S.section(zc), si = secs.length; secs.push(sec);
    const ze = zc + (L_.dz || 0), fa = L_.fa ?? L_.a ?? 1;
    for (let c = 0; c < sec.n; c++) {
      if (fa < 1 && ((c * 2654435761) >>> 0) % 1000 / 1000 >= fa) continue;
      const x = sec.x[c], y = sec.y[c];
      const X = x * rxx + y * ryx + ze * rzx, Y = x * rxy + y * ryy + ze * rzy, D = x * rxd + y * ryd + ze * rzd;
      const sx = Math.floor(o.cx + s * X) - h0, sy = Math.floor(o.cy - s * Y) - h0;
      if (sx + k <= 0 || sy + k <= 0 || sx >= W || sy >= H) continue;
      for (let yy = Math.max(0, sy); yy < Math.min(H, sy + k); yy++) for (let xx = Math.max(0, sx); xx < Math.min(W, sx + k); xx++) {
        const p = yy * W + xx; if (D >= ZB[p] - 0.6 * vs) { ZB[p] = D; ID[p] = -2 - c; KB[p] = si; }
      }
      if (sx < bx0) bx0 = sx; if (sy < by0) by0 = sy; if (sx + k > bx1) bx1 = sx + k; if (sy + k > by1) by1 = sy + k;
    }
  }
  bx0 = Math.max(0, bx0 - 1); by0 = Math.max(0, by0 - 1); bx1 = Math.min(W, bx1 + 1); by1 = Math.min(H, by1 + 1);
  // shading: Lambert + rim − cavity occlusion, smoothed over the local surface (3×3 among same-surface neighbours)
  const L = o.light || [-0.5, 0.45, 0.75], ln = Math.hypot(...L), lx = L[0] / ln, ly = L[1] / ln, ld = L[2] / ln;
  const amb = o.amb ?? 0.1, gain = o.gain ?? 1, same = 2.2 * vs;
  for (let yy = by0; yy < by1; yy++) for (let xx = bx0; xx < bx1; xx++) {
    const p = yy * W + xx, m = ID[p]; if (m < 0) continue;
    const lam = Math.max(0, NX[m] * lx + NY[m] * ly + ND[m] * ld);
    VB[p] = amb + 1.0 * lam - 1.25 * V.ao[m] + 0.08 * Math.pow(1 - Math.max(0, ND[m]), 3);
  }
  const [cL, cW] = o.cutWin || [40, 110], front = o.front || 0;
  for (let yy = by0; yy < by1; yy++) for (let xx = bx0; xx < bx1; xx++) {
    const p = yy * W + xx, m = ID[p]; if (m === -1) continue;
    const b = bay(xx, yy), i4 = p * 4;
    let col;
    if (m <= -2) {
      const sec = secs[KB[p]], v = S.win(sec.hu[-2 - m], cL, cW), r = Rr.gray, f = v * (r.length - 1) + b - 0.5;
      col = r[clamp(Math.round(f), 0, r.length - 1)];
      if (o.cutTint) col = o.cutTint(col, sec.hu[-2 - m], xx, yy) || col;
    } else {
      const oc = o.over ? o.over(m) : null;
      if (oc) { data[i4] = oc[0]; data[i4 + 1] = oc[1]; data[i4 + 2] = oc[2]; data[i4 + 3] = 255; continue; }
      const z0 = ZB[p];
      let sum = 0, cnt = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xq = xx + dx, yq = yy + dy; if (xq < 0 || yq < 0 || xq >= W || yq >= H) continue;
        const q = yq * W + xq; if (ID[q] < 0 || Math.abs(ZB[q] - z0) > same) continue;
        sum += VB[q]; cnt++;
      }
      let v = sum / cnt;
      const nd = Math.max(0.25, ND[m]), gx = -NX[m] / nd / s, gy = NY[m] / nd / s, mg = 2.4 * vs;
      if ((xx > 0 && ZB[p - 1] - (z0 - gx) > mg) || (xx < W - 1 && ZB[p + 1] - (z0 + gx) > mg) ||
          (yy > 0 && ZB[p - W] - (z0 - gy) > mg) || (yy < H - 1 && ZB[p + W] - (z0 + gy) > mg)) v -= 0.3;
      v *= gain;
      if (o.tint) v = o.tint(m, v);
      const r = V.lab[m] === 2 ? Rr.tooth : Rr.bone;
      if (band && Math.abs(ZO[m] - band.z) < band.w) col = bandCol;
      else if (front > 0 && V.z[m] > showZ - front) { const c3 = hex(globalThis.P.c4); col = c3; }
      else { const f = clamp(v) * (r.length - 1) + b - 0.5; col = r[clamp(Math.round(f), 0, r.length - 1)]; }
    }
    data[i4] = col[0]; data[i4 + 1] = col[1]; data[i4 + 2] = col[2]; data[i4 + 3] = 255;
  }
  if (o.outline !== false) {
    const e = Rr.edge;
    for (let yy = by0; yy < by1; yy++) for (let xx = bx0; xx < bx1; xx++) {
      const p = yy * W + xx; if (ID[p] !== -1) continue;
      if ((xx > 0 && ID[p - 1] !== -1) || (xx < W - 1 && ID[p + 1] !== -1) || (yy > 0 && ID[p - W] !== -1) || (yy < H - 1 && ID[p + W] !== -1)) {
        const i4 = p * 4; data[i4] = e[0]; data[i4 + 1] = e[1]; data[i4 + 2] = e[2]; data[i4 + 3] = 255;
      }
    }
  }
  S.last = { o, R: [rxx, rxy, rxd, ryx, ryy, ryd, rzx, rzy, rzd], ZB, ID, W, H };
  return { bx0, by0, bx1, by1, ZB, ID, W };
};
// a horizontal plane z = zp drawn into the last render with a depth test (the scan plane): its rectangle (half sizes hx, hy
// in mm) as a dithered fill and an outline, hidden where the skull is in front of it
S.plane = (img, zp, o = {}) => {
  const Lr = S.last; if (!Lr) return;
  const { o: v, R, ZB: Z, W, H } = Lr, [rxx, rxy, rxd, ryx, ryy, ryd, rzx, rzy, rzd] = R, s = v.s;
  const hx = o.hx ?? 105, hy = o.hy ?? 128, cy0 = o.cy0 ?? 8, d = img.data, fillA = o.fill ?? 0.18;
  const fc = hex(globalThis.P[o.col || 'c2']), ec = hex(globalThis.P[o.edge || 'c4']);
  const inside = (sx, sy) => {
    // view (X, Y) of the pixel, then the depth where the ray meets the plane, then the plane point in head coordinates
    const X = (sx + 0.5 - v.cx) / s, Y = -(sy + 0.5 - v.cy) / s;
    if (Math.abs(rzd) < 1e-6) return null;
    const D = (zp - rzx * X - rzy * Y) / rzd;
    const x = rxx * X + rxy * Y + rxd * D, y = ryx * X + ryy * Y + ryd * D;
    return [x, y - cy0, D];
  };
  for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < W; sx++) {
    const q = inside(sx, sy); if (!q) return;
    const [x, y, D] = q; if (Math.abs(x) > hx || Math.abs(y) > hy) continue;
    const p = sy * W + sx; if (ZB[p] > D + 0.5) continue;
    const edge = Math.abs(x) > hx - 1.6 / s * 1.2 || Math.abs(y) > hy - 1.6 / s * 1.2;
    if (!edge && bay(sx, sy) > fillA) continue;
    const c = edge ? ec : fc, i4 = p * 4; d[i4] = c[0]; d[i4 + 1] = c[1]; d[i4 + 2] = c[2]; d[i4 + 3] = 255;
  }
};
})();
