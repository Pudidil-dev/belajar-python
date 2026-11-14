// LIT — 2D pixel models shaded like 3D (the look of this film).
// A shape is filled into a mask at screen resolution. Inside it, a height field is built from the exact distance to its
// edge: a dome of radius R px, which for a stroked tube becomes a cylinder. Its normals are lit by the film's one light
// (top left, toward the viewer). The light value is cut into the material's hue-shifted ramp with codixel's band shading:
// flat bands, with dither only in a thin strip at each band boundary. Edge pixels that face the light go one step lighter
// (rim); edge pixels that face away go two steps darker (a selout-style outline taken from the ramp itself, never black),
// so overlapping parts read as separate 3D forms. Everything is written in exact palette colours, so the quantizer leaves
// it untouched.
(() => {
const { W, H, P } = PIX;
const LIT = window.LIT = { NAME: 'LIT', FLAT: true };
const norm = v => { const n = Math.hypot(...v); return v.map(q => q / n); };
const L = LIT.L = norm([-0.55, -0.72, 0.62]);                 // the one light: from the top left, toward the viewer
const LP = norm([L[0], L[1]]);                                  // its direction in the picture plane
const BT = PIX.BT, band = PIX.band, clamp = U.clamp;
const RGB = {}; const rgb = LIT.rgb = k => RGB[k] || (RGB[k] = PIX.hex(P[k] || k));
const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const mx = cv.getContext('2d', { willReadFrequently: true });
const PW = W + 2, PH = H + 2;
const M = new Uint8Array(W * H), G = new Float64Array(PW * PH), D = new Float32Array(W * H);
const N1 = Math.max(PW, PH) + 2, f1 = new Float64Array(N1), d1 = new Float64Array(N1), v1 = new Int32Array(N1), z1 = new Float64Array(N1 + 1);
const INF = 1e20;
function edt1(n) {                                               // 1-D squared distance transform (Felzenszwalb–Huttenlocher)
  let k = 0; v1[0] = 0; z1[0] = -INF; z1[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = ((f1[q] + q * q) - (f1[v1[k]] + v1[k] * v1[k])) / (2 * q - 2 * v1[k]);
    while (s <= z1[k]) { k--; s = ((f1[q] + q * q) - (f1[v1[k]] + v1[k] * v1[k])) / (2 * q - 2 * v1[k]); }
    k++; v1[k] = q; z1[k] = s; z1[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z1[k + 1] < q) k++; const dq = q - v1[k]; d1[q] = dq * dq + f1[v1[k]]; }
}
// exact distance (px) from every mask pixel in the box to the nearest pixel outside the shape (outside the box counts as outside)
function edt(x0, y0, x1, y1) {
  const w = x1 - x0 + 2, h = y1 - y0 + 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const X = x0 + x - 1, Y = y0 + y - 1; G[y * w + x] = X >= x0 && X < x1 && Y >= y0 && Y < y1 && M[Y * W + X] ? INF : 0; }
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f1[y] = G[y * w + x]; edt1(h); for (let y = 0; y < h; y++) G[y * w + x] = d1[y]; }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f1[x] = G[y * w + x]; edt1(w); for (let x = 0; x < w; x++) G[y * w + x] = d1[x]; }
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) D[y * W + x] = M[y * W + x] ? Math.sqrt(G[(y - y0 + 1) * w + (x - x0 + 1)]) : 0;
}
// LIT.CLIP: a screen box that every write is limited to (set by window.inset: putImageData ignores canvas clipping)
LIT.CLIP = null;
const box0 = b => { let [x0, y0, x1, y1] = b; const C = LIT.CLIP || [0, 0, W, H]; x0 = Math.max(C[0], Math.floor(x0)); y0 = Math.max(C[1], Math.floor(y0)); x1 = Math.min(C[2], Math.ceil(x1)); y1 = Math.min(C[3], Math.ceil(y1)); return [x0, y0, x1, y1]; };
// rasterize draw(ctx) into the binary mask M inside box; returns false if nothing landed
function raster(draw, x0, y0, x1, y1) {
  mx.setTransform(1, 0, 0, 1, 0, 0); mx.clearRect(x0, y0, x1 - x0, y1 - y0);
  mx.save(); mx.beginPath(); mx.rect(x0, y0, x1 - x0, y1 - y0); mx.clip(); mx.fillStyle = '#fff'; mx.strokeStyle = '#fff'; mx.lineCap = 'round'; mx.lineJoin = 'round'; draw(mx); mx.restore();
  const md = mx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
  let any = false;
  for (let y = y0, i = 3; y < y1; y++) for (let x = x0; x < x1; x++, i += 4) { const v = md[i] >= 128 ? 1 : 0; M[y * W + x] = v; if (v) any = true; }
  return any;
}
LIT.mask = (draw, box) => { const [x0, y0, x1, y1] = box0(box); if (x1 <= x0 || y1 <= y0) return null; return raster(draw, x0, y0, x1, y1) ? { M, x0, y0, x1, y1 } : null; };
// the main renderer. draw(ctx) fills the shape in screen space; box = [x0, y0, x1, y1] screen bounds; ramp = keys dark → light.
// o: R (dome radius px; default: the shape's half thickness), amb (0.18), dif (0.9), strip (1/3), edge (true), rim (true),
//    alpha (0..1 dithered coverage), clip(x, y), tone(x, y, d) → value offset, bias (value offset), flat (0..1: 1 = no dome),
//    hmul (height scale: lower = flatter), keep (true: return the distance field for later passes)
LIT.shape = (c, draw, box, ramp, o = {}) => {
  const [x0, y0, x1, y1] = box0(box);
  if (x1 - x0 < 1 || y1 - y0 < 1 || !raster(draw, x0, y0, x1, y1)) return null;
  edt(x0, y0, x1, y1);
  let dmax = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const d = D[y * W + x]; if (d > dmax) dmax = d; }
  const R = Math.max(1, o.R ?? dmax), amb = o.amb ?? 0.18, dif = o.dif ?? 0.9, strip = o.strip ?? 1 / 3, n = ramp.length, cols = ramp.map(rgb);
  const hm = o.hmul ?? 1, a = o.alpha ?? 1, flat = o.flat ?? 0;
  const img = c.getImageData(x0, y0, x1 - x0, y1 - y0), dd = img.data, bw = x1 - x0;
  const dAt = (x, y) => (x < x0 || y < y0 || x >= x1 || y >= y1) ? 0 : D[y * W + x];
  // o.cylX: shade each row as a slice of a vertical cylinder (containers, liquid columns), instead of a dome
  const rowL = o.cylX ? new Int16Array(y1 - y0).fill(-1) : null, rowR = o.cylX ? new Int16Array(y1 - y0).fill(-1) : null;
  if (o.cylX) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (M[y * W + x]) { if (rowL[y - y0] < 0) rowL[y - y0] = x; rowR[y - y0] = x; }
  // FLAT (the default since the xray-style revision): a flat base colour, a 1-px light edge on the top-left, a darker band
  // on the bottom-right (the classic flat pixel-art facet, as in xray-machine) — no dome gradients, no dither
  if (LIT.FLAT && !o.smooth) {
    const kb = Math.max(1, Math.min(n - 2, Math.round((n - 1) * (0.5 + (o.bias || 0) * 1.6)))), sw = Math.max(1, Math.min(3, Math.round(dmax * 0.2)));
    const out = (X, Y) => X < x0 || Y < y0 || X >= x1 || Y >= y1 || !M[Y * W + X];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (!M[y * W + x]) continue;
      if (a < 1 && BT(x, y) >= a) continue;
      if (o.clip && !o.clip(x, y)) continue;
      let k = kb + (o.tone ? Math.round(o.tone(x, y, D[y * W + x]) * (n - 1) * 0.9) : 0);
      if (o.edge !== false) { if (out(x + sw, y + sw)) k -= 2; else if (out(x - 1, y - 1)) k += 2; else if (o.cylX && rowL && x - rowL[y - y0] === 2) k += 1; }
      k = Math.max(0, Math.min(n - 1, k));
      const col = cols[k], i = ((y - y0) * bw + (x - x0)) * 4; dd[i] = col[0]; dd[i + 1] = col[1]; dd[i + 2] = col[2]; dd[i + 3] = 255;
    }
    c.putImageData(img, x0, y0);
    return { x0, y0, x1, y1, dmax, R };
  }
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (!M[y * W + x]) continue;
    if (a < 1 && BT(x, y) >= a) continue;
    if (o.clip && !o.clip(x, y)) continue;
    const d = D[y * W + x];
    // gradient of the distance field (points inward), and the slope of the circular profile at this distance
    let gx = (dAt(x + 1, y) - dAt(x - 1, y)) / 2, gy = (dAt(x, y + 1) - dAt(x, y - 1)) / 2;
    const gl = Math.hypot(gx, gy) || 1; gx /= gl; gy /= gl;
    const u = clamp(1 - Math.min(d - 0.5, R) / R, 0, 1), sl = (1 - flat) * hm * Math.min(5, u / Math.sqrt(Math.max(1e-4, 1 - u * u)));
    let nx = -gx * sl, ny = -gy * sl, nz = 1; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    if (o.cylX) { const l = rowL[y - y0], r = rowR[y - y0], hw = Math.max(1, (r - l + 1) / 2), u = clamp((x + 0.5 - (l + hw)) / hw, -0.98, 0.98); nx = u; ny = o.tilt || 0; nz = Math.sqrt(Math.max(0, 1 - u * u - ny * ny)); }
    let v = amb + dif * Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]) + (o.bias || 0) + (o.tone ? o.tone(x, y, d) : 0);
    let k = band(v, n, x, y, strip);
    if (o.edge !== false && d < 1.5) {
      const f = -(gx * LP[0] + gy * LP[1]);                     // > 0: this edge faces the light
      if (f > 0.35 && o.rim !== false) k = Math.min(n - 1, k + 1); else if (f < -0.1) k = Math.max(0, k - 2);
    }
    const col = cols[k], i = ((y - y0) * bw + (x - x0)) * 4;
    dd[i] = col[0]; dd[i + 1] = col[1]; dd[i + 2] = col[2]; dd[i + 3] = 255;
  }
  c.putImageData(img, x0, y0);
  return { x0, y0, x1, y1, dmax, R };
};
// helpers in world space (cam = {x, y, z} as K.cam): a Path2D, or a stroked polyline (a tube: the distance profile across a
// stroke is a cylinder). box: world bounds [x0, y0, x1, y1] (padded by the stroke width for tubes).
const wbox = (cam, b, pad = 0) => { const [ax, ay] = K.S(cam, b[0] - pad, b[1] - pad), [bx, by] = K.S(cam, b[2] + pad, b[3] + pad); return [Math.min(ax, bx) - 2, Math.min(ay, by) - 2, Math.max(ax, bx) + 2, Math.max(ay, by) + 2]; };
LIT.wbox = wbox;
LIT.path = (c, cam, path, b, ramp, o = {}) => LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.fill(path); }, wbox(cam, b), ramp, { ...o, R: o.Rw != null ? o.Rw * cam.z : o.R });
const ptsBox = pts => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; };
LIT.ptsBox = ptsBox;
LIT.tube = (c, cam, pts, width, ramp, o = {}) => {
  if (pts.length < 2) return null;
  const b = ptsBox(pts), lw = Math.max(1, width * cam.z);
  return LIT.shape(c, ctx => { K.cam(ctx, cam); ctx.lineWidth = lw / cam.z; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }, wbox(cam, b, width), ramp, { R: lw / 2, ...o });
};
// an analytic lit sphere at a screen point (molecules, beads): faster than the mask path
LIT.sphere = (c, sx, sy, r, ramp, o = {}) => {
  if (r < 0.5) return;
  const n = ramp.length, cols = ramp.map(rgb), amb = o.amb ?? 0.18, dif = o.dif ?? 0.9, a = o.alpha ?? 1;
  const [x0, y0, x1, y1] = box0([sx - r - 1, sy - r - 1, sx + r + 1, sy + r + 1]);
  if (x1 <= x0 || y1 <= y0) return;
  const img = c.getImageData(x0, y0, x1 - x0, y1 - y0), dd = img.data, bw = x1 - x0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const dx = (x + 0.5 - sx) / r, dy = (y + 0.5 - sy) / r, q = dx * dx + dy * dy;
    if (q > 1) continue;
    if (a < 1 && BT(x, y) >= a) continue;
    const nz = Math.sqrt(1 - q);
    let k;
    if (LIT.FLAT && !o.smooth) {
      const kb = Math.max(1, Math.min(n - 2, Math.round((n - 1) * (0.5 + (o.bias || 0) * 1.6)))), sh = Math.max(0.9, r * 0.3) / r;
      k = (dx + sh) ** 2 + (dy + sh) ** 2 > 1 ? kb - (r > 2.5 ? 2 : 1) : kb;
      if (r >= 2.2 && (dx + 0.42) ** 2 + (dy + 0.42) ** 2 < Math.max(0.05, (0.9 / r) ** 2, 0.22 ** 2)) k = kb + 2;
      k = Math.max(0, Math.min(n - 1, k));
      const col = cols[k], i = ((y - y0) * bw + (x - x0)) * 4; dd[i] = col[0]; dd[i + 1] = col[1]; dd[i + 2] = col[2]; dd[i + 3] = 255;
      continue;
    }
    k = band(amb + dif * Math.max(0, dx * L[0] + dy * L[1] + nz * L[2]) + (o.bias || 0), n, x, y, o.strip ?? 1 / 3);
    if (o.edge !== false && q > (1 - 1.6 / r) ** 2 && r > 2.5) { const f = -(-dx * LP[0] - dy * LP[1]); if (f < -0.1) k = Math.max(0, k - 2); }
    const col = cols[k], i = ((y - y0) * bw + (x - x0)) * 4; dd[i] = col[0]; dd[i + 1] = col[1]; dd[i + 2] = col[2]; dd[i + 3] = 255;
  }
  c.putImageData(img, x0, y0);
};
// a block in oblique projection (the "voxel" look of the machine and the table): front face, top face and right face.
// x, y = the front face's top-left (world), w, h = front size, d = depth (drawn up and to the right by OB per unit).
LIT.OB = [0.5, -0.42];
LIT.block = (c, cam, x, y, w, h, d, ramp, o = {}) => {
  const n = ramp.length, OB = o.ob || LIT.OB, dx = OB[0] * d, dy = OB[1] * d;
  const S = (X, Y) => K.S(cam, X, Y), poly = (pts, col, a = 1) => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a; c.fillStyle = P[col] || col; c.beginPath(); pts.forEach(([X, Y], i) => { const [sx, sy] = S(X, Y); i ? c.lineTo(Math.round(sx), Math.round(sy)) : c.moveTo(Math.round(sx), Math.round(sy)); }); c.closePath(); c.fill(); c.restore(); };
  const kf = o.front ?? Math.round((n - 1) * 0.55), kt = o.top ?? Math.min(n - 1, kf + 2), ks = o.side ?? Math.max(0, kf - 2);
  if (d > 0) {
    poly([[x, y], [x + w, y], [x + w + dx, y + dy], [x + dx, y + dy]], ramp[kt]);
    poly([[x + w, y], [x + w + dx, y + dy], [x + w + dx, y + h + dy], [x + w, y + h]], ramp[ks]);
  }
  poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], ramp[kf]);
  // a one-pixel light edge along the front's top and left (where the light catches the corner)
  const [ax, ay] = S(x, y), [bx, by] = S(x + w, y + h), z = cam.z;
  if (o.lip !== false && z * Math.min(w, h) > 6) { PIX.rect(c, Math.round(ax), Math.round(ay), Math.max(1, Math.round(bx - ax)), 1, ramp[Math.min(n - 1, kt + 1)]); PIX.rect(c, Math.round(ax), Math.round(ay), 1, Math.max(1, Math.round(by - ay)), ramp[Math.min(n - 1, kf + 1)]); }
};
// a vertical cylinder seen slightly from above: body shaded across its width (cylindrical normals), elliptical top face.
// cx, y = centre of the top ellipse (world), r = radius, h = height, e = ellipse ratio (ry/r)
LIT.cyl = (c, cam, cx, y, r, h, ramp, o = {}) => {
  const n = ramp.length, cols = ramp.map(rgb), e = o.e ?? 0.32, amb = o.amb ?? 0.18, dif = o.dif ?? 0.9, a = o.alpha ?? 1;
  const [sx, sy] = K.S(cam, cx, y), R = r * cam.z, HH = h * cam.z, ry = R * e;
  const [x0, y0, x1, y1] = box0([sx - R - 1, sy - ry - 1, sx + R + 1, sy + HH + ry + 1]);
  if (x1 <= x0 || y1 <= y0) return;
  const img = c.getImageData(x0, y0, x1 - x0, y1 - y0), dd = img.data, bw = x1 - x0;
  for (let y2 = y0; y2 < y1; y2++) for (let x2 = x0; x2 < x1; x2++) {
    const dx = (x2 + 0.5 - sx) / R; if (Math.abs(dx) > 1) continue;
    const yt = sy - ry * Math.sqrt(1 - dx * dx), yb = sy + HH + ry * Math.sqrt(1 - dx * dx), py = y2 + 0.5;
    if (py < yt || py > yb) continue;
    if (a < 1 && BT(x2, y2) >= a) continue;
    if (o.clip && !o.clip(x2, y2)) continue;
    const onTop = o.top !== false && ((py - sy) / ry) ** 2 + dx * dx <= 1;
    let v, k;
    if (LIT.FLAT) { const kb = Math.max(1, Math.min(n - 2, Math.round((n - 1) * (0.5 + (o.bias || 0) * 1.6)))); k = onTop ? kb + 1 : dx > 0.55 ? kb - 2 : (dx > -0.8 && dx < -0.6) ? kb + 2 : kb; k = Math.max(0, Math.min(n - 1, k)); }
    else {
      if (onTop) v = amb + dif * (0.25 * -L[1] + 0.97 * L[2]) + 0.12; else { const nz = Math.sqrt(1 - dx * dx); v = amb + dif * Math.max(0, dx * L[0] + nz * L[2]); }
      k = band(v + (o.bias || 0), n, x2, y2, 1 / 3);
      if (!onTop && Math.abs(dx) > 1 - 1.4 / R) k = Math.max(0, k - (dx > 0 ? 2 : 0));
    }
    const col = cols[k], i = ((y2 - y0) * bw + (x2 - x0)) * 4; dd[i] = col[0]; dd[i + 1] = col[1]; dd[i + 2] = col[2]; dd[i + 3] = 255;
  }
  c.putImageData(img, x0, y0);
};
// flat polygon in world space (exact palette colour, integer-snapped vertices: crisp edges)
LIT.poly = (c, cam, pts, col, a = 1) => {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a; c.fillStyle = P[col] || col; c.beginPath();
  pts.forEach(([X, Y], i) => { const [sx, sy] = K.S(cam, X, Y); i ? c.lineTo(Math.round(sx), Math.round(sy)) : c.moveTo(Math.round(sx), Math.round(sy)); });
  c.closePath(); c.fill(); c.restore();
};
// a pixel-perfect 1-px line in one fixed colour (codixel: lines one ramp step from their surroundings, no L corners)
LIT.line = (c, cam, pts, col, o = {}) => {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P[col] || col;
  let last = null;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = K.S(cam, pts[i - 1][0], pts[i - 1][1]), [bx, by] = K.S(cam, pts[i][0], pts[i][1]);
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))));
    for (let k = 0; k <= n; k++) {
      const x = Math.round(ax + (bx - ax) * k / n), y = Math.round(ay + (by - ay) * k / n);
      if (last && last[0] === x && last[1] === y) continue;
      if (o.dash && (Math.floor((i * 97 + k) / o.dash) % 2)) { last = [x, y]; continue; }
      if (!o.alpha || BT(x, y) < o.alpha) c.fillRect(x, y, 1, 1);
      last = [x, y];
    }
  }
  c.restore();
};
LIT.init = () => {};
})();
