'use strict';
// ============================================================================
// THE HUMAN-SCALE WORLD (units: mm, y down). One vertical stack that suits the
// 9:16 frame: a fingertip points down from the top, the lancing pen comes in
// from the lower right, the drop hangs under the pad, the test strip stands
// tip-up in the meter below. Everything that happens later flows downward:
// blood down the strip, electrons down the electrode, data into the meter.
// Light from the upper right. Kurzgesagt flat shading: base + lit rim +
// same-hue shadow band, no black outlines.
// ============================================================================
const LITE = [0.6, -0.8];
// ---------------------------------------------------------------- background (navy lab, soft bokeh with parallax)
const BOKEH = [];
for (let i = 0; i < 9; i++) BOKEH.push({ x: hash(i * 7 + 1) * 340 - 35, y: hash(i * 7 + 2) * 560 - 40, r: 26 + 46 * hash(i * 7 + 3), c: i % 3, ph: hash(i * 7 + 4) * TAU, k: 0.05 + 0.08 * hash(i * 7 + 5) });
const DUST = [];
for (let i = 0; i < 46; i++) DUST.push({ x: hash(i + 900) * W, y: hash(i + 901) * H, k: 0.1 + 0.3 * hash(i + 902), ph: hash(i + 903) * TAU, s: hash(i + 904) });
function bgM(cam, t) {
  // flat ground with two broad dithered bands (no gradient look)
  rect(0, 0, W, H, P.BG);
  rect(0, 0, W, 150, P.N1, 0.5); rect(0, 300, W, H, P.K0, 0.35);
  const lz = Math.log(cam.z);
  for (const b of BOKEH) {
    const x = ((b.x - cam.cx * b.k * 6 + 24 * wob(t, 1, b.ph)) % 360 + 360) % 360 - 45;
    const y = ((b.y - cam.cy * b.k * 6 + 16 * wob(t, 1, b.ph + 1)) % 600 + 600) % 600 - 60;
    const r = b.r * (1 + 0.12 * lz);
    disc(x, y, r, [P.N2, P.N3, P.N2][b.c], 0.42); disc(x, y, r * 0.7, [P.N2, P.N3, P.N4][b.c], 0.3);
  }
  for (const d of DUST) {
    const x = ((d.x + 14 * wob(t, 2, d.ph) - cam.cx * d.k * 2) % W + W) % W, y = ((d.y - t * 3 * d.k * 10 - cam.cy * d.k * 2) % H + H) % H;
    pset(x, y, d.s > 0.7 ? P.N6 : P.N5);
  }
}
// ---------------------------------------------------------------- the fingertip (pointing down; nail on the left, pad on the right)
const FING = { x: -5.2, tipY: 0, hw: 8 };
const PA = 0.9, PN = [Math.cos(PA), Math.sin(PA)];
const PUNCT = [FING.x + FING.hw * PN[0], FING.tipY - FING.hw + FING.hw * PN[1]];   // puncture site, side of the pad
function fingerSD(x, y) {
  const cy = FING.tipY - FING.hw;
  if (y < cy) { const hw = FING.hw * (1 + (cy - y) * 0.006); return Math.abs(x - FING.x) - hw; }
  return Math.hypot(x - FING.x, y - cy) - FING.hw;
}
function drawFinger(cam, t) {
  const z = cam.z, iz = 1 / z, cy = FING.tipY - FING.hw, bob = 0.06 * wob(t, 5, 0.3);
  const x0 = Math.max(0, Math.floor(cam.x(FING.x - FING.hw * 1.4))), x1 = Math.min(W, Math.ceil(cam.x(FING.x + FING.hw * 1.4)));
  const y1 = Math.min(H, Math.ceil(cam.y(FING.tipY + bob + 1)));
  if (x1 <= 0 || x0 >= W || y1 <= 0) return;
  const px = Math.max(1, iz);            // one screen pixel in mm
  for (let sy = 0; sy < y1; sy++) {
    const wy = (sy + 0.5 - cam.ay) * iz + cam.cy - bob;
    for (let sx = x0; sx < x1; sx++) {
      const wx = (sx + 0.5 - cam.ax) * iz + cam.cx;
      const d = fingerSD(wx, wy); if (d > 0) continue;
      let nx, ny;
      if (wy < cy) { nx = Math.sign(wx - FING.x) || 1; ny = 0; } else { const l = Math.hypot(wx - FING.x, wy - cy) || 1; nx = (wx - FING.x) / l; ny = (wy - cy) / l; }
      const lit = LITE[0] * nx + LITE[1] * ny, depth = -d;
      let col = P.SK3;
      if (lit > 0.25 && depth < Math.max(0.5, 1.6 * px)) col = P.SK4;
      else if (lit < -0.45 && depth < Math.max(0.6, 1.4 * px)) col = P.SK1;
      else if (lit < -0.2 && depth < 2.6) col = P.SK2;
      else if (lit < 0.05 && depth < 1.6 && bay(sx, sy) < 0.5) col = P.SK2;
      // the nail, seen in profile on the back of the finger
      const nT = cy - 11, nB = cy + 3.6;
      if (wx < FING.x && wy > nT && wy < nB && depth < 1.5) {
        const k = (wy - nT) / (nB - nT);
        col = depth < Math.max(0.35, px) ? P.NL0 : k > 0.86 ? P.NL2 : (depth > 1.05 ? P.SK2 : P.NL1);
      }
      // knuckle creases
      for (const cyK of [cy - 17.5, cy - 19]) if (Math.abs(wy - cyK - 0.8 * Math.cos((wx - FING.x) / FING.hw * 1.4)) < 0.22 * Math.max(1, px * 3) && depth > 1.2 && Math.abs(wx - FING.x) < FING.hw * 0.75) col = P.SK2;
      // fingerprint ridges on the pad (close-ups only)
      if (z > 7 && wx > FING.x - 1 && wy > cy - 9 && depth > 0.8 && (col === P.SK3 || col === P.SK4)) {
        const r = Math.hypot(wx - (FING.x + 4.2), wy - (cy + 1.5));
        if (((r * 1.9) % 1) < 0.16) col = P.SK2;
      }
      buf[sy * W + sx] = col;
    }
  }
}
// ---------------------------------------------------------------- the drop (a bead that swells on the pad and hangs)
function dropCenter(r, sag) { return [PUNCT[0] + PN[0] * r * 0.72, PUNCT[1] + PN[1] * r * 0.72 + r * 0.32 * sag]; }
function dropBottom(r, flat) { return dropCenter(r, 1)[1] + r * 1.1 * (1 - 0.14 * (flat || 0)); }
function drawDrop(cam, r, sag, t, opt) {
  if (r <= 0.04) return;
  opt = opt || {};
  const z = cam.z, bob = 0.06 * wob(t, 5, 0.3), c = dropCenter(r, sag);
  const jig = opt.jig || 0, wv = 1 + 0.05 * jig * Math.sin(t * 26), wh = 1 - 0.05 * jig * Math.sin(t * 26);
  const cx = cam.x(c[0]), cy = cam.y(c[1] + bob), R = r * z;
  const rx = R * (1 - 0.05 * sag) * wv * (opt.flat ? 1 + 0.18 * opt.flat : 1), ry = R * (1 + 0.1 * sag) * wh * (opt.flat ? 1 - 0.14 * opt.flat : 1);
  // neck where it leaves the skin
  if (r > 0.25) ellipse(cam.x(PUNCT[0] + PN[0] * r * 0.2), cam.y(PUNCT[1] + PN[1] * r * 0.2 + bob), R * 0.62, R * 0.5, P.BL2, undefined, PA);
  const m = maskEll(cx, cy, rx, ry, 0);
  shade(m, P.BL2, P.BL3, P.BL1, null, { k: Math.max(1, Math.round(R / 9)), kh: Math.max(1, Math.round(R / 12)) });
  if (R > 3) {
    ellipse(cx - rx * 0.22, cy + ry * 0.25, rx * 0.5, ry * 0.42, P.BL1, 0.45);
    ellipse(cx + rx * 0.32, cy - ry * 0.4, Math.max(1, rx * 0.24), Math.max(1, ry * 0.14), P.BL4, 1, -0.6);
    if (R > 6) pset(cx + rx * 0.5, cy - ry * 0.52, P.BL5);
    ring(cx, cy, Math.max(rx, ry) + 1, 1, P.BL1, 0.25);
  }
}
// ---------------------------------------------------------------- the lancing pen (nose at (x, y); a = direction from the nose to the back)
function drawLancet(cam, x, y, a, t, opt) {
  opt = opt || {};
  const z = cam.z, c = Math.cos(a), s = Math.sin(a);
  const L = (u, v) => [cam.x(x + u * c - v * s), cam.y(y + u * s + v * c)];
  // band between v = h0 (one side) and v = h1, from u0 to u1
  const band = (u0, u1, h0, h1, col) => poly([].concat(L(u0, h0), L(u1, h0), L(u1, h1), L(u0, h1)), col);
  // body: a long rounded tube (lit along the upper edge = side facing the light)
  band(10, 96, -6.4, 6.4, P.ST2); band(10, 96, -6.4, -3.6, P.ST3); band(10, 96, 3.6, 6.4, P.ST1); band(10, 96, 5.4, 6.4, P.ST0);
  // teal grip band with ribs, depth dial
  band(24, 38, -6.7, 6.7, P.TL1); band(24, 38, -6.7, -3.8, P.TL2); band(24, 38, 3.8, 6.7, P.TL0);
  for (let u = 25.5; u < 37; u += 2.2) band(u, u + 0.7, -6.7, 6.7, P.TL0);
  for (let u = 46; u < 60; u += 3) band(u, u + 0.9, -6.5, -5.2, P.ST1);
  // release button (on top) and the cocking end cap
  band(64, 72, -7.6, -6.2, P.TL1); band(64, 72, -7.6, -7.0, P.TL2);
  band(90, 96, -6.8, 6.8, P.ST1);
  // nose cap (clear, tapered), with the needle port
  poly([].concat(L(0.4, -3.2), L(10.4, -5.6), L(10.4, 5.6), L(0.4, 3.2)), P.ST1);
  poly([].concat(L(0.4, -3.2), L(10.4, -5.6), L(10.4, -2.6), L(0.4, -1.4)), P.ST2);
  const t0 = L(0.4, -3.2), t1 = L(0.4, 3.2); lineW(t0[0], t0[1], t1[0], t1[1], Math.max(1, 0.7 * z), P.ST0);
  if (opt.flash > 0) {           // click flash at the nose
    const f = opt.flash, q = L(-0.2, 0);
    for (let i = 0; i < 7; i++) { const an = a + Math.PI + (i - 3) * 0.42, r0 = (1.2 + 2.4 * (1 - f)) * z, r1 = r0 + 2.2 * z * f; line(q[0] + Math.cos(an) * r0, q[1] + Math.sin(an) * r0, q[0] + Math.cos(an) * r1, q[1] + Math.sin(an) * r1, i % 2 ? P.C6 : P.GL3); }
  }
}
// ---------------------------------------------------------------- the test strip (vertical, tip up; (x, y) = centre of the tip edge)
const STRIP = { L: 34, hw: 2.8, w0: 0.25, w1: 6.5, cw: 0.7 };     // length, half width, window top/bottom, channel half width
// electrode bands as fractions of the window (same numbers as the cross-section: CE/RE, WE, fill detect)
const EBANDS = [[0.1, 0.325, 'AG'], [0.3875, 0.725, 'AU'], [0.7875, 0.9125, 'AG']];
const TRACE_X = [-1.9, 1.5, -1.2];                                 // lead of each band down the strip
const PAD_X = [-1.8, 1.8, 0];
function stripWinY(f) { return STRIP.w0 + (STRIP.w1 - STRIP.w0) * f; }
// opt: fill (0..1 of the window), sig (signal pulse phase or <0), glow (contact glow), show (0..1 for strips that fade in)
function drawStrip(cam, x, y, t, opt) {
  opt = opt || {};
  const z = cam.z, X = u => cam.x(x + u), Y = v => cam.y(y + v), hw = STRIP.hw, L = STRIP.L;
  const px = 1 / z;
  // body
  rect(X(-hw), Y(0.5), X(hw), Y(L), P.ST3);
  poly([X(-hw), Y(0.55), X(-hw + 0.5), Y(0), X(hw - 0.5), Y(0), X(hw), Y(0.55)], P.ST3);
  rect(X(hw - Math.max(0.3, px * 1.2)), Y(0.5), X(hw), Y(L), P.ST1);                       // shadow edge (right)
  rect(X(-hw), Y(0.6), X(-hw + Math.max(0.15, px)), Y(L), P.C6);                             // lit edge (left)
  // printed carbon/metal traces under the clear cover
  if (z > 1.2) {
    for (let k = 0; k < 3; k++) {
      const b = EBANDS[k], tx = TRACE_X[k], col = b[2] === 'AU' ? (z > 3 ? P.AU2 : P.AU1) : (z > 3 ? P.AG2 : P.AG1);
      const by0 = stripWinY(b[0]), by1 = stripWinY(b[1]), tw = 0.32;
      rect(X(Math.min(-STRIP.cw - 0.15, tx)), Y(by0), X(Math.max(STRIP.cw + 0.15, tx + tw)), Y(by1), col);   // band across the channel + lead
      let jy = 20;
      if (k === 2) { rect(X(tx), Y(by0), X(tx + tw), Y(jy), col); rect(X(Math.min(tx, PAD_X[k])), Y(jy), X(Math.max(tx, PAD_X[k]) + tw), Y(jy + tw), col); rect(X(PAD_X[k]), Y(jy), X(PAD_X[k] + tw), Y(L - 5.5), col); }
      else rect(X(tx), Y(by0), X(tx + tw), Y(L - 5.5), col);
      // contact pad
      rect(X(PAD_X[k] - 0.55), Y(L - 5.6), X(PAD_X[k] + 0.85), Y(L - 0.8), col);
      if (z > 4) rect(X(PAD_X[k] - 0.55), Y(L - 5.6), X(PAD_X[k] + 0.85), Y(L - 5.6 + px * 1.2), b[2] === 'AU' ? P.AU3 : P.AG3);
    }
    if (opt.sig !== undefined && opt.sig >= 0) {            // green pulses running down the working-electrode lead
      const k = 1, tx = TRACE_X[k] + 0.16, by1 = stripWinY(EBANDS[k][1]);
      for (let q = 0; q < 7; q++) {
        const v = by1 + (((opt.sig * 14 + q * 4.2) % (L - 6 - by1)) + (L - 6 - by1)) % (L - 6 - by1);
        const hl = Math.max(0.5, 2.2 * px);
        rect(X(tx - 0.42), Y(v - 1.1), X(tx + 0.42), Y(v + 0.3), P.SG2);
        rect(X(tx - 0.24), Y(v - 2.6), X(tx + 0.24), Y(v - 1.1), P.SG1);
        if (z > 5) rect(X(tx - 0.42), Y(v + 0.3 - hl * 0.4), X(tx + 0.42), Y(v + 0.3), P.SG3);
      }
    }
  }
  // the capillary window over the channel
  rect(X(-STRIP.cw - 0.12), Y(STRIP.w0), X(STRIP.cw + 0.12), Y(STRIP.w1 + 0.12), P.ST1);
  rect(X(-STRIP.cw), Y(STRIP.w0), X(STRIP.cw), Y(STRIP.w1), P.ST2, z > 3 ? 0.55 : 1);
  if (opt.fill > 0) {
    const fy = stripWinY(clamp(opt.fill, 0, 1));
    rect(X(-STRIP.cw), Y(0), X(STRIP.cw), Y(fy), P.BL2);
    rect(X(-STRIP.cw), Y(0), X(-STRIP.cw + Math.max(0.12, px)), Y(fy), P.BL3);
    if (opt.fill < 1) rect(X(-STRIP.cw), Y(fy - Math.max(0.12, px)), X(STRIP.cw), Y(fy), P.BL1);
  }
  // inlet notch at the tip
  const nr = Math.max(1.2, 0.55 * z); disc(X(0), Y(-0.02), nr, P.ST1); disc(X(0), Y(-0.15), nr * 0.8, opt.fill > 0 ? P.BL2 : P.ST2);
  // teal band + insert arrow (printed)
  if (z > 0.8) {
    rect(X(-hw), Y(10.5), X(hw), Y(13), P.TL1); rect(X(-hw), Y(10.5), X(hw), Y(10.5 + Math.max(0.2, px)), P.TL2);
    const ax = X(0), ay = Y(17.2), s = Math.max(2, 1.0 * z);
    poly([ax - s, ay - s * 0.6, ax, ay + s * 0.5, ax + s, ay - s * 0.6, ax + s, ay - s * 0.1, ax, ay + s, ax - s, ay - s * 0.1], P.ST1);
  }
}
// ---------------------------------------------------------------- the meter (portrait; strip port on top)
// g = {x, y: top centre, sx: horizontal squash (turning), side: side-face width (mm), cut: 0..1 cutaway, disp: display state}
const MET = { hw: 22, h: 80, r: 8, dx0: -17, dx1: 17, dy0: 9, dy1: 33, by: 47 };
function meterSD(u, v) {             // signed distance of a rounded rect in meter coords (u: from centre, v: from top)
  const qx = Math.abs(u) - (MET.hw - MET.r), qy = Math.abs(v - MET.h / 2) - (MET.h / 2 - MET.r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - MET.r;
}
function meterMask(cam, g, grow) {
  const u0 = -MET.hw - (g.side || 0), x0 = cam.x(g.x + u0 * g.sx), x1 = cam.x(g.x + MET.hw * g.sx), y0 = cam.y(g.y), y1 = cam.y(g.y + MET.h);
  return maskFn(x0 - 2, y0 - 2, x1 + 2, y1 + 2, (sx, sy) => meterSD((cam.wx(sx) - g.x) / g.sx, cam.wy(sy) - g.y) < (grow || 0) / g.sx);
}
function drawMeter(cam, g, t) {
  const z = cam.z, X = u => cam.x(g.x + u * g.sx), Y = v => cam.y(g.y + v), px = 1 / z;
  if (!onScreen(X(-MET.hw - (g.side || 0)) , Y(-3), X(MET.hw), Y(MET.h), 4)) return;
  // side face (visible while the meter is turned)
  if (g.side > 0.2) {
    poly([X(-MET.hw) - g.side * z, Y(MET.r * 0.6), X(-MET.hw), Y(MET.r * 0.3), X(-MET.hw), Y(MET.h - MET.r * 0.3), X(-MET.hw) - g.side * z, Y(MET.h - MET.r * 0.6)], P.MC1);
    poly([X(-MET.hw) - g.side * z, Y(MET.r * 0.6), X(-MET.hw), Y(MET.r * 0.3), X(-MET.hw), Y(MET.r * 0.3 + 2), X(-MET.hw) - g.side * z, Y(MET.r * 0.6 + 2)], P.MC2);
  }
  // body
  const m = meterMask(cam, g, 0);
  shade(m, P.MC3, P.MC4, P.MC2, null, { k: Math.max(1, Math.round(1.2 * z * g.sx)), kh: Math.max(1, Math.round(0.6 * z)) });
  // port collar on top
  rect(X(-4.6), Y(-0.9), X(4.6), Y(2.6), P.MC2); rect(X(-4.6), Y(-0.9), X(4.6), Y(-0.9 + Math.max(0.3, px)), P.MC4);
  rect(X(-3.3), Y(-0.4), X(3.3), Y(1.4), P.MC0);
  rect(X(-4.6), Y(2.0), X(4.6), Y(2.6), P.TL1);
  // display bezel + LCD
  const cut = g.cut || 0;
  if (cut < 1) {
    rect(X(MET.dx0 - 1.4), Y(MET.dy0 - 1.4), X(MET.dx1 + 1.4), Y(MET.dy1 + 1.4), P.MC1);
    rect(X(MET.dx0 - 1.4), Y(MET.dy1 + 1.4 - Math.max(0.3, px)), X(MET.dx1 + 1.4), Y(MET.dy1 + 1.4), P.MC4);
    drawLCD(cam, g, t);
    // buttons
    const bx = X(0), by = Y(MET.by), br = 6.2 * z * Math.min(1, g.sx + 0.15);
    ellipse(bx, by, 6.2 * z * g.sx, 6.2 * z, P.TL0); ellipse(bx, by - 0.4 * z, 5.4 * z * g.sx, 5.3 * z, P.TL1); ellipse(bx - 1.2 * z * g.sx, by - 1.6 * z, 2.2 * z * g.sx, 1.2 * z, P.TL2);
    for (const sxn of [-1, 1]) { const qx = X(sxn * 14), qy = Y(MET.by); ellipse(qx, qy, 2.6 * z * g.sx, 2.6 * z, P.MC1); ellipse(qx, qy - 0.4 * z, 2.1 * z * g.sx, 2.0 * z, P.MC2); }
    for (let k = 0; k < 4; k++) rect(X(-6 + k * 4), Y(66), X(-4 + k * 4), Y(71), P.MC2);
  }
}
// ---------------------------------------------------------------- the LCD
// segments in a digit box (w 7.6, h 13 mm): [x0, y0, x1, y1] bars
const SEG_DEF = { a: [1.1, 0, 6.5, 1.3], b: [6.3, 0.9, 7.6, 6.2], c: [6.3, 6.8, 7.6, 12.1], d: [1.1, 11.7, 6.5, 13], e: [0, 6.8, 1.3, 12.1], f: [0, 0.9, 1.3, 6.2], g: [1.1, 5.85, 6.5, 7.15] };
const DIGITS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '' };
function seg7(X, Y, ox, oy, ch, on, off, z) {
  const lit = DIGITS[ch] || '';
  for (const k in SEG_DEF) {
    const [a, b, c, d] = SEG_DEF[k], isOn = lit.indexOf(k) >= 0, col = isOn ? on : off;
    if (col === null) continue;
    const x0 = X(ox + a), y0 = Y(oy + b), x1 = X(ox + c), y1 = Y(oy + d), bev = Math.min(x1 - x0, y1 - y0) * 0.5;
    if (x1 - x0 > y1 - y0) poly([x0 + bev, y0, x1 - bev, y0, x1, (y0 + y1) / 2, x1 - bev, y1, x0 + bev, y1, x0, (y0 + y1) / 2], col);
    else poly([x0, y0 + bev, (x0 + x1) / 2, y0, x1, y0 + bev, x1, y1 - bev, (x0 + x1) / 2, y1, x0, y1 - bev], col);
  }
}
// display state from the story clock: g.disp = {mode, digits, k (slam scale per digit), unit, blink, glow}
function drawLCD(cam, g, t) {
  const z = cam.z, X = u => cam.x(g.x + u * g.sx), Y = v => cam.y(g.y + v), D = g.disp || { mode: 'off' };
  const x0 = X(MET.dx0), y0 = Y(MET.dy0), x1 = X(MET.dx1), y1 = Y(MET.dy1);
  rect(x0, y0, x1, y1, D.mode === 'off' ? P.LC0 : P.LC1);
  rect(x0, y0, x1, y0 + Math.max(1, 0.5 * z), P.LC0);
  if (D.mode === 'off') return;
  if (D.glow > 0) rect(x0, y0 + Math.max(1, 0.5 * z), x1, y1, P.LC2, 0.3 * D.glow);     // backlight pulse (behind the segments)
  const on = P.LC3, ghost = z > 3 ? P.LC2 : null;
  const dX = u => X(MET.dx0 + u), dY = v => Y(MET.dy0 + v);
  const xs = [5.2, 13.8, 22.4];
  for (let i = 0; i < 3; i++) {
    const ch = D.digits ? D.digits[i] : ' ';
    const k = D.k ? D.k[i] : 1;
    if (k > 1.001) {                      // slam: the digit lands big and settles (drawn around its centre)
      const cxD = MET.dx0 + xs[i] + 3.8, cyD = MET.dy0 + 4.2 + 6.5;
      const sX = u => cam.x(g.x + (cxD + (u - (MET.dx0 + xs[i] + 3.8)) * k) * g.sx), sY = v => cam.y(g.y + cyD + (v - cyD) * k);
      seg7(u => sX(u), v => sY(v), MET.dx0 + xs[i], MET.dy0 + 4.2, ch, P.LC4, null, z);
    } else seg7(u => X(u), v => Y(v), MET.dx0 + xs[i], MET.dy0 + 4.2, ch, k > 0 ? (D.hot ? P.LC4 : on) : ghost, ghost, z);
  }
  // unit
  const sc = Math.max(1, Math.round(z * 0.36));
  if (D.unit > 0) text(FM, 'mg/dL', dX(23.2), dY(18.8), { sc, c: D.unit > 1 ? P.LC4 : P.LC3, ol: null });
  else if (ghost !== null) text(FM, 'mg/dL', dX(23.2), dY(18.8), { sc, c: P.LC2, ol: null });
  // status icons: strip + drop (apply sample), battery
  const ic = D.mode === 'apply' ? (D.blink ? P.LC3 : P.LC2) : P.LC2;
  rect(dX(1.4), dY(1.0), dX(2.4), dY(3.6), ic); disc(dX(4.1), dY(2.6), Math.max(1, 0.7 * z), ic); poly([dX(3.4), dY(2.4), dX(4.1), dY(0.9), dX(4.8), dY(2.4)], ic);
  rect(dX(29.6), dY(1.2), dX(32.4), dY(2.8), P.LC2); rect(dX(32.4), dY(1.6), dX(32.8), dY(2.4), P.LC2); rect(dX(29.9), dY(1.5), dX(31.6), dY(2.5), P.LC3);
}
// ---------------------------------------------------------------- the circuit board (seen when the casing opens)
// meter-local coords (u from centre, v from top)
const PCB = {
  conn: [-5, 1.5, 5, 9.5], afe: [10, 14.5, 3.2, 2.6], adc: [-10, 21.5, 2.6, 2.6], mcu: [0, 34, 5, 5],
  xtal: [9.5, 30], flex: [0, 46.5], cell: [0, 62, 10],
};
// signal routes (meter-local polylines): contact -> AFE -> ADC -> MCU -> display
const ROUTE = [
  [1.8, 8.6, 1.8, 11, 6.8, 11, 6.8, 14.5],
  [13.2, 14.5, 15.2, 14.5, 15.2, 21.5, -7.4, 21.5],
  [-10, 24.1, -10, 28.5, -3.2, 28.5, -3.2, 29],
  [0, 39, 0, 45],
];
let ROUTE_P = null;
function routePaths() { if (!ROUTE_P) ROUTE_P = ROUTE.map(r => new Path(r)); return ROUTE_P; }
function drawPCB(cam, g, t, st) {
  st = st || {};
  const z = cam.z, X = u => cam.x(g.x + u * g.sx), Y = v => cam.y(g.y + v), px = 1 / z;
  // board
  rect(X(-19.6), Y(1.4), X(19.6), Y(77.4), P.PC1);
  rect(X(-19.6), Y(1.4), X(19.6), Y(1.4 + Math.max(0.35, px)), P.PC3);
  if (z > 2.5) for (let i = 0; i < 26; i++) { const u = -18 + 36 * hash(i + 60), v = 4 + 72 * hash(i + 61); rect(X(u), Y(v), X(u) + Math.max(1, 0.35 * z), Y(v) + Math.max(1, 0.35 * z), P.PC2); }   // vias
  // copper (gold) routes; the signal path glows when live
  const RP = routePaths(), tw = Math.max(1, 0.5 * z);
  // other traces (decor)
  const deco = [[-1.8, 8.6, -1.8, 12, 4, 12, 4, 13.2, 6.8, 13.2], [0, 9.4, 0, 10.4, 5.5, 10.4], [13.2, 13.2, 17, 13.2, 17, 40, 5, 40], [-12.6, 21.5, -16, 21.5, -16, 44, -4, 44, -4, 39], [5, 32, 8, 32, 8, 30], [-5, 37, -12, 37, -12, 52]];
  for (const d of deco) for (let i = 0; i + 3 < d.length; i += 2) lineW(X(d[i]), Y(d[i + 1]), X(d[i + 2]), Y(d[i + 3]), tw, P.PC3);
  RP.forEach((p, k) => { for (let i = 0; i + 3 < p.p.length; i += 2) lineW(X(p.p[i]), Y(p.p[i + 1]), X(p.p[i + 2]), Y(p.p[i + 3]), tw * 1.25, st.live && st.live[k] > 0 ? P.SG1 : P.AU1); });
  // signal pulses along the routes
  if (st.pulse) for (const [k, ph, n] of st.pulse) {
    const p = RP[k];
    for (let q = 0; q < n; q++) { const s = ((ph * 26 + q * p.L / n) % p.L + p.L) % p.L, a = p.at(s); disc(X(a[0]), Y(a[1]), Math.max(1.5, 0.75 * z), P.SG2); disc(X(a[0]), Y(a[1]), Math.max(1, 0.35 * z), P.SG3); }
  }
  // the strip connector: housing + spring contacts
  const [c0, c1, c2, c3] = PCB.conn;
  rect(X(c0), Y(c1), X(c2), Y(c3), P.CP1); rect(X(c0), Y(c3 - Math.max(0.4, px)), X(c2), Y(c3), P.CP0);
  rect(X(c0), Y(c1), X(c2), Y(c1 + Math.max(0.3, px)), P.CP2);
  // chips
  chipBox(X, Y, z, PCB.afe, 'side', st.hot && st.hot[0]);
  chipBox(X, Y, z, PCB.adc, 'quad', st.hot && st.hot[1]);
  chipBox(X, Y, z, PCB.mcu, 'quad', st.hot && st.hot[2]);
  // crystal, flex cable to the display, coin cell, passives
  ellipse(X(PCB.xtal[0]), Y(PCB.xtal[1]), 1.6 * z, 0.8 * z, P.AG2); ellipse(X(PCB.xtal[0] - 0.4), Y(PCB.xtal[1] - 0.3), 0.8 * z, 0.3 * z, P.AG3);
  rect(X(-9), Y(45), X(9), Y(48.5), P.TP1); for (let i = 0; i < 14; i++) rect(X(-8.2 + i * 1.2), Y(45.4), X(-7.7 + i * 1.2), Y(47.8), P.AU2);
  disc(X(0), Y(PCB.cell[1]), PCB.cell[2] * z, P.AG1); disc(X(0), Y(PCB.cell[1]), (PCB.cell[2] - 0.8) * z, P.AG2); disc(X(-2.5), Y(PCB.cell[1] - 3), 3 * z, P.AG3, 0.5);
  if (z > 2) { rect(X(-0.4), Y(PCB.cell[1] - 2), X(0.4), Y(PCB.cell[1] + 2), P.AG1); rect(X(-2), Y(PCB.cell[1] - 0.4), X(2), Y(PCB.cell[1] + 0.4), P.AG1); }
  const PASS = [[5, 6], [8, 6], [14, 8], [16, 18], [-6, 16], [-14, 15], [-15, 27], [6, 26], [12, 36], [-8, 41], [10, 44], [-14, 34]];
  for (const [u, v] of PASS) { rect(X(u - 0.9), Y(v - 0.45), X(u + 0.9), Y(v + 0.45), P.TP1); if (z > 4) { rect(X(u - 0.9), Y(v - 0.45), X(u - 0.5), Y(v + 0.45), P.AG2); rect(X(u + 0.5), Y(v - 0.45), X(u + 0.9), Y(v + 0.45), P.AG2); } }
  if (z > 2) for (let i = 0; i < 6; i++) pset(X(-17 + i * 0.8), Y(74), P.PC3);
}
function chipBox(X, Y, z, c, kind, hot) {
  const [u, v, hw, hh] = c, x0 = X(u - hw), x1 = X(u + hw), y0 = Y(v - hh), y1 = Y(v + hh);
  const lw = Math.max(1, 0.25 * z), ll = Math.max(1, 0.7 * z);
  const nPin = Math.max(3, Math.round(hh * 2 / 0.9)), nPinX = Math.max(3, Math.round(hw * 2 / 0.9));
  for (let i = 0; i < nPin; i++) { const y = lerp(y0 + ll * 0.6, y1 - ll * 0.6, nPin > 1 ? i / (nPin - 1) : 0.5); rect(x0 - ll, y - lw, x0, y + lw, P.AG2); rect(x1, y - lw, x1 + ll, y + lw, P.AG2); }
  if (kind === 'quad') for (let i = 0; i < nPinX; i++) { const x = lerp(x0 + ll * 0.6, x1 - ll * 0.6, nPinX > 1 ? i / (nPinX - 1) : 0.5); rect(x - lw, y0 - ll, x + lw, y0, P.AG2); rect(x - lw, y1, x + lw, y1 + ll, P.AG2); }
  rect(x0, y0, x1, y1, P.CP1); rect(x0, y0, x1, y0 + Math.max(1, 0.3 * z), P.CP2); rect(x1 - Math.max(1, 0.3 * z), y0, x1, y1, P.CP0);
  disc(x0 + (x1 - x0) * 0.18, y0 + (y1 - y0) * 0.2, Math.max(1, 0.3 * z), P.CP0);
  if (hot > 0) { rect(x0 + 2, y0 + 2, x1 - 2, y1 - 2, P.SG1, 0.35 * hot); ring((x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) * 0.75, 1, P.SG2, 0.6 * hot); }
}
// ---------------------------------------------------------------- the hand that holds the meter (right hand; palm behind)
function drawHandBack(cam, g, t) {        // palm and wrist behind the meter
  const z = cam.z, X = u => cam.x(g.x + u * g.sx), Y = v => cam.y(g.y + v);
  const pts = [X(-24), Y(54), X(-15), Y(86), X(-6), Y(140), X(24), Y(140), X(25), Y(90), X(20), Y(60)];
  const m = maskPoly(pts);
  shade(m, P.SK2, P.SK3, P.SK1, null, { k: Math.max(1, Math.round(0.8 * z)) });
}
function capsule(cam, X, Y, u0, v0, u1, v1, r, z, nail) {
  const a = [X(u0), Y(v0)], b = [X(u1), Y(v1)], R = r * z;
  const m = maskFn(Math.min(a[0], b[0]) - R - 1, Math.min(a[1], b[1]) - R - 1, Math.max(a[0], b[0]) + R + 1, Math.max(a[1], b[1]) + R + 1, (x, y) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, k = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / L2, 0, 1);
    return Math.hypot(x - a[0] - k * dx, y - a[1] - k * dy) < R;
  });
  shade(m, P.SK3, P.SK4, P.SK1, null, { k: Math.max(1, Math.round(0.45 * z)), kh: Math.max(1, Math.round(0.3 * z)) });
  if (nail) {                             // nail near the tip (b end)
    const dx = a[0] - b[0], dy = a[1] - b[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const cx = b[0] + ux * R * 0.75, cy = b[1] + uy * R * 0.75;
    ellipse(cx, cy, R * 0.55, R * 0.62, P.NL1, undefined, Math.atan2(uy, ux)); ellipse(cx - ux * R * 0.2 - R * 0.1, cy - uy * R * 0.2 - R * 0.15, R * 0.22, R * 0.25, P.NL2);
  }
}
function drawHandFront(cam, g, t) {       // fingertips curled round the left edge, thumb along the right edge
  const z = cam.z, X = u => cam.x(g.x + u * g.sx), Y = v => cam.y(g.y + v);
  const vis = clamp(g.sx * 1.4 - 0.3, 0, 1);
  if (vis > 0.05) {
    const F = [[44, 3.9, 6.0], [53.5, 4.0, 6.4], [63, 3.8, 6.0], [71.5, 3.3, 4.8]];
    for (const [v, r, reach] of F) capsule(cam, X, Y, -MET.hw - 3, v, -MET.hw + reach * vis, v - 0.6, r, z, true);
  }
  capsule(cam, X, Y, MET.hw + 8, 92, MET.hw - 3.2, 58, 4.6, z, false);
  capsule(cam, X, Y, MET.hw - 0.5, 64, MET.hw - 5.6, 50.5, 4.1, z, true);
}
