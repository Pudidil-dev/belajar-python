'use strict';
// ============================================================================
// CORONARY STENT 8-bit — core: pixel buffer, palette, rasterizers, masks, easing, text.
// Everything draws into one 270x480 Uint32 buffer (crisp pixels, no AA).
// The buffer is shown 4x nearest-neighbour (1080x1920) by the player/export.
// ============================================================================
const W = 270, H = 480, FPS = 60, DUR = 55, NF = 3300;
const CX = 135, CY = 240;
let buf = new Uint32Array(W * H);
const SPARE = [new Uint32Array(W * H), new Uint32Array(W * H), new Uint32Array(W * H), new Uint32Array(W * H)];
const CHAINBUF = SPARE[0], FEEDBUF = SPARE[1], TRANSBUF = SPARE[2], TMPBUF = SPARE[3];

function hexc(h) {
  const n = parseInt(h.slice(1), 16);
  return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
}
const P = {};
const PAL_HEX = {
  // ground (dark navy, #0B1020 from the brief)
  K0: '#04060D', BG: '#0B1020', N1: '#10172C', N2: '#161F3A', N3: '#1E2949', N4: '#29375E', N5: '#3A4B7C', N6: '#53679A',
  // machine casing ramp around #CAD2DE
  C0: '#252B37', C1: '#465064', C2: '#6E7A8E', C3: '#9AA5B7', C4: '#CAD2DE', C5: '#E5EAF1', C6: '#FFFFFF',
  // tungsten ramp around #919AA8
  T0: '#272C35', T1: '#454C59', T2: '#676F7E', T3: '#919AA8', T4: '#B6BEC9', T5: '#DCE1E8',
  // primary electrons #35D9FF
  E0: '#0A324C', E1: '#116C96', E2: '#35D9FF', E3: '#BDF5FF',
  // secondary electrons #A7E7FF
  S0: '#22445A', S1: '#5D9BBA', S2: '#A7E7FF', S3: '#E9FAFF',
  // X-ray photons #FFD65A
  Y0: '#4A380D', Y1: '#A47C1C', Y2: '#FFD65A', Y3: '#FFF3C2',
  // RF fields #A579FF
  V0: '#22154C', V1: '#4C339C', V2: '#A579FF', V3: '#DDCCFF',
  // tumor coral #F26676
  R0: '#3C101A', R1: '#7C2332', R2: '#BC4154', R3: '#F26676', R4: '#FFA8B0',
  // water #75BFE8
  W0: '#13324B', W1: '#326E9A', W2: '#75BFE8', W3: '#C5E8FA',
  // hydroxyl radicals #FF9B4A
  O0: '#4C230A', O1: '#A8531A', O2: '#FF9B4A', O3: '#FFD4A9',
  // DNA ivory + lavender
  I0: '#4E4A3F', I1: '#9B9580', I2: '#EDE6D0', I3: '#FFFCF1',
  L0: '#33295A', L1: '#6C5EA4', L2: '#B9A8E8', L3: '#E5DBFF',
  // dose map blue -> amber -> warm red
  D0: '#1C2D74', D1: '#3365CE', D2: '#E8A83B', D3: '#EC7E3A', D4: '#E3453E',
  // alignment lasers / status lights (green, used only for these)
  G0: '#0B4325', G1: '#1D9A4F', G2: '#5CFF8A', G3: '#CCFFDB',
  A0: '#5A3D0E', A1: '#B07A1E', A2: '#E8A83B',
  // anatomy (muted so coral + dose read first)
  SK0: '#2E1F28', SK1: '#7E5A55', SK2: '#B68A78', SK3: '#D9AF98',
  MU0: '#3A2A3E', MU1: '#55405A', MU2: '#6C5372',
  LU0: '#161D38', LU1: '#202A4D', LU2: '#2C3964', LU3: '#3C4C80',
  HE0: '#3E1D33', HE1: '#5E2B48', HE2: '#7E3C5E',
  BO0: '#6F6C64', BO1: '#B3B0A5', BO2: '#DCDACF',
  CO1: '#C9AE86',
  // healthy cells (cool neutral)
  HC0: '#232C47', HC1: '#36446A', HC2: '#4B5C8A', HC3: '#6D80B0',
  // hot filament (dull red, gun only)
  HF1: '#7A2E22', HF2: '#C2553A', HF3: '#F29A6E',
  // CT greys
  CT0: '#06080E', CT1: '#141824', CT2: '#2A303D', CT3: '#4C5363', CT4: '#7E8595', CT5: '#A3AAB8', CT6: '#E2E6EE',
  INK: '#F4F7FB', SUB: '#A9B3C5', SH: '#03050A',
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
// Kurzgesagt-style pixel glow: stacked dithered discs in darker tints
function glow(cx, cy, r, c1, c2, lv) {
  lv = lv === undefined ? 1 : lv; if (lv <= 0 || r <= 0) return;
  disc(cx, cy, r, c1, 0.28 * lv);
  disc(cx, cy, r * 0.62, c1, 0.55 * lv);
  if (c2 !== undefined && c2 !== null) disc(cx, cy, r * 0.32, c2, 0.6 * lv);
}
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

// ---------------------------------------------------------------- fonts
function mkFont(h, defs, spaceW) {
  const g = {};
  for (const ch in defs) {
    const rows = defs[ch].split('/');
    const w = rows[0].length;
    const bits = rows.map(r => { let v = 0; for (let i = 0; i < r.length; i++) if (r[i] === '#') v |= 1 << i; return v; });
    g[ch] = { w, bits };
  }
  g[' '] = { w: spaceW, bits: new Array(h).fill(0) };
  return { h, g };
}
// Label font: 7-row condensed caps (drawn at 2x -> 56 px cap height on export)
const FL = mkFont(7, {
  A: '.##./#..#/#..#/####/#..#/#..#/#..#', B: '###./#..#/#..#/###./#..#/#..#/###.', C: '.##./#..#/#.../#.../#.../#..#/.##.',
  D: '###./#..#/#..#/#..#/#..#/#..#/###.', E: '####/#.../#.../###./#.../#.../####', F: '####/#.../#.../###./#.../#.../#...',
  G: '.##./#..#/#.../#.##/#..#/#..#/.###', H: '#..#/#..#/#..#/####/#..#/#..#/#..#', I: '###/.#./.#./.#./.#./.#./###',
  J: '...#/...#/...#/...#/#..#/#..#/.##.', K: '#..#/#..#/#.#./##../#.#./#..#/#..#', L: '#.../#.../#.../#.../#.../#.../####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#', N: '#..#/##.#/##.#/#.##/#.##/#..#/#..#', O: '.##./#..#/#..#/#..#/#..#/#..#/.##.',
  P: '###./#..#/#..#/###./#.../#.../#...', Q: '.##./#..#/#..#/#..#/#..#/#.#./.#.#', R: '###./#..#/#..#/###./#.#./#..#/#..#',
  S: '.##./#..#/#.../.##./...#/#..#/.##.', T: '#####/..#../..#../..#../..#../..#../..#..', U: '#..#/#..#/#..#/#..#/#..#/#..#/.##.',
  V: '#...#/#...#/#...#/#...#/.#.#./.#.#./..#..', W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#', X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..', Z: '#####/....#/...#./..#../.#.../#..../#####',
  0: '.##./#..#/#..#/#..#/#..#/#..#/.##.', 1: '.#./##./.#./.#./.#./.#./###', 2: '.##./#..#/...#/..#./.#../#.../####',
  3: '###./...#/...#/.##./...#/...#/###.', 4: '..#./.##./#.#./#.#./####/..#./..#.', 5: '####/#.../###./...#/...#/#..#/.##.',
  6: '.##./#.../#.../###./#..#/#..#/.##.', 7: '####/...#/..#./..#./.#../.#../.#..', 8: '.##./#..#/#..#/.##./#..#/#..#/.##.',
  9: '.##./#..#/#..#/.###/...#/...#/.##.',
  ',': '../../../../../.#/#.', '-': '.../.../.../###/.../.../...',
  '?': '.##./#..#/...#/..#./.#../..../.#..', '!': '#/#/#/#/#/./#', '(': '.#/#./#./#./#./#./.#', ')': '#./.#/.#/.#/.#/.#/#.',
  '/': '..#/..#/.#./.#./.#./#../#..', "'": '#/#/./././././.', '•': '../../##/##/../../..',
  '^': '..#../.###./#.#.#/..#../..#../..#../..#..', '>': '...../..#../...#./#####/...#./..#../.....', '+': '.../.../.#./###/.#./.../...',
  k: '#.../#.../#..#/#.#./##../#.#./#..#',
}, 2);
FL.g['.'] = { w: 1, bits: [0, 0, 0, 0, 0, 0, 1] };
FL.g[':'] = { w: 1, bits: [0, 0, 1, 0, 0, 1, 0] };
// Micro font: 5-row caps (2x -> 40 px)
const FM = mkFont(5, {
  A: '.##./#..#/####/#..#/#..#', B: '###./#..#/###./#..#/###.', C: '.###/#.../#.../#.../.###', D: '###./#..#/#..#/#..#/###.',
  E: '####/#.../###./#.../####', F: '####/#.../###./#.../#...', G: '.###/#.../#.##/#..#/.###', H: '#..#/#..#/####/#..#/#..#',
  I: '###/.#./.#./.#./###', J: '...#/...#/...#/#..#/.##.', K: '#..#/#.#./##../#.#./#..#', L: '#.../#.../#.../#.../####',
  M: '#...#/##.##/#.#.#/#...#/#...#', N: '#..#/##.#/#.##/#..#/#..#', O: '.##./#..#/#..#/#..#/.##.', P: '###./#..#/###./#.../#...',
  Q: '.##./#..#/#..#/#.#./.#.#', R: '###./#..#/###./#.#./#..#', S: '.###/#.../.##./...#/###.', T: '###/.#./.#./.#./.#.',
  U: '#..#/#..#/#..#/#..#/.##.', V: '#...#/#...#/.#.#./.#.#./..#..', W: '#...#/#...#/#.#.#/##.##/#...#', X: '#.#/#.#/.#./#.#/#.#',
  Y: '#.#/#.#/.#./.#./.#.', Z: '####/...#/.##./#.../####',
  0: '###/#.#/#.#/#.#/###', 1: '.#./##./.#./.#./###', 2: '##./..#/.#./#../###', 3: '##./..#/.#./..#/##.', 4: '#.#/#.#/###/..#/..#',
  5: '###/#../##./..#/##.', 6: '.##/#../###/#.#/###', 7: '###/..#/.#./.#./.#.', 8: '###/#.#/###/#.#/###', 9: '###/#.#/###/..#/##.',
  ',': '../../../.#/#.', '-': '.../.../###/.../...', '?': '##./..#/.#./.../.#.', '(': '.#/#./#./#./.#', ')': '#./.#/.#/.#/#.',
  '/': '..#/.#./.#./.#./#..', "'": '#/#/./././', '!': '#/#/#/./#', '^': '.#./###/.#./.#./.#.', '>': '..#./...#/####/...#/..#.',
  '+': '.../.#./###/.#./...', '•': '../##/##/../..', k: '#.../#.#./##../#.#./#..#',
}, 2);
FM.g['.'] = { w: 1, bits: [0, 0, 0, 0, 1] };
FM.g[':'] = { w: 1, bits: [0, 1, 0, 1, 0] };
FM.g["'"] = { w: 1, bits: [1, 1, 0, 0, 0] };
// Title font: 9-row caps (2x + fake bold -> 72 px)
const FT = mkFont(9, {
  H: '#...#/#...#/#...#/#...#/#####/#...#/#...#/#...#/#...#', O: '.###./#...#/#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  W: '#.....#/#.....#/#.....#/#.....#/#..#..#/#..#..#/#.#.#.#/##...##/#.....#', M: '#.....#/##...##/#.#.#.#/#..#..#/#.....#/#.....#/#.....#/#.....#/#.....#',
  E: '####/#.../#.../#.../###./#.../#.../#.../####', D: '####./#...#/#...#/#...#/#...#/#...#/#...#/#...#/####.',
  I: '###/.#./.#./.#./.#./.#./.#./.#./###', C: '.###./#...#/#..../#..../#..../#..../#..../#...#/.###.',
  A: '.###./#...#/#...#/#...#/#####/#...#/#...#/#...#/#...#', L: '#.../#.../#.../#.../#.../#.../#.../#.../####',
  N: '#...#/##..#/##..#/#.#.#/#.#.#/#.#.#/#..##/#..##/#...#', R: '####./#...#/#...#/#...#/####./#.#../#..#./#...#/#...#',
  T: '#####/..#../..#../..#../..#../..#../..#../..#../..#..', S: '.###./#...#/#..../#..../.###./....#/....#/#...#/.###.',
  K: '#...#/#..#./#.#../##.../##.../#.#../#..#./#...#/#...#',
  Y: '#...#/#...#/.#.#./.#.#./..#../..#../..#../..#../..#..',
}, 2);

function glyphOf(f, ch) { return f.g[ch] || f.g[ch.toUpperCase()] || f.g['?'] || f.g[' ']; }
function textW(f, s, sc, bold) {
  sc = sc || 2; let w = 0;
  for (let i = 0; i < s.length; i++) { w += glyphOf(f, s[i]).w; if (i < s.length - 1) w += 1; }
  return w * sc + (bold ? 1 : 0);
}
// draw text; returns width. opt: {sc, c, ol, n (chars shown), bold, align, shadow}
function text(f, s, x, y, opt) {
  opt = opt || {};
  const sc = opt.sc || 2, c = opt.c === undefined ? P.INK : opt.c, ol = opt.ol === undefined ? P.SH : opt.ol;
  const bold = opt.bold ? 1 : 0, n = opt.n === undefined ? s.length : Math.floor(opt.n);
  const tw = textW(f, s, sc, bold);
  if (opt.align === 'center') x -= tw / 2; else if (opt.align === 'right') x -= tw;
  x = Math.round(x); y = Math.round(y);
  const passes = [];
  if (opt.shadow !== undefined && opt.shadow !== null) passes.push([opt.shadow, 1, 1, opt.sd || 1]);
  if (ol !== null) passes.push([ol, 1, 0, 0]);
  passes.push([c, 0, 0, 0]);
  for (const [col, grow, isSh, sd] of passes) {
    let cx = x;
    for (let i = 0; i < s.length && i < n; i++) {
      const g = glyphOf(f, s[i]);
      for (let r = 0; r < f.h; r++) {
        const bits = g.bits[r]; if (!bits) continue;
        for (let k = 0; k < g.w; k++) if (bits & (1 << k)) {
          const px = cx + k * sc, py = y + r * sc;
          if (isSh) rect(px + sd, py + sd, px + sc + bold + sd, py + sc + sd, col);
          else if (grow) rect(px - 1, py - 1, px + sc + bold + 1, py + sc + 1, col);
          else rect(px, py, px + sc + bold, py + sc, col);
        }
      }
      cx += (g.w + 1) * sc;
    }
  }
  return tw;
}
function wrap(f, s, maxW, sc) {
  const words = s.split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (textW(f, t, sc) <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } }
  if (cur) lines.push(cur); return lines;
}
