// CT — the measurement and the reconstruction, computed from HEAD for one axial slice (z = CT.Z), with the geometry
// of a third-generation scanner: a point source on a circle of radius D round the isocentre and an equiangular (curved)
// detector arc centred on the source.
//   phantom    μ(x, y) at ≈ 70 keV, /cm, on an N × N grid (2 × 2 supersampled)
//   sinogram   p(β, γ) = ∫ μ dl along every ray: NA gantry angles over 360°, ND channels across the fan;
//              measured as I = I₀ e^(−p) with Poisson noise, logged back to p = ln(I₀/I)
//   FBP        fan-beam filtered backprojection (Kak & Slaney): weight by D cos γ, convolve with the ramp kernel in fan
//              angle, backproject with 1/L² over all angles; any subset of views (1, 2, 4 … NA) for the build-up
//   HU         1000 (μ − μ_water) / μ_water
// Images are drawn per screen pixel (inverse mapping + window/level + ordered dither), so they stay crisp at every zoom.
(() => {
const CT = window.CT = { NAME: 'CT' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
CT.Z = 20;                       // slice level (mm): lateral ventricles, falx, a clean skull ring
CT.N = 192; CT.FOV = 220;        // image matrix and field of view (mm)
CT.OX = 5; CT.OY = -14;          // the head lies a little left of and below the isocentre (its traces in the sinogram swing)
CT.PX = CT.FOV / CT.N;           // mm per pixel
CT.D = 570;                      // source → isocentre (mm)
CT.SDD = 1040;                   // source → detector (mm)
CT.FAN = 26 * Math.PI / 180;     // half fan angle (covers a 50 cm scan field)
CT.NA = 360; CT.ND = 360;        // views over 360°, channels across the fan
CT.I0 = 4e6;                     // unattenuated photons per detector reading (sets the noise)
CT.MUW = HEAD.MU_W;
const N = CT.N, PX = CT.PX;
// ---------- phantom ----------
CT.MU = null; CT.HU = null;
CT.buildPhantom = () => {
  const mu = new Float32Array(N * N), hu = new Float32Array(N * N), ss = 2;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    let a = 0;
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      const x = (c + (sx + 0.5) / ss - N / 2) * PX, y = (N / 2 - r - (sy + 0.5) / ss) * PX;
      a += HEAD.hu(x - CT.OX, y - CT.OY, CT.Z);
    }
    hu[r * N + c] = a / (ss * ss); mu[r * N + c] = HEAD.muOf(a / (ss * ss));
  }
  CT.MU = mu; CT.HUP = hu;
  // tissue classes for the illustrated cross-section (0 air, 1 skin/soft, 2 fat, 3 bone, 4 brain, 5 CSF, 6 eye, 7 tooth), 2× finer
  const n2 = N * 2, cls = new Uint8Array(n2 * n2), px2 = PX / 2;
  for (let r = 0; r < n2; r++) for (let c = 0; c < n2; c++) cls[r * n2 + c] = HEAD.cls((c + 0.5 - n2 / 2) * px2 - CT.OX, (n2 / 2 - r - 0.5) * px2 - CT.OY, CT.Z);
  CT.CLS = cls; CT.N2 = n2;
};
// bilinear μ at gantry-plane mm (X right = patient's left, Y up = anterior)
const muAt = (X, Y) => {
  const fx = X / PX + N / 2 - 0.5, fy = N / 2 - Y / PX - 0.5;
  if (fx < 0 || fy < 0 || fx >= N - 1 || fy >= N - 1) return 0;
  const i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, q = j * N + i, M = CT.MU;
  return (M[q] * (1 - u) + M[q + 1] * u) * (1 - v) + (M[q + N] * (1 - u) + M[q + N + 1] * u) * v;
};
CT.muAt = muAt;
// ---------- geometry ----------
// gantry angle β: 0 = tube at the top, increasing clockwise on screen
CT.src = beta => [CT.D * Math.sin(beta), CT.D * Math.cos(beta)];
// direction of the ray at fan angle γ (0 = through the isocentre), unit vector
CT.rayDir = (beta, g) => { const a = beta + Math.PI + g; return [Math.sin(a), Math.cos(a)]; };
// detector point for fan angle γ (on the arc of radius SDD round the source)
CT.det = (beta, g) => { const [sx, sy] = CT.src(beta), [dx, dy] = CT.rayDir(beta, g); return [sx + dx * CT.SDD, sy + dy * CT.SDD]; };
CT.gamma = j => (j + 0.5 - CT.ND / 2) * (2 * CT.FAN / CT.ND);
// line integral of μ along the ray (β, γ), mm × /cm → dimensionless; only the part inside the image disc matters
CT.lineInt = (beta, g, step = 0.6) => {
  const [sx, sy] = CT.src(beta), [dx, dy] = CT.rayDir(beta, g), R = CT.FOV / 2 * 1.42;
  // intersect with the circle of radius R round the isocentre
  const b = sx * dx + sy * dy, cc = sx * sx + sy * sy - R * R, disc = b * b - cc;
  if (disc <= 0) return 0;
  const t0 = -b - Math.sqrt(disc), t1 = -b + Math.sqrt(disc);
  let s = 0;
  for (let t = t0 + step / 2; t < t1; t += step) s += muAt(sx + dx * t, sy + dy * t);
  return s * step / 10;
};
// the fan-beam profile at gantry angle β (ND channels), and its transmitted fraction I/I₀
CT.profile = (beta, nd = CT.ND) => { const p = new Float32Array(nd); for (let j = 0; j < nd; j++) p[j] = CT.lineInt(beta, (j + 0.5 - nd / 2) * (2 * CT.FAN / nd)); return p; };
// ---------- the measured sinogram ----------
CT.buildSinogram = () => {
  const NA = CT.NA, ND = CT.ND, S = new Float32Array(NA * ND), rng = U.rng(4242);
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = rng(); v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  for (let a = 0; a < NA; a++) {
    const beta = a / NA * TAU;
    for (let j = 0; j < ND; j++) {
      const p = CT.lineInt(beta, CT.gamma(j)), I = CT.I0 * Math.exp(-p);
      const In = Math.max(1, I + Math.sqrt(I) * gauss());              // Poisson ≈ Gaussian at these counts
      S[a * ND + j] = Math.log(CT.I0 / In);
    }
  }
  CT.SINO = S;
  let mx = 0; for (const v of S) if (v > mx) mx = v; CT.PMAX = mx;
};
// ---------- fan-beam filtered backprojection ----------
CT.buildFiltered = () => {
  const NA = CT.NA, ND = CT.ND, dg = 2 * CT.FAN / ND, Q = new Float32Array(NA * ND);
  // ramp kernel in fan angle (equiangular): h(nΔγ) · ½ (nΔγ / sin nΔγ)²; discrete ramp: 1/(4Δ²) at 0, −1/(π² n² Δ²) odd n
  const K = new Float32Array(2 * ND - 1);
  for (let n = -(ND - 1); n <= ND - 1; n++) {
    let h = n === 0 ? 1 / (4 * dg * dg) : n % 2 ? -1 / (Math.PI * Math.PI * n * n * dg * dg) : 0;
    if (n !== 0) { const g = n * dg; h *= 0.5 * (g / Math.sin(g)) ** 2; }
    else h *= 0.5;
    K[n + ND - 1] = h;
  }
  const w = new Float32Array(ND), tmp = new Float32Array(ND);
  for (let a = 0; a < NA; a++) {
    for (let j = 0; j < ND; j++) w[j] = CT.SINO[a * ND + j] * CT.D * Math.cos(CT.gamma(j));
    for (let j = 0; j < ND; j++) { let s = 0; for (let k = 0; k < ND; k++) s += w[k] * K[j - k + ND - 1]; tmp[j] = s * dg; }
    const T = j => tmp[Math.max(0, Math.min(ND - 1, j))];
    for (let j = 0; j < ND; j++) Q[a * ND + j] = (T(j - 2) + 4 * T(j - 1) + 6 * T(j) + 4 * T(j + 1) + T(j + 2)) / 16;   // a smooth (Hann-like) roll-off of the ramp
  }
  CT.Q = Q;
};
// backproject a set of views into an N × N μ image (/cm). views: array of view indices; filtered: Q or raw sinogram.
// The full 360° set is weighted by Δβ; a subset of n views keeps the same total weight (each counts NA/n).
CT.backproject = (views, filtered = true, out = null) => {
  const NA = CT.NA, ND = CT.ND, dg = 2 * CT.FAN / ND, img = out || new Float32Array(N * N), data = filtered ? CT.Q : CT.SINO;
  const wv = TAU / NA * (NA / views.length);
  for (const a of views) {
    const beta = a / NA * TAU, [sx, sy] = CT.src(beta), cb = Math.cos(beta), sb = Math.sin(beta), row = a * ND;
    for (let r = 0; r < N; r++) {
      const Y = (N / 2 - r - 0.5) * PX;
      for (let c = 0; c < N; c++) {
        const X = (c + 0.5 - N / 2) * PX;
        // distance from the source and the fan angle of the ray through (X, Y)
        const vx = X - sx, vy = Y - sy, L2 = vx * vx + vy * vy;
        const along = -(vx * sb + vy * cb), across = -vx * cb + vy * sb;       // components along the central ray / across it (+γ side)
        const g = Math.atan2(across, along), f = g / dg + ND / 2 - 0.5;
        if (f < 0 || f >= ND - 1) continue;
        const j = f | 0, u = f - j, q = data[row + j] * (1 - u) + data[row + j + 1] * u;
        img[r * N + c] += filtered ? q * wv * CT.D / L2 : q * wv / TAU;
      }
    }
  }
  return img;
};
// views in a well-spread order (each new view as far as possible from those already taken), so any first n of them
// cover 360° evenly; cumulative sums are kept every 8 views and the build-up of S14 reads any n cheaply
CT.ORDER = (() => {
  const NA = CT.NA, taken = new Uint8Array(NA), order = [0], dist = new Float32Array(NA).fill(1e9); taken[0] = 1;
  const upd = a => { for (let k = 0; k < NA; k++) { const d = Math.min(Math.abs(k - a), NA - Math.abs(k - a)); if (d < dist[k]) dist[k] = d; } };
  upd(0);
  while (order.length < NA) { let best = -1, bd = -1; for (let k = 0; k < NA; k++) if (!taken[k] && dist[k] > bd) { bd = dist[k]; best = k; } taken[best] = 1; order.push(best); upd(best); }
  return order;
})();
const CK = [];                                  // CK[m] = sum of the first 8m views (filtered, unscaled)
CT.buildCumulative = () => {
  let acc = new Float32Array(N * N); CK[0] = Float32Array.from(acc);
  for (let i = 0; i < CT.NA; i++) {
    const one = CT.backproject([CT.ORDER[i]], true); for (let q = 0; q < acc.length; q++) acc[q] += one[q] / CT.NA;   // weight of one view in the full set
    if ((i + 1) % 8 === 0) CK[(i + 1) / 8] = Float32Array.from(acc);
  }
};
// μ image (/cm) from the first n views of ORDER, scaled as if they were the full set
CT.partial = (() => {
  const cache = new Map();
  return n => {
    n = Math.max(1, Math.min(CT.NA, Math.round(n)));
    if (cache.has(n)) return cache.get(n);
    const m = Math.floor(n / 8), img = Float32Array.from(CK[m]);
    for (let i = m * 8; i < n; i++) { const one = CT.backproject([CT.ORDER[i]], true); for (let q = 0; q < img.length; q++) img[q] += one[q] / CT.NA; }
    const s = CT.CAL * CT.NA / n; for (let q = 0; q < img.length; q++) img[q] = img[q] * s + CT.OFS;
    if (cache.size > 24) cache.delete(cache.keys().next().value);
    cache.set(n, img); return img;
  };
})();
// one view smeared back across the image (the S14 demonstration), scaled like a full image
CT.smear = (a, filtered = true) => { const img = CT.backproject([a], filtered); const s = filtered ? CT.CAL : CT.CALU * CT.NA; for (let i = 0; i < img.length; i++) img[i] = img[i] * s + (filtered ? CT.OFS : 0); return img; };
CT.full = () => CT.FULL;
CT.blurry = () => CT.BLUR;
CT.toHU = mu => 1000 * (mu - CT.MUW) / CT.MUW;
CT.init = async () => {
  const t0 = performance.now();
  CT.buildPhantom();
  const t1 = performance.now();
  CT.buildSinogram();
  const t2 = performance.now();
  CT.buildFiltered();
  // calibration: least squares between the full reconstructions and the phantom's μ inside the head
  CT.CAL = 1; CT.CALU = 1;
  const views = []; for (let k = 0; k < CT.NA; k++) views.push(k);
  const f = CT.backproject(views, true), u = CT.backproject(views, false);
  let sfm = 0, sff = 0, sum_ = 0, suu = 0;
  for (let i = 0; i < N * N; i++) { if (CT.MU[i] <= 0) continue; sfm += f[i] * CT.MU[i]; sff += f[i] * f[i]; sum_ += u[i] * CT.MU[i]; suu += u[i] * u[i]; }
  CT.CAL = sfm / sff; CT.CALU = sum_ / suu;
  // offset: the reconstruction's soft-tissue level against the phantom's (brain pixels)
  let so = 0, no = 0;
  for (let i = 0; i < N * N; i++) { const h = CT.HUP[i]; if (h > 0 && h < 60) { so += CT.MU[i] - f[i] * CT.CAL; no++; } }
  CT.OFS = no ? so / no : 0;
  for (let i = 0; i < N * N; i++) { f[i] = f[i] * CT.CAL + CT.OFS; u[i] *= CT.CALU; }
  CT.FULL = f; CT.BLUR = u;
  CT.buildCumulative();
  console.log(`CT: phantom ${Math.round(t1 - t0)} ms, sinogram ${Math.round(t2 - t1)} ms, filter+cal ${Math.round(performance.now() - t2)} ms, pmax ${CT.PMAX.toFixed(2)}`);
};
// ---------- drawing ----------
const hex = h => PIX.hex(PIX.P[h] || h);
let RAMPS = null;
const ramps = () => RAMPS || (RAMPS = {
  gray: ['k', 'g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'ga', 'gb', 'w'].map(hex),
  blue: ['k', 'n1', 'b0', 'b1', 'b2', 'b3', 'b4', 'w'].map(hex),
});
CT.ramps = () => ramps();
const BAY = (x, y) => PIX.BAYER[(y & 3) << 2 | (x & 3)] + 0.5;
// draw a grid image (w × h values) through an affine map: screen = M · (u, v, 1), u, v in grid cells (0..w, 0..h).
// o: {M: [a, b, c, d, e, f] (sx = a u + c v + e, sy = b u + d v + f), val(i) → 0..1 level (or null = transparent),
//     ramp, clip: [x0, y0, x1, y1], nearest, alpha (0..1 dithered coverage), fade (fn(u, v) → coverage)}
CT.blit = (c, w, h, o) => {
  const [a, b, cc, d, e, f] = o.M, det = a * d - b * cc; if (Math.abs(det) < 1e-9) return;
  const ia = d / det, ib = -b / det, ic = -cc / det, id = a / det;
  // screen bounding box of the grid
  const pts = [[0, 0], [w, 0], [0, h], [w, h]].map(([u, v]) => [a * u + cc * v + e, b * u + d * v + f]);
  let x0 = Math.floor(Math.min(...pts.map(p => p[0]))), x1 = Math.ceil(Math.max(...pts.map(p => p[0])));
  let y0 = Math.floor(Math.min(...pts.map(p => p[1]))), y1 = Math.ceil(Math.max(...pts.map(p => p[1])));
  const cl = o.clip || [0, 0, PIX.W, PIX.H];
  x0 = Math.max(x0, cl[0], 0); y0 = Math.max(y0, cl[1], 0); x1 = Math.min(x1, cl[2], PIX.W); y1 = Math.min(y1, cl[3], PIX.H);
  if (x1 <= x0 || y1 <= y0) return;
  const R = o.ramp || ramps().gray, nR = R.length, alpha = o.alpha ?? 1;
  const img = c.getImageData(x0, y0, x1 - x0, y1 - y0), D = img.data, W2 = x1 - x0;
  const near = o.nearest ?? (Math.hypot(ia, ib) < 0.75);
  for (let sy = y0; sy < y1; sy++) for (let sx = x0; sx < x1; sx++) {
    const X = sx + 0.5 - e, Y = sy + 0.5 - f, u = ia * X + ic * Y, v = ib * X + id * Y;
    if (u < 0 || v < 0 || u >= w || v >= h) continue;
    const bay = BAY(sx, sy);
    if (alpha < 1 && bay > alpha) continue;
    if (o.fade) { const cv = o.fade(u, v); if (cv <= 0 || bay > cv) continue; }
    let lv;
    if (near) lv = o.val(Math.floor(v) * w + Math.floor(u));
    else {
      const fu = Math.max(0, Math.min(w - 1.001, u - 0.5)), fv = Math.max(0, Math.min(h - 1.001, v - 0.5)), i = fu | 0, j = fv | 0, du = fu - i, dv = fv - j;
      const q00 = o.val(j * w + i), q10 = o.val(j * w + i + 1), q01 = o.val((j + 1) * w + i), q11 = o.val((j + 1) * w + i + 1);
      if (q00 == null || q10 == null || q01 == null || q11 == null) lv = q00 ?? q10 ?? q01 ?? q11; else lv = (q00 * (1 - du) + q10 * du) * (1 - dv) + (q01 * (1 - du) + q11 * du) * dv;
    }
    if (lv == null) continue;
    const k = Math.max(0, Math.min(nR - 1, Math.round(clamp(lv) * (nR - 1) + bay - 0.5))), col = R[k], p = ((sy - y0) * W2 + (sx - x0)) * 4;
    D[p] = col[0]; D[p + 1] = col[1]; D[p + 2] = col[2]; D[p + 3] = 255;
  }
  c.putImageData(img, x0, y0);
};
// convenience: an N × N μ image (or HU image with hu: true) centred at screen (cx, cy), s px per mm, rotated by rot
CT.drawSlice = (c, img, cx, cy, s, o = {}) => {
  const L = o.L ?? 40, W = o.W ?? 100, hu = o.hu, rot = o.rot || 0, k = s * PX, co = Math.cos(rot) * k, si = Math.sin(rot) * k;
  const M = [co, si, -si, co, cx - (co * N / 2 - si * N / 2), cy - (si * N / 2 + co * N / 2)];
  const lo = L - W / 2;
  CT.blit(c, N, N, { ...o, M, val: i => { const v = hu ? img[i] : CT.toHU(img[i]); if (o.mask && !o.mask(i, v)) return null; return (v - lo) / W; } });
};
})();
