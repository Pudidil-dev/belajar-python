// FX — particles, glows and screen-space effects, drawn in screen pixels so they stay hard-edged at every zoom.
// (Inherited from the X-ray and quantum films; this film uses the glows, spotlight, fades, rings and wave packets.)
(() => {
const { P, W, H } = PIX;
const FX = window.FX = {};
const h = U.hash, TAU = U.TAU, clamp = U.clamp, lerp = U.lerp;
const R = (c, x, y, w, hh, col) => { c.fillStyle = P[col] || col; c.fillRect(x, y, w, hh); };
const inScreen = (x, y, m = 20) => x > -m && y > -m && x < W + m && y < H + m;

// ---------- electron: s = 1 (plus), 2 (4×4 rounded), 3 (5×5 with glow) ----------
FX.e = (c, sx, sy, s = 2, a = 1, hot = false) => {
  if (a <= 0 || !inScreen(sx, sy)) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a;
  const x = Math.round(sx), y = Math.round(sy);
  if (s <= 1) { R(c, x - 1, y, 3, 1, 'c2'); R(c, x, y - 1, 1, 3, 'c2'); R(c, x, y, 1, 1, 'c3'); }
  else if (s === 2) { R(c, x - 2, y - 3, 4, 6, 'k'); R(c, x - 3, y - 2, 6, 4, 'k'); R(c, x - 1, y - 2, 2, 4, 'c2'); R(c, x - 2, y - 1, 4, 2, 'c2'); R(c, x - 1, y - 1, 2, 2, 'c3'); if (hot) R(c, x - 1, y - 1, 1, 1, 'w'); }
  else {
    R(c, x - 3, y - 2, 7, 5, 'k'); R(c, x - 2, y - 3, 5, 7, 'k');
    c.globalAlpha = a * 0.55; R(c, x - 3, y - 1, 7, 3, 'c1'); R(c, x - 1, y - 3, 3, 7, 'c1'); R(c, x - 2, y - 2, 5, 5, 'c1');
    c.globalAlpha = a; R(c, x - 2, y - 1, 5, 3, 'c2'); R(c, x - 1, y - 2, 3, 5, 'c2'); R(c, x - 1, y - 1, 3, 3, 'c3'); R(c, x, y, 1, 1, 'w');
  }
  c.restore();
};
// trail: pts = screen points, newest first. Bright near the particle, fading to dark teal.
FX.trail = (c, pts, a = 1, cols = ['c2', 'c1', 'c1', 'c0', 'c0']) => {
  if (pts.length < 2 || a <= 0) return;
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  if (L < 1) return;
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    const q = d / L, col = cols[Math.min(cols.length - 1, Math.floor(q * cols.length))];
    c.save(); c.globalAlpha = a; PIX.bline(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col, q > 0.7 ? 1 : 0); c.restore();
    d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
};

// ---------- X-ray photon: a violet wave packet moving along ang. lam = wavelength (px), len = half length (px) ----------
FX.ph = (c, sx, sy, ang, lam = 6, len = 12, amp = 3, a = 1, ramp = ['y0', 'y1', 'y2', 'y3']) => {
  if (a <= 0 || !inScreen(sx, sy, len + 8)) return;
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  // faint halo first (sparse dither), then the wave line
  for (let s = -len; s <= len; s += 1) {
    const e = Math.exp(-Math.pow(s / (len * 0.62), 2));
    if (e < 0.25) continue;
    for (const o of [-amp - 1, amp + 1]) {
      const x = Math.round(sx + dx * s + nx * o * e), y = Math.round(sy + dy * s + ny * o * e);
      if (e * a * 0.6 > K.BAY(x, y)) R(c, x, y, 1, 1, ramp[0]);
    }
  }
  const px_ = [];
  for (let s = -len; s <= len; s += 0.5) {
    const e = Math.exp(-Math.pow(s / (len * 0.55), 2)), off = amp * e * Math.sin(TAU * s / lam);
    const x = Math.round(sx + dx * s + nx * off), y = Math.round(sy + dy * s + ny * off);
    const v = e * a, col = v > 0.72 ? ramp[3] : v > 0.38 ? ramp[2] : v > 0.14 ? ramp[1] : null;
    if (col) px_.push([x, y, col]);
  }
  if (a > 0.3) for (const [x, y] of px_) R(c, x - 1, y - 1, 3, 3, 'k');
  for (const [x, y, col] of px_) R(c, x, y, 1, 1, col);
  const tx = Math.round(sx + dx * len * 0.55), ty = Math.round(sy + dy * len * 0.55);   // bright leading crest
  if (a > 0.5) R(c, tx, ty, 1, 1, 'w');
  c.restore();
};
// photon wavelength (px) for an energy in keV: higher energy → shorter wave (λ = 1.24/E nm); kept readable on screen
FX.lamFor = (keV, k = 1) => Math.max(2.6, 90 / Math.sqrt(keV * 6.5 + 4) * k);

// ---------- nucleus: packed protons (orange) and neutrons (darker) ----------
FX.nuc = (c, sx, sy, r, seed = 1, a = 1, hot = 0) => {
  if (a <= 0 || !inScreen(sx, sy, r + 4)) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a;
  const x = Math.round(sx), y = Math.round(sy);
  if (r < 2.6) {
    R(c, x - 1, y - 1, 3, 3, 'r1'); R(c, x - 1, y - 1, 2, 2, 'r2'); R(c, x - 1, y - 1, 1, 1, 'r3');
    c.restore(); return;
  }
  const rn = Math.max(1.4, r * 0.27), n = Math.max(5, Math.min(60, Math.round(0.86 * (r / rn) * (r / rn))));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const q = Math.sqrt((i + 0.5) / n) * (r - rn * 0.9), an = i * 2.39996 + seed;
    pts.push([sx + Math.cos(an) * q, sy + Math.sin(an) * q * 0.96, h(i, seed) < 0.42 ? 1 : 0]);   // 74 p : 110 n ≈ 0.4
  }
  pts.sort((p, q) => (p[0] + p[1]) - (q[0] + q[1]));                // light from the upper left
  for (const [px, py, isP] of pts) {
    const rr = rn * 1.08;
    c.fillStyle = P[isP ? 'r1' : 'g5']; c.beginPath(); c.arc(Math.round(px * 2) / 2, Math.round(py * 2) / 2, rr, 0, TAU); c.fill();
    c.fillStyle = P[isP ? 'r2' : 'g7']; c.beginPath(); c.arc(Math.round(px * 2) / 2 - rr * 0.25, Math.round(py * 2) / 2 - rr * 0.25, rr * 0.72, 0, TAU); c.fill();
    if (rr > 1.6) R(c, Math.round(px - rr * 0.5), Math.round(py - rr * 0.5), 1, 1, isP ? 'r3' : 'g9');
  }
  if (hot > 0) { c.restore(); FX.glowL(c, sx, sy, r * 2.2, ['r1', 'r2', 'u1'], 0.5 * hot); return; }
  c.restore();
};

// ---------- electron cloud of an atom (per pixel, into an ImageData) ----------
// shells: [[radius fraction, width fraction, weight], …]; the density is drawn as a shimmering golden stipple.
const SHELLS_W = [[0.10, 0.06, 1.0], [0.24, 0.08, 0.85], [0.43, 0.11, 0.7], [0.66, 0.14, 0.5], [0.88, 0.13, 0.3]];
const RAMP = { y: ['y0', 'y1', 'y2', 'y3'], r: ['r1', 'r2', 'u1', 'u2'], d: ['g2', 'g3', 'g5', 'g7'], w: ['g2', 'g4', 'g6', 'g8'], c: ['c0', 'c1', 'c2', 'c3'], b: ['q1', 'q3', 'q4', 'q6'] };
FX.cloud = (img, sx, sy, Rr, t, o = {}) => {
  const shells = o.shells || SHELLS_W, gain = o.gain ?? 1, ramp = (RAMP[o.ramp || 'y']).map(K.rgb), d = img.data;
  const x0 = Math.max(0, Math.floor(sx - Rr * 1.1)), x1 = Math.min(W - 1, Math.ceil(sx + Rr * 1.1));
  const y0 = Math.max(0, Math.floor(sy - Rr * 1.1)), y1 = Math.min(H - 1, Math.ceil(sy + Rr * 1.1));
  const sc = o.grain ?? 0.45, seed = o.seed || 0, sh = o.shimmer ?? 1.6;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const r = Math.hypot(x - sx, y - sy) / Rr;
    if (r > 1.08) continue;
    let rho = 0;
    for (const [rc, w, a] of shells) { const q = (r - rc) / w; rho += a * Math.exp(-q * q); }
    rho *= gain * (1 - U.ss(0.86, 1.08, r));
    if (o.hole) { const q = Math.hypot(x - o.hole[0], y - o.hole[1]) / o.hole[2]; rho *= U.ss(0.55, 1.1, q); }
    if (rho < 0.04) continue;
    const n = K.vn3(x * sc + seed, y * sc, t * sh, 3) - 0.5;
    const v = rho + n * 0.5 - K.BAY(x, y) * 0.75;
    if (v <= 0) continue;
    const col = ramp[v > 0.75 ? 3 : v > 0.42 ? 2 : v > 0.16 ? 1 : 0];
    const i = (y * W + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
  }
};

// ---------- dithered glow that only lightens: pixels darker than the glow colour take it, by an ordered-dither threshold.
// Keeps glows on their own ramp (no muddy blends that the quantizer would snap to an unrelated palette colour).
const LUM = rgb => rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
FX.glowL = (c, sx, sy, r, ramp = ['r1', 'r2', 'u1', 'u2', 'y2'], a = 1, fall = 1.6) => {
  if (r <= 0 || a <= 0) return;
  const x0 = Math.max(0, Math.floor(sx - r)), x1 = Math.min(W - 1, Math.ceil(sx + r)), y0 = Math.max(0, Math.floor(sy - r)), y1 = Math.min(H - 1, Math.ceil(sy + r));
  if (x1 < x0 || y1 < y0) return;
  // read and write only the glow's own box (a full-frame getImageData per glow made atom-heavy frames take seconds)
  const cols = ramp.map(K.rgb), lums = cols.map(LUM), bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const img = c.getImageData(x0, y0, bw, bh), d = img.data;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const q = Math.hypot(x - sx, y - sy) / r; if (q >= 1) continue;
    const v = a * Math.pow(1 - q, fall) * cols.length + K.BAY(x, y);   // level + dither: level 0.3 → 30% of pixels get ramp[0]
    const k = Math.min(cols.length - 1, Math.floor(v) - 1); if (k < 0) continue;
    const i = ((y - y0) * bw + (x - x0)) * 4;
    if (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 >= lums[k]) continue;
    d[i] = cols[k][0]; d[i + 1] = cols[k][1]; d[i + 2] = cols[k][2]; d[i + 3] = 255;     // opaque also on a transparent layer
  }
  c.putImageData(img, x0, y0); c.restore();
};
// world-space version (centre and radius under the current canvas transform)
FX.glowW = (c, x, y, r, ramp, a, fall) => { const m = c.getTransform(); FX.glowL(c, m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f, r * Math.hypot(m.a, m.b), ramp, a, fall); };

// spotlight: dims everything outside radius r0 around (sx, sy), down to (1 − a) brightness past r1 (screen px).
// A plain multiply; the palette quantizer then maps the darker colours onto the next palette steps.
FX.spot = (c, sx, sy, r0, r1, a = 1) => {
  if (a <= 0) return;
  const img = K.pbegin(c), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const q = (Math.hypot(x - sx, y - sy) - r0) / (r1 - r0); if (q <= 0) continue;
    const f = 1 - a * MO.smooth(Math.min(1, q)), i = (y * W + x) * 4;
    d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
  }
  K.pend(c, img);
};

// darken everything below y0, reaching (1 − a) brightness at y1 and beyond — a floor for overlays (screen px)
FX.fadeBelow = (c, y0, y1, a = 0.8) => {
  if (a <= 0) return;
  const img = K.pbegin(c), d = img.data;
  for (let y = Math.max(0, Math.floor(y0)); y < H; y++) {
    const f = 1 - a * MO.smooth(Math.min(1, (y - y0) / (y1 - y0)));
    for (let x = 0, i = y * W * 4; x < W; x++, i += 4) { d[i] *= f; d[i + 1] *= f; d[i + 2] *= f; }
  }
  K.pend(c, img);
};

// darken everything above y1, reaching (1 − a) brightness at y0 and above (screen px)
FX.fadeAbove = (c, y0, y1, a = 1) => {
  if (a <= 0 || y1 <= 0) return;
  const img = K.pbegin(c), d = img.data;
  for (let y = 0; y < Math.min(H, Math.ceil(y1)); y++) {
    const f = 1 - a * MO.smooth(Math.min(1, (y1 - y) / Math.max(1, y1 - y0)));
    for (let x = 0, i = y * W * 4; x < W; x++, i += 4) { d[i] *= f; d[i + 1] *= f; d[i + 2] *= f; }
  }
  K.pend(c, img);
};

// ---------- small effects ----------
FX.flash = (c, sx, sy, r, col = 'w', a = 1) => {            // pixel starburst
  if (a <= 0 || r <= 0) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a;
  const x = Math.round(sx), y = Math.round(sy), L = Math.round(r);
  R(c, x - L, y, 2 * L + 1, 1, col); R(c, x, y - L, 1, 2 * L + 1, col);
  const d2 = Math.round(r * 0.55); for (let k = 1; k <= d2; k++) { R(c, x - k, y - k, 1, 1, col); R(c, x + k, y - k, 1, 1, col); R(c, x - k, y + k, 1, 1, col); R(c, x + k, y + k, 1, 1, col); }
  R(c, x - 1, y - 1, 3, 3, 'w');
  c.restore();
};
FX.ring = (c, sx, sy, r, col = 'w', a = 1) => {              // expanding shock ring, 1 px
  if (a <= 0 || r <= 0) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a; c.fillStyle = P[col] || col;
  const n = Math.max(12, Math.round(r * 6.3));
  for (let k = 0; k < n; k++) { const an = k / n * TAU; c.fillRect(Math.round(sx + Math.cos(an) * r), Math.round(sy + Math.sin(an) * r), 1, 1); }
  c.restore();
};
// heat: a red/orange glow with rising shimmer strokes (s = 0..1)
FX.heat = (c, sx, sy, r, s, t, seed = 1) => {
  if (s <= 0) return;
  FX.glowL(c, sx, sy, r, ['r0', 'r1', 'r2', 'u1', 'u2', 'y2'], 0.95 * s, 1.4);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  for (let k = 0; k < Math.round(10 * s); k++) {
    const ph = K.wrap(t * (0.7 + h(k, seed) * 0.6) + h(k, seed + 1), 1);
    const x = sx + (h(k, seed + 2) - 0.5) * r * 1.4 + Math.sin(t * 6 + k) * 2, y = sy + r * 0.3 - ph * r * 1.1;
    c.globalAlpha = (1 - ph) * s; R(c, Math.round(x), Math.round(y), 1, 3, ph < 0.4 ? 'u2' : 'r2');
  }
  c.restore();
};
// field arrows: rows of chevrons marching along dir (+1 → right, −1 → left) between x0 and x1 (screen px)
FX.field = (c, x0, x1, ys, dir, t, col = 'g7', a = 1, gap = 22) => {
  if (a <= 0) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a; c.fillStyle = P[col] || col;
  for (const y0 of ys) {
    const y = Math.round(y0);
    for (let x = x0 + K.wrap(dir * t * 18, gap); x < x1; x += gap) {
      const X = Math.round(x);
      for (let k = 0; k < 4; k++) { c.fillRect(X - dir * k, y - k, 1, 1); c.fillRect(X - dir * k, y + k, 1, 1); }
      c.fillRect(X - dir * 9, y, 7, 1);
    }
  }
  c.restore();
};
// meter bar with label and value (screen px)
FX.meter = (c, x, y, w, frac, label, val, col = 'c2', a = 1) => {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a;
  PIX.rect(c, x, y + 9, w, 5, 'g2'); PIX.rect(c, x, y + 9, Math.round(w * clamp(frac)), 5, col);
  PIX.rect(c, x, y + 9, Math.round(w * clamp(frac)), 1, 'w');
  PIX.text(c, label, x, y, 'g8'); PIX.text(c, val, x + w, y, 'w', { align: 'right' });
  c.restore();
};
})();
