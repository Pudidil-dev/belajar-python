'use strict';
// ============================================================================
// AMOXICILLIN 8-bit — core: pixel buffer, palette, rasterisers, masks, easing, camera.
// 2D pixel art: everything draws into one 360x640 Uint32 buffer (crisp pixels,
// no anti-aliasing), shown 3x nearest-neighbour (1080x1920) by the player / export.
// W, H and buf can be swapped temporarily (withCanvas) to draw a world into a
// larger square buffer, e.g. for a camera roll.
// ============================================================================
const FPS = 60, DUR = 60, NF = 3600;
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
  // ground: deep charcoal navy (hue below 222 deg, out of the blue-purple band); the objects on it are bright and saturated
  K0: '#070B14', BG: '#0E1626', N1: '#132036', N2: '#192A44', N3: '#213655', N4: '#2B4568', N5: '#38577E',
  // peptidoglycan (bright turquoise to cyan), the membrane (turquoise, a deeper green-blue)
  PG0: '#083C46', PG1: '#0C6874', PG2: '#14A0AA', PG3: '#2CDCE0', PG4: '#8CF6F4', PG5: '#E2FFFE',
  MB0: '#05343A', MB1: '#0A5458', MB2: '#128078', MB3: '#22B4A4', MB4: '#7CEAD4',
  // the glycan backbone: GlcNAc (teal-green) and MurNAc (light sky cyan)
  GT0: '#063F3A', GT1: '#0D6E62', GT2: '#16A08C', GT3: '#2ED2B2', GT4: '#92F4DA',
  GC0: '#145E7A', GC1: '#238FB8', GC2: '#52C8F2', GC3: '#A6EAFF', GC4: '#E6FAFF',
  // peptide stems (golden yellow)
  PE0: '#5A3C06', PE1: '#9E720E', PE2: '#D8A61E', PE3: '#FFD040', PE4: '#FFEC9C',
  // the penicillin-binding protein (purple) and amoxicillin (amber-orange, solid, never glowing)
  PB0: '#250E3C', PB1: '#461C6E', PB2: '#6C30A4', PB3: '#9650D8', PB4: '#BE86F6', PB5: '#E6C8FF',
  AM0: '#5C2204', AM1: '#A2460A', AM2: '#E26C14', AM3: '#FF982A', AM4: '#FFC468', AM5: '#FFE8BC',
  // cytoplasm (green), damage (red-orange)
  CP0: '#06200E', CP1: '#0B3418', CP2: '#124E24', CP3: '#1B7032', CP4: '#34A04C', CP5: '#86DA86',
  DM0: '#5C1206', DM1: '#A2220C', DM2: '#E43C1A', DM3: '#FF6838', DM4: '#FFA678',
  // other enzymes: Mur ligases (lime), membrane enzymes and the glycan builder (steel blue), wall hydrolases (rose)
  EG0: '#243C08', EG1: '#46700E', EG2: '#72A41C', EG3: '#A6D23A', EG4: '#DAF290',
  ES0: '#142640', ES1: '#24456E', ES2: '#3C6CA4', ES3: '#6898D4', ES4: '#AED0F6',
  EH0: '#4E1430', EH1: '#88244E', EH2: '#C43E74', EH3: '#EE6EA0', EH4: '#FFB0CE',
  // the lipid carrier (olive), phosphate (pale), the nucleotide handle (neutral grey)
  LP0: '#363008', LP1: '#665A12', LP2: '#A49428', LP3: '#DCCC5A', PH0: '#8C8270', PH1: '#C8BEA6', PH2: '#F6F0DE',
  NU0: '#4E4A46', NU1: '#807A72', NU2: '#B4ACA0', NU3: '#E6DED2',
  // the body: skin (glass), mucosa and gut (pink-red), blood, red cells, the capsule's cream half, collagen, tissue fluid
  SK0: '#5A2E22', SK1: '#9A5640', SK2: '#D08664', SK3: '#F2B48E', SK4: '#FFD8BE',
  MU0: '#4A0E1E', MU1: '#841E3A', MU2: '#BE3656', MU3: '#E85E78', MU4: '#FA96A6', MU5: '#FFCCD2',
  AR0: '#480E18', AR1: '#7C1A28', AR2: '#B42A38', AR3: '#E84A52', AR4: '#FC8078', AR5: '#FFBCAC',
  BL0: '#300810', BL1: '#56101E', BL2: '#80182A', BL3: '#AA2436',
  CR0: '#806E48', CR1: '#C0AA78', CR2: '#ECDCAE', CR3: '#FFF6DC',
  CO0: '#3A2026', CO1: '#5E3842', CO2: '#8E5862', CO3: '#BE8A8A',
  FL0: '#10282E', FL1: '#1C424A', FL2: '#2E646A', FL3: '#4E9090',
  // neutral greys, shadow, ink
  G0: '#07090C', G1: '#15191E', G2: '#262B31', G3: '#3A4047', G4: '#535A61', G5: '#727980', G6: '#969DA2', G7: '#BCC2C4', G8: '#F2FAF8',
  SH: '#02050C', INK: '#F4F8FF',
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
