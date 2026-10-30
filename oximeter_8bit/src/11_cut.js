'use strict';
// ============================================================================
// THE FINGERTIP CUT-AWAY (same mm coordinates as the hand world, nail to the
// right). A side section through the distal finger and both jaws of the clip:
// epidermis, dermis with capillary loops, the fatty pulp with fibrous septa,
// the distal phalanx and the DIP joint, flexor and extensor tendons, the nail
// plate, nail bed and matrix, a pulsing artery and a still vein in the pad, a
// dorsal vein. The upper jaw holds the red + infrared LED package, the lower
// jaw the photodiode. Light always travels right to left across the finger.
// ============================================================================
// ---------------------------------------------------------------- anatomy (mm)
function sdBone(x, y) {
  if (x < -5 || x > 7.5 || y < 1.5) return 9;
  let d = sdRBox(x, y, -1.9, 3.3, 4.8, 7.4, 2.0);                    // tuft
  d = smin(d, sdRBox(x, y, -0.4, 6.0, 3.5, 20.6, 1.2), 1.0);         // shaft
  d = smin(d, sdRBox(x, y, -2.5, 18.8, 5.0, 24.6, 1.6), 1.2);        // base (palmar lip, dorsal tubercle)
  const m = smin(sdRBox(x, y, -2.7, 25.7, 5.1, 32.5, 2.1), sdRBox(x, y, -1.3, 30, 4.0, 70, 1.4), 1.5);   // middle phalanx head + shaft
  return Math.min(d, m);
}
const JOINT = { y0: 24.6, y1: 25.7 };
// vessels: polylines (mm) with radii
const ART = new Path([-4.9, 52, -4.75, 34, -4.55, 18, -4.2, 11, -3.5, 7.2]);
const ART_BR = [new Path([-3.5, 7.2, -5.4, 4.2, -6.1, 2.7]), new Path([-3.5, 7.2, -1.6, 3.6, 0.8, 2.5, 3.4, 2.3]), new Path([-4.6, 16, -6.4, 14.6]), new Path([-4.7, 27, -6.9, 25.4]), new Path([-4.8, 38, -7.2, 36.6])];
const VEIN = new Path([-6.85, 52, -6.8, 34, -6.75, 16, -6.4, 9.5, -5.6, 6.2]);
const DVEIN = new Path([7.15, 52, 7.05, 36, 6.95, 22.5, 6.6, 19.5]);
function distPath(p, x, y) {
  let best = 1e9, bs = 0;
  for (let i = 0; i + 1 < p.n; i++) {
    const ax = p.p[2 * i], ay = p.p[2 * i + 1], bx = p.p[2 * i + 2], by = p.p[2 * i + 3];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9, h = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
    const d = Math.hypot(x - ax - dx * h, y - ay - dy * h); if (d < best) { best = d; bs = p.c[i] + h * Math.sqrt(l2); }
  }
  return [best, bs];
}
// fat lobules: cellular pattern (distance to nearest and second nearest seed)
// seeds of the cellular pattern, cached per grid cell (the same hash as before, computed once)
const LOB_SEED = new Map();
function lobSeed(gx, gy) {
  const k = (gx + 512) * 4096 + (gy + 512); let v = LOB_SEED.get(k);
  if (v === undefined) { v = [gx + 0.2 + 0.6 * hash2(gx, gy), gy + 0.2 + 0.6 * hash2(gx + 71, gy + 13)]; LOB_SEED.set(k, v); }
  return v;
}
const _lob = [0, 0];
function lobule(x, y) {
  const S = 1.55, fx = x / S, fy = y / S, gx = Math.floor(fx), gy = Math.floor(fy);
  let d1 = 99, d2 = 99;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const sd_ = lobSeed(gx + i, gy + j), dx = fx - sd_[0], dy = fy - sd_[1], d = dx * dx + dy * dy;
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  d1 = Math.sqrt(d1) * S; d2 = Math.sqrt(d2) * S;
  _lob[0] = d1; _lob[1] = d2 - d1; return _lob;
}
// the light path through the finger (red and infrared LEDs, photodiode window)
const LED_R = [9.25, 11.75], LED_IR = [9.25, 13.85], PD_C = [-9.3, 12.8], PD_H = 1.9;
// ---------------------------------------------------------------- per-pixel tissue colour
// DZ: ordered dither between two colours. While baking the tissue texture it records the pair and the
// level instead, so the dither is applied later in screen space (no moire when the camera zooms).
let BAKE = false, _pa = 0, _pb = 0, _pl = -1;
function DZ(L, A, B, sx, sy) { if (BAKE) { _pa = A; _pb = B; _pl = L; return A; } return bay(sx, sy) < L ? A : B; }
// o: { v (arterial volume 0..1), xray (0..1 skin see-through for the hook), hiArt, hiVein }
function tissueCol(wx, wy, d, sx, sy, z, o) {
  const dep = -d, px = 1 / z, palm = clamp((-wx + 1) / 6, 0, 1);
  // nail plate (above the skin line on the back of the fingertip)
  if (wx > 5.2 && wy > 1.8 && wy < 15.2 && d > -0.35) {
    if (wy > 13.0) return d > 0.3 ? P.NL0 : P.NL1;                   // lunula
    return d > 0.42 || d < -0.25 ? P.NL0 : (DZ(0.3, P.NL2, P.NL1, sx, sy));
  }
  if (d > 0) return -1;
  // epidermis (thick on the pad), stratum corneum line, papillary border
  const epi = lerp(0.36, 0.85, palm), wave = 0.09 * Math.sin((wx * 0.7 + wy * 0.7) * 11.5);
  // nail bed + matrix under the plate
  if (wx > 4.6 && wy > 2.6 && wy < 18.2 && dep < 1.25) {
    if (wy > 14.6 && dep < 0.45) return P.SK2;                       // eponychium (proximal fold) over the root
    if (wy > 14.2) return dep < 0.95 ? (DZ(0.5, P.NL2, P.NL3, sx, sy)) : P.TS4;   // nail matrix
    if (dep < 0.9) { const cap = ((wy * 3.2) % 1) < 0.2 && dep > 0.3; return cap ? P.AR3 : (DZ(0.35, P.TS3, P.TS4, sx, sy)); }   // vascular nail bed
  }
  if (dep < Math.max(px * 0.9, 0.09)) return P.EP2;
  if (dep < epi + wave) {
    if (dep > epi + wave - Math.max(px, 0.08)) return P.EP0;         // basal layer
    if (palm > 0.4 && ((dep * 9 + wx * 0.4) % 1) < 0.18 && z > 9) return P.EP2;   // ridges of the thick pad skin
    return P.EP1;
  }
  // dermis: collagen, capillary loops in the papillae
  const der = epi + 1.25;
  if (dep < der) {
    const along = wy * (palm > 0.5 ? 1 : 0.8) + wx * 0.15;
    if (dep < epi + 0.42 && ((along * 2.3) % 1) < 0.16) return dep < epi + 0.3 ? P.AR3 : P.AR2;      // capillary hairpins
    return DZ(0.22, P.TS3, P.TS4, sx, sy);
  }
  // bone, joint
  const db = sdBone(wx, wy);
  if (db < 0) {
    if (-db < Math.max(0.42, px * 1.2)) return -db < px ? P.BN1 : P.BN3;   // cortex
    const [m1, me] = lobule(wx * 2.6 + 40, wy * 2.6 + 40);                         // spongy bone: trabeculae round marrow spaces
    if (me < 0.16) return P.BN3;
    return m1 < 0.32 ? P.MR1 : (DZ(0.3, P.MR1, P.BN2, sx, sy));
  }
  if (wy > JOINT.y0 && wy < JOINT.y1 && wx > -2.5 && wx < 5.0) return db < 0.5 ? P.TS2 : P.TS3;   // DIP joint space
  // tendons
  if (wx > -4.15 && wx < -2.75 && wy > 21.5) return ((wy * 3 + wx) % 1) < 0.25 ? P.BN3 : P.NL0;     // flexor
  if (wx > 5.15 && wx < 5.85 && wy > 19.8 && db > 0) return ((wy * 3) % 1) < 0.25 ? P.BN3 : P.NL0;  // extensor
  // pulp: fat lobules with fibrous septa (pad side); thin subcutis on the back
  if (palm > 0.15 || wy < 8) {
    const [d1, e] = lobule(wx, wy);
    if (e < Math.max(0.09, px * 1.1)) return P.TS4;
    return d1 < 0.5 ? P.FT3 : (DZ(0.5, P.FT2, P.FT3, sx, sy));
  }
  return DZ(0.4, P.TS4, P.TS5, sx, sy);
}
// the static tissue baked once into a world-space texture (28 texels/mm): colour pair + dither level
const TEX = { x0: -8.9, y0: -0.6, R: 28, w: 0, h: 0, c1: null, c2: null, lv: null };
function bakeTissue() {
  TEX.w = Math.ceil((9.3 - TEX.x0) * TEX.R); TEX.h = Math.ceil((44.5 - TEX.y0) * TEX.R);
  const n = TEX.w * TEX.h; TEX.c1 = new Uint32Array(n); TEX.c2 = new Uint32Array(n); TEX.lv = new Uint8Array(n);
  BAKE = true;
  for (let j = 0; j < TEX.h; j++) {
    const wy = TEX.y0 + (j + 0.5) / TEX.R;
    for (let i = 0; i < TEX.w; i++) {
      const wx = TEX.x0 + (i + 0.5) / TEX.R, d = sdIndex(wx, wy);
      if (d > 0.65) continue;
      _pl = -1; const c = tissueCol(wx, wy, d, 0, 0, TEX.R, {});
      if (c === -1) continue;
      const k = j * TEX.w + i;
      if (_pl < 0) { TEX.c1[k] = c; TEX.c2[k] = c; TEX.lv[k] = 0; } else { TEX.c1[k] = _pa; TEX.c2[k] = _pb; TEX.lv[k] = Math.round(_pl * 16); }
      if (d < -0.3) TEX.lv[k] |= 128;                  // flag: deep enough to carry vessels
    }
  }
  BAKE = false;
}
// vessels drawn over the tissue (they pulse with the arterial volume v)
function pathXAt(p, y) {                // x of a (roughly vertical) path at height y, or NaN outside it
  for (let i = 0; i + 1 < p.n; i++) { const ya = p.p[2 * i + 1], yb = p.p[2 * i + 3]; if ((y <= ya && y >= yb) || (y >= ya && y <= yb)) { const u = (y - ya) / ((yb - ya) || 1e-9); return lerp(p.p[2 * i], p.p[2 * i + 2], u); } }
  return NaN;
}
const BR_Y = [[2.0, 7.8], [13.9, 16.5], [24.7, 27.6], [35.9, 38.6]];
function vesselCol(wx, wy, sx, sy, z, o) {
  const v = o.v || 0, px = 1 / z;
  if (!o._rowBr && wy > 7.8) {             // away from the branches only the two trunks matter
    const ax = o._rowArt, vx = o._rowVein;
    if (!(Math.abs(wx - ax) < 1.25) && !(Math.abs(wx - vx) < 1.0) && !(wx > 6 && wy > 18)) return -1;
  }
  if (wx > -8 && wx < -3 && wy > 1.5) {
    const ro = 0.84 * (1 + 0.16 * v), rl = 0.52 * (1 + 0.28 * v);
    const [da, sa] = distPath(ART, wx, wy);
    const taper = clamp((52 - sa) / 46, 0, 1), k = 1 - 0.42 * clamp((sa - 36) / 10, 0, 1);
    if (da < ro * k) {
      if (da < rl * k) { const side = wx - ART.at(sa)[0]; return da > rl * k - px ? P.AR1 : (side > rl * k * 0.25 && side < rl * k * 0.6 ? P.AR4 : P.AR3); }
      return da > ro * k - Math.max(px, 0.08) ? P.WA0 : (da < rl * k + 0.12 ? P.WA3 : P.WA2);
    }
    void taper;
    for (let i = 0; i < ART_BR.length; i++) { const [db, sb] = distPath(ART_BR[i], wx, wy), rb = (i < 2 ? 0.34 - 0.04 * sb : 0.24) * (1 + 0.2 * v); if (db < rb) return db < rb * 0.45 ? P.AR4 : P.AR2; }
    const [dv, sv] = distPath(VEIN, wx, wy), rv = 0.74 * (1 - 0.3 * Math.max(0, (sv - 40) / 10));
    if (dv < rv) { const side = wx - VEIN.at(sv)[0]; return dv > rv - Math.max(px, 0.1) ? P.VD4 : (side > rv * 0.25 && side < rv * 0.6 ? P.VD3 : P.VD2); }
  }
  if (wx > 6 && wx < 8 && wy > 18) { const [dd] = distPath(DVEIN, wx, wy); if (dd < 0.45) return dd > 0.45 - Math.max(px, 0.1) ? P.VD4 : P.VD2; }
  return -1;
}
// ---------------------------------------------------------------- jaws: solid shells with cut-open windows round the optics
const WIN_U = [8.75, 8.4, 12.9, 17.2], WIN_L = [-13.1, 8.4, -8.85, 17.2];
function sdWin(x, y, w) { return sdRBox(x, y, w[0], w[1], w[2], w[3], 0.9); }
function cutWindows(cam, t, o) {
  const z = cam.z, px = 1 / z;
  for (const w of [WIN_U, WIN_L]) {
    if (cam.x(w[2]) < -2 || cam.x(w[0]) > W + 2) continue;
    sdfLayer(cam, cam.x(w[0]) - 2, cam.y(w[1]) - 2, cam.x(w[2]) + 2, cam.y(w[3]) + 2, (x, y) => sdWin(x, y, w), (wx, wy, d, nx, ny, sx, sy) => {
      const dep = -d;
      if (dep < Math.max(px, 0.05)) return P.G5;
      if (dep < Math.max(0.3, px * 2.2)) return ((sx + sy) >> 1) % 3 === 0 ? P.G3 : P.G2;   // cut face, hatched
      return ny < -0.5 && dep < Math.max(0.5, px * 3.5) ? P.K0 : (bay(sx, sy) < 0.5 ? P.G6 : P.N2);   // shadowed cavity
    }, 4);
  }
}
// state o: { t, v, flow, ledR, ledIR (0..1 brightness), pdHit (0..1) }
function cutawayScene(cam, t, o) {
  const z = cam.z, iz = 1 / z;
  rect(0, 0, W, H, P.BG); rect(0, 0, W, H, P.N1, 0.35);
  if (CLIPTEX) blitWorld(cam, CLIPTEX); else { SHELL_DIM = true; drawClip(cam, t, { open: 0, noDisplay: true }); SHELL_DIM = false; cutWindows(cam, t, o); }
  // the finger, cut open: baked tissue + live vessels
  const x0 = Math.max(0, Math.floor(cam.x(TEX.x0))), x1 = Math.min(W, Math.ceil(cam.x(TEX.x0 + TEX.w / TEX.R)));
  for (let sy = 0; sy < H; sy++) {
    const wy = (sy + 0.5 - cam.ay) * iz + cam.cy, ty = Math.floor((wy - TEX.y0) * TEX.R);
    if (ty < 0 || ty >= TEX.h) continue;
    o._rowArt = pathXAt(ART, wy); o._rowVein = pathXAt(VEIN, wy); o._rowBr = BR_Y.some(r => wy > r[0] && wy < r[1]);
    const row = ty * TEX.w, by4 = (sy & 3) << 2;
    for (let sx = x0; sx < x1; sx++) {
      const wx = (sx + 0.5 - cam.ax) * iz + cam.cx, tx = Math.floor((wx - TEX.x0) * TEX.R);
      if (tx < 0 || tx >= TEX.w) continue;
      const k = row + tx, c1 = TEX.c1[k]; if (c1 === 0) continue;
      const lv = TEX.lv[k];
      let c = (lv & 127) === 0 ? c1 : (BAYER[by4 | (sx & 3)] + 0.5 < (lv & 127) ? c1 : TEX.c2[k]);
      if (lv & 128) { const vc = vesselCol(wx, wy, sx, sy, z, o); if (vc !== -1) c = vc; }
      buf[sy * W + sx] = c;
    }
  }
  drawLedPackage(cam, t, o);
  drawPhotodiode(cam, t, o);
}
// the red + infrared LED package in the upper jaw (dies face left, into the finger)
function drawLedPackage(cam, t, o) {
  const z = cam.z, X = cam.x.bind(cam), Y = cam.y.bind(cam);
  if (X(9.2) > W + 4 || X(12.2) < -4) return;
  rect(X(11.25), Y(8.75), X(11.95), Y(16.85), P.CB2); rect(X(11.25), Y(8.75), X(11.4), Y(16.85), P.CB4);        // PCB edge
  for (const yy of [9.4, 16.0]) rect(X(11.95), Y(yy), X(12.55), Y(yy + 0.25), P.AU1);                           // wires to the electronics
  rect(X(9.6), Y(10.35), X(11.25), Y(15.35), P.G2); rect(X(9.6), Y(10.35), X(11.25), Y(10.55), P.GW);          // package body
  rect(X(9.45), Y(10.6), X(9.75), Y(15.1), P.G6, 0.6);                                                          // clear epoxy window
  for (const [cy, kind] of [[LED_R[1], 'r'], [LED_IR[1], 'ir']]) {
    const on = kind === 'r' ? (o.ledR || 0) : (o.ledIR || 0);
    poly([X(9.75), Y(cy - 0.75), X(10.55), Y(cy - 0.45), X(10.55), Y(cy + 0.45), X(9.75), Y(cy + 0.75)], P.G4);     // reflector cup
    poly([X(9.85), Y(cy - 0.62), X(10.45), Y(cy - 0.36), X(10.45), Y(cy + 0.36), X(9.85), Y(cy + 0.62)], P.G1);
    const dc = kind === 'r' ? (on > 0.2 ? P.LR4 : P.LR1) : (on > 0.2 ? P.IR4 : P.IR1);
    rect(X(10.2), Y(cy - 0.24), X(10.48), Y(cy + 0.24), dc);                                                    // the die
    if (z > 20) { rect(X(10.2), Y(cy - 0.24), X(10.48), Y(cy - 0.24) + 1, kind === 'r' ? P.LR5 : P.IR5); line(X(10.34), Y(cy - 0.24), X(10.9), Y(cy - 1.0), P.AU2); line(X(10.9), Y(cy - 1.0), X(11.2), Y(cy - 1.0), P.AU2); }   // bond wire
    if (on > 0.02) {
      const gx = X(9.7), gy = Y(cy), r = Math.min(0.85 * z, 34);
      glow(gx, gy, r * (0.8 + 0.4 * on), kind === 'r' ? P.LR2 : P.IR2, kind === 'r' ? P.LR4 : P.IR4, on);
      disc(X(10.34), gy, Math.max(1.5, 0.25 * z), kind === 'r' ? P.LR5 : P.IR5);
    }
  }
}
// the photodiode in the lower jaw (active face to the right)
function drawPhotodiode(cam, t, o) {
  const z = cam.z, X = cam.x.bind(cam), Y = cam.y.bind(cam);
  if (X(-12.4) > W + 4 || X(-9.2) < -4) return;
  rect(X(-12.05), Y(8.75), X(-11.35), Y(16.85), P.CB2); rect(X(-11.5), Y(8.75), X(-11.35), Y(16.85), P.CB4);
  for (const yy of [9.4, 16.0]) rect(X(-12.6), Y(yy), X(-12.05), Y(yy + 0.25), P.AU1);
  rect(X(-11.35), Y(10.0), X(-9.65), Y(15.6), P.CH2); rect(X(-11.35), Y(10.0), X(-9.65), Y(10.2), P.CH3);      // package
  rect(X(-9.95), Y(PD_C[1] - PD_H), X(-9.62), Y(PD_C[1] + PD_H), P.PD1);                                        // silicon die, edge-on
  rect(X(-9.75), Y(PD_C[1] - PD_H + 0.15), X(-9.62), Y(PD_C[1] + PD_H - 0.15), o.pdHit > 0.2 ? P.PD5 : P.PD3);  // active face
  if (z > 20) for (let k = 0; k < 6; k++) rect(X(-9.75), Y(PD_C[1] - PD_H + 0.3 + k * 0.62), X(-9.62), Y(PD_C[1] - PD_H + 0.36 + k * 0.62), P.PD4);
  rect(X(-9.62), Y(10.6), X(-9.4), Y(15.0), P.G6, 0.5);                                                          // window
  if (o.pdHit > 0.02) glow(X(-9.55), Y(PD_C[1]), Math.min(1.1 * z, 40) * (0.7 + 0.5 * o.pdHit), P.PD2, P.PD4, o.pdHit);
}
