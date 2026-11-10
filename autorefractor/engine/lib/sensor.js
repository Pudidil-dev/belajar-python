// SEN — the image sensor and the ring image on it (asset F).
// A monochrome image sensor drawn as 64 × 64 schematic pixels (a real one has far more). The returning infrared light
// forms a ring on it. The ring of the film's one example is slightly smaller than the dashed calibration circle and
// slightly flattened, with its long axis horizontal — the same fictional reading everywhere (S10, S12, S15, S16, S19).
// Which way a ring changes for a given eye depends on the instrument's design; the film only says that its size, its
// ellipticity and its orientation carry the sphere, the cylinder and the axis. No value is attached to a size or angle.
//   SEN.I(x, y, e, seed)     intensity 0..1 of pixel (x, y) at exposure e (0 = faint noise … 1 = the clear ring)
//   SEN.grid(c, o)           the mosaic: as light on the pixels (magenta overlay), as collected charge (pale gold), or as
//                            digital values (white/grey) — per pixel, so a readout line can sweep across it
//   SEN.die(c, cx, cy, s)    the chip round the mosaic: die, bond pads, package
//   SEN.tilt(c, o)           the chip turning from edge-on to face-on (S10)
//   SEN.thumb(c, x, y, n, seed)   a small digital ring image, n × n screen pixels
//   SEN.overlay(c, o)        the analysis drawn over the digital ring: calibration circle, samples, fitted ellipse, axes
(() => {
const { W, H, P } = PIX;
const SEN = window.SEN = { NAME: 'SEN' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, h = U.hash;
const N = 64, C0 = 31.5;
SEN.N = N; SEN.C0 = C0;
SEN.RING = { a: 18.6, b: 15.4, r0: 21.5, sig: 1.3 };            // semi-axes in pixels (horizontal, vertical), calibration radius, half-width
let BASE = null;
SEN.init = () => {
  BASE = new Float32Array(N * N);
  const { a, b, sig } = SEN.RING, rb = (a + b) / 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x - C0, dy = y - C0, rho = Math.hypot(dx / a, dy / b), q = (rho - 1) * rb / sig, ang = Math.atan2(dy, dx);
    BASE[y * N + x] = Math.exp(-q * q) * (0.9 + 0.1 * Math.cos(2 * ang + 0.6)) + 0.035 * Math.exp(-Math.pow(Math.hypot(dx, dy) / 24, 2));
  }
};
SEN.I = (x, y, e = 1, seed = 0) => {
  if (x < 0 || y < 0 || x >= N || y >= N) return 0;
  const n = h(x + seed * 131, y + seed * 57);
  return clamp(BASE[y * N + x] * e * (0.9 + 0.2 * n) + (1 - e) * 0.3 * n * n + 0.025 * n);
};
const RAMP = {
  light: ['si0', 'm0', 'm1', 'm2', 'm3', 'm4', 'w'],                // returning light on the pixels (overlay colour)
  charge: ['si0', 'y0', 'y1', 'y2', 'y3', 'y4'],                     // collected charge
  digital: ['k', 'g1', 'g3', 'g5', 'g7', 'g9', 'gb', 'w'],           // digital values
};
const level = (v, n, x, y) => clamp(Math.floor(v * (n - 1) + (h(x * 3 + 1, y * 7 + 2) - 0.5) * 0.55 + 0.5), 0, n - 1);
// o = {cx, cy: screen point of pixel-space point (fx, fy) (default: the mosaic's centre), s: screen px per pixel, mode or
//      modeAt(ix, iy), e, seed, gaps (default: s ≥ 4 and not digital), box: [x0, y0, x1, y1] clip, dim(ix, iy) → 0..1}
SEN.grid = (c, o) => {
  const s = o.s, fx = o.fx ?? N / 2, fy = o.fy ?? N / 2, e = o.e ?? 1, seed = o.seed || 0;
  const [bx0, by0, bx1, by1] = o.box || [0, 0, W, H];
  const X = i => Math.round(o.cx + (i - fx) * s), Y = j => Math.round(o.cy + (j - fy) * s);
  const i0 = Math.max(0, Math.floor(fx + (bx0 - o.cx) / s)), i1 = Math.min(N - 1, Math.ceil(fx + (bx1 - o.cx) / s));
  const j0 = Math.max(0, Math.floor(fy + (by0 - o.cy) / s)), j1 = Math.min(N - 1, Math.ceil(fy + (by1 - o.cy) / s));
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.beginPath(); c.rect(bx0, by0, bx1 - bx0, by1 - by0); c.clip();
  // the substrate under the mosaic
  c.fillStyle = P.k; c.fillRect(X(0) - 1, Y(0) - 1, X(N) - X(0) + 1, Y(N) - Y(0) + 1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const mode = o.modeAt ? o.modeAt(i, j) : (o.mode || 'light'), ramp = RAMP[mode], x0 = X(i), y0 = Y(j), w = X(i + 1) - x0, hh = Y(j + 1) - y0;
    const v = SEN.I(i, j, e, seed) * (o.gain ? o.gain(i, j) : 1), k = level(v, ramp.length, i, j);
    const gap = (o.gaps ?? (mode !== 'digital')) && s >= 4 ? 1 : 0;
    if (mode === 'digital' || s < 8) { c.fillStyle = P[ramp[k]]; c.fillRect(x0, y0, w - gap, hh - gap); continue; }
    // a large physical pixel: silicon body, the light-sensitive area inside it, a glint of the microlens
    const m = Math.max(1, Math.round(s * 0.14));
    c.fillStyle = P.si0; c.fillRect(x0, y0, w - gap, hh - gap);
    c.fillStyle = P[k === 0 ? 'si1' : ramp[k]]; c.fillRect(x0 + m, y0 + m, w - gap - 2 * m, hh - gap - 2 * m);
    if (s >= 12) { c.fillStyle = P[k === 0 ? 'si2' : ramp[Math.min(ramp.length - 1, k + 1)]]; c.fillRect(x0 + m, y0 + m, Math.max(1, Math.round(s * 0.2)), 1); c.fillRect(x0 + m, y0 + m, 1, Math.max(1, Math.round(s * 0.2))); }
  }
  c.restore();
};
// the chip round the mosaic (screen px): die with bond pads, package with a bevel and a notch
SEN.die = (c, cx, cy, s, o = {}) => {
  const g = N * s / 2, m1 = Math.round(3.5 * s), m2 = Math.round(8 * s), R = (x, y, w, hh, col) => PIX.rect(c, Math.round(x), Math.round(y), Math.round(w), Math.round(hh), col);
  R(cx - g - m2, cy - g - m2, 2 * (g + m2), 2 * (g + m2), 'g2'); R(cx - g - m2, cy - g - m2, 2 * (g + m2), Math.max(1, s / 2), 'g4'); R(cx - g - m2, cy - g - m2, Math.max(1, s / 2), 2 * (g + m2), 'g4');
  R(cx - g - m2, cy + g + m2 - Math.max(1, s / 2), 2 * (g + m2), Math.max(1, s / 2), 'g0'); R(cx + g + m2 - Math.max(1, s / 2), cy - g - m2, Math.max(1, s / 2), 2 * (g + m2), 'g0');
  R(cx - g - m1, cy - g - m1, 2 * (g + m1), 2 * (g + m1), 'si0'); R(cx - g - 1, cy - g - 1, 2 * g + 2, 2 * g + 2, 'si1');
  const n = 12;
  for (let k = 0; k < n; k++) { const q = (k + 0.5) / n * 2 * g - g, p = Math.max(2, Math.round(1.4 * s)), d = g + m1 * 0.5;
    R(cx + q - p / 2, cy - d - p / 2, p, p, 'y2'); R(cx + q - p / 2, cy + d - p / 2, p, p, 'y2'); R(cx - d - p / 2, cy + q - p / 2, p, p, 'y2'); R(cx + d - p / 2, cy + q - p / 2, p, p, 'y2');
    // bond wires to the package
    R(cx + q, cy - g - m2 + s, 1, m2 - m1 - s, 'y1'); R(cx + q, cy + g + m1, 1, m2 - m1 - s, 'y1'); R(cx - g - m2 + s, cy + q, m2 - m1 - s, 1, 'y1'); R(cx + g + m1, cy + q, m2 - m1 - s, 1, 'y1'); }
  R(cx - g - m2 + s, cy - g - m2 + s, 2 * s, 2 * s, 't2');                                    // the orientation mark
};
SEN.dieHalf = s => N * s / 2 + Math.round(8 * s);
// ---------- the chip turning to face us: the face drawn offscreen at 4 px per pixel, then squeezed vertically ----------
let off = null, ox = null;
SEN.tilt = (c, o) => {
  const s = 4, half = SEN.dieHalf(s), size = 2 * half;
  if (!off) { off = document.createElement('canvas'); off.width = off.height = size; ox = off.getContext('2d'); }
  ox.setTransform(1, 0, 0, 1, 0, 0); ox.clearRect(0, 0, size, size);
  // PIX helpers draw in "screen" pixels of whatever context they get, so the face can be composed on the offscreen canvas
  SEN.die(ox, half, half, s); SEN.grid(ox, { cx: half, cy: half, s, mode: 'light', e: o.e ?? 0, seed: o.seed || 0, box: [0, 0, size, size] });
  const hw = o.hw, hh = Math.max(1, o.hh);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
  c.drawImage(off, 0, 0, size, size, Math.round(o.cx - hw), Math.round(o.cy - hh), Math.round(2 * hw), Math.round(2 * hh));
  // the chip's near edge (its thickness) while it is still tilted
  const th = Math.round((o.edge ?? 0) * 7); if (th > 0) { PIX.rect(c, Math.round(o.cx - hw), Math.round(o.cy + hh), Math.round(2 * hw), th, 'g1'); PIX.rect(c, Math.round(o.cx - hw), Math.round(o.cy + hh), Math.round(2 * hw), 1, 'g4'); }
  c.restore();
};
// a small digital ring image, n × n screen pixels, top-left at (x, y); a = appearance 0..1 (dithered)
SEN.thumb = (c, x, y, n, seed = 0, o = {}) => {
  const ramp = RAMP.digital, e = o.e ?? 1, a = o.a ?? 1;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (a < 1 && K.BAY(x + i, y + j) > a) continue;
    const u = (i + 0.5) / n * N, v = (j + 0.5) / n * N, iu = Math.floor(u), iv = Math.floor(v);
    // average 2 × 2 so the thin ring survives the reduction
    let s = 0; for (const [du, dv] of [[0, 0], [1, 0], [0, 1], [1, 1]]) s = Math.max(s, SEN.I(Math.min(N - 1, iu + du), Math.min(N - 1, iv + dv), e, seed));
    c.fillStyle = P[ramp[level(s, ramp.length, iu, iv)]]; c.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1);
  }
  c.restore();
};
// ---------- the analysis overlay (S15, S16, S19), in pixel space mapped by {cx, cy, s} like SEN.grid ----------
// o = {cx, cy, s, cal: 0..1 (dashed calibration circle drawn round), samp: 0..1 (sample marks placed round the ring),
//      fit: 0..1 (the fitted ellipse drawn round), axes: 0..1 (the two principal directions), t}
SEN.overlay = (c, o) => {
  const { cx, cy, s } = o, { a, b, r0 } = SEN.RING, t = o.t || 0;
  const pt = (rx, ry, ang) => [cx + Math.cos(ang) * rx * s, cy + Math.sin(ang) * ry * s];
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  if (o.cal > 0) {                                                     // the calibration circle: dashes, drawn clockwise from the top
    const n = 40; c.fillStyle = P.e2;
    for (let k = 0; k < n * clamp(o.cal); k++) { if (k % 2) continue; for (let q = 0; q < 1; q += 0.1) { const [x, y] = pt(r0, r0, -Math.PI / 2 + (k + q) / n * TAU); c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(s / 2)), Math.max(1, Math.round(s / 2))); } }
  }
  if (o.fit > 0) {                                                     // the fitted ellipse: a thin continuous line
    const n = 220; c.fillStyle = P.e3;
    for (let k = 0; k < n * clamp(o.fit); k++) { const [x, y] = pt(a, b, -Math.PI / 2 + k / n * TAU); c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(s / 4)), Math.max(1, Math.round(s / 4))); }
  }
  if (o.samp > 0) {                                                    // sample marks where the ring's brightest point lies along each spoke
    const n = 32, d = Math.max(3, Math.round(s * 0.75));
    for (let k = 0; k < Math.floor(n * clamp(o.samp) + 1e-6); k++) {
      const ang = -Math.PI / 2 + k / n * TAU, [x, y] = pt(a, b, ang), fresh = k >= Math.floor(n * clamp(o.samp)) - 1 && o.samp < 1;
      if (fresh) { const [x0, y0] = pt(a * 0.5, b * 0.5, ang), [x1, y1] = pt(a * 1.42, b * 1.42, ang); PIX.bline(c, x0, y0, x1, y1, 'e1'); }
      c.fillStyle = P[fresh ? 'w' : 'e2']; c.fillRect(Math.round(x - d / 2), Math.round(y - d / 2), d, d);
    }
  }
  if (o.axes > 0) {                                                    // the two principal directions: the long axis and the short one
    const k = MO.cubicOut(clamp(o.axes)), ex = a * s * k, ey = b * s * k, hd = Math.max(3, Math.round(s));
    PIX.bline(c, cx - ex, cy, cx + ex, cy, 'w'); PIX.bline(c, cx, cy - ey, cx, cy + ey, 'e3');
    for (const sg of [-1, 1]) { for (const q of [-1, 1]) { PIX.bline(c, cx + sg * ex, cy, cx + sg * (ex - hd), cy + q * hd * 0.7, 'w'); PIX.bline(c, cx, cy + sg * ey, cx + q * hd * 0.7, cy + sg * (ey - hd), 'e3'); } }
    // the gap to the calibration circle along each direction
    if (o.axes >= 1) for (const sg of [-1, 1]) { PIX.bline(c, cx + sg * (a * s + 2), cy, cx + sg * (r0 * s - 1), cy, 'e1', 1); PIX.bline(c, cx, cy + sg * (b * s + 2), cx, cy + sg * (r0 * s - 1), 'e1', 1); }
    PIX.rect(c, Math.round(cx) - 1, Math.round(cy) - 1, 3, 3, 'w');
  }
  c.restore();
};
// a check mark (screen px), k = 0..1 drawn
SEN.check = (c, x, y, k, col = 'e2', sc = 1) => {
  if (k <= 0) return;
  const pts = [[0, 4], [3, 7], [9, 0]], n = clamp(k) * 2;
  for (let i = 0; i < 2; i++) { const q = clamp(n - i); if (q <= 0) break; const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    for (const dy of [0, 1]) PIX.bline(c, x + ax * sc, y + ay * sc + dy, x + lerp(ax, bx, q) * sc, y + lerp(ay, by, q) * sc + dy, col); }
};
})();
