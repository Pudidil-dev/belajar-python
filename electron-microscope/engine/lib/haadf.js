// HA — the film's micrograph: isolated gold atoms (a few pairs and one small raft) on a 3 nm amorphous carbon film,
// recorded as a HAADF-STEM scan. Each pixel is what the annular detector counts while the probe is parked there:
// the probe intensity (a 0.07 nm core broadened by the atoms' thermal motion, plus a faint aberration tail) weighted
// by each atom's high-angle scattering strength (∝ Z^1.7: gold 79 → 1683, carbon 6 → 21), turned into counts with
// Poisson shot noise, with the scan's line-to-line jitter and gain wobble on top. 0.025 nm per pixel; 270 × 480
// pixels = 6.75 × 12 nm, so at the opening one image pixel is one screen pixel.
// The same atom positions are reused wherever the film shows the specimen itself (the scan, the scattering, the end).
(() => {
const HA = window.HA = {};
const NM = HA.NM = 0.025, IW = HA.IW = 270, IH = HA.IH = 480;
const ZW = HA.ZW = z => Math.pow(z, 1.7);                                 // high-angle scattering strength
const SIG = 0.040, TAIL = 0.13, TAILK = 0.022;                           // nm; tail peak relative to the core
const PEAK = 55;                                                         // counts at a single gold atom

// ---------- the specimen ----------
const AU = HA.AU = [];                                                   // {x, y} nm, image frame (y down)
HA.HOOK = 0;                                                             // index of "ONE GOLD ATOM"
function place() {
  const r = U.rng(79);
  AU.push({ x: 3.90, y: 5.80 });                                         // the hook atom, near the frame centre
  // a monolayer raft, Au(111) spacing 0.288 nm, lower right
  const a = 0.288, cx = 5.05, cy = 9.55, raft = [];
  for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
    const x = cx + (i + j / 2) * a, y = cy + j * a * Math.sqrt(3) / 2, d = Math.hypot(x - cx, (y - cy) * 1.15);
    if (d < 0.62 + 0.18 * U.hash(i + 9, j + 4)) raft.push({ x, y, raft: 1 });
  }
  raft.forEach(p => AU.push(p));
  // pairs and a bent trio (atoms that met on the film)
  for (const [x, y, an, n] of [[1.35, 2.15, 0.6, 2], [5.6, 3.05, 2.1, 2], [1.05, 9.9, -0.4, 3], [2.6, 7.6, 1.2, 2]]) {
    const b = [x + Math.cos(an) * 0.29, y + Math.sin(an) * 0.29];
    AU.push({ x, y }, { x: b[0], y: b[1] });
    if (n === 3) AU.push({ x: b[0] + Math.cos(an + 1.05) * 0.29, y: b[1] + Math.sin(an + 1.05) * 0.29 });
  }
  // single atoms, kept apart (and clear of the hook atom, so its cursor ring sits on dark carbon)
  let tries = 0;
  while (AU.length < 52 && tries++ < 5000) {
    const x = 0.2 + r() * (IW * NM - 0.4), y = 0.2 + r() * (IH * NM - 0.4);
    const far = AU.every((p, i) => Math.hypot(p.x - x, p.y - y) > (i === 0 ? 1.0 : p.raft ? 0.9 : 0.62));
    if (far) AU.push({ x, y });
  }
}

// ---------- the scan ----------
let V, CNT, D;                                                           // ideal signal, counts, display 0..1
HA.mips = [];
function gauss(r) {                                                       // seeded standard normal
  const u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(U.TAU * v);
}
function poisson(r, lam) {
  if (lam <= 0) return 0;
  if (lam > 30) return Math.max(0, Math.round(lam + Math.sqrt(lam) * gauss(r)));
  const L = Math.exp(-lam); let k = 0, p = 1;
  do { k++; p *= r(); } while (p > L);
  return k - 1;
}
function splat(arr, x, y, w, sig, rad) {                                  // add w·exp(−r²/2σ²) at (x, y) nm
  const px = x / NM - 0.5, py = y / NM - 0.5, s2 = 2 * (sig / NM) ** 2, R = Math.ceil(rad / NM);
  const x0 = Math.max(0, Math.floor(px - R)), x1 = Math.min(IW - 1, Math.ceil(px + R));
  const y0 = Math.max(0, Math.floor(py - R)), y1 = Math.min(IH - 1, Math.ceil(py + R));
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
    const d2 = (xx - px) ** 2 + (yy - py) ** 2; arr[yy * IW + xx] += w * Math.exp(-d2 / s2);
  }
}
HA.init = () => {
  place();
  const r = U.rng(1931);                                                 // Knoll and Ruska's first electron lens images
  V = HA.V = new Float32Array(IW * IH);
  // carbon: ~300 atoms per nm² in projection through 3 nm, thickness wandering ±25% over a few nm
  const area = IW * NM * IH * NM, nC = Math.round(300 * area);
  for (let i = 0; i < nC; i++) {
    const x = r() * IW * NM, y = r() * IH * NM;
    const th = 0.75 + 0.5 * K.fbm(x * 0.45, y * 0.45, 5, 3);
    if (r() > th / 1.25) continue;
    splat(V, x, y, ZW(6), SIG, 0.12);
  }
  for (const p of AU) { splat(V, p.x, p.y, ZW(79), SIG, 0.16); splat(V, p.x, p.y, ZW(79) * TAILK, TAIL, 0.4); }
  // detector counts with shot noise, then the scan's per-line jitter (x shift) and gain wobble
  const k = PEAK / ZW(79);
  CNT = HA.CNT = new Float32Array(IW * IH); D = HA.D = new Float32Array(IW * IH);
  let jit = 0, gain = 1;
  for (let y = 0; y < IH; y++) {
    jit = jit * 0.86 + 0.16 * gauss(r); gain = 1 + (gain - 1) * 0.9 + 0.012 * gauss(r);
    const dx = jit * 0.9 + 0.12 * gauss(r);
    for (let x = 0; x < IW; x++) {
      const sx = Math.min(IW - 1, Math.max(0, x + dx)), xi = Math.floor(sx), f = sx - xi, xj = Math.min(IW - 1, xi + 1);
      const v = (V[y * IW + xi] * (1 - f) + V[y * IW + xj] * f) * gain;
      CNT[y * IW + x] = poisson(r, v * k + 0.25);
    }
  }
  for (let i = 0; i < IW * IH; i++) D[i] = Math.min(1, Math.sqrt(CNT[i] / PEAK) * 0.96 + 0.025);
  // the image and its mip pyramid (area averages: the micrograph never sparkles when it is drawn small)
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const c0 = cv(IW, IH), x0 = c0.getContext('2d'), im = x0.createImageData(IW, IH);
  for (let i = 0; i < IW * IH; i++) { const g = Math.round(255 * D[i]); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = g; im.data[i * 4 + 3] = 255; }
  x0.putImageData(im, 0, 0); HA.mips = [c0];
  let src = D, w = IW, h = IH;
  while (w > 8) {
    const nw = Math.ceil(w / 2), nh = Math.ceil(h / 2), dst = new Float32Array(nw * nh), c = cv(nw, nh), x = c.getContext('2d'), m = x.createImageData(nw, nh);
    for (let yy = 0; yy < nh; yy++) for (let xx = 0; xx < nw; xx++) {
      let s = 0, n = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const X = xx * 2 + dx, Y = yy * 2 + dy; if (X < w && Y < h) { s += src[Y * w + X]; n++; } }
      dst[yy * nw + xx] = s / n; const g = Math.round(255 * s / n), i = (yy * nw + xx) * 4; m.data[i] = m.data[i + 1] = m.data[i + 2] = g; m.data[i + 3] = 255;
    }
    x.putImageData(m, 0, 0); HA.mips.push(c); src = dst; w = nw; h = nh;
  }
};

// ---------- drawing ----------
// Draw the micrograph (or its first `rows` scan lines, plus `cols` pixels of the next) into the world rectangle
// (x, y, w, h) under the current transform. Nearest-neighbour when magnified (the pixels show), a matching mip level
// with bilinear filtering when it is drawn smaller than 1:1.
HA.draw = (c, x, y, w, h, o = {}) => {
  const m = c.getTransform(), s = Math.hypot(m.a, m.b) * w / IW;          // screen pixels per image pixel
  const rows = o.rows ?? IH, cols = o.cols ?? 0;
  let L = 0; if (s < 1) L = Math.min(HA.mips.length - 1, Math.max(0, Math.floor(Math.log2(1 / s))));
  const img = HA.mips[L], f = img.width / IW;
  c.save(); c.imageSmoothingEnabled = s < 1; if (c.imageSmoothingQuality) c.imageSmoothingQuality = 'low';
  if (o.alpha != null) c.globalAlpha *= o.alpha;
  const full = Math.min(IH, Math.floor(rows));
  if (full >= IH) c.drawImage(img, 0, 0, img.width, img.height, x, y, w, h);
  else {
    if (full > 0) { const sh = Math.max(1, Math.round(full * f)); c.drawImage(img, 0, 0, img.width, sh, x, y, w, h * sh / img.height); }
    if (cols > 0 && full < IH) {
      const sw = Math.max(1, Math.round(Math.min(IW, cols) * f)), sy = Math.round(full * f);
      c.drawImage(img, 0, sy, sw, Math.max(1, Math.round(f)), x, y + h * full / IH, w * sw / img.width, h / IH);
    }
  }
  c.restore();
};
// image pixel ↔ nm
HA.px = (xn, yn) => [xn / NM, yn / NM];
HA.nm = (px, py) => [px * NM, py * NM];
// line profile through the recorded counts (bilinear), n samples from (x0, y0) to (x1, y1) in image pixels
HA.profile = (x0, y0, x1, y1, n = 48) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), x = U.lerp(x0, x1, t) - 0.5, y = U.lerp(y0, y1, t) - 0.5;
    const xi = Math.max(0, Math.min(IW - 2, Math.floor(x))), yi = Math.max(0, Math.min(IH - 2, Math.floor(y))), fx = U.clamp(x - xi), fy = U.clamp(y - yi);
    const g = (X, Y) => D[Y * IW + X];
    out.push(g(xi, yi) * (1 - fx) * (1 - fy) + g(xi + 1, yi) * fx * (1 - fy) + g(xi, yi + 1) * (1 - fx) * fy + g(xi + 1, yi + 1) * fx * fy);
  }
  return out;
};
// the fitted curve for that profile: background + a Gaussian at the atom (display units)
HA.fit = (x0, y0, x1, y1, n, atom) => {
  const [ax, ay] = HA.px(atom.x, atom.y), out = [], bg = 0.2;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), x = U.lerp(x0, x1, t), y = U.lerp(y0, y1, t), d = Math.hypot(x - ax, y - ay) * NM;
    out.push(bg + (0.98 - bg) * Math.exp(-d * d / (2 * (SIG * 1.18) ** 2)));
  }
  return out;
};
})();
