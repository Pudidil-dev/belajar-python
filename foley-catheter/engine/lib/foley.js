// FOLEY — one two-way Foley catheter, the same in every view (mm):
//   rounded closed tip (radius R = 2.7, about 16 Fr) → two opposing side drainage eyes (u = 7–11.5 mm from the tip) →
//   retention balloon (u = 15–36; seen deflated as a thin sleeve, or expanded to ≈ 22 mm across) → the shaft toward the
//   outlet → outside the body the bifurcation: the main drainage connector and the separate balloon valve.
//   Inside: one large drainage lumen (from the eyes to the drainage connector) and one small balloon lumen in the wall
//   (from the balloon's inflation port to the valve), with a solid partition. Urine never enters the balloon chamber.
// The route: the catheter lies along the urethral lumen (PELVIS.UR) and, past the neck, straight up into the bladder.
// FOLEY.route(r): r = 0 at the external meatus, positive inward (up the urethra, into the bladder), negative outside.
// A catheter whose tip sits at route position rTip has the point at distance u from its tip at r = rTip − u.
(() => {
const { W, H, P } = PIX;
const F = window.FOLEY = { NAME: 'FOLEY' };
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
F.R = 2.7; F.EYE = [7, 11.5]; F.BAL = [15, 36]; F.BAL_C = 25.5; F.BAL_RX = 10.5; F.BAL_RY = 11;
// ---------- the route ----------
let RP = null, RS = null;
F.init = () => {
  const out = PELVIS.spline([[34, -262], [40, -232], [48, -202], [56, -180], [62, -158], [65, -140], [65, -124]], 0.5);   // outside, toward the meatus
  const ure = PELVIS.UR.slice().reverse();                                                                               // meatus → neck
  const bl = []; for (let y = 0.5; y <= 60; y += 0.5) bl.push([0, y]);                                                    // neck → up into the bladder
  const pts = out.concat(ure.slice(1)).concat(bl);
  const s = new Float64Array(pts.length); for (let i = 1; i < pts.length; i++) s[i] = s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  // r = 0 at the meatus
  let im = out.length - 1; const s0 = s[im];
  for (let i = 0; i < s.length; i++) s[i] -= s0;
  RP = pts; RS = s;
  F.L_URETHRA = s[out.length - 1 + ure.length - 1];                 // r at the bladder neck
  F.R_FINAL = F.L_URETHRA + F.BAL[1] + 0.5;                          // tip position with the balloon resting on the neck
  F.R_MIN = s[0];
};
F.route = r => {
  let lo = 0, hi = RS.length - 1; r = clamp(r, RS[0], RS[hi]);
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (RS[mid] <= r) lo = mid; else hi = mid; }
  const q = (r - RS[lo]) / Math.max(1e-9, RS[hi] - RS[lo]), a = RP[lo], b = RP[hi], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [lerp(a[0], b[0], q), lerp(a[1], b[1], q), (b[0] - a[0]) / l, (b[1] - a[1]) / l];   // point and unit tangent (pointing inward)
};
// ---------- the cutaway rendering: a smooth ivory tube on the voxel section ----------
const hex = h => PIX.hex(P[h] || h);
let RAMP = null;
const ramps = () => RAMP || (RAMP = { iv: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'w'].map(hex), rim: hex('q1'), eye: hex('k'), eyeRim: hex('q2'), bal: ['l0', 'l1', 'l2', 'l3', 'l4'].map(hex) });
const BAY = (x, y) => PIX.BAYER[(y & 3) << 2 | (x & 3)] + 0.5;
let ZB = null, NB = null;
// screen-space sphere splats: pts = [[sx, sy, r, eye (0/1)]]; writes into c within the bbox
F.tubeSplat = (c, pts, o = {}) => {
  if (!pts.length) return;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const [x, y, r] of pts) { x0 = Math.min(x0, x - r - 2); y0 = Math.min(y0, y - r - 2); x1 = Math.max(x1, x + r + 2); y1 = Math.max(y1, y + r + 2); }
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
  if (x1 <= x0 || y1 <= y0) return;
  const w = x1 - x0, hh = y1 - y0;
  if (!ZB || ZB.length < w * hh) { ZB = new Float32Array(W * H); NB = new Float32Array(W * H * 3); }
  ZB.fill(-1, 0, w * hh);
  const tag = new Uint8Array(w * hh);
  for (const [cx, cy, r, tg] of pts) {
    const ax = Math.max(x0, Math.floor(cx - r)), bx = Math.min(x1 - 1, Math.ceil(cx + r)), ay = Math.max(y0, Math.floor(cy - r)), by = Math.min(y1 - 1, Math.ceil(cy + r)), r2 = r * r;
    for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, q = dx * dx + dy * dy; if (q > r2) continue;
      const dz = Math.sqrt(r2 - q), p = (y - y0) * w + (x - x0);
      if (dz <= ZB[p]) continue;
      ZB[p] = dz; NB[p * 3] = dx / r; NB[p * 3 + 1] = dy / r; NB[p * 3 + 2] = dz / r; tag[p] = tg || 0;
    }
  }
  const img = c.getImageData(x0, y0, w, hh), d = img.data, R = ramps(), Lx = -0.5, Ly = -0.6, Lz = 0.62;
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x; if (ZB[p] < 0) continue;
    const nx = NB[p * 3], ny = NB[p * 3 + 1], nz = NB[p * 3 + 2];
    let col;
    const edge = nz < 0.32;
    if (tag[p] === 1 && nz > 0.45) col = Math.abs(nx) + Math.abs(ny) > 0.62 ? R.eyeRim : R.eye;             // a drainage eye facing us
    else if (edge) col = R.rim;
    else {
      const lam = Math.max(0, -(nx * Lx + ny * Ly) * 0.9 + nz * Lz), spec = Math.pow(Math.max(0, lam), 14);
      const v = 0.12 + 0.9 * lam, k = clamp(Math.round(v * (R.iv.length - 2) + BAY(x0 + x, y0 + y) - 0.5), 0, R.iv.length - 2);
      col = spec > 0.6 ? R.iv[R.iv.length - 1] : R.iv[k];
    }
    const i = p * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  c.putImageData(img, x0, y0);
};
// the translucent liquid-filled balloon: an ellipse round the shaft (dithered pale blue over what is behind, a lit rim, a
// soft inner highlight; slightly darker toward the bottom like a liquid)
F.balloon = (c, cx, cy, ang, rx, ry, o = {}) => {
  const a = o.alpha ?? 0.55, R = ramps(), co = Math.cos(ang), si = Math.sin(ang), M = Math.max(rx, ry) + 2;
  const x0 = Math.max(0, Math.floor(cx - M)), x1 = Math.min(W, Math.ceil(cx + M)), y0 = Math.max(0, Math.floor(cy - M)), y1 = Math.min(H, Math.ceil(cy + M));
  if (x1 <= x0 || y1 <= y0) return;
  const img = c.getImageData(x0, y0, x1 - x0, y1 - y0), d = img.data, w = x1 - x0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, u = (dx * co + dy * si) / rx, v = (-dx * si + dy * co) / ry, q = Math.hypot(u, v);
    if (q > 1) continue;
    const b = BAY(x, y), rim = q > 1 - 1.6 / Math.min(rx, ry), lowv = (dy / ry + 1) / 2;
    let col = null;
    if (rim) col = q > 1 - 0.8 / Math.min(rx, ry) ? R.bal[1] : R.bal[3];
    else if (b < a * (0.65 + 0.35 * lowv)) col = lowv > 0.62 ? R.bal[1] : R.bal[2];
    if (!rim && Math.hypot(u + 0.42, v + 0.38) < 0.2) col = R.bal[4];
    if (!col) continue;
    const i = ((y - y0) * w + (x - x0)) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  c.putImageData(img, x0, y0);
};
// the catheter in the cutaway. o = {rTip, inflated (0..1, only ever 0 or 1 in the film), uMax, lift [dx, dy] (screen offset for
// the relief), ring (0..1 tracking outline round the tip), drain (0..1 amber overlay), chan (0..1 cyan overlay), t}
F.drawCut = (c, cam, o) => {
  const rTip = o.rTip, uMax = o.uMax ?? 330, s = cam.s, R = F.R, [lx, ly] = o.lift || [0, 0], pts = [];
  const scr = u => { const [x, y] = F.route(rTip - u); const [sx, sy] = PELVIS.S(cam, x, y); return [sx + lx, sy + ly]; };
  const step = Math.max(0.12, 0.35 / Math.max(0.3, s));
  for (let u = 0; u <= uMax; u += step * (u < 40 ? 1 : 2)) {
    const [sx, sy] = scr(u);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    let r = R;
    if (u < R) r = Math.sqrt(Math.max(0.05, R * R - (R - u) * (R - u)));                       // the rounded closed tip
    if (!o.inflated && u > F.BAL[0] && u < F.BAL[1]) r = R + 0.35 * Math.sin(Math.PI * (u - F.BAL[0]) / (F.BAL[1] - F.BAL[0]));   // the flat balloon sleeve
    const eye = u > F.EYE[0] && u < F.EYE[1] ? 1 : 0;
    pts.push([sx, sy, r * s, eye && Math.abs(u - (F.EYE[0] + F.EYE[1]) / 2) < (F.EYE[1] - F.EYE[0]) / 2 * 0.95 ? 1 : 0]);
  }
  // the eye facing us is an oval: the splat tags points on the tube's axis; narrow it across by drawing it after
  F.tubeSplat(c, pts.map(p => [p[0], p[1], p[2], 0]));
  // the drainage eye facing the viewer (the opposing one is on the far side): a dark oval with a lit rim
  {
    const uE = (F.EYE[0] + F.EYE[1]) / 2, [ex, ey] = scr(uE), [ax, ay] = scr(uE - 1), ang = Math.atan2(ey - ay, ex - ax), L = (F.EYE[1] - F.EYE[0]) / 2 * s, Wd = R * 0.5 * s;
    if (L > 1.2) {
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.translate(ex, ey); c.rotate(ang);
      c.fillStyle = P.q3; c.beginPath(); c.ellipse(0.4, 0.4, L + 0.8, Wd + 0.8, 0, 0, TAU); c.fill();
      c.fillStyle = o.eyeFill ? P[o.eyeFill] : P.n0; c.beginPath(); c.ellipse(0, 0, L, Wd, 0, 0, TAU); c.fill();
      c.restore();
    }
  }
  // overlays: the drainage path (amber, dashes moving out from the eyes) and the balloon channel (cyan, drawn on)
  if (o.drain > 0) {
    const off = K.wrap((o.t || 0) * 18, 6);
    c.save(); c.globalAlpha = o.drain;
    for (let u = (F.EYE[0] + F.EYE[1]) / 2 + off; u < (o.drainMax ?? uMax); u += 6) { const [ax, ay] = scr(u), [bx, by] = scr(u + 2.6); PIX.bline(c, ax, ay, bx, by, 'a1'); PIX.bline(c, ax + 1, ay, bx + 1, by, 'a2'); }
    c.restore();
  }
  if (o.chan > 0) {
    const u0 = F.BAL_C, u1 = lerp(u0, o.chanMax ?? uMax, o.chan);
    for (let u = u0; u < u1; u += 1) { const [ax, ay] = scr(u), [bx, by] = scr(u + 1), [, , tx, ty] = F.route(rTip - u), nx = -ty, ny = tx; const k = R * 0.62 * s; PIX.bline(c, ax + nx * k, ay - ny * k, bx + nx * k, by - ny * k, 'c3'); }
  }
  // the balloon (expanded: always inside the bladder in this film)
  if (o.inflated) {
    const [bx, by] = scr(F.BAL_C), [ax, ay] = scr(F.BAL_C - 1), ang = Math.atan2(by - ay, bx - ax);
    F.balloon(c, bx, by, ang, F.BAL_RX * s, F.BAL_RY * s, { alpha: 0.55 });
    if (o.balOutline > 0) VES_ring(c, bx, by, F.BAL_RY * s + 4, o.balOutline, o.t || 0, 'l4');
  }
  if (o.ring > 0) { const [tx, ty] = scr(R * 0.8); VES_ring(c, tx, ty, R * s + 6, o.ring, o.t || 0, 'c3'); }
  return { scr };
};
// a pixel circle drawn on clockwise from 12 o'clock (p = 0..1), 2 px thick, with a slowly turning gap (an editorial marker)
const VES_ring = F.ring = (c, x, y, r, p, t = 0, col = 'c3') => {
  if (p <= 0) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P[col] || col;
  const n = Math.max(24, Math.round(r * 7)), gapA = (t * 0.5) % 1;
  for (let k = 0; k < n * p; k++) {
    const q = k / n, an = -Math.PI / 2 + q * TAU;
    if (p >= 1 && Math.abs(((q - gapA + 1) % 1) - 0.5) > 0.46) continue;
    for (const dr of [0, 1]) c.fillRect(Math.round(x + Math.cos(an) * (r + dr)), Math.round(y + Math.sin(an) * (r + dr)), 1, 1);
  }
  c.restore();
};
})();
