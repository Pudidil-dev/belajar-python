// DEV — the device views of the same Foley catheter (mm, its own dimensions):
//   outer radius R = 2.7; the drainage lumen spans −2.1 … +1.4 across the shaft, the balloon lumen +1.68 … +2.32 in the wall,
//   with a 0.28-mm partition between them. The rounded tip is closed; the two opposing eyes (u = 7–11.5) open into the
//   drainage lumen; the balloon lumen starts below the eyes and opens through its inflation port (u = 25) into the
//   balloon chamber, an annulus round the shaft between u = 15 and 36. Urine never reaches the balloon chamber.
//   DEV.long   longitudinal section (axis vertical, tip up), the walls cut, both lumens visible, the balloon chamber as two
//              lobes left and right
//   DEV.cross  the cross-section: a D-shaped drainage lumen, a small round balloon lumen, the partition
//   DEV.macro  the tip in 3D (ray-cast capsule with its two eyes, the expanded balloon below), turned about its axis
//   DEV.ports  the outer end: the bifurcation into the main drainage connector (the bag's tubing pushed onto it) and the
//              side arm with the balloon valve
// Colour overlays (amber drainage, cyan balloon channel) are teaching marks, not fluid colours.
(() => {
const { W, H, P } = PIX;
const DEV = window.DEV = {};
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, h = U.hash;
const R = 2.7, DL0 = -2.1, DL1 = 1.4, BL0 = 1.68, BL1 = 2.32, EYE = [7, 11.5], BAL = [15, 36], PORT = 25;
DEV.dims = { R, DL0, DL1, BL0, BL1, EYE, BAL, PORT };
const rect = (c, x, y, w, h_, col) => PIX.rect(c, Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h_)), col);
// ---------- longitudinal section. v = {cx, y0 (screen y of the tip), s (px/mm)}; o = {t, flow (0..1), drain (amber 0..1),
// chan (cyan 0..1 drawn-on fraction), balloon (1), eyeFlow (urine entering), uMax}
DEV.long = (c, v, o = {}) => {
  const s = v.s, X = mm => v.cx + mm * s, Y = u => v.y0 + u * s, uMax = o.uMax ?? 80;
  // the balloon chamber: two lobes beside the shaft (the inflated balloon cut through), liquid-filled pale blue
  if (o.balloon !== false) {
    for (const sg of [-1, 1]) {
      const cx = X(sg * (R + 4.3)), cy = Y((BAL[0] + BAL[1]) / 2), rx = 4.6 * s, ry = (BAL[1] - BAL[0]) / 2 * s;
      c.save(); c.beginPath(); c.ellipse(cx, cy, rx + 1.5, ry + 1.5, 0, 0, TAU); c.fillStyle = P.l3; c.fill();
      c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.fillStyle = P.l1; c.fill(); c.clip();
      K.dith(c, cx - rx, cy - ry, rx * 2, ry * 2, 'l2', 0.38);
      K.dith(c, cx - rx, cy + ry * 0.3, rx * 2, ry, 'l0', 0.3);
      c.restore();
      PIX.rect(c, Math.round(cx - rx * 0.5), Math.round(cy - ry * 0.7), Math.max(2, Math.round(rx * 0.25)), Math.round(ry * 0.5), 'l4');
    }
  }
  // the shaft walls (ivory, two-tone), cut: left wall, right wall with the balloon lumen inside it
  const top = Y(0), bot = Y(uMax);
  // rounded closed tip
  c.save(); c.beginPath(); c.ellipse(X(0), Y(R), R * s, R * s, 0, Math.PI, TAU); c.lineTo(X(R), bot); c.lineTo(X(-R), bot); c.closePath();
  PIX.flat(c, (() => { const p = new Path2D(); p.ellipse(X(0), Y(R), R * s, R * s, 0, Math.PI, TAU); p.lineTo(X(R), bot); p.lineTo(X(-R), bot); p.closePath(); return p; })(), 'q5', 'q3', 'q6', [2, 0], [1, 0]);
  c.restore();
  // the drainage lumen (cut open: dark), from just under the tip down
  const lumTop = Y(R * 0.9);
  rect(c, X(DL0), lumTop, (DL1 - DL0) * s, bot - lumTop, 'n0');
  c.save(); c.beginPath(); c.ellipse(X((DL0 + DL1) / 2), lumTop, (DL1 - DL0) / 2 * s, 1.2 * s, 0, Math.PI, TAU); c.fillStyle = P.n0; c.fill(); c.restore();
  // the balloon lumen in the right wall: from below the eyes down; its inflation port at u = 25 through the outer wall
  const bTop = Y(20);
  rect(c, X(BL0), bTop, (BL1 - BL0) * s, bot - bTop, 'g2');
  rect(c, X(BL0), Y(PORT - 0.8), (R - BL0 + 0.2) * s, 1.6 * s, 'g2');
  // the eyes: openings through both walls
  for (const sg of [-1, 1]) rect(c, sg < 0 ? X(-R - 0.2) : X(DL1), Y(EYE[0]), sg < 0 ? (R + 0.2 + DL0) * s : (R - DL1 + 0.2) * s, (EYE[1] - EYE[0]) * s, 'n0');
  // overlays
  if (o.drain > 0) { c.save(); c.globalAlpha = o.drain; K.dith(c, X(DL0), lumTop, (DL1 - DL0) * s, bot - lumTop, 'a0', 0.55); c.restore(); }
  if (o.chan > 0) {
    const len = (bot - Y(PORT)) * o.chan;
    rect(c, X(BL0) + 1, bot - len, Math.max(1, (BL1 - BL0) * s - 2), len, 'c2');
    if (o.chan >= 1) { rect(c, X(BL0), Y(PORT - 0.8), (R - BL0 + 0.2) * s, 1.6 * s, 'c3'); }
    if (o.chan < 1) { const yy = bot - len; PIX.rect(c, Math.round(X((BL0 + BL1) / 2)) - 2, Math.round(yy) - 2, 5, 5, 'c4'); }
  }
  // urine: markers entering by the eyes and running down the lumen (direction only)
  if (o.flow > 0) {
    const t = o.t || 0, n = 26;
    for (let k = 0; k < n; k++) {
      const ph = K.wrap(t * 0.55 + k / n, 1), x = lerp(DL0 + 0.4, DL1 - 0.4, h(k, 3));
      const u = lerp(EYE[1] - 1, uMax + 4, ph), yy = Y(u);
      if (yy > bot || yy < lumTop) continue;
      c.save(); c.globalAlpha = o.flow; PIX.rect(c, Math.round(X(x)), Math.round(yy), 2, Math.max(2, Math.round(1.6 * s)), k % 3 ? 'f3' : 'f4'); c.restore();
    }
  }
  if (o.eyeFlow > 0) {
    const t = o.t || 0;
    for (const sg of [-1, 1]) for (let k = 0; k < 6; k++) {
      const ph = K.wrap(t * 0.7 + k / 6 + (sg > 0 ? 0.5 : 0), 1), sx = sg * lerp(R + 3.5, (DL0 + DL1) / 2 - sg * 0.6, MO.cubicIn(Math.min(1, ph * 1.4))), u = lerp((EYE[0] + EYE[1]) / 2 - 1.5 + h(k, sg + 5) * 3, EYE[1] + 6, MO.cubicIn(Math.max(0, ph * 1.4 - 0.4)));
      c.save(); c.globalAlpha = o.eyeFlow; PIX.rect(c, Math.round(X(sx)), Math.round(Y(u)), 3, 3, 'f3'); PIX.rect(c, Math.round(X(sx)), Math.round(Y(u)), 1, 1, 'f4'); c.restore();
    }
  }
  return { X, Y, top, bot };
};
// ---------- cross-section. o = {drain, chan (0..1 highlight), t}
DEV.cross = (c, cx, cy, s, o = {}) => {
  const outer = PIX.circPath(cx, cy, R * s);
  PIX.flat(c, outer, 'q5', 'q3', 'q6', [3, 3], [-2, -2]);
  // the D-shaped drainage lumen: a circle cut by the partition line at x = DL1
  const lum = new Path2D(); const rL = (DL1 - DL0) / 2 * 1.06, cxL = (DL0 + DL1) / 2;
  lum.ellipse(cx + cxL * s, cy, rL * s, 1.95 * s, 0, 0, TAU);
  c.save(); c.beginPath(); c.rect(cx - R * s, cy - R * s, (DL1 + R) * s, 2 * R * s); c.clip(); PIX.fill(c, lum, 'n0'); c.restore();
  const sl = PIX.circPath(cx + 2.0 * s, cy, 0.34 * s); PIX.fill(c, sl, 'g2');
  const pulse = 0.5 + 0.5 * Math.sin((o.t || 0) * 3);
  if (o.drain > 0) {
    c.save(); c.beginPath(); c.rect(cx - R * s, cy - R * s, (DL1 + R) * s, 2 * R * s); c.clip(); c.clip(lum);
    c.globalAlpha = o.drain; PIX.rect(c, cx - R * s, cy - R * s, 2 * R * s, 2 * R * s, 'a0');
    for (let y = Math.floor(cy - R * s); y < cy + R * s; y++) for (let x = Math.floor(cx - R * s); x < cx + DL1 * s; x++) if (K.BAY(x, y) < 0.18 + 0.12 * pulse) PIX.rect(c, x, y, 1, 1, 'a1');
    c.restore();
    c.save(); c.beginPath(); c.rect(cx - R * s, cy - R * s, (DL1 + R) * s, 2 * R * s); c.clip(); c.globalAlpha = o.drain; c.strokeStyle = P.a2; c.lineWidth = 2; c.stroke(lum); c.restore();
  }
  if (o.chan > 0) { c.save(); c.globalAlpha = o.chan; PIX.fill(c, sl, 'c2'); c.restore(); FX.ring(c, cx + 2.0 * s, cy, 0.34 * s + 2, 'c3', o.chan); }
  // re-cut the partition so the amber never spills past it
  rect(c, cx + DL1 * s, cy - 1.7 * s, (BL0 - DL1) * s, 3.4 * s, 'q5');
  return { lumen: [cx + cxL * s, cy], small: [cx + 2.0 * s, cy] };
};
// ---------- the tip in 3D: orthographic ray cast. v = {cx, cy (screen of the tip end), s, yaw (rotation about the axis)};
// the axis is vertical, tip up; eyes at azimuth ±90° in the catheter's frame; the expanded balloon below (translucent)
DEV.macro = (c, v, o = {}) => {
  const s = v.s, x0 = Math.max(0, Math.floor(v.cx - 16 * s)), x1 = Math.min(W, Math.ceil(v.cx + 16 * s)), y0 = Math.max(0, Math.floor(v.cy - 2)), y1 = Math.min(H, Math.ceil(v.cy + 46 * s));
  const img = c.getImageData(x0, y0, x1 - x0, y1 - y0), d = img.data, w = x1 - x0;
  const iv = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'w'].map(k => PIX.hex(P[k])), dark = PIX.hex(P.n0), rimC = PIX.hex(P.q2), lumC = PIX.hex(P.g1);
  const bal = ['l0', 'l1', 'l2', 'l3', 'l4'].map(k => PIX.hex(P[k]));
  const cy_ = Math.cos(v.yaw), sy_ = Math.sin(v.yaw), L = [-0.55, 0.62, 0.56];
  const balC = (BAL[0] + BAL[1]) / 2, balRx = 11, balRy = 10.5;
  for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) {
    const X = (px + 0.5 - v.cx) / s, u = (py + 0.5 - v.cy) / s;                     // X across the screen, u down the axis from the tip end
    let col = null;
    // the shaft: capsule of radius R, axis vertical, tip at u = 0 (hemisphere centre at u = R)
    let hitZ = null, nx = 0, ny = 0, nz = 0;
    if (Math.abs(X) < R) {
      if (u >= R) { const z = Math.sqrt(R * R - X * X); hitZ = z; nx = X / R; ny = 0; nz = z / R; }
      else { const dy = u - R, q = R * R - X * X - dy * dy; if (q > 0) { const z = Math.sqrt(q); hitZ = z; nx = X / R; ny = dy / R; nz = z / R; } }
    }
    if (hitZ != null && u < balC + 30) {
      // the surface point's azimuth in the catheter's own frame (rotated by yaw): eyes at ±90°
      const az = Math.atan2(nx, nz) + v.yaw, a = Math.atan2(Math.sin(az), Math.cos(az));
      const inEye = u > EYE[0] && u < EYE[1] && (Math.abs(a - Math.PI / 2) < 0.62 || Math.abs(a + Math.PI / 2) < 0.62);
      const em = inEye ? Math.min(Math.abs(Math.abs(a) - Math.PI / 2) / 0.62, Math.max(Math.abs(u - (EYE[0] + EYE[1]) / 2) / ((EYE[1] - EYE[0]) / 2), 0)) : 1;
      if (inEye && em < 0.82) col = em > 0.6 ? rimC : (nz > 0.5 ? lumC : dark);
      else {
        const lam = Math.max(0, nx * L[0] - ny * L[1] + nz * L[2]), spec = Math.pow(lam, 16), b = PIX.BAYER[(py & 3) << 2 | (px & 3)] + 0.5;
        col = nz < 0.25 ? iv[0] : spec > 0.6 ? iv[6] : iv[clamp(Math.round((0.15 + 0.85 * lam) * 5 + b - 0.5), 1, 5)];
      }
    }
    // the expanded balloon round the shaft: an ellipsoid, translucent pale blue over the shaft and the urine behind
    const bu = (u - balC) / balRy, bx = X / balRx, bq = bx * bx + bu * bu;
    if (bq < 1) {
      const b = PIX.BAYER[(py & 3) << 2 | (px & 3)] + 0.5, rim = bq > 0.86;
      const bz = Math.sqrt(1 - bq), lam = Math.max(0, -bx * 0.55 - bu * 0.6 + bz * 0.6);
      if (rim) col = bq > 0.95 ? bal[1] : bal[3];
      else if (b < 0.5) col = bal[clamp(Math.round(1 + lam * 2.4), 1, 3)];
      if (!rim && Math.hypot(bx + 0.45, bu + 0.45) < 0.16) col = bal[4];
    }
    if (!col) continue;
    const i = ((py - y0) * w + (px - x0)) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  c.putImageData(img, x0, y0);
};
// ---------- the outer end: the bifurcation. v = {cx, cy (junction), s}; o = {drain, chan, t, tubing (1)}
DEV.ports = (c, v, o = {}) => {
  const s = v.s, J = [v.cx, v.cy];
  const shaft = new Path2D(); shaft.rect(J[0] - R * s, -20, 2 * R * s, J[1] + 20);
  PIX.flat(c, shaft, 'q5', 'q3', 'q6', [3, 0], [-1, 0]);
  // the main drainage connector: a funnel widening downward, with the bag's tubing pushed onto it
  const f = new Path2D(); f.moveTo(J[0] - R * s, J[1]); f.lineTo(J[0] - 5.2 * s, J[1] + 26 * s); f.lineTo(J[0] + 5.2 * s, J[1] + 26 * s); f.lineTo(J[0] + R * s, J[1]); f.closePath();
  PIX.flat(c, f, 'q5', 'q3', 'q6', [3, 2], [-1, -1]);
  if (o.tubing !== false) { const tb = new Path2D(); tb.rect(J[0] - 4.2 * s, J[1] + 22 * s, 8.4 * s, H); PIX.flat(c, tb, 'g8', 'g6', 'g9', [3, 0], [-1, 0]); rect(c, J[0] - 4.6 * s, J[1] + 22 * s, 9.2 * s, 2 * s, 'g7'); }
  // the side arm with the balloon valve (a small cylinder with a cap)
  c.save(); c.translate(J[0] + R * s * 0.5, J[1] + 2 * s); c.rotate(-0.62);
  const arm = new Path2D(); arm.rect(0, -1.8 * s, 20 * s, 3.6 * s); PIX.flat(c, arm, 'q5', 'q3', 'q6', [0, 2], [0, -1]);
  const valve = new Path2D(); valve.rect(18 * s, -3.6 * s, 10 * s, 7.2 * s); PIX.flat(c, valve, 'g6', 'g4', 'g8', [2, 2], [-1, -1]);
  rect(c, 27 * s, -2.4 * s, 2.4 * s, 4.8 * s, 'g9');
  c.restore();
  // overlays: the drainage path down the shaft, the funnel and into the tubing; the balloon channel up the side arm
  const t = o.t || 0;
  if (o.drain > 0) {
    c.save(); c.globalAlpha = o.drain;
    for (let k = 0; k < 14; k++) { const ph = K.wrap(t * 0.5 + k / 14, 1), y = lerp(-10, J[1] + 60 * s, ph); PIX.rect(c, Math.round(J[0]) - 1, Math.round(y), 3, Math.max(3, Math.round(2.5 * s)), 'a1'); }
    c.restore();
  }
  if (o.chan > 0) {
    c.save(); c.translate(J[0] + R * s * 0.5, J[1] + 2 * s); c.rotate(-0.62);
    PIX.rect(c, 0, -1, Math.round(26 * s * o.chan), 2, 'c3');
    c.restore();
    const n = Math.round((J[1] + 20) * o.chan);
    PIX.rect(c, Math.round(J[0] + 2.0 * s) - 1, Math.round(J[1] - n), 2, n, 'c3');
  }
  return { valve: [J[0] + R * s * 0.5 + Math.cos(-0.62) * 23 * s, J[1] + 2 * s + Math.sin(-0.62) * 23 * s], drain: [J[0], J[1] + 34 * s] };
};
})();
