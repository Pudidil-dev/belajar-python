'use strict';
// ============================================================================
// THE HUMAN-SCALE WORLD (units: mm, y down). A hand seen from the thumb side,
// index finger raised, the nail facing right. The clip sits on the fingertip:
// the upper jaw (display, LEDs) on the nail side, the lower jaw (photodiode)
// on the pad side, the hinge above the tip. The display is drawn on the jaw's
// visible face, as in the usual pulse-oximeter icon. Light from the upper
// right. Kurzgesagt flat shading: base + lit rim + same-hue shadow band.
// ============================================================================
const LITE = [0.6, -0.8];
// ---------------------------------------------------------------- SDF helpers
function sdCap(px, py, ax, ay, bx, by, r) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
  const h = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - ax - dx * h, py - ay - dy * h) - r;
}
// capsule whose radius tapers from ra (at a) to rb (at b)
function sdTaper(px, py, ax, ay, bx, by, ra, rb) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
  const h = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - ax - dx * h, py - ay - dy * h) - (ra + (rb - ra) * h);
}
function sdRBox(px, py, x0, y0, x1, y1, r) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hx = (x1 - x0) / 2 - r, hy = (y1 - y0) / 2 - r;
  const qx = Math.abs(px - cx) - hx, qy = Math.abs(py - cy) - hy;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
function smin(a, b, k) { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); }
// rasterise an SDF layer over a screen box; col(wx, wy, d, nx, ny, sx, sy) -> colour or -1 (skip).
// The normal is only computed near the edge (within `band` screen px); inside it is (0, 0).
// Coarse-to-fine: each 4x4 block is tested at its centre first (the SDFs are distance-like), so blocks
// clearly outside are skipped and blocks deep inside skip the per-pixel distance (they get the centre's).
function sdfLayer(cam, x0, y0, x1, y1, sd, col, band) {
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
  if (x0 >= x1 || y0 >= y1) return;
  const iz = 1 / cam.z, e = 0.5 * iz, bw = (band || 4) * iz, B = 4, marg = 3.0 * iz, deepT = Math.max(bw + marg + 2 * iz, 3.6);
  for (let by = y0; by < y1; by += B) {
    const yb1 = Math.min(by + B, y1);
    for (let bx = x0; bx < x1; bx += B) {
      const xb1 = Math.min(bx + B, x1);
      const dc = sd((bx + B / 2 - cam.ax) * iz + cam.cx, (by + B / 2 - cam.ay) * iz + cam.cy);
      if (dc > marg) continue;
      const deep = dc < -deepT;
      for (let sy = by; sy < yb1; sy++) {
        const wy = (sy + 0.5 - cam.ay) * iz + cam.cy;
        for (let sx = bx; sx < xb1; sx++) {
          const wx = (sx + 0.5 - cam.ax) * iz + cam.cx;
          if (deep) { const c = col(wx, wy, dc, 0, 0, sx, sy); if (c !== -1) buf[sy * W + sx] = c; continue; }
          const d = sd(wx, wy); if (d > 0) continue;
          let nx = 0, ny = 0;
          if (d > -bw) { nx = sd(wx + e, wy) - sd(wx - e, wy); ny = sd(wx, wy + e) - sd(wx, wy - e); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; }
          const c = col(wx, wy, d, nx, ny, sx, sy);
          if (c !== -1) buf[sy * W + sx] = c;
        }
      }
    }
  }
}
// bake a static drawing into a world-space texture (R texels per mm); 0 = empty
function bakeWorld(x0, y0, x1, y1, R, drawFn) {
  const w = Math.ceil((x1 - x0) * R), h = Math.ceil((y1 - y0) * R), tex = new Uint32Array(w * h);
  const oW = W, oH = H, oCX = CX, oCY = CY, oBuf = buf;
  W = w; H = h; CX = w / 2; CY = h / 2; buf = tex;
  try { drawFn(new Cam(x0 + w / (2 * R), y0 + h / (2 * R), R, w / 2, h / 2)); } finally { W = oW; H = oH; CX = oCX; CY = oCY; buf = oBuf; }
  return { x0, y0, R, w, h, px: tex };
}
// draw a baked texture with the camera (nearest texel)
function blitWorld(cam, T) {
  const iz = 1 / cam.z;
  const sx0 = Math.max(0, Math.floor(cam.x(T.x0))), sx1 = Math.min(W, Math.ceil(cam.x(T.x0 + T.w / T.R)));
  const sy0 = Math.max(0, Math.floor(cam.y(T.y0))), sy1 = Math.min(H, Math.ceil(cam.y(T.y0 + T.h / T.R)));
  if (sx0 >= sx1 || sy0 >= sy1) return;
  const txs = new Int32Array(sx1 - sx0);
  for (let sx = sx0; sx < sx1; sx++) txs[sx - sx0] = Math.floor((((sx + 0.5 - cam.ax) * iz + cam.cx) - T.x0) * T.R);
  for (let sy = sy0; sy < sy1; sy++) {
    const ty = Math.floor((((sy + 0.5 - cam.ay) * iz + cam.cy) - T.y0) * T.R); if (ty < 0 || ty >= T.h) continue;
    const row = ty * T.w, o = sy * W;
    for (let sx = sx0; sx < sx1; sx++) { const tx = txs[sx - sx0]; if (tx < 0 || tx >= T.w) continue; const c = T.px[row + tx]; if (c !== 0) buf[o + sx] = c; }
  }
}
// skin shading shared by the hand, finger and thumb: base, lit rim, shadow band, dark edge
function skinCol(d, nx, ny, sx, sy, z, edge) {
  const px = 1 / z, lit = LITE[0] * nx + LITE[1] * ny, dep = -d;
  if (edge && dep < px * 1.05) return P.SK1;
  if (nx === 0 && ny === 0) return P.SK3;
  if (lit > 0.3 && dep < Math.max(0.5, 1.7 * px)) return dep < px * 0.9 ? P.SK5 : P.SK4;
  if (lit < -0.45 && dep < Math.max(0.6, 1.5 * px)) return P.SK1;
  if (lit < -0.15 && dep < Math.max(1.2, 3 * px)) return P.SK2;
  if (lit < 0.1 && dep < Math.max(1.6, 3.5 * px) && bay(sx, sy) < 0.5) return P.SK2;
  return P.SK3;
}
// ---------------------------------------------------------------- background: navy lab, soft bokeh with parallax
const BOKEH = [];
for (let i = 0; i < 9; i++) BOKEH.push({ x: hash(i * 7 + 1) * 340 - 35, y: hash(i * 7 + 2) * 560 - 40, r: 26 + 46 * hash(i * 7 + 3), c: i % 3, ph: hash(i * 7 + 4) * TAU, k: 0.05 + 0.08 * hash(i * 7 + 5) });
const DUST = [];
for (let i = 0; i < 46; i++) DUST.push({ x: hash(i + 900) * 360, y: hash(i + 901) * 640, k: 0.1 + 0.3 * hash(i + 902), ph: hash(i + 903) * TAU, s: hash(i + 904) });
function bgLab(cam, t, glowK) {
  rect(0, 0, W, H, P.BG);
  rect(0, 0, W, 150, P.N1, 0.5); rect(0, 420, W, H, P.K0, 0.35);
  const lz = Math.log(cam.z);
  for (const b of BOKEH) {
    const x = ((b.x - cam.cx * b.k * 6 * cam.z / 3 + 24 * wob(t, 1, b.ph)) % 360 + 360) % 360 - 45;
    const y = ((b.y - cam.cy * b.k * 6 * cam.z / 3 + 16 * wob(t, 1, b.ph + 1)) % 600 + 600) % 600 - 60;
    const r = b.r * (1 + 0.12 * lz);
    disc(x, y, r, [P.N2, P.N3, P.N2][b.c], 0.42); disc(x, y, r * 0.7, [P.N2, P.N3, P.N4][b.c], 0.3);
  }
  for (const d of DUST) {
    const x = ((d.x + 14 * wob(t, 2, d.ph) - cam.cx * d.k * 2) % W + W) % W, y = ((d.y - t * 3 * d.k * 10 - cam.cy * d.k * 2) % H + H) % H;
    pset(x, y, d.s > 0.7 ? P.N6 : P.N5);
  }
  if (glowK > 0) { const gx = cam.x(-2), gy = cam.y(13); glow(gx, gy, 70 * cam.z / 3.2 * (0.8 + 0.2 * glowK), P.LR1, P.LR2, 0.35 * glowK); }
}
// ---------------------------------------------------------------- the hand (index finger up, nail to the right)
const FG = { tipY: 0, r0: 8, r1: 9.2, baseY: 74, x0: 0, x1: 0.8 };
function sdIndex(x, y) {
  let d = sdTaper(x, y, FG.x0, FG.tipY + FG.r0, FG.x1, FG.baseY, FG.r0, FG.r1);
  d = smin(d, sdCap(x, y, 4.2, 22.5, 4.4, 24.5, 4.5), 1.6);         // DIP knuckle (dorsal)
  d = smin(d, sdCap(x, y, 4.8, 46, 5.0, 48.5, 5.0), 1.8);           // PIP knuckle
  return d;
}
function sdPalm(x, y) {
  let d = sdCap(x, y, 2.5, 80, 1.0, 175, 13);                       // hand body (back on the right, palm on the left)
  d = smin(d, sdCap(x, y, 5.2, 72, 5.6, 76, 6.6), 3);               // index knuckle on the back of the hand
  d = smin(d, sdCap(x, y, -2, 77, -22.5, 79.5, 8.4), 3.2);          // curled middle finger: proximal phalanx (forward)
  d = smin(d, sdCap(x, y, -23.6, 80, -21.4, 99, 7.7), 2.4);         // ... middle phalanx (folded down)
  d = smin(d, sdCap(x, y, -20, 101, -9, 106, 6.6), 2.6);            // ... fingertip tucked back into the palm
  d = smin(d, sdCap(x, y, -19.5, 102, -15, 119, 7.4), 3);           // ring / little finger fold under it
  d = smin(d, sdCap(x, y, -10, 112, -5, 175, 12.5), 5);             // palm and heel of the hand
  d = Math.min(d, sdCap(x, y, -15.5, 86, -11, 100, 7.5));          // the palm behind the curled finger (no gap)
  return d;
}
const TH = { a: [-3.5, 132], b: [-13.8, 114.5], c: [-24.2, 105.2] };
function sdThumb(x, y) {
  let d = sdTaper(x, y, TH.a[0], TH.a[1], TH.b[0], TH.b[1], 10.2, 7.6);       // thenar / first metacarpal
  d = smin(d, sdTaper(x, y, TH.b[0], TH.b[1], TH.c[0], TH.c[1], 7.4, 6.3), 1.8);   // thumb, tip resting on the curled middle finger
  return d;
}
let HANDTEX = null;
function drawHand(cam, t, o) {
  o = o || {};
  if (HANDTEX && cam.z < 9.5) { blitWorld(cam, HANDTEX); fingerGlow(cam, o.glow || 0); return; }
  drawHandRaw(cam, t, o); fingerGlow(cam, o.glow || 0);
}
// light through the fingertip (the red LED): the skin glows red between the jaws, strongest on the pad side
function fingerGlow(cam, glowK) {
  if (glowK <= 0) return;
  const iz = 1 / cam.z, x0 = Math.max(0, Math.floor(cam.x(-9))), x1 = Math.min(W, Math.ceil(cam.x(9))), y0 = Math.max(0, Math.floor(cam.y(-2))), y1 = Math.min(H, Math.ceil(cam.y(32)));
  for (let sy = y0; sy < y1; sy++) {
    const wy = (sy + 0.5 - cam.ay) * iz + cam.cy, gy = glowK * Math.exp(-((wy - 12.5) ** 2) / 60);
    if (gy < 0.06) continue;
    for (let sx = x0; sx < x1; sx++) {
      const wx = (sx + 0.5 - cam.ax) * iz + cam.cx;
      const gk = gy * (0.5 + 0.5 * clamp((-wx + 8) / 16, 0, 1)); if (gk < 0.06) continue;
      if (sdIndex(wx, wy) > -0.1) continue;
      const b_ = bay(sx, sy), i = sy * W + sx, c = buf[i];
      if (b_ < gk * 0.55) buf[i] = P.LR4; else if (b_ < gk * 1.1) buf[i] = c === P.SK2 || c === P.SK1 ? P.LR2 : P.LR3;
    }
  }
}
function bakeHand() { HANDTEX = bakeWorld(-46, -4, 24, 192, 9, cam => drawHandRaw(cam, 0, {})); }
function drawHandRaw(cam, t, o) {
  o = o || {};
  const z = cam.z, X0 = cam.x(-46), X1 = cam.x(24), Y0 = cam.y(-10), Y1 = H;
  if (cam.y(60) > H + 10) return;
  // back layer: palm + curled fingers
  sdfLayer(cam, X0, cam.y(62), X1, Y1, sdPalm, (wx, wy, d, nx, ny, sx, sy) => {
    let c = skinCol(d, nx, ny, sx, sy, z, true);
    const px = 1 / z, lw = 0.22 * Math.max(1, px * 3);
    // the curled middle finger's joints and its nail (seen at the tucked tip), knuckle wrinkles
    if (Math.abs(Math.hypot(wx + 21.5, wy - 80.5) - 6.4) < lw && wx < -18 && wy < 84 && -d > 0.8) c = P.SK2;
    if (Math.abs(wy - 97.5 - (wx + 22) * 0.3) < lw && wx < -15.5 && -d > 0.8) c = P.SK2;
    if (Math.abs(wx + 13.4 + (wy - 104) * 0.25) < lw && wy > 101 && wy < 110 && -d > 0.8) c = P.SK2;
    for (const k of [0, 1.3]) if (Math.abs(wy - 74.5 - k + 0.4 * Math.cos(wx * 0.8)) < lw && wx > 1.5 && wx < 10 && -d > 0.8 && -d < 3) c = P.SK2;
    const ts = sdThumb(wx + 1.6, wy - 2.2);                            // the thumb's soft shadow on the fist
    if (ts < 0 && sdThumb(wx, wy) > 0) c = ts > -1.4 ? P.SK1 : (bay(sx, sy) < 0.5 ? P.SK2 : c);
    return c;
  });
  // the index finger
  sdfLayer(cam, cam.x(-10), Y0, cam.x(12), cam.y(86), sdIndex, (wx, wy, d, nx, ny, sx, sy) => {
    if (wy > 84) return -1;
    if (wy > 76 && d > -0.5 && nx > -0.2) return -1;                // merge into the knuckle (no seam on the back)
    let c = skinCol(d, nx, ny, sx, sy, z, wy > 62 && nx < 0.3);
    const px = 1 / z;
    // creases: palmar (left) at the joints, dorsal wrinkles (right)
    for (const cy of [24, 25.6, 47.5, 49.4]) if (Math.abs(wy - cy - 0.6 * (wx / 8)) < 0.22 * Math.max(1, px * 3) && -d > 0.7 && wx < -3.5) c = P.SK2;
    for (const cy of [22.4, 23.6, 24.8, 46.2, 47.6]) if (Math.abs(wy - cy + 0.5 * Math.cos(wx)) < 0.2 * Math.max(1, px * 3) && wx > 3.4 && -d > 0.6 && -d < 2.4) c = P.SK2;
    // fingerprint ridges on the pad (close-ups only)
    if (z > 7 && wx < -1 && wy < 16 && -d > 0.6 && (c === P.SK3 || c === P.SK4)) { const r = Math.hypot(wx + 3.8, wy - 8); if (((r * 1.9) % 1) < 0.16) c = P.SK2; }
    return c;
  });
  drawNail(cam, t, o);
  // the thumb, in front
  sdfLayer(cam, X0, cam.y(92), cam.x(12), Y1, sdThumb, (wx, wy, d, nx, ny, sx, sy) => {
    let c = skinCol(d, nx, ny, sx, sy, z, true);
    // thumb nail, on the tip's upper-left side
    const u = wx + 21.6, v = wy - 104.4;
    if (Math.hypot(u * 0.66 - v * 0.75, (u * 0.75 + v * 0.66) * 1.7) < 3.4 && -d < 2.4 && ny < 0.1) c = -d < 0.6 * Math.max(1, 1.5 / z) ? P.NL3 : (u + v < -1.2 ? P.NL0 : P.NL1);
    if (Math.abs((wy - 114.5) - (wx + 13.8) * 1.12) < 0.25 * Math.max(1, 3 / z) && -d > 1.2 && -d < 4.5) c = P.SK2;   // thumb joint crease
    return c;
  });
}
// the index fingernail in profile, along the dorsal edge (right)
function drawNail(cam, t, o) {
  const z = cam.z, px = 1 / z;
  sdfLayer(cam, cam.x(5.5), cam.y(1.4), cam.x(9.6), cam.y(17.5), (x, y) => {
    if (y < 1.6 || y > 16.2) return 1;
    const d = sdIndex(x, y); if (x < 5.6) return 1;
    return Math.max(d - 0.62, -d - 1.05);                           // a 1.7 mm band straddling the skin line
  }, (wx, wy, d, nx, ny, sx, sy) => {
    const dSkin = sdIndex(wx, wy);
    if (wy > 14.9) return dSkin > -0.2 ? P.SK2 : P.NL2;              // cuticle fold
    if (dSkin > 0.38) return P.NL0;                                  // the raised plate edge catches the light
    if (wy > 12.6) return P.NL0;                                     // lunula
    if (wy < 3.4) return P.NL0;                                      // free edge
    return dSkin > -0.35 ? P.NL1 : P.NL2;
  }, 2);
}
// ---------------------------------------------------------------- the clip
// shells in the closed pose (world mm); each rotates about the hinge pin when open
const CLIP = { pin: [4.6, -10.2], upper: { x0: 8.7, y0: -11, x1: 31, y1: 41, r: 6.5 }, cap1: { x0: 2.2, y0: -16.5, x1: 20, y1: -5.8, r: 5 },
  lower: { x0: -17.6, y0: -6.5, x1: -8.2, y1: 41, r: 5 }, cap0: { x0: -13.5, y0: -14.5, x1: 7, y1: -5, r: 4.5 },
  disp: { x0: 12, y0: -7, x1: 28.6, y1: 31 } };
const rotAbout = (x, y, a) => { const c = Math.cos(a), s = Math.sin(a), dx = x - CLIP.pin[0], dy = y - CLIP.pin[1]; return [CLIP.pin[0] + dx * c - dy * s, CLIP.pin[1] + dx * s + dy * c]; };
function sdUpperShell(x, y, a) {
  if (a) { const q = rotAbout(x, y, -a); x = q[0]; y = q[1]; }
  const U = CLIP.upper, C = CLIP.cap1;
  return smin(sdRBox(x, y, U.x0, U.y0, U.x1, U.y1, U.r), sdRBox(x, y, C.x0, C.y0, C.x1, C.y1, C.r), 2.5);
}
function sdLowerShell(x, y, a) {
  if (a) { const q = rotAbout(x, y, a); x = q[0]; y = q[1]; }
  const L = CLIP.lower, C = CLIP.cap0;
  return smin(sdRBox(x, y, L.x0, L.y0, L.x1, L.y1, L.r), sdRBox(x, y, C.x0, C.y0, C.x1, C.y1, C.r), 2.2);
}
let SHELL_DIM = false;                 // cut-away views draw the clip darker so the tissue reads first
function shellCol(d, nx, ny, sx, sy, z, wx, wy, trimX) {
  const px = 1 / z, lit = LITE[0] * nx + LITE[1] * ny, dep = -d;
  const R = SHELL_DIM ? [P.G6, P.G2, P.G4, P.G3, P.G5] : [P.G5, P.GW, P.G3, P.G2, P.G1];
  if (dep < px * 1.05) return R[0];
  if (nx !== 0 || ny !== 0) {
    if (lit > 0.3 && dep < Math.max(0.55, 1.8 * px)) return R[1];
    if (lit < -0.4 && dep < Math.max(0.7, 1.8 * px)) return R[2];
    if (lit < -0.1 && dep < Math.max(1.3, 3 * px)) return R[3];
  }
  return R[4];
}
// state: { open (0..1), disp: {on, spo2, pr, boot, k98, beat}, glow }
let CLIPTEX = null;
function bakeClipCut() { CLIPTEX = bakeWorld(-18, -17.5, 32, 42, 20, cam => { SHELL_DIM = true; drawClip(cam, 0, { open: 0, noDisplay: true }); SHELL_DIM = false; cutWindows(cam, 0, {}); }); }
function drawClip(cam, t, st) {
  const z = cam.z, a = (st.open || 0) * 0.23;
  // lower jaw (pad side) — behind the finger's edge but in front of the background
  sdfLayer(cam, cam.x(-32), cam.y(-24), cam.x(10), cam.y(56), (x, y) => sdLowerShell(x, y, a), (wx, wy, d, nx, ny, sx, sy) => {
    let c = shellCol(d, nx, ny, sx, sy, z, wx, wy), qx = wx, qy = wy;
    if (a) { const q = rotAbout(wx, wy, a); qx = q[0]; qy = q[1]; }
    if (qx < -10 && qx > -16.4 && qy > 6 && qy < 34 && -d > 1.2 && ((qy * 1.25) % 1) < 0.18 * Math.max(1, 3 / z)) c = SHELL_DIM ? P.G4 : P.G2;   // grip ridges
    if (qx > -9.6 && qy > -4 && -d < 1.4) c = -d < 0.5 ? P.G4 : P.TL1;   // soft inner pad edge (teal silicone)
    return c;
  });
  // upper jaw (nail side) with the display
  sdfLayer(cam, cam.x(-6), cam.y(-26), cam.x(46), cam.y(56), (x, y) => sdUpperShell(x, y, a), (wx, wy, d, nx, ny, sx, sy) => {
    let c = shellCol(d, nx, ny, sx, sy, z, wx, wy), qx = wx, qy = wy;
    if (a) { const q = rotAbout(wx, wy, -a); qx = q[0]; qy = q[1]; }
    if (qx > 29.4 && qy > -6 && qy < 37 && -d > 0.35) c = qx > 30.2 ? P.TL1 : P.TL2;                  // teal trim along the outer edge
    if (qx < 9.6 && qy > -4 && -d < 1.4) c = -d < 0.5 ? P.G4 : P.TL1;                                    // soft inner pad
    return c;
  });
  // the hinge pin and spring
  const hx = cam.x(CLIP.pin[0]), hy = cam.y(CLIP.pin[1]), hr = 2.5 * z;
  disc(hx, hy, hr, P.G5); disc(hx, hy, hr * 0.8, P.G3); disc(hx - hr * 0.25, hy - hr * 0.25, hr * 0.38, P.G1);
  // the display (only drawn upright when the jaw is closed)
  if (!st.noDisplay) drawDisplay(cam, t, st, a);
  // the power button
  const bq = a ? rotAbout(20.2, 36, a) : [20.2, 36], bx = cam.x(bq[0]), by = cam.y(bq[1]);
  disc(bx, by, 2.7 * z, P.G4); disc(bx, by - 0.2 * z, 2.2 * z, P.TL1); disc(bx - 0.6 * z, by - 0.8 * z, 0.8 * z, P.TL3);
}
// ---------------------------------------------------------------- the display: SpO2 (yellow), PR (cyan), heart, pleth trace
const SEG_DEF = { a: [1.1, 0, 6.5, 1.3], b: [6.3, 0.9, 7.6, 6.2], c: [6.3, 6.8, 7.6, 12.1], d: [1.1, 11.7, 6.5, 13], e: [0, 6.8, 1.3, 12.1], f: [0, 0.9, 1.3, 6.2], g: [1.1, 5.85, 6.5, 7.15] };
const DIGITS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '' };
// one 7-segment digit in a (7.6 x 13) box scaled by s, top-left at world (ox, oy)
function seg7(cam, ox, oy, s, ch, on, off) { seg7s(cam, ox, oy, s, DIGITS[ch] || '', on, off); }
// "measuring": a two-segment snake zigzags through the horizontal segments of the two digits, one step per 16th
// note (one lap per heartbeat). Horizontal segments alone never spell a digit, so no frame reads as a number.
const CHASE = [[0, 'a'], [1, 'a'], [1, 'g'], [0, 'g'], [0, 'd'], [1, 'd'], [1, 'g'], [0, 'g']];
function chaseSegs(t, len, off) {
  const st = Math.floor(t / S16) + (off || 0), out = ['', ''];
  for (let j = 0; j < len; j++) { const [d, sg] = CHASE[((st - j) % 8 + 8) % 8]; out[d] += sg; }
  return out;
}
// one 7-segment digit from an explicit segment list
function seg7s(cam, ox, oy, s, lit, on, off) {
  for (const k in SEG_DEF) {
    const [a, b, c, d] = SEG_DEF[k], isOn = lit.indexOf(k) >= 0, col = isOn ? on : off;
    if (col === null || col === undefined) continue;
    const x0 = cam.x(ox + a * s), y0 = cam.y(oy + b * s), x1 = cam.x(ox + c * s), y1 = cam.y(oy + d * s), bev = Math.min(x1 - x0, y1 - y0) * 0.5;
    if (x1 - x0 > y1 - y0) poly([x0 + bev, y0, x1 - bev, y0, x1, (y0 + y1) / 2, x1 - bev, y1, x0 + bev, y1, x0, (y0 + y1) / 2], col);
    else poly([x0, y0 + bev, (x0 + x1) / 2, y0, x1, y0 + bev, x1, y1 - bev, (x0 + x1) / 2, y1, x0, y1 - bev], col);
  }
}
function heartIcon(x, y, s, col) {
  disc(x - s * 0.5, y - s * 0.2, s * 0.55, col); disc(x + s * 0.5, y - s * 0.2, s * 0.55, col);
  poly([x - s * 1.05, y - s * 0.05, x + s * 1.05, y - s * 0.05, x, y + s * 1.05], col);
}
function drawDisplay(cam, t, st, a) {
  const z = cam.z, D = CLIP.disp, S = st.disp || {};
  if (a > 0.004) {                                    // tilted, off: just the glass
    const c = [[D.x0, D.y0], [D.x1, D.y0], [D.x1, D.y1], [D.x0, D.y1]].map(([x, y]) => rotAbout(x, y, a)).map(([x, y]) => [cam.x(x), cam.y(y)]);
    poly(c.flat(), P.DS1); return;
  }
  const x0 = cam.x(D.x0), y0 = cam.y(D.y0), x1 = cam.x(D.x1), y1 = cam.y(D.y1);
  rect(x0 - 1, y0 - 1, x1 + 1, y1 + 1, P.G5); rect(x0, y0, x1, y1, S.on ? P.DS1 : P.DS0);
  rect(x0, y0, x1, y0 + Math.max(1, 0.5 * z), P.DS0);
  // glass glint
  for (let i = 0; i < 3; i++) line(x1 - (3 + i) * z, y0 + 1, x1 - (9 + i) * z, y0 + 7 * z, P.DS2);
  if (!S.on) return;
  const ghostY = z > 4 ? P.DY0 : null, ghostC = z > 4 ? P.DC0 : null, boot = S.boot || 0;
  const sc = Math.max(1, Math.round(z * 0.3));
  // labels
  text(FS, 'SpO₂', cam.x(13.2), cam.y(-5.6), { sc, c: P.DY1, ol: null });
  text(FS, '%', cam.x(26.3), cam.y(6.6), { sc, c: P.DY1, ol: null });
  text(FS, 'PR', cam.x(13.2), cam.y(12.0), { sc, c: P.DC1, ol: null });
  text(FS, 'bpm', cam.x(13.2), cam.y(16.6), { sc: Math.max(1, sc - 1), c: P.DC0 === ghostC ? P.DC1 : P.DC1, ol: null });
  // battery
  rect(cam.x(25), cam.y(-5.4), cam.x(27.6), cam.y(-3.8), P.DC0); rect(cam.x(27.6), cam.y(-5.0), cam.x(28.0), cam.y(-4.2), P.DC0); rect(cam.x(25.3), cam.y(-5.1), cam.x(27.0), cam.y(-4.1), P.SG2);
  // digits: boot shows 88 / --, then the values (k98: slam scale)
  const big = 0.8, small = 0.56;
  const dig = v => String(v).padStart(2, ' ').split('').map(c => DIGITS[c] || '');
  const s1 = boot > 0 && boot < 0.5 ? ['abcdefg', 'abcdefg'] : boot > 0 ? chaseSegs(t, 2, 0) : dig(S.spo2 || SPO2);
  const s2 = boot > 0 && boot < 0.5 ? ['abcdefg', 'abcdefg'] : boot > 0 ? chaseSegs(t, 2, 4) : dig(S.pr || PR_BPM);
  const k = S.k98 || 1, hot = k > 1.02;
  for (let i = 0; i < 2; i++) {
    const ox = 13.0 + i * 6.9, oy = -1.8;
    if (k > 1.001) {
      const cxD = ox + 3.8 * big, cyD = oy + 6.5 * big;
      const c2 = { x: u => cam.x(cxD + (u - cxD) * k), y: v => cam.y(cyD + (v - cyD) * k), z };
      seg7s(c2, ox, oy, big, s1[i], P.DY2, null);
    } else seg7s(cam, ox, oy, big, s1[i], hot ? P.DY2 : P.DY1, ghostY);
  }
  for (let i = 0; i < 2; i++) seg7s(cam, 18.2 + i * 4.9, 12.0, small, s2[i], P.DC1, ghostC);
  // heart icon blinks on each beat
  const hk = S.beat === undefined ? 0 : S.beat;
  heartIcon(cam.x(14.5), cam.y(20.6), Math.max(2, 1.25 * z * (1 + 0.25 * hk)), hk > 0.3 ? P.LR3 : P.LR1);
  // pleth: a scrolling green trace of the arterial pulse (volume up)
  const gx0 = 13.2, gx1 = 27.6, gy0 = 23.0, gy1 = 29.6;
  rect(cam.x(gx0), cam.y(gy1) + 1, cam.x(gx1), cam.y(gy1) + 2, P.DC0);
  let px_ = null, py_ = null;
  for (let u = 0; u <= 1.0001; u += 1 / Math.max(8, (gx1 - gx0) * z / 2)) {
    const tt = t - (1 - u) * 1.9, v = pleth(tt) * (S.wave === undefined ? 1 : S.wave);
    const x = cam.x(gx0 + u * (gx1 - gx0)), y = cam.y(gy1 - 0.6 - v * (gy1 - gy0 - 1.4));
    if (px_ !== null) lineW(px_, py_, x, y, Math.max(1, z * 0.35), P.SG2);
    px_ = x; py_ = y;
  }
  disc(px_, py_, Math.max(1.5, z * 0.5), P.SG3);
}
// ---------------------------------------------------------------- the whole macro scene
function macroScene(cam, t, st) {
  bgLab(cam, t, st.glow || 0);
  drawHand(cam, t, { glow: st.glow || 0 });
  drawClip(cam, t, st);
}
