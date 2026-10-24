'use strict';
// ============================================================================
// WAVE PHYSICS VIEWS — water particles that oscillate in place (S11), the
// pressure waveform steepening into a shock (S13), propagation through tissue
// layers (S14), shear between growth layers (S19), cavitation bubbles (S20).
// Pulse model: Church-type lithotripter waveform p = 2 e^(-a x) cos(w x + pi/3):
// a sharp positive front (~1 us) then a weaker, longer negative tail.
// ============================================================================
const PW = { a: 0.04553, w: 0.02618, c: Math.PI / 3, neg: 1.3 };        // per px of travel (S11 scale)
function pulseP(x) { if (x < 0) return 0; const p = 2 * Math.exp(-PW.a * x) * Math.cos(PW.w * x + PW.c); return p < 0 ? p * PW.neg : p; }
function pulseInt(x) { // integral of the (un-exaggerated) pulse: particle displacement returns to ~0
  if (x <= 0) return 0;
  const F = u => 2 * Math.exp(-PW.a * u) * (PW.w * Math.sin(PW.w * u + PW.c) - PW.a * Math.cos(PW.w * u + PW.c)) / (PW.a * PW.a + PW.w * PW.w);
  return F(x) - F(0);
}
// ---------------------------------------------------------------- S11 water particles: compression = close together, rarefaction = spread out
function drawParticles(t, opt) {
  opt = opt || {};
  clear(P.WC1);
  for (let y = 0; y < 150; y++) rect(0, y, W, y + 1, P.WC0, (150 - y) / 240);
  rect(EM.x0, 432, EM.x1, 435, P.T4); rect(EM.x0, 432, EM.x1, 433, P.T5); rect(22, 436, 248, H, P.N3);
  rect(16, 300, 28, H, P.C2); rect(242, 300, 254, H, P.C2);
  const s = opt.front === undefined ? -999 : opt.front, K = 0.65;
  if (s > 100 && s < 440) { rect(30, s - 1, 240, s, P.SW1, 0.55); }
  const hi = opt.hi || [7, 15];
  for (let j = 0; j < 30; j++) for (let i = 0; i < 16; i++) {
    const x0 = 32 + i * 13.7, y0 = 112 + j * 10.5, ph = y0 - s;
    const y = y0 - K * pulseInt(ph), p = pulseP(ph);
    const c = p > 0.3 ? P.CB3 : p > 0.08 ? P.CB2 : p < -0.05 ? P.RF2 : P.WC3;
    rect(Math.round(x0), Math.round(y), Math.round(x0) + 2, Math.round(y) + 2, c);
    if (i === hi[0] && j === hi[1]) {
      rect(Math.round(x0) - 4, Math.round(y0) + 1, Math.round(x0) - 1, Math.round(y0) + 2, P.SUB); rect(Math.round(x0) + 3, Math.round(y0) + 1, Math.round(x0) + 6, Math.round(y0) + 2, P.SUB);
      ring(Math.round(x0) + 1, Math.round(y) + 1, 4.5, 1, P.INK);
    }
  }
}
// ---------------------------------------------------------------- S13 pressure-time waveform: steepening into a shock
function waveP(us, k) { // k: 0 smooth pulse -> 1 shock front; us = time (microseconds)
  const tr = lerp(1.3, 0.025, k), pk = lerp(0.62, 1, k);
  const body = us >= 0 ? 2 * Math.exp(-0.91 * us) * Math.cos(0.5234 * us + Math.PI / 3) : 1;
  const rise = us >= 0 ? 1 : clamp(1 + us / tr, 0, 1);
  const v = (us >= 0 ? body : rise * rise * (3 - 2 * rise)) * pk;
  return v < 0 ? v * PW.neg : v;
}
const WV = { x0: 26, x1: 244, y0: 104, y1: 384, base: 286, sx: 30, sy: 150, t0: -1.0 };
function drawWave(t, opt) {
  opt = opt || {};
  clear(P.BG);
  const m = maskRR(WV.x0, WV.y0, WV.x1, WV.y1, 6); shade(m, P.K0, P.N2, P.K0, P.N4);
  for (let x = WV.x0 + 12; x < WV.x1 - 4; x += 20) rect(x, WV.y0 + 4, x + 1, WV.y1 - 4, P.N2);
  for (let y = WV.base - 140; y < WV.y1 - 4; y += 20) rect(WV.x0 + 4, y, WV.x1 - 4, y + 1, P.N2);
  rect(WV.x0 + 6, WV.base, WV.x1 - 6, WV.base + 1, P.N6);
  rect(WV.x0 + 10, WV.y0 + 8, WV.x0 + 11, WV.y1 - 8, P.N6);
  text(FM, 'P', WV.x0 + 14, WV.y0 + 8, { c: P.SUB, ol: null }); text(FM, 'T', WV.x1 - 14, WV.base + 6, { c: P.SUB, ol: null });
  const k = opt.k || 0, draw = opt.draw === undefined ? 1 : opt.draw;
  let px = null, py = null;
  const xEnd = lerp(WV.x0 + 12, WV.x1 - 8, draw);
  for (let x = WV.x0 + 12; x <= xEnd; x++) {
    const us = WV.t0 + (x - (WV.x0 + 12)) / WV.sx, p = waveP(us, k), y = WV.base - p * WV.sy;
    if (p > 0) rect(x, Math.round(y), x + 1, WV.base, P.CB1, 0.55); else rect(x, WV.base + 1, x + 1, Math.round(y), P.RF1, 0.6);
    if (px !== null) line(px, py, x, y, p > 0.02 ? (Math.abs(y - py) > 6 ? P.SW2 : P.CB3) : p < -0.02 ? P.RF3 : P.SW1);
    px = x; py = y;
  }
  if (k > 0.97 && opt.flash > 0) { const x = WV.x0 + 12 + (-WV.t0) * WV.sx; rect(x - 1, WV.base - WV.sy - 6, x + 2, WV.base, P.SW2, opt.flash); }
  if (opt.signs > 0) { text(FM, '+', WV.x0 + 12 + 1.0 * WV.sx, WV.base - 70, { c: P.CB3, n: opt.signs * 2 }); text(FM, '-', WV.x0 + 12 + 3.0 * WV.sx, WV.base + 14, { c: P.RF3, n: opt.signs * 2 - 1 }); }
}
// ---------------------------------------------------------------- S14 through soft tissue (water -> skin -> fat -> muscle -> kidney)
const LY = { fx: 135, fy: 150, cap: 206, mus: 222, fat: 300, skin: 344, gel: 356, mem: 362 };
function drawLayers(t, opt) {
  opt = opt || {};
  clear(P.KD1);
  for (let y = 0; y < LY.cap; y++) for (let x = 0; x < W; x++) if (bay(x, y) < 0.35 + 0.3 * vn2(x * 0.08, y * 0.08, 70)) buf[y * W + x] = P.KD2;
  ellipse(LY.fx + 4, LY.fy + 2, 58, 34, P.KD4); ellipse(LY.fx + 4, LY.fy + 2, 56, 32, P.UR1); ellipse(LY.fx + 4, LY.fy + 2, 54, 30, P.UR2, 0.25);
  { const m = maskEll(LY.fx, LY.fy, 13, 10.5); shade(m, P.ST3, P.ST5, P.ST1, P.ST0); }
  rect(0, LY.cap, W, LY.cap + 2, P.KD4); rect(0, LY.cap + 2, W, LY.mus, P.FA1); rect(0, LY.cap + 2, W, LY.mus, P.FA2, 0.2);
  rect(0, LY.mus, W, LY.fat, P.MR1);
  for (let y = LY.mus; y < LY.fat; y++) if (Math.sin(y * 0.9) > 0.55) rect(0, y, W, y + 1, P.MR2, 0.5);
  rect(0, LY.fat, W, LY.skin, P.FA1);
  for (let y = LY.fat; y < LY.skin; y++) for (let x = 0; x < W; x++) { const c = vn2(x * 0.12, y * 0.16, 72); if (c > 0.62 && bay(x, y) < 0.7) buf[y * W + x] = P.FA2; else if (c < 0.25) buf[y * W + x] = P.FA0; }
  rect(0, LY.skin, W, LY.gel, P.SK2); rect(0, LY.skin, W, LY.skin + 2, P.SK3);
  rect(0, LY.gel, W, LY.mem, P.GL1); rect(0, LY.mem, W, LY.mem + 2, P.WC3); rect(0, LY.mem + 2, W, H, P.WC1);
  rect(0, 446, W, H, P.C2); rect(0, 446, W, 447, P.C4);
}
// ---------------------------------------------------------------- S19 shear between growth layers
function drawShear(t, opt) {
  opt = opt || {};
  if (!STRAMP) STRAMP = [P.ST0, P.ST1, P.ST2, P.ST3, P.ST4, P.ST5];
  const LH = 38, amp = opt.amp || 0, wave = opt.wave === undefined ? -999 : opt.wave, tip = opt.tip === undefined ? -1 : opt.tip, weak = 6;
  const shift = (i, x, y) => { const e = gauss(((y + x * 0.35) - wave) / 60); return amp * e * ((i & 1) ? 1 : -1) * 4.5; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const yb = y + 3 * Math.sin(x * 0.03 + Math.floor(y / LH));
    const i = Math.floor(yb / LH), f = yb - i * LH, u = x - shift(i, x, y);
    const gx = u / 15, gy = (yb) / 15, ix = Math.floor(gx), iy = Math.floor(gy);
    let e1 = 9, e2 = 9, cid = 0;
    for (let j = -1; j <= 1; j++) for (let q = -1; q <= 1; q++) { const cx = ix + q, cy = iy + j, dx = gx - cx - hash3(cx, cy, 81), dy = gy - cy - hash3(cx, cy, 82), e = dx * dx + dy * dy; if (e < e1) { e2 = e1; e1 = e; cid = cx * 131 + cy; } else if (e < e2) e2 = e; }
    let v = 2.6 + ((i & 1) ? 0.45 : -0.1) + (hash(cid) - 0.5) * 0.6;
    if (Math.sqrt(e2) - Math.sqrt(e1) < 0.07) v -= 0.8;
    if (f < 2.2) v = i === weak ? 0.9 : 1.4;                          // layer boundaries; the weak one darker
    buf[y * W + x] = STRAMP[clamp(Math.floor(v + bay(x, y) - 0.5), 1, 5)];
  }
  // vertical marker lines show the opposite sliding of neighbouring layers
  for (let m = 0; m < 7; m++) for (let y = 0; y < H; y++) {
    const yb = y + 3 * Math.sin((24 + m * 40) * 0.03 + Math.floor(y / LH)), i = Math.floor(yb / LH);
    const x = 24 + m * 40 + shift(i, 24 + m * 40, y); if ((y >> 1) & 1) pset(x, y, P.SW1);
  }
  // crack along the weak interface
  if (tip > 0) {
    const yc = x => weak * LH - 3 * Math.sin(x * 0.03 + weak) + 1;
    for (let x = 0; x < tip && x < W; x++) { const y = yc(x); rect(x, y - 1, x + 1, y + 1, P.MC1); if (bay(x, y) < 0.5) pset(x, y - 2, P.MC0); }
    if (tip < W) glow(tip, yc(tip), 8, P.MS0, P.MC2, 0.9);
  }
}
// ---------------------------------------------------------------- S20 cavitation bubbles near the stone's front face (screen space)
// b: {x, y, rmax, t0 (growth start), tc (collapse), kind: 'jet' | 'sphere' | 'weak', sx, sy (wall point)}
function drawBubble(b, t) {
  if (t < b.t0 - 0.3) return;
  if (t < b.t0) { pset(b.x, b.y, P.CV1); return; }                          // nucleus
  const g = t < b.tc ? eout(clamp((t - b.t0) / (b.tc - b.t0), 0, 1)) : 1;
  const cd = 0.22;                                                         // collapse duration (slowed)
  if (t < b.tc) { const r = Math.max(1, b.rmax * g); const m = maskDisc(b.x, b.y, r); shade(m, P.CV0, P.CV2, P.N2, P.CV1); return; }
  const c = clamp((t - b.tc) / cd, 0, 1);
  if (c < 1) {
    const r = Math.max(1, b.rmax * (1 - ein(c)));
    if (b.kind === 'sphere') { const m = maskDisc(b.x, b.y, r); shade(m, P.CV0, P.CV2, P.N2, P.CV1); }
    else { // asymmetric: the far side caves in first and a jet forms towards the wall
      const dy = b.sy - b.y, m = maskEll(b.x, b.y + dy * 0.18 * c, r * (1 + 0.25 * c), r * (1 - 0.45 * c)); shade(m, P.CV0, P.CV2, P.N2, P.CV1);
      const jl = (b.kind === 'jet' ? 1 : 0.55) * c, jx = b.x, jy0 = b.y + r * (1 - c), jy1 = lerp(b.y, b.sy, jl);
      lineW(jx, jy0, jx, jy1, b.kind === 'jet' ? 2 : 1, P.CV2);
    }
    return;
  }
  const a = t - b.tc - cd;
  if (b.kind === 'sphere') { if (a < 0.35) ring(b.x, b.y, 2 + a * 90, 1, P.SW1, 1 - a / 0.35); if (a > 0.08 && a < 0.3) disc(b.x, b.y, 2.5 * Math.sin((a - 0.08) / 0.22 * Math.PI), P.CV1); }
  else { if (a < 0.3) ring(b.x, b.sy, 1 + a * 60, 1, P.SW1, 1 - a / 0.3); if (b.kind === 'jet' && a < 0.4) glow(b.x, b.sy, 4, P.MC0, P.MC1, 1 - a / 0.4); }
}
