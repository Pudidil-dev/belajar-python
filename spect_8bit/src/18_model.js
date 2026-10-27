'use strict';
// ============================================================================
// ONE PATIENT, ONE TRACER DISTRIBUTION, REAL CAMERA MATHS. Every data scene is
// computed, not painted: a 3-D activity map (left-ventricular wall, faint
// right ventricle, liver, body background) is projected the way a parallel-
// hole camera sees it (line sums + attenuation in water), counts are drawn one
// event at a time, and the volume is reconstructed slice by slice with MLEM
// from 24 noisy views over 180 degrees. The perfusion slices of s26 are
// resliced from that reconstruction along the LV axis.
// Model units: cm. X = patient's left, Y = anterior (up on the table), Z = feet.
// ============================================================================
const MD = { n: 32, vox: 0.75, nv: 25, mu: 0.15, iters: 14 };            // 32^3 voxels, 25 views (every 7.5 deg)
MD.half = MD.n * MD.vox / 2;
const LVA = norm3([0.6, 0.5, 0.62]);                                      // base -> apex
const LVC = [1.2, 0.4, 0.8];                                              // ellipsoid centre (volume coords)
const VIEW_TH = []; for (let k = 0; k < MD.nv; k++) VIEW_TH.push(-Math.PI / 4 + Math.PI * k / (MD.nv - 1));   // RAO 45 .. LPO 45 (both ends)
// LV local frame: a = axis, e1 = toward the lateral wall, e2 = completes the frame
const LVE1 = norm3(cross3(LVA, [0, 0, 1])), LVE2 = cross3(LVA, LVE1);
function activityAt(x, y, z) {
  const q = [x - LVC[0], y - LVC[1], z - LVC[2]], h = dot3(q, LVA);
  const rv = sub3(q, mul3(LVA, h)), r = Math.hypot(rv[0], rv[1], rv[2]);
  let a = 0.03;                                                            // body background
  // LV myocardium: a truncated thick ellipsoidal cup
  if (h > -2.3) {
    const out = (h * h) / (4.7 * 4.7) + (r * r) / (3.05 * 3.05), inn = (h * h) / (3.6 * 3.6) + (r * r) / (1.95 * 1.95);
    if (out <= 1 && (inn > 1 || h > 3.55)) {
      const lat = dot3(rv, LVE1) / (r || 1);
      a = 1.0 - 0.07 * Math.max(0, (h - 2.6) / 2) + 0.04 * lat;             // slight apical thinning, normal variation
    }
  }
  // RV free wall: a thinner crescent on the septal side, low uptake
  const s = add3(q, mul3(LVE1, 2.9)), hs = dot3(s, LVA), rs = Math.hypot(...sub3(s, mul3(LVA, hs)));
  if (hs > -2 && hs < 3.2 && dot3(s, LVE1) < 0.4) {
    const o2 = (hs * hs) / (4.2 * 4.2) + (rs * rs) / (2.9 * 2.9), i2 = (hs * hs) / (3.8 * 3.8) + (rs * rs) / (2.45 * 2.45);
    if (o2 <= 1 && i2 > 1) a = Math.max(a, 0.32);
  }
  // liver (patient's right, below the heart): sestamibi is also taken up there
  const lx = (x + 6.5) / 6.2, ly = (y + 1.2) / 4.6, lz = (z - 8.5) / 4.8;
  if (lx * lx + ly * ly + lz * lz <= 1) a = Math.max(a, 0.5);
  return a;
}
// body outline (elliptic cylinder) for attenuation: the heart sits left of the midline and anterior
function pathInBody(x, y, dx, dy) {        // distance from (x,y) to the body surface along (dx,dy)
  const A = 16, B = 11, px = (x + 3) / A, py = (y + 3) / B, vx = dx / A, vy = dy / B;
  const a = vx * vx + vy * vy, b = 2 * (px * vx + py * vy), c = px * px + py * py - 1, D = b * b - 4 * a * c;
  if (D < 0 || c > 0) return 0;
  return (-b + Math.sqrt(D)) / (2 * a);
}
// ---------------------------------------------------------------- built in engineInit()
const MODEL = { act: null, rays: null, proj: [], projClean: [], recon: [], sens: null, ready: false, evPix: 0, events: null, cdf: null };
function vIdx(i, j, k) { return (k * MD.n + j) * MD.n + i; }
function voxC(i) { return (i + 0.5) * MD.vox - MD.half; }
function buildModel() {
  if (MODEL.ready) return;
  const n = MD.n;
  // activity voxels (2x2x2 supersampled for smooth partial volumes)
  const act = new Float32Array(n * n * n);
  for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let s = 0;
    for (let q = 0; q < 8; q++) s += activityAt(voxC(i) + ((q & 1) - 0.5) * MD.vox * 0.5, voxC(j) + (((q >> 1) & 1) - 0.5) * MD.vox * 0.5, voxC(k) + ((q >> 2) - 0.5) * MD.vox * 0.5);
    act[vIdx(i, j, k)] = s / 8;
  }
  MODEL.act = act;
  // ray table for one transaxial slice: for view v, bin b, step s -> voxel (i + j*n) and weight (step x attenuation)
  const ns = n, step = MD.vox, rays = { idx: new Int16Array(MD.nv * n * ns), w: new Float32Array(MD.nv * n * ns) };
  for (let v = 0; v < MD.nv; v++) {
    const th = VIEW_TH[v], nx = Math.sin(th), ny = Math.cos(th), sx = Math.cos(th), sy = -Math.sin(th);
    for (let b = 0; b < n; b++) {
      const u = voxC(b);
      for (let s = 0; s < ns; s++) {
        const w = (s + 0.5) * step - MD.half;
        const x = u * sx + w * nx, y = u * sy + w * ny, i = Math.floor((x + MD.half) / MD.vox), j = Math.floor((y + MD.half) / MD.vox);
        const o = (v * n + b) * ns + s;
        if (i < 0 || j < 0 || i >= n || j >= n) { rays.idx[o] = -1; continue; }
        rays.idx[o] = i + j * n; rays.w[o] = step * Math.exp(-MD.mu * pathInBody(x, y, nx, ny));
      }
    }
  }
  MODEL.rays = rays;
  // projections: clean and with counting noise (deterministic Gaussian approximation of Poisson)
  const scale = 26;
  for (let v = 0; v < MD.nv; v++) {
    const pc = new Float32Array(n * n), pn = new Float32Array(n * n);
    for (let k = 0; k < n; k++) for (let b = 0; b < n; b++) {
      let s = 0; const o0 = (v * n + b) * ns;
      for (let q = 0; q < ns; q++) { const id = rays.idx[o0 + q]; if (id >= 0) s += act[k * n * n + id] * rays.w[o0 + q]; }
      const c = s * scale, g = gauss(v * 7919 + k * 131 + b * 17);
      pc[k * n + b] = c; pn[k * n + b] = Math.max(0, c + Math.sqrt(Math.max(c, 0.5)) * g);
    }
    MODEL.projClean.push(pc); MODEL.proj.push(pn);
  }
  // sensitivity image (back-projection of ones), then MLEM slice by slice; keep chosen iterations
  const sens = new Float32Array(n * n);
  for (let v = 0; v < MD.nv; v++) for (let b = 0; b < n; b++) { const o0 = (v * n + b) * ns; for (let q = 0; q < ns; q++) { const id = rays.idx[o0 + q]; if (id >= 0) sens[id] += rays.w[o0 + q]; } }
  const keep = [1, 2, 3, 5, 8, 14], est = new Float32Array(n * n * n).fill(1);
  const fp = new Float32Array(n), bp = new Float32Array(n * n);
  for (let it = 1; it <= MD.iters; it++) {
    for (let k = 0; k < n; k++) {
      const off = k * n * n; bp.fill(0);
      for (let v = 0; v < MD.nv; v++) {
        const meas = MODEL.proj[v];
        for (let b = 0; b < n; b++) {
          const o0 = (v * n + b) * ns; let s = 0;
          for (let q = 0; q < ns; q++) { const id = rays.idx[o0 + q]; if (id >= 0) s += est[off + id] * rays.w[o0 + q]; }
          const ratio = s > 1e-6 ? meas[k * n + b] / (s * scale) : 0;
          for (let q = 0; q < ns; q++) { const id = rays.idx[o0 + q]; if (id >= 0) bp[id] += ratio * rays.w[o0 + q]; }
        }
      }
      for (let id = 0; id < n * n; id++) est[off + id] = sens[id] > 1e-6 ? est[off + id] * bp[id] / sens[id] : 0;
    }
    if (keep.includes(it)) MODEL.recon.push(smooth3(est, it >= 8 ? 0.9 : 0.6));
  }
  // what each kept estimate predicts for the LAO view (the "expected projection" of the compare step)
  MODEL.estProj0 = (function () { const img = new Float32Array(n * n), v = VIEW_LAO; for (let k = 0; k < n; k++) for (let b = 0; b < n; b++) { const o0 = (v * n + b) * ns; let s = 0; for (let q = 0; q < ns; q++) { const id = rays.idx[o0 + q]; if (id >= 0) s += rays.w[o0 + q]; } img[k * n + b] = s * scale * 0.07; } return img; })();
  MODEL.estProj = MODEL.recon.map(vol => {
    const img = new Float32Array(n * n), v = VIEW_LAO;
    for (let k = 0; k < n; k++) for (let b = 0; b < n; b++) { const o0 = (v * n + b) * ns; let s = 0; for (let q = 0; q < ns; q++) { const id = rays.idx[o0 + q]; if (id >= 0) s += vol[k * n * n + id] * rays.w[o0 + q]; } img[k * n + b] = s * scale; }
    return img;
  });
  void fp;
  // the counting sequence for the s21/s22 projection (view index of the head we follow: LAO 45 deg)
  const pv = MODEL.projClean[VIEW_LAO], cdf = new Float32Array(n * n); let acc = 0;
  for (let i = 0; i < n * n; i++) { acc += pv[i]; cdf[i] = acc; }
  MODEL.cdf = cdf;
  // the event we followed lands on the bright lateral wall of this view
  let best = 0; for (let i = 0; i < n * n; i++) { const b = i % n; if (b > n / 2 && pv[i] > pv[best]) best = i; }
  MODEL.evPix = best;
  MODEL.ready = true;
}
const VIEW_LAO = 12;                                       // th = +45 deg (LAO): the head we zoom into
function gauss(seed) { const u = Math.max(1e-6, hash(seed)), v = hash(seed + 99991); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
// event i of the counting sequence -> pixel index (event 0 is the one we followed)
function eventPix(i) {
  if (i === 0) return MODEL.evPix;
  const c = MODEL.cdf, r = hash(i * 2654435761 + 7) * c[c.length - 1];
  let lo = 0, hi = c.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (c[m] < r) lo = m + 1; else hi = m; }
  return lo;
}
// counts image after N events (histogram), cached by N
const _cnt = { N: -1, img: null };
function countsAfter(N) {
  N = Math.max(0, Math.floor(N));
  if (_cnt.N === N) return _cnt.img;
  const n = MD.n; let img = _cnt.img && _cnt.N >= 0 && _cnt.N <= N ? _cnt.img : new Float32Array(n * n), from = _cnt.img && _cnt.N >= 0 && _cnt.N <= N ? _cnt.N : 0;
  if (from === 0) img.fill(0);
  for (let i = from; i < N; i++) img[eventPix(i)] += 1;
  _cnt.N = N; _cnt.img = img; return img;
}
// separable 3-D Gaussian-ish smoothing (3-tap) for display
function smooth3(src, k) {
  const n = MD.n, a = new Float32Array(src), b = new Float32Array(src.length), w0 = 1, w1 = 0.5 * k;
  const pass = (from, to, di, dj, dk) => {
    for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = vIdx(x, y, z); let s = from[i] * w0, w = w0;
      const xm = x - di, ym = y - dj, zm = z - dk, xp = x + di, yp = y + dj, zp = z + dk;
      if (xm >= 0 && ym >= 0 && zm >= 0) { s += from[vIdx(xm, ym, zm)] * w1; w += w1; }
      if (xp < n && yp < n && zp < n) { s += from[vIdx(xp, yp, zp)] * w1; w += w1; }
      to[i] = s / w;
    }
  };
  pass(a, b, 1, 0, 0); pass(b, a, 0, 1, 0); pass(a, b, 0, 0, 1);
  return b;
}
// trilinear sample of a volume at model coordinates (cm)
function volAt(vol, x, y, z) {
  const n = MD.n, fx = (x + MD.half) / MD.vox - 0.5, fy = (y + MD.half) / MD.vox - 0.5, fz = (z + MD.half) / MD.vox - 0.5;
  const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz); if (i < 0 || j < 0 || k < 0 || i >= n - 1 || j >= n - 1 || k >= n - 1) return 0;
  const u = fx - i, v = fy - j, w = fz - k;
  const c = (a, b, c2) => vol[vIdx(a, b, c2)];
  return lerp(lerp(lerp(c(i, j, k), c(i + 1, j, k), u), lerp(c(i, j + 1, k), c(i + 1, j + 1, k), u), v), lerp(lerp(c(i, j, k + 1), c(i + 1, j, k + 1), u), lerp(c(i, j + 1, k + 1), c(i + 1, j + 1, k + 1), u), v), w);
}
// a cardiac slice of a volume: kind 'SA' (short axis at depth h along the LV axis), 'VLA', 'HLA'; returns m x m values
function cardiacSlice(vol, kind, h, m) {
  const out = new Float32Array(m * m), R = 5.2;
  for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) {
    const a = (i + 0.5) / m * 2 - 1, b = (j + 0.5) / m * 2 - 1;
    let p;
    if (kind === 'SA') p = add3(add3(LVC, mul3(LVA, h)), add3(mul3(LVE1, a * R), mul3(LVE2, -b * R)));
    else if (kind === 'VLA') p = add3(LVC, add3(mul3(LVA, a * R * 1.15 + 0.6), mul3(LVE2, -b * R)));
    else p = add3(LVC, add3(mul3(LVA, -b * R * 1.15 + 0.6), mul3(LVE1, a * R)));
    out[j * m + i] = volAt(vol, p[0], p[1], p[2]);
  }
  return out;
}
// ---------------------------------------------------------------- drawing a value image with a colour ramp
const RAMP_PJ = () => [P.PJ0, P.PJ1, P.PJ2, P.PJ3, P.PJ4, P.C6];
const RAMP_RM = () => [P.RM0, P.RM1, P.RM2, P.RM3, P.RM4, P.RM5, P.RM6, P.RM7, P.RM8];
// img: m x m floats; drawn into the screen rect (x0,y0,w,h) with bilinear upsampling and ordered dithering
function drawValueImage(img, m, x0, y0, w, h, ramp, vmax, o) {
  o = o || {};
  const X0 = Math.round(x0), Y0 = Math.round(y0), Wd = Math.round(w), Hd = Math.round(h), nr = ramp.length - 1;
  for (let py = 0; py < Hd; py++) {
    const sy = Y0 + py; if (sy < 0 || sy >= H) continue;
    const fy = (py + 0.5) / Hd * m - 0.5, j = clamp(Math.floor(fy), 0, m - 2), v = clamp(fy - j, 0, 1);
    for (let px = 0; px < Wd; px++) {
      const sx = X0 + px; if (sx < 0 || sx >= W) continue;
      let val;
      if (o.nearest) { val = img[clamp(Math.floor((py + 0.5) / Hd * m), 0, m - 1) * m + clamp(Math.floor((px + 0.5) / Wd * m), 0, m - 1)]; }
      else {
        const fx = (px + 0.5) / Wd * m - 0.5, i = clamp(Math.floor(fx), 0, m - 2), u = clamp(fx - i, 0, 1);
        val = lerp(lerp(img[j * m + i], img[j * m + i + 1], u), lerp(img[(j + 1) * m + i], img[(j + 1) * m + i + 1], u), v);
      }
      const q = clamp(val / vmax, 0, 1) * nr + (bay(sx, sy) - 0.5) * (o.dith === undefined ? 0.8 : o.dith);
      buf[sy * W + sx] = ramp[clamp(Math.round(q), 0, nr)];
    }
  }
}
function projImage(v, noisy) { return noisy ? MODEL.proj[v] : MODEL.projClean[v]; }
