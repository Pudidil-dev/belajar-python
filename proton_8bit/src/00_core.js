'use strict';
// ============================================================================
// PROTON 8-bit — core: pixel buffer, palette, rasterisers, masks, easing, camera.
// Everything draws into one 360x640 Uint32 buffer (crisp pixels, no AA),
// shown 3x nearest-neighbour (1080x1920) by the player / export.
// W, H and buf can be swapped temporarily (withCanvas) to draw a world into a
// larger square buffer, e.g. for a camera roll.
// ============================================================================
const FPS = 60, DUR = 72, NF = 4320;
let W = 360, H = 640, CX = 180, CY = 320;
const MAXPIX = 640 * 640;
let buf = new Uint32Array(W * H);
const SPARE = [new Uint32Array(MAXPIX), new Uint32Array(MAXPIX), new Uint32Array(MAXPIX), new Uint32Array(MAXPIX), new Uint32Array(MAXPIX)];
const FEEDBUF = SPARE[1].subarray(0, 360 * 640), TMPBUF = SPARE[3].subarray(0, 360 * 640), TMP2 = SPARE[4].subarray(0, 360 * 640);
// draw into a w x h buffer (taken from SPARE[0]) and return it
function withCanvas(w, h, fn) {
  const oW = W, oH = H, oCX = CX, oCY = CY, oBuf = buf;
  W = w; H = h; CX = w / 2; CY = h / 2; buf = SPARE[0].subarray(0, w * h);
  try { fn(); } finally { const out = buf; W = oW; H = oH; CX = oCX; CY = oCY; buf = oBuf; withCanvas.last = out; }
  return withCanvas.last;
}
function hexc(h) {
  const n = parseInt(h.slice(1), 16);
  return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
}
const P = {};
const PAL_HEX = {
  // ground: deep navy (hue <= 218, kept out of the blue-purple band)
  K0: '#030812', BG: '#0B1A33', N1: '#0E2140', N2: '#132A4C', N3: '#1A355C', N4: '#23436F', N5: '#305788', N6: '#4470A3',
  // the machine: metallic white, silver and dark grey
  M0: '#151A22', M1: '#262E3A', M2: '#3C4756', M3: '#5E6B7C', M4: '#8D99A8', M5: '#BAC4D0', M6: '#E6ECF2', M7: '#FFFFFF',
  // shielding concrete (neutral grey) and the facility floor
  CO0: '#24272E', CO1: '#363A43', CO2: '#4A4F5A', CO3: '#636975', CO4: '#7E8592', FL0: '#0D1626', FL1: '#121E33', FL2: '#18263F',
  // the copper main coil of the cyclotron magnet (small areas only)
  CU0: '#2E2A2A', CU1: '#4A4442', CU2: '#6A5E56', CU3: '#8A7C70',
  // protons: luminous cyan; the RF field arrows use the same family
  PC0: '#0A3E4A', PC1: '#127082', PC2: '#1EA8BE', PC3: '#38E0F0', PC4: '#9AF4FC', PC5: '#E8FEFF',
  // electrons: small yellow
  EL0: '#5E4A0E', EL1: '#A88418', EL2: '#FFD84A', EL3: '#FFF2B0',
  // magnetic field: thin purple lines
  MG0: '#2E1E4A', MG1: '#5A3C8C', MG2: '#8E6CCC', MG3: '#C2A6F2',
  // the tumour (orange-red) and normal tissue (soft red and pink)
  TU0: '#5E1A10', TU1: '#9A2E1A', TU2: '#E8603A', TU3: '#F49468', TU4: '#FFC4A2',
  TI0: '#4E2230', TI1: '#86404E', TI2: '#B8687A', TI3: '#E7A0A8', TI4: '#F2C2C6', TI5: '#FADDE0',
  // organs in the cross-section (darker reds), fat, bone, spinal cord
  OR0: '#4A1820', OR1: '#76303A', OR2: '#9E4A52', OR3: '#C26A70', FA0: '#C9A08E', FA1: '#E6C6B6', BO0: '#7E7464', BO1: '#BFB49C', BO2: '#E8E0CC', CD: '#F4E6B8',
  // deposited energy: orange-yellow markers (and the dose map)
  DE0: '#5A3008', DE1: '#A65E12', DE2: '#F2A030', DE3: '#FFD070', DE4: '#FFF0C0',
  // the couch (carbon fibre), the patient's blanket (pale grey-blue), the X-ray image (grey)
  CF0: '#10141B', CF1: '#1C232E', CF2: '#2C3644', BK0: '#5E7488', BK1: '#8AA0B6', BK2: '#B6C8D8', BK3: '#DCE6F0',
  XR0: '#0A0C10', XR1: '#2A3038', XR2: '#5A626C', XR3: '#9AA2AC', XR4: '#DCE2E8',
  // water molecules, DNA (pale backbone, soft bases), radicals (lime)
  WO: '#C6D4E2', WH: '#F4F8FC', DN0: '#5E6E80', DN1: '#B4C2D2', DN2: '#E6ECF2', BA1: '#6CC49A', BA2: '#E88E9A', RD1: '#7CC84E', RD2: '#C2F08E',
  // control-room screens
  SCR0: '#04121A', SCR1: '#0A2430', SCR2: '#0E3644',
  // UI
  INK: '#F4F8FF', SUB: '#9CC0E4', LBL: '#86E6FF', YEL: '#FFD84A', RED: '#FF6A6A', GRN: '#7CE0A0', SH: '#02050C', C4: '#C8D4E6', C6: '#FFFFFF',
};
for (const k in PAL_HEX) P[k] = hexc(PAL_HEX[k]);

// ---------------------------------------------------------------- math/ease
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const smooth = t => t * t * (3 - 2 * t);
const eio = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eout = t => 1 - Math.pow(1 - t, 3);
const ein = t => t * t * t;
function bezierEase(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return function (x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const fx = ((ax * t + bx) * t + cx) * t - x;
      const d = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(fx) < 1e-6) break;
      t -= fx / (d || 1e-6);
      t = clamp(t, 0, 1);
    }
    return ((ay * t + by) * t + cy) * t;
  };
}
const K75 = bezierEase(0.75, 0, 0.25, 1);      // Kurzgesagt camera ease
const K50 = bezierEase(0.5, 0, 0.2, 1);
function backOut(t, s) { s = s === undefined ? 1.70158 : s; t = clamp(t, 0, 1) - 1; return t * t * ((s + 1) * t + s) + 1; }
const TAU = Math.PI * 2;

// stateless hash -> [0,1)
function hash(n) {
  n = (n | 0) ^ 0x9e3779b9;
  n = Math.imul(n ^ (n >>> 16), 0x21f0aaad);
  n = Math.imul(n ^ (n >>> 15), 0x735a2d97);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 4294967296;
}
const hash2 = (a, b) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));
const hash3 = (a, b, c) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(c | 0, 83492791));
function vnoise(x, s) { // 1-D value noise, smooth
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash2(i, s), hash2(i + 1, s), u);
}

// ---------------------------------------------------------------- dithering
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;

// ---------------------------------------------------------------- primitives
function clear(c) { buf.fill(c); }
function pset(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && x < W && y >= 0 && y < H) buf[y * W + x] = c; }
function psetD(x, y, c, lv) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && x < W && y >= 0 && y < H && bay(x, y) < lv) buf[y * W + x] = c; }
function rect(x0, y0, x1, y1, c, lv) {
  const a = Math.max(0, Math.round(x0)), b = Math.min(W, Math.round(x1));
  const p = Math.max(0, Math.round(y0)), q = Math.min(H, Math.round(y1));
  if (a >= b || p >= q) return;
  if (lv === undefined || lv >= 1) { for (let y = p; y < q; y++) buf.fill(c, y * W + a, y * W + b); return; }
  if (lv <= 0) return;
  for (let y = p; y < q; y++) for (let x = a; x < b; x++) if (bay(x, y) < lv) buf[y * W + x] = c;
}
function frame(x0, y0, x1, y1, c) { rect(x0, y0, x1, y0 + 1, c); rect(x0, y1 - 1, x1, y1, c); rect(x0, y0, x0 + 1, y1, c); rect(x1 - 1, y0, x1, y1, c); }
function disc(cx, cy, r, c, lv) {
  if (r <= 0) return;
  if (lv !== undefined && lv <= 0) return;
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy, h = r * r - dy * dy;
    if (h < 0) continue;
    const s = Math.sqrt(h);
    const a = Math.max(0, Math.ceil(cx - s - 0.5)), b = Math.min(W - 1, Math.floor(cx + s - 0.5));
    if (lv === undefined || lv >= 1) { if (a <= b) buf.fill(c, y * W + a, y * W + b + 1); }
    else for (let x = a; x <= b; x++) if (bay(x, y) < lv) buf[y * W + x] = c;
  }
}
function ring(cx, cy, r, w, c, lv) {
  const ro = r + w / 2, ri = Math.max(0, r - w / 2);
  const y0 = Math.max(0, Math.floor(cy - ro)), y1 = Math.min(H - 1, Math.ceil(cy + ro));
  const x0 = Math.max(0, Math.floor(cx - ro)), x1 = Math.min(W - 1, Math.ceil(cx + ro));
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy;
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx, d2 = dx * dx + dy * dy;
      if (d2 <= ro * ro && d2 >= ri * ri && (lv === undefined || bay(x, y) < lv)) buf[y * W + x] = c;
    }
  }
}
function ellipse(cx, cy, rx, ry, c, lv, rot) {
  const R = Math.max(rx, ry);
  const cs = Math.cos(rot || 0), sn = Math.sin(rot || 0);
  const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(H - 1, Math.ceil(cy + R));
  const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W - 1, Math.ceil(cx + R));
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy;
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const u = (dx * cs + dy * sn) / rx, v = (-dx * sn + dy * cs) / ry;
      if (u * u + v * v <= 1 && (lv === undefined || bay(x, y) < lv)) buf[y * W + x] = c;
    }
  }
}
// scanline polygon fill (even-odd) on pixel centres; pts = [x0,y0,x1,y1,...]
const _xs = [];
function poly(pts, c, lv) {
  const n = pts.length >> 1; if (n < 3) return;
  let ymin = Infinity, ymax = -Infinity;
  for (let i = 0; i < n; i++) { const y = pts[2 * i + 1]; if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
  const y0 = Math.max(0, Math.floor(ymin)), y1 = Math.min(H - 1, Math.ceil(ymax));
  for (let y = y0; y <= y1; y++) {
    const sy = y + 0.5; _xs.length = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const yi = pts[2 * i + 1], yj = pts[2 * j + 1];
      if ((yi > sy) !== (yj > sy)) { const xi = pts[2 * i], xj = pts[2 * j]; _xs.push(xi + (sy - yi) * (xj - xi) / (yj - yi)); }
    }
    _xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < _xs.length; k += 2) {
      const a = Math.max(0, Math.ceil(_xs[k] - 0.5)), b = Math.min(W - 1, Math.floor(_xs[k + 1] - 0.5));
      if (lv === undefined || lv >= 1) { if (a <= b) buf.fill(c, y * W + a, y * W + b + 1); }
      else for (let x = a; x <= b; x++) if (bay(x, y) < lv) buf[y * W + x] = c;
    }
  }
}
// clip a segment to the screen (Liang-Barsky); returns null if outside
function clipSeg(x0, y0, x1, y1, m) {
  m = m || 2;
  let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0;
  const p = [-dx, dx, -dy, dy], q = [x0 + m, W + m - 1 - x0, y0 + m, H + m - 1 - y0];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return null; }
    else { const r = q[i] / p[i]; if (p[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; } }
  }
  return [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy];
}
function line(x0, y0, x1, y1, c, lv) {
  const s = clipSeg(x0, y0, x1, y1); if (!s) return;
  x0 = Math.floor(s[0]); y0 = Math.floor(s[1]); x1 = Math.floor(s[2]); y1 = Math.floor(s[3]);
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, err = dx + dy;
  for (let guard = 0; guard < 4000; guard++) {
    if (x0 >= 0 && x0 < W && y0 >= 0 && y0 < H && (lv === undefined || bay(x0, y0) < lv)) buf[y0 * W + x0] = c;
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function lineW(x0, y0, x1, y1, w, c, lv) {
  if (w <= 1.2) { line(x0, y0, x1, y1, c, lv); return; }
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / L * w / 2, ny = dx / L * w / 2;
  poly([x0 + nx, y0 + ny, x1 + nx, y1 + ny, x1 - nx, y1 - ny, x0 - nx, y0 - ny], c, lv);
}
function polyline(pts, c, lv) { for (let i = 0; i + 3 < pts.length; i += 2) line(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], c, lv); }
function dashLine(x0, y0, x1, y1, c, on, off, phase) {
  const L = Math.hypot(x1 - x0, y1 - y0); if (L < 0.5) return;
  const per = on + off; let s = -((phase || 0) % per);
  for (; s < L; s += per) {
    const a = Math.max(0, s), b = Math.min(L, s + on); if (b <= a) continue;
    line(lerp(x0, x1, a / L), lerp(y0, y1, a / L), lerp(x0, x1, b / L), lerp(y0, y1, b / L), c);
  }
}
// soft glow: a smooth radial blend toward c1 (and c2 in the core), no dither sparkle
function mixc(a, b, k) { // blend two packed colours, k in 0..1
  const ki = Math.round(clamp(k, 0, 1) * 256), kj = 256 - ki;
  return (0xff000000 | (((((a >>> 16) & 255) * kj + ((b >>> 16) & 255) * ki) >> 8) << 16) | (((((a >>> 8) & 255) * kj + ((b >>> 8) & 255) * ki) >> 8) << 8) | ((((a & 255) * kj + (b & 255) * ki) >> 8))) >>> 0;
}
function glow(cx, cy, r, c1, c2, lv) {
  lv = lv === undefined ? 1 : lv; if (lv <= 0 || r <= 0) return;
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r)), x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r; if (d >= 1) continue;
    const i = y * W + x, u = 1 - d;
    let c = mixc(buf[i], c1, 0.55 * lv * u * u);
    if (c2 !== undefined && c2 !== null && d < 0.35) c = mixc(c, c2, 0.5 * lv * (1 - d / 0.35));
    buf[i] = c;
  }
}
// blend a whole buffer into buf (k = weight of src) — smooth crossfades
function mixInto(dst, src, k) {
  if (k <= 0) return; const ki = Math.round(clamp(k, 0, 1) * 256), kj = 256 - ki;
  for (let i = 0; i < dst.length; i++) {
    const a = dst[i], b = src[i]; if (a === b) continue;
    dst[i] = (0xff000000 | (((((a >>> 16) & 255) * kj + ((b >>> 16) & 255) * ki) >> 8) << 16) | (((((a >>> 8) & 255) * kj + ((b >>> 8) & 255) * ki) >> 8) << 8) | ((((a & 255) * kj + (b & 255) * ki) >> 8))) >>> 0;
  }
}
// tint the whole frame toward colour c by k (a calm dim, no dither)
function tintAll(c, k) { if (k <= 0) return; for (let i = 0; i < buf.length; i++) buf[i] = mixc(buf[i], c, k); }
function darken(lv, x0, y0, x1, y1, c) { // dithered dim overlay
  rect(x0 === undefined ? 0 : x0, y0 === undefined ? 0 : y0, x1 === undefined ? W : x1, y1 === undefined ? H : y1, c === undefined ? P.K0 : c, lv);
}

// ---------------------------------------------------------------- masks
// Bounding-box masks for 16-bit style shading (outline, rim light, shadow)
class Mask {
  constructor(x0, y0, x1, y1) {
    this.x0 = Math.max(-2, Math.floor(x0) - 2); this.y0 = Math.max(-2, Math.floor(y0) - 2);
    this.x1 = Math.min(W + 2, Math.ceil(x1) + 2); this.y1 = Math.min(H + 2, Math.ceil(y1) + 2);
    this.w = Math.max(0, this.x1 - this.x0); this.h = Math.max(0, this.y1 - this.y0);
    this.d = new Uint8Array(this.w * this.h);
  }
  get(x, y) { x -= this.x0; y -= this.y0; return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : 0; }
  empty() { return this.w === 0 || this.h === 0; }
}
function maskFn(x0, y0, x1, y1, fn) { // fn(px+0.5, py+0.5) -> bool
  const m = new Mask(x0, y0, x1, y1);
  for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (fn(m.x0 + i + 0.5, m.y0 + j + 0.5)) m.d[j * m.w + i] = 1;
  return m;
}
function maskPoly(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]); }
  const m = new Mask(x0, y0, x1, y1); if (m.empty()) return m;
  const n = pts.length >> 1;
  for (let j = 0; j < m.h; j++) {
    const sy = m.y0 + j + 0.5; _xs.length = 0;
    for (let i = 0, k = n - 1; i < n; k = i++) {
      const yi = pts[2 * i + 1], yk = pts[2 * k + 1];
      if ((yi > sy) !== (yk > sy)) { const xi = pts[2 * i], xk = pts[2 * k]; _xs.push(xi + (sy - yi) * (xk - xi) / (yk - yi)); }
    }
    _xs.sort((a, b) => a - b);
    for (let q = 0; q + 1 < _xs.length; q += 2) {
      const a = Math.max(0, Math.ceil(_xs[q] - 0.5 - m.x0)), b = Math.min(m.w - 1, Math.floor(_xs[q + 1] - 0.5 - m.x0));
      for (let i = a; i <= b; i++) m.d[j * m.w + i] = 1;
    }
  }
  return m;
}
function _span(m, j, xa, xb) { // fill pixels whose centres lie in [xa, xb] on mask row j
  const a = Math.max(0, Math.ceil(xa - 0.5 - m.x0)), b = Math.min(m.w - 1, Math.floor(xb - 0.5 - m.x0));
  if (a <= b) m.d.fill(1, j * m.w + a, j * m.w + b + 1);
}
function maskDisc(cx, cy, r) {
  const m = new Mask(cx - r, cy - r, cx + r, cy + r);
  for (let j = 0; j < m.h; j++) { const dy = m.y0 + j + 0.5 - cy, h = r * r - dy * dy; if (h < 0) continue; const s = Math.sqrt(h); _span(m, j, cx - s, cx + s); }
  return m;
}
function maskEll(cx, cy, rx, ry, rot) {
  const R = Math.max(rx, ry), c = Math.cos(rot || 0), s = Math.sin(rot || 0);
  const m = new Mask(cx - R, cy - R, cx + R, cy + R);
  const A = c * c / (rx * rx) + s * s / (ry * ry), Bk = 2 * (c * s / (rx * rx) - s * c / (ry * ry)), Ck = s * s / (rx * rx) + c * c / (ry * ry);
  for (let j = 0; j < m.h; j++) {
    const dy = m.y0 + j + 0.5 - cy, B = Bk * dy, C = Ck * dy * dy - 1, disc_ = B * B - 4 * A * C;
    if (disc_ < 0) continue; const q = Math.sqrt(disc_);
    _span(m, j, cx + (-B - q) / (2 * A), cx + (-B + q) / (2 * A));
  }
  return m;
}
function maskRR(x0, y0, x1, y1, r) { // rounded rect
  r = Math.max(0, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2));
  const m = new Mask(x0, y0, x1, y1);
  for (let j = 0; j < m.h; j++) {
    const y = m.y0 + j + 0.5; if (y < y0 || y > y1) continue;
    const qy = Math.max(y0 + r - y, 0, y - (y1 - r));
    if (qy > r) continue;
    const dx = r - Math.sqrt(Math.max(0, r * r - qy * qy));
    _span(m, j, x0 + dx, x1 - dx);
  }
  return m;
}
function mFill(m, c, lv, clip) {
  for (let j = 0; j < m.h; j++) {
    const y = m.y0 + j; if (y < 0 || y >= H) continue;
    for (let i = 0; i < m.w; i++) {
      if (!m.d[j * m.w + i]) continue; const x = m.x0 + i; if (x < 0 || x >= W) continue;
      if (clip && !clip(x, y)) continue;
      if (lv === undefined || lv >= 1 || bay(x, y) < lv) buf[y * W + x] = c;
    }
  }
}
// pixels of m whose neighbour at (x-dx, y-dy) is outside m (the edge facing -dx,-dy)
function mRim(m, c, dx, dy, lv) {
  for (let j = 0; j < m.h; j++) {
    const y = m.y0 + j; if (y < 0 || y >= H) continue;
    for (let i = 0; i < m.w; i++) {
      if (!m.d[j * m.w + i]) continue; const x = m.x0 + i; if (x < 0 || x >= W) continue;
      const ii = i - dx, jj = j - dy;
      const inside = ii >= 0 && jj >= 0 && ii < m.w && jj < m.h && m.d[jj * m.w + ii];
      if (!inside && (lv === undefined || bay(x, y) < lv)) buf[y * W + x] = c;
    }
  }
}
function mOutline(m, c) { // inner 4-neighbour outline
  for (let j = 0; j < m.h; j++) {
    const y = m.y0 + j; if (y < 0 || y >= H) continue;
    for (let i = 0; i < m.w; i++) {
      if (!m.d[j * m.w + i]) continue; const x = m.x0 + i; if (x < 0 || x >= W) continue;
      const e = (i === 0 || !m.d[j * m.w + i - 1]) || (i === m.w - 1 || !m.d[j * m.w + i + 1]) || (j === 0 || !m.d[(j - 1) * m.w + i]) || (j === m.h - 1 || !m.d[(j + 1) * m.w + i]);
      if (e) buf[y * W + x] = c;
    }
  }
}
function mOuter(m, c) { // outer 4-neighbour outline (1 px outside the shape)
  for (let j = 0; j < m.h; j++) {
    const y = m.y0 + j; if (y < 0 || y >= H) continue;
    for (let i = 0; i < m.w; i++) {
      if (m.d[j * m.w + i]) continue; const x = m.x0 + i; if (x < 0 || x >= W) continue;
      const e = (i > 0 && m.d[j * m.w + i - 1]) || (i < m.w - 1 && m.d[j * m.w + i + 1]) || (j > 0 && m.d[(j - 1) * m.w + i]) || (j < m.h - 1 && m.d[(j + 1) * m.w + i]);
      if (e) buf[y * W + x] = c;
    }
  }
}
// standard 16-bit shading: base, light rim top-left, shadow rim bottom-right, outline
function shade(m, base, hi, lo, ol, opt) {
  opt = opt || {};
  mFill(m, base, opt.lv, opt.clip);
  const k = opt.k || 1;
  if (lo !== null && lo !== undefined) for (let s = 1; s <= k; s++) mRim(m, lo, -s, -s);
  if (hi !== null && hi !== undefined) for (let s = 1; s <= (opt.kh || k); s++) mRim(m, hi, s, s);
  if (ol !== null && ol !== undefined) { if (opt.outer) mOuter(m, ol); else mOutline(m, ol); }
}

// ---------------------------------------------------------------- camera
class Cam {
  constructor(cx, cy, z, ax, ay) { this.cx = cx; this.cy = cy; this.z = z; this.ax = ax === undefined ? CX : ax; this.ay = ay === undefined ? CY : ay; }
  x(wx) { return (wx - this.cx) * this.z + this.ax; }
  y(wy) { return (wy - this.cy) * this.z + this.ay; }
  s(v) { return v * this.z; }
  wx(sx) { return (sx - this.ax) / this.z + this.cx; }
  wy(sy) { return (sy - this.ay) / this.z + this.cy; }
  pts(arr) { const o = new Array(arr.length); for (let i = 0; i < arr.length; i += 2) { o[i] = this.x(arr[i]); o[i + 1] = this.y(arr[i + 1]); } return o; }
}
// keyframe track: [[t, cx, cy, z, easeFn?], ...] with log-zoom interpolation
function camTrack(keys, t, ax, ay) {
  if (t <= keys[0][0]) { const k = keys[0]; return new Cam(k[1], k[2], k[3], ax, ay); }
  for (let i = 0; i + 1 < keys.length; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) {
      const e = b[4] || K75; const f = e(seg(t, a[0], b[0]));
      const z = Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), f));
      // zoom-aware centre blend: keep motion even across big zoom changes
      let g = f;
      if (Math.abs(Math.log(b[3] / a[3])) > 0.2) { const za = a[3], zb = b[3]; g = (1 / za - 1 / z) / (1 / za - 1 / zb); g = clamp(g, 0, 1); }
      return new Cam(lerp(a[1], b[1], g), lerp(a[2], b[2], g), z, ax, ay);
    }
  }
  const k = keys[keys.length - 1]; return new Cam(k[1], k[2], k[3], ax, ay);
}

// ---------------------------------------------------------------- buffers
function withBuffer(target, fn) { const old = buf; buf = target; try { fn(); } finally { buf = old; } }
function copyBuf(dst, src) { dst.set(src); }
// dithered dissolve: show b where bayer < k
function dissolve(a, b, k, out) {
  out = out || buf;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; out[i] = bay(x, y) < k ? b[i] : a[i]; }
}


// draw fn at opacity lv (a smooth see-through / fade); TMP2 keeps the pixels underneath
function withDither(lv, fn) {
  if (lv >= 1) { fn(); return; }
  if (lv <= 0) return;
  TMP2.set(buf);
  fn();
  const ki = Math.round(lv * 256), kj = 256 - ki;
  for (let i = 0; i < buf.length; i++) {
    const a = TMP2[i], b = buf[i]; if (a === b) continue;
    buf[i] = (0xff000000 | (((((a >>> 16) & 255) * kj + ((b >>> 16) & 255) * ki) >> 8) << 16) | (((((a >>> 8) & 255) * kj + ((b >>> 8) & 255) * ki) >> 8) << 8) | ((((a & 255) * kj + (b & 255) * ki) >> 8))) >>> 0;
  }
}
// a translucent box (for labels over busy pictures)
function tintRect(x0, y0, x1, y1, c, k) {
  const a = Math.max(0, Math.round(x0)), b = Math.min(W, Math.round(x1)), p = Math.max(0, Math.round(y0)), q = Math.min(H, Math.round(y1));
  for (let y = p; y < q; y++) for (let x = a; x < b; x++) { const i = y * W + x; buf[i] = mixc(buf[i], c, k); }
}
