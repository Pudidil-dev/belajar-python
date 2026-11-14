// K — shared drawing kit. Everything is a pure function of time (seeded hashes, no Math.random), so any frame can be
// rendered on its own and twice gives the same pixels.
(() => {
const { P, W, H } = PIX;
const K = window.K = {};
window.SC = window.SC || {};                       // scene registry (scene files load before film.js)
const h = U.hash, TAU = U.TAU, clamp = U.clamp, lerp = U.lerp;
K.h = h;
K.col = c => P[c] || c;
K.wrap = (v, m) => ((v % m) + m) % m;
K.pop = (t, t0, d = 0.35) => t < t0 ? 0 : MO.backOut(clamp((t - t0) / d), 2.2);   // Kurzgesagt pop-in scale
K.inout = (t, a, b) => MO.k75(clamp((t - a) / (b - a)));
K.sm = (t, a, b) => MO.smooth(clamp((t - a) / (b - a)));
K.lin = (t, a, b) => clamp((t - a) / (b - a));
K.zl = (a, b, p) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * p);       // log-space zoom
K.rgb = c => PIX.hex(P[c] || c);

// ---------- camera: cam = {x, y, z, r} (world centre, px per world unit, roll) ----------
K.cam = (c, cam) => PIX.cam(c, cam);
K.S = (cam, x, y) => {                                  // world → screen, matching PIX.cam (incl. its integer snap)
  const z = cam.z ?? 1;
  if (cam.r) {
    const dx = (x - cam.x) * z, dy = (y - cam.y) * z, co = Math.cos(cam.r), si = Math.sin(cam.r);
    return [W / 2 + dx * co - dy * si, H / 2 + dx * si + dy * co];
  }
  return [Math.round(W / 2 - z * cam.x) + z * x, Math.round(H / 2 - z * cam.y) + z * y];
};
K.Sinv = (cam, sx, sy) => {
  const z = cam.z ?? 1;
  if (cam.r) {
    const dx = sx - W / 2, dy = sy - H / 2, co = Math.cos(-cam.r), si = Math.sin(-cam.r);
    return [cam.x + (dx * co - dy * si) / z, cam.y + (dx * si + dy * co) / z];
  }
  return [(sx - Math.round(W / 2 - z * cam.x)) / z, (sy - Math.round(H / 2 - z * cam.y)) / z];
};
K.camLerp = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), z: K.zl(a.z, b.z, p), r: lerp(a.r || 0, b.r || 0, p) });
// zoom toward a fixed screen point: keeps the world point under (sx, sy) still while z changes
K.camZoomAt = (cam, wx, wy, z) => { const [sx, sy] = K.S(cam, wx, wy); return { x: wx - (sx - W / 2) / z, y: wy - (sy - H / 2) / z, z, r: cam.r || 0 }; };

// ---------- noise ----------
const fade = t => t * t * (3 - 2 * t);
K.vn = (x, y, s = 0) => {                               // value noise 0..1
  const xi = Math.floor(x), yi = Math.floor(y), xf = fade(x - xi), yf = fade(y - yi);
  const a = h(xi + s * 131, yi), b = h(xi + 1 + s * 131, yi), c = h(xi + s * 131, yi + 1), d = h(xi + 1 + s * 131, yi + 1);
  return lerp(lerp(a, b, xf), lerp(c, d, xf), yf);
};
K.fbm = (x, y, s = 0, o = 3) => { let v = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { v += a * K.vn(x * f, y * f, s + i * 7); n += a; a *= 0.5; f *= 2.03; } return v / n; };
K.vn3 = (x, y, t, s = 0) => { const ti = Math.floor(t), tf = fade(t - ti); return lerp(K.vn(x, y, s + ti * 17), K.vn(x, y, s + ti * 17 + 17), tf); };

// ---------- direct pixel access (for per-pixel effects drawn after the canvas layers) ----------
K.pbegin = c => { const img = c.getImageData(0, 0, W, H); return img; };
K.pend = (c, img) => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.putImageData(img, 0, 0); c.restore(); };
K.pset = (img, x, y, rgb) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4, d = img.data; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; };
K.BAY = (x, y) => PIX.BAYER[(y & 3) << 2 | (x & 3)] + 0.5;           // 0..1 ordered-dither threshold

// ---------- shapes ----------
K.ball = (c, x, y, r, base, sh, hi, a = 1) => {
  if (r <= 0) return;
  const p = PIX.circPath(x, y, r);
  c.save(); c.globalAlpha *= a; c.clip(p);
  c.fillStyle = K.col(sh || base); c.fill(p);
  c.fillStyle = K.col(base); c.beginPath(); c.arc(x - r * 0.22, y - r * 0.22, r * 0.9, 0, TAU); c.fill();
  if (hi) { c.fillStyle = K.col(hi); c.beginPath(); c.arc(x - r * 0.42, y - r * 0.42, Math.max(0.7, r * 0.26), 0, TAU); c.fill(); }
  c.restore();
};
K.panel = (c, x, y, w, h_, base = 'g4', sh = 'g2', hi = 'g6', o = {}) => {
  PIX.flat(c, PIX.rectPath(x, y, w, h_, o.r || 0), base, sh, hi, o.sv || [2, 2], o.hv || [1, 1]);
  if (o.seams) for (let k = 1; k < o.seams; k++) PIX.rect(c, x + 2, y + Math.round(h_ * k / o.seams), w - 4, 1, sh);
  if (o.rivets) for (const [rx, ry] of [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h_ - 3], [x + w - 3, y + h_ - 3]]) PIX.rect(c, rx, ry, 1, 1, hi);
};
K.pipe = (c, pts, w, base = 'g4', hi = 'g6', sh = 'g2') => {
  const path = () => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); };
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = K.col(sh); c.lineWidth = w; path(); c.stroke();
  c.strokeStyle = K.col(base); c.lineWidth = w * 0.7; c.translate(-w * 0.1, -w * 0.1); path(); c.stroke();
  c.strokeStyle = K.col(hi); c.lineWidth = Math.max(1, w * 0.18); c.translate(-w * 0.15, -w * 0.15); path(); c.stroke();
  c.restore();
};
K.polyLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
K.along = (pts, d) => {
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= l) { const q = l ? d / l : 0; return [lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q)]; }
    d -= l;
  }
  return pts[pts.length - 1];
};
K.arrow = (c, x0, y0, x1, y1, col = 'w', head = 3) => {
  PIX.bline(c, x0, y0, x1, y1, col);
  const a = Math.atan2(y1 - y0, x1 - x0);
  for (const s of [-1, 1]) PIX.bline(c, x1, y1, x1 - Math.cos(a + s * 0.6) * head, y1 - Math.sin(a + s * 0.6) * head, col);
};
// pixel text at a point given in the current drawing coordinates; PIX.text itself takes screen pixels
K.wtext = (c, s, x, y, col, opt) => { const m = c.getTransform(); PIX.text(c, s, m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f, col, opt); };
K.grid = (c, x, y, w, h_, s, col, a = 0.3) => { c.save(); c.globalAlpha *= a; c.fillStyle = K.col(col); for (let gx = x; gx <= x + w; gx += s) c.fillRect(Math.round(gx), y, 1, h_); for (let gy = y; gy <= y + h_; gy += s) c.fillRect(x, Math.round(gy), w, 1); c.restore(); };
// screen-space dithered rectangle fill at coverage a (0..1) — a hard-pixel "transparent" layer that survives quantization
K.dith = (c, x0, y0, w, h_, col, a, ph = 0) => {
  if (a <= 0) return; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = K.col(col);
  for (let y = Math.max(0, Math.round(y0)); y < Math.min(H, Math.round(y0 + h_)); y++) for (let x = Math.max(0, Math.round(x0)); x < Math.min(W, Math.round(x0 + w)); x++) if (a > K.BAY(x + ph, y)) c.fillRect(x, y, 1, 1);
  c.restore();
};
})();
