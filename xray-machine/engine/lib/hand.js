// HAND — one right hand, palm down, used everywhere: the PA radiograph (scenes 1, 13, 14), the cross-section through the
// metacarpals (scenes 10, 11) and the transmitted-intensity profile on the detector.
// The radiograph is not painted: for every pixel it integrates the attenuation along the beam through soft tissue (finger
// cylinders, palm slab, forearm) and through each bone (a hollow tube: cortex + marrow, rounded ends). Bright = more
// attenuation = fewer X-rays reached the detector, so the cortex edges come out brightest, as on a real radiograph.
// Hand units: fingertips near y = 0, forearm at y = 1.45; x across (thumb side negative). Thumb on the left (right
// hand seen from the back, fingers up — the usual PA display).
(() => {
const HAND = window.HAND = {};
const h = U.hash, clamp = U.clamp, lerp = U.lerp;
// bones: [name, x0, y0, x1, y1, r0 (start end), rs (shaft), r1 (other end), kind]  kind: 'long' | 'short' | 'carpal'
const B = [];
const bone = (name, x0, y0, x1, y1, r0, rs, r1, kind = 'long', c0, c1) => B.push({ name, x0, y0, x1, y1, r0, rs, r1, kind,
  c0: c0 ?? (kind === 'carpal' ? 1 : 0.45), c1: c1 ?? (kind === 'carpal' ? 1 : 0.8) });   // end-cap roundness: flat joint base, round head
// forearm
bone('radius', -0.112, 1.62, -0.098, 1.082, 0.036, 0.033, 0.056, 'long', 0.5, 0.55);
bone('ulna', 0.105, 1.62, 0.094, 1.115, 0.027, 0.024, 0.03, 'long', 0.5, 0.9);
// carpals (short ellipsoids drawn as tiny capsules)
bone('scaphoid', -0.14, 1.04, -0.072, 0.978, 0.027, 0.03, 0.026, 'carpal');
bone('lunate', -0.036, 1.05, 0.004, 1.0, 0.032, 0.035, 0.03, 'carpal');
bone('triquetrum', 0.046, 1.028, 0.086, 0.99, 0.026, 0.028, 0.024, 'carpal');
bone('pisiform', 0.074, 1.012, 0.09, 1.0, 0.019, 0.02, 0.018, 'carpal');
bone('trapezium', -0.168, 0.94, -0.124, 0.904, 0.027, 0.028, 0.025, 'carpal');
bone('trapezoid', -0.092, 0.93, -0.064, 0.906, 0.024, 0.025, 0.023, 'carpal');
bone('capitate', -0.008, 0.97, -0.002, 0.893, 0.029, 0.031, 0.026, 'carpal');
bone('hamate', 0.054, 0.965, 0.072, 0.9, 0.03, 0.031, 0.025, 'carpal');
// metacarpals (base → head)
bone('mc1', -0.162, 0.872, -0.272, 0.718, 0.026, 0.02, 0.025);
bone('mc2', -0.073, 0.878, -0.098, 0.532, 0.025, 0.017, 0.027);
bone('mc3', -0.004, 0.874, -0.012, 0.514, 0.025, 0.017, 0.028);
bone('mc4', 0.057, 0.878, 0.074, 0.539, 0.023, 0.015, 0.025);
bone('mc5', 0.111, 0.874, 0.151, 0.589, 0.023, 0.015, 0.024);
// phalanges (proximal end → distal end); gaps between them are the joints
const finger = (pts, rad) => pts.forEach((p, i) => bone(`p${i}`, p[0], p[1], p[2], p[3], rad[i][0], rad[i][1], rad[i][2]));
finger([[-0.29, 0.695, -0.368, 0.58], [-0.38, 0.556, -0.418, 0.478]], [[0.024, 0.017, 0.021], [0.019, 0.013, 0.015]]);              // thumb
finger([[-0.103, 0.506, -0.128, 0.337], [-0.131, 0.313, -0.145, 0.22], [-0.148, 0.197, -0.157, 0.14]], [[0.022, 0.014, 0.019], [0.018, 0.012, 0.016], [0.015, 0.009, 0.013]]);
finger([[-0.012, 0.488, -0.013, 0.298], [-0.013, 0.274, -0.014, 0.167], [-0.014, 0.143, -0.015, 0.082]], [[0.023, 0.015, 0.02], [0.019, 0.012, 0.017], [0.016, 0.01, 0.013]]);
finger([[0.077, 0.513, 0.098, 0.337], [0.101, 0.313, 0.113, 0.212], [0.115, 0.189, 0.123, 0.132]], [[0.022, 0.014, 0.019], [0.018, 0.012, 0.016], [0.015, 0.009, 0.013]]);
finger([[0.156, 0.563, 0.2, 0.427], [0.204, 0.403, 0.224, 0.335], [0.227, 0.313, 0.24, 0.267]], [[0.019, 0.013, 0.017], [0.016, 0.01, 0.014], [0.013, 0.008, 0.011]]);
HAND.bones = B;
// soft tissue: finger cylinders (axis from base to beyond the tip) + palm slab + wrist/forearm
const FING = [[-0.19, 0.84, -0.43, 0.445, 0.05], [-0.085, 0.6, -0.162, 0.108, 0.047], [-0.008, 0.6, -0.016, 0.048, 0.048],
  [0.07, 0.6, 0.127, 0.1, 0.046], [0.14, 0.62, 0.247, 0.236, 0.041]];
const PALM = [];
{ // smooth closed outline through control points (Catmull-Rom), hand units
  const C = [[-0.225, 0.86], [-0.205, 0.74], [-0.175, 0.62], [-0.14, 0.545], [-0.06, 0.51], [0.04, 0.512], [0.12, 0.55], [0.19, 0.62],
    [0.2, 0.74], [0.185, 0.88], [0.165, 1.0], [0.165, 1.1], [0.17, 1.6], [-0.19, 1.6], [-0.18, 1.1], [-0.2, 1.0]];
  for (let i = 0; i < C.length; i++) {
    const p0 = C[(i - 1 + C.length) % C.length], p1 = C[i], p2 = C[(i + 1) % C.length], p3 = C[(i + 2) % C.length];
    for (let k = 0; k < 8; k++) { const t = k / 8, t2 = t * t, t3 = t2 * t;
      PALM.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
  }
}
const segD = (px, py, b) => {                    // distance to a segment + parameter along it
  const vx = b.x1 - b.x0, vy = b.y1 - b.y0, L2 = vx * vx + vy * vy;
  const s = clamp(((px - b.x0) * vx + (py - b.y0) * vy) / L2);
  return [Math.hypot(px - b.x0 - vx * s, py - b.y0 - vy * s), s];
};
const inPoly = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const polyDist = (x, y, poly) => { let d = 1e9; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, segD(x, y, { x0: poly[j][0], y0: poly[j][1], x1: poly[i][0], y1: poly[i][1] })[0]); return d; };
// thickness of soft tissue along the beam (hand units)
HAND.soft = (x, y) => {
  let T = 0;
  for (const [x0, y0, x1, y1, r] of FING) {
    const [d] = segD(x, y, { x0, y0, x1, y1 });
    if (d < r) T = Math.max(T, 2 * Math.sqrt(r * r - d * d));
  }
  if (inPoly(x, y, PALM)) {
    const e = polyDist(x, y, PALM), th = y > 1.02 ? lerp(0.12, 0.145, clamp((y - 1.02) / 0.4)) : 0.12;
    T = Math.max(T, th * Math.sqrt(clamp(e / 0.05)));
  }
  return T;
};
// attenuation through one bone at (x, y): hollow tube, cortex thick in the shaft and thin at the ends
const MU_S = 3.1, MU_C = 14.0, MU_M = 4.0;            // cortical bone attenuates ~5× soft tissue at ~40 keV
const boneA = (x, y, b) => {
  const vx = b.x1 - b.x0, vy = b.y1 - b.y0, L = Math.hypot(vx, vy), ux = vx / L, uy = vy / L;
  const ax = (x - b.x0) * ux + (y - b.y0) * uy, d = Math.abs((x - b.x0) * uy - (y - b.y0) * ux);
  const s = clamp(ax / L);
  let r = s < 0.5 ? lerp(b.r0, b.rs, MO.smooth(clamp(s / 0.4))) : lerp(b.rs, b.r1, MO.smooth(clamp((s - 0.6) / 0.4)));
  const cap = (ax < 0 ? b.c0 : b.c1) * r, over = ax < 0 ? -ax : ax > L ? ax - L : 0;       // flattened (joint-surface) ends
  if (over > 0) { if (over >= cap) return 0; r *= Math.sqrt(1 - (over / cap) ** 2); }
  if (d >= r) return 0;
  const shaft = b.kind === 'long' ? Math.sin(Math.PI * s) : 0, ri = r * (b.kind === 'carpal' ? 0.86 : lerp(0.84, 0.56, shaft));
  const Lo = 2 * Math.sqrt(r * r - d * d), Li = d < ri ? 2 * Math.sqrt(ri * ri - d * d) : 0;
  const trab = 0.7 + 0.6 * K.fbm(x * 150, y * 150, 7, 2);           // trabecular texture in the marrow
  return MU_C * (Lo - Li) + MU_M * Li * trab;
};
HAND.atten = (x, y) => {
  let A = MU_S * HAND.soft(x, y);
  for (const b of B) {
    if (x < Math.min(b.x0, b.x1) - 0.12 || x > Math.max(b.x0, b.x1) + 0.12 || y < Math.min(b.y0, b.y1) - 0.12 || y > Math.max(b.y0, b.y1) + 0.12) continue;
    A += boneA(x, y, b);
  }
  return A;
};
HAND.boneAt = (x, y) => B.some(b => boneA(x, y, b) > 0);
// ---------- precomputed radiograph (grey 0..1, already windowed and edge-enhanced) ----------
const MW = 240, MH = 300, X0 = -0.6, X1 = 0.6, Y0 = -0.02, Y1 = 1.48;
HAND.box = { x0: X0, x1: X1, y0: Y0, y1: Y1, w: MW, h: MH };
let G = null, ATT = null, SOFT = null;
HAND.init = () => {
  if (G) return;
  ATT = new Float32Array(MW * MH); SOFT = new Float32Array(MW * MH);
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    const x = lerp(X0, X1, (i + 0.5) / MW), y = lerp(Y0, Y1, (j + 0.5) / MH);
    ATT[j * MW + i] = HAND.atten(x, y); SOFT[j * MW + i] = HAND.soft(x, y);
  }
  // unsharp mask (digital radiographs are edge-enhanced) then window: air black, soft tissue dark grey, bone white
  const bl = new Float32Array(MW * MH);
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    let s = 0, n = 0;
    for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < MW && jj < MH) { s += ATT[jj * MW + ii]; n++; } }
    bl[j * MW + i] = s / n;
  }
  G = new Float32Array(MW * MH);
  for (let k = 0; k < MW * MH; k++) {
    const a = ATT[k] + 0.9 * (ATT[k] - bl[k]);
    G[k] = clamp(Math.pow(clamp((a - 0.06) / 0.98), 1.0));
  }
};
HAND.grey = (u, v) => {                               // u, v in 0..1 over the box
  const i = Math.max(0, Math.min(MW - 1, Math.floor(u * MW))), j = Math.max(0, Math.min(MH - 1, Math.floor(v * MH)));
  return G[j * MW + i];
};
HAND.isTissue = (u, v) => { const i = Math.max(0, Math.min(MW - 1, Math.floor(u * MW))), j = Math.max(0, Math.min(MH - 1, Math.floor(v * MH))); return SOFT[j * MW + i] > 0.004; };
HAND.isBone = (u, v) => { const i = Math.max(0, Math.min(MW - 1, Math.floor(u * MW))), j = Math.max(0, Math.min(MH - 1, Math.floor(v * MH))); return ATT[j * MW + i] - MU_S * SOFT[j * MW + i] > 0.02; };
// grey (0..1) → neutral palette ramp with ordered dither, written straight into an ImageData
const RAMP = ['k', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'da', 'w'].map(c => PIX.hex(PIX.P[c]));
HAND.shade = (img, x, y, g) => {
  const f = clamp(g) * (RAMP.length - 1), i0 = Math.floor(f), q = f - i0;
  const col = RAMP[Math.min(RAMP.length - 1, q > K.BAY(x, y) ? i0 + 1 : i0)];
  const k = (y * PIX.W + x) * 4, d = img.data; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2];
};
// draw the radiograph into screen rect (x, y, w, h) — o.block(u, v) may return a pixel block size (progressive reveal),
// o.mask(u, v) → 0..1 visibility, o.lv brightness gain, o.marker (lead 'R')
HAND.draw = (c, rx, ry, rw, rh, o = {}) => {
  const img = K.pbegin(c), W = PIX.W, H = PIX.H;
  const x0 = Math.max(0, Math.floor(rx)), x1 = Math.min(W, Math.ceil(rx + rw)), y0 = Math.max(0, Math.floor(ry)), y1 = Math.min(H, Math.ceil(ry + rh));
  const lv = o.lv ?? 1, bg = o.bg ?? 0.02;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    let u = (x + 0.5 - rx) / rw, v = (y + 0.5 - ry) / rh;
    if (u < 0 || v < 0 || u > 1 || v > 1) continue;
    let m = o.mask ? o.mask(u, v) : 1;
    if (m <= 0) continue;
    if (o.block) {
      const bs = o.block(u, v);
      if (bs > 1) { const bx = Math.floor((x - rx) / bs) * bs + bs / 2, by = Math.floor((y - ry) / bs) * bs + bs / 2; u = bx / rw; v = by / rh; }
    }
    const g = Math.max(bg, HAND.grey(u, v) * lv) * m;
    HAND.shade(img, x, y, g);
  }
  K.pend(c, img);
  if (o.marker) PIX.text(c, 'R', Math.round(rx + rw * 0.84), Math.round(ry + rh * 0.04), 'w', { shadow: null, sc: rw > 150 ? 2 : 1 });
};
// ---------- cross-section through the metacarpals (scenes 10–11), in millimetres ----------
// x across the hand (thumb side negative, as on the radiograph), y depth: 0 = back of the hand (the beam enters here),
// increasing toward the palm, which lies on the detector. About 86 mm wide and 28 mm thick.
const SEC = (() => {
  const top = x => { const u = (x + 2) / 44; return 14 - 13 * Math.sqrt(Math.max(0, 1 - u ** 6)); };
  const bot = x => { const u = (x + 2) / 44; return 14 + 13 * Math.sqrt(Math.max(0, 1 - u ** 6)) + 5 * Math.exp(-(((x + 31) / 8) ** 2)) * Math.sqrt(Math.max(0, 1 - u ** 6)) + 2 * Math.exp(-(((x - 30) / 7) ** 2)); };
  const X0 = -46, X1 = 42, outline = [];
  for (let k = 0; k <= 80; k++) { const x = lerp(X0, X1, k / 80); outline.push([x, top(x)]); }
  for (let k = 80; k >= 0; k--) { const x = lerp(X0, X1, k / 80); outline.push([x, bot(x)]); }
  const bones = [{ n: 'mc1', x: -31, y: 17, r: 5.2, ri: 2.6 }, { n: 'mc2', x: -14, y: 10, r: 4.6, ri: 2.2 }, { n: 'mc3', x: -2, y: 9.6, r: 4.8, ri: 2.3 },
    { n: 'mc4', x: 10, y: 10, r: 4.2, ri: 2.0 }, { n: 'mc5', x: 21.5, y: 11, r: 4.0, ri: 1.9 }];
  const ext = bones.slice(1).map(b => ({ x: b.x, y: 3.6, rx: 2.2, ry: 0.9 }));                  // extensor tendons (back)
  const flex = []; bones.slice(1).forEach(b => flex.push({ x: b.x - 1.5, y: 19.6, r: 1.6 }, { x: b.x + 1.5, y: 20.2, r: 1.5 }));   // flexor tendons
  const musc = [{ x: -8, y: 11.5, rx: 3.2, ry: 5 }, { x: 4, y: 11.8, rx: 3, ry: 5 }, { x: 15.8, y: 12.2, rx: 2.8, ry: 4.6 }, { x: -31, y: 21, rx: 10, ry: 7.5 }, { x: 30, y: 15, rx: 7, ry: 6.5 }];
  const vess = [[-20, 23.5], [-7, 23.8], [6, 23.6], [18, 23], [-26, 12], [27, 9]];
  return { top, bot, X0, X1, outline, bones, ext, flex, musc, vess, path: U.poly(outline, true) };
})();
HAND.SEC = SEC;
// draw the section in the current transform (mm)
HAND.drawSection = (c, o = {}) => {
  const P = PIX.P;
  PIX.fill(c, SEC.path, 't3');
  c.save(); c.clip(SEC.path);
  c.save(); c.translate(0, 0); const inner = new Path2D(); inner.addPath(SEC.path, new DOMMatrix([0.975, 0, 0, 0.93, -0.05, 1])); c.fillStyle = P.t2; c.fill(inner); c.restore();
  for (const m of SEC.musc) { c.beginPath(); c.ellipse(m.x, m.y, m.rx, m.ry, 0, 0, U.TAU); c.fillStyle = P.t1; c.fill(); }
  for (const m of SEC.musc) for (let k = 0; k < 5; k++) PIX.line(c, m.x - m.rx * 0.6, m.y - m.ry * 0.5 + k * m.ry * 0.25, m.x + m.rx * 0.6, m.y - m.ry * 0.45 + k * m.ry * 0.25, 't0', 0.25);   // muscle fibres
  for (const e of SEC.ext) { c.beginPath(); c.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, U.TAU); c.fillStyle = P.b1; c.fill(); }
  for (const f of SEC.flex) PIX.circ(c, f.x, f.y, f.r, 'b1');
  for (const [x, y] of SEC.vess) { PIX.circ(c, x, y, 0.9, 'r2'); PIX.circ(c, x + 1.6, y + 0.3, 0.6, 'r1'); }
  for (const b of SEC.bones) {
    PIX.circ(c, b.x, b.y, b.r + 0.35, 'b0'); PIX.circ(c, b.x, b.y, b.r, 'b2'); PIX.circ(c, b.x, b.y, b.ri, 'b1');
    for (let k = 0; k < 6; k++) { const an = k * 1.1 + b.x; PIX.circ(c, b.x + Math.cos(an) * b.ri * 0.55, b.y + Math.sin(an) * b.ri * 0.55, 0.35, 'b0'); }   // trabeculae
    PIX.circ(c, b.x - b.r * 0.45, b.y - b.r * 0.45, Math.max(0.5, b.r * 0.16), 'w');
  }
  c.restore();
  c.save(); c.strokeStyle = P.t3; c.lineWidth = 0.6; c.stroke(SEC.path); c.restore();
};
// what a vertical ray at x crosses, from the back of the hand down: segments [y0, y1, kind] (kind: soft | cortex | marrow)
HAND.secSegments = x => {
  if (x <= SEC.X0 || x >= SEC.X1) return [];
  const y0 = SEC.top(x), y1 = SEC.bot(x), cuts = [];
  for (const b of SEC.bones) {
    const d = Math.abs(x - b.x); if (d >= b.r) continue;
    const ho = Math.sqrt(b.r * b.r - d * d), hi = d < b.ri ? Math.sqrt(b.ri * b.ri - d * d) : 0;
    if (hi > 0) cuts.push([b.y - ho, b.y - hi, 'cortex'], [b.y - hi, b.y + hi, 'marrow'], [b.y + hi, b.y + ho, 'cortex']);
    else cuts.push([b.y - ho, b.y + ho, 'cortex']);
  }
  cuts.sort((p, q) => p[0] - q[0]);
  const segs = []; let y = y0;
  for (const cu of cuts) { if (cu[0] > y) segs.push([y, cu[0], 'soft']); segs.push(cu); y = cu[1]; }
  if (y1 > y) segs.push([y, y1, 'soft']);
  return segs;
};
HAND.MU = { soft: 0.02, cortex: 0.1, marrow: 0.035 };              // per mm (illustrative, in proportion)
HAND.transmit = x => { let A = 0; for (const [a, b, k] of HAND.secSegments(x)) A += HAND.MU[k] * (b - a); return Math.exp(-A); };
})();
