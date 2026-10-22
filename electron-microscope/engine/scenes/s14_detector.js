// S14 · 1:31–1:39 — THE HAADF DETECTOR. Below the specimen the scattered electrons spread out. The camera follows them
// down to a flat ring with a hole in the middle: low-angle electrons (most of them) drop through the hole toward the
// bright-field detector; those scattered into the high-angle range (~70–200 mrad, drawn wider) strike the ring. Inside
// the ring (a representative scintillator detector): each hit makes the scintillator flash, the light runs down a light
// guide into a photomultiplier, whose photocathode turns it back into electrons that multiply dynode by dynode into a
// current pulse — an electrical signal. Other detector technologies exist; the principle is the same.
(() => {
const { W, H } = PIX;
const T_RING = 0.0, T_CUT = 3.05, T_CHAIN = 3.4;
// ---------- part 1: perspective view, world y (camera pans down) ----------
const SPY = 70, RY = 300, BFY = 420, SQ = 0.27;                                // specimen, ring, BF detector planes (world y)
const RIN = 40, ROUT = 104;                                                     // ring radii (px at the ring plane)
let EV = [];
const camY = lt => U.lerp(-20, 40, MO.sineInOut(U.clamp(lt / 2.2)));
function ringView(c, lt) {
  const T = 91 + lt, oy = -camY(lt), X0 = 135;
  PIX.rect(c, 0, 0, W, H, 'k'); for (let y = K.wrap(oy, 24); y < H; y += 24) PIX.rect(c, 0, y, W, 1, 'n0');
  // specimen film with the probe spot
  const sy = SPY + oy;
  PIX.fill(c, PIX.polyPath([[X0 - 110, sy + 4], [X0 + 70, sy + 4], [X0 + 110, sy - 6], [X0 - 70, sy - 6]]), 'g2'); PIX.bline(c, X0 - 110, sy + 4, X0 + 70, sy + 4, 'g4');
  FX.glowL(c, X0, sy, 10, ['c1', 'c2', 'c3', 'c4'], 0.9); PIX.rect(c, X0 - 1, sy - 1, 3, 3, 'w');
  for (let i = 0; i < 5; i++) { const yy = sy - 60 + K.wrap(lt * 140 + i * 12, 60); FX.e(c, X0, yy, 1, 0.9); }
  // the ring: back half, then electrons, then front half (so the hits sit on its face)
  const ry = RY + oy, ell = (rx, col, from, to) => { c.save(); c.fillStyle = PIX.P[col]; c.beginPath(); c.ellipse(X0, ry, rx, rx * SQ, 0, from, to); c.fill(); c.restore(); };
  c.save(); c.fillStyle = PIX.P.g3; c.beginPath(); c.ellipse(X0, ry + 6, ROUT, ROUT * SQ, 0, 0, U.TAU); c.fill(); c.restore();     // thickness
  ell(ROUT, 'c1', 0, U.TAU); ell(ROUT - 3, 'c2', 0, U.TAU);
  c.save(); c.fillStyle = PIX.P.k; c.beginPath(); c.ellipse(X0, ry, RIN, RIN * SQ, 0, 0, U.TAU); c.fill(); c.restore();
  c.save(); c.strokeStyle = PIX.P.c4; c.lineWidth = 1; c.beginPath(); c.ellipse(X0, ry, ROUT - 1, (ROUT - 1) * SQ, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); c.restore();
  // BF detector below the hole
  const by = BFY + oy; c.save(); c.fillStyle = PIX.P.g4; c.beginPath(); c.ellipse(X0, by + 3, 22, 22 * SQ, 0, 0, U.TAU); c.fill(); c.fillStyle = PIX.P.c3; c.beginPath(); c.ellipse(X0, by, 22, 22 * SQ, 0, 0, U.TAU); c.fill(); c.restore();
  // the bulk of the beam: a narrow low-angle cone through the hole to the BF detector
  for (const sg of [-1, 1]) PIX.bline(c, X0, sy, X0 + sg * 16, by, 'c0');
  // electrons: straight lines from the probe spot; the ring catches the high-angle ones
  for (const e of EV) {
    const age = lt - e.t; if (age < 0) continue;
    const R = e.R, hx = X0 + R * Math.cos(e.phi), hy = ry + R * Math.sin(e.phi) * SQ;
    const onRing = R > RIN && R < ROUT, end = onRing ? [hx, hy] : [X0 + R * (BFY - SPY) / (RY - SPY) * Math.cos(e.phi), by + R * (BFY - SPY) / (RY - SPY) * Math.sin(e.phi) * SQ];
    const L = Math.hypot(end[0] - X0, end[1] - sy), d = age * 420;
    if (d < L) {
      const u = d / L, x = U.lerp(X0, end[0], u), y = U.lerp(sy, end[1], u), u0 = Math.max(0, u - 0.12);
      PIX.bline(c, U.lerp(X0, end[0], u0), U.lerp(sy, end[1], u0), x, y, onRing ? 'y2' : 'c1'); FX.e(c, x, y, onRing ? 2 : 1, 1, onRing);
    } else if (onRing && d - L < 60) { const k = 1 - (d - L) / 60; FX.flash(c, hx, hy, 2 + 4 * k, 'c5', k); }
  }
  return { ry, by, sy };
}
// HAADF next to BF (the reference figure): the same raft of gold atoms as each detector records it — bright on dark
// from the high-angle ring, dark on bright from the low-angle disc below the hole
function inset(c, lt) {
  const k = U.clamp((lt - 1.65) / 0.25) * (1 - U.clamp((lt - T_CUT + 0.1) / 0.2)); if (k <= 0) return;
  const S = 44, x0 = 14, y0 = 128, cx = 202, cy = 382;
  const shade = v => v > 0.86 ? 'w' : v > 0.72 ? 'gb' : v > 0.6 ? 'ga' : v > 0.48 ? 'g9' : v > 0.38 ? 'g7' : v > 0.3 ? 'g5' : v > 0.22 ? 'g4' : v > 0.15 ? 'g3' : 'g2';
  [[0, 'HAADF', 'y4', v => v], [1, 'BF', 'g9', v => 0.92 - 0.7 * U.clamp((v - 0.2) / 0.8)]].forEach(([i, name, col, f]) => {
    const x = x0 + i * (S + 10);
    PIX.rect(c, x - 1, y0 - 1, S + 2, S + 2, 'g5', k);
    const img = c.getImageData(x, y0, S, S), d = img.data;
    for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
      if (K.BAY(x + xx, y0 + yy) >= k) continue;                              // dithered fade
      const p = PIX.hex(PIX.P[shade(f(HA.D[(cy - S / 2 + yy) * HA.IW + cx - S / 2 + xx]))]), q = (yy * S + xx) * 4;
      d[q] = p[0]; d[q + 1] = p[1]; d[q + 2] = p[2]; d[q + 3] = 255;
    }
    c.putImageData(img, x, y0);
    PIX.text(c, name, x + S / 2, y0 - 10, col, { align: 'center', n: Math.floor((lt - 1.65) * PIX.RATE) });
  });
  if (lt > 1.9) PIX.text(c, 'SAME ATOMS', x0 + S + 5, y0 + S + 5, 'g9', { align: 'center', n: Math.floor((lt - 1.9) * PIX.RATE) });
}
// ---------- part 2: inside the ring — scintillator, light guide, photomultiplier ----------
const SCX = 12, SCY = 158, SCW = 80;                                            // scintillator slab
const PMT = [140, 132, 124, 72];                                                 // x, y, w, h
const DY = [[166, 146], [181, 190], [196, 146], [211, 190], [226, 146], [241, 190]];
const ANX = 254, CAB = 268;
const HITS = [3.55, 4.75, 5.55, 6.15, 6.6, 7.0, 7.35];
function chainView(c, lt) {
  PIX.rect(c, 0, 0, W, H, 'k'); for (let y = 0; y < H; y += 24) PIX.rect(c, 0, y, W, 1, 'n0');
  // scintillator slab (part of the ring, cut open)
  PIX.rect(c, SCX - 2, SCY - 2, SCW + 4, 26, 'g3'); PIX.rect(c, SCX, SCY, SCW, 14, 'c3'); PIX.rect(c, SCX, SCY, SCW, 2, 'c5'); PIX.rect(c, SCX, SCY + 14, SCW, 8, 'g4');
  // light guide (tapered, translucent)
  PIX.fill(c, PIX.polyPath([[SCX + SCW, SCY], [PMT[0], PMT[1] + 14], [PMT[0], PMT[1] + PMT[3] - 14], [SCX + SCW, SCY + 22]]), 'n3');
  PIX.bline(c, SCX + SCW, SCY, PMT[0], PMT[1] + 14, 'n4'); PIX.bline(c, SCX + SCW, SCY + 22, PMT[0], PMT[1] + PMT[3] - 14, 'n2');
  // photomultiplier: glass, photocathode, dynodes, anode, cable
  const [px, py, pw, ph] = PMT;
  PIX.fill(c, PIX.rectPath(px, py, pw, ph, 18), 'n4'); PIX.fill(c, PIX.rectPath(px + 2, py + 2, pw - 4, ph - 4, 16), 'n0');
  PIX.rect(c, px + 4, py + 12, 4, ph - 24, 'y3'); PIX.rect(c, px + 4, py + 12, 1, ph - 24, 'y4');
  for (const [x, y] of DY) { PIX.rect(c, x - 7, y - 2, 14, 4, 'g7'); PIX.rect(c, x - 7, y - 2, 14, 1, 'g9'); }
  PIX.rect(c, ANX - 2, py + 18, 4, ph - 36, 'g8');
  PIX.rect(c, px + pw, py + ph / 2 - 1, CAB - px - pw + 1, 3, 'g5'); PIX.rect(c, CAB - 2, py + ph / 2, 3, 286 - (py + ph / 2), 'g5');
  // each hit: electron in → flash → light along the guide → photoelectron → ×3 per dynode → pulse down the cable
  for (const t0 of HITS) {
    const a = lt - t0; if (a < -0.45 || a > 1.75) continue;
    const ex = SCX + 34 + U.hash(t0 * 10, 1) * 20, ey = SCY;
    if (a < 0) { const u = -a / 0.45, y = U.lerp(ey, 70, u); FX.trail(c, [[ex, y], [ex, y - 16], [ex, y - 30]], 1, ['y3', 'y2', 'y1', 'y0']); FX.e(c, ex, y, 2, 1, true); continue; }
    if (a < 0.22) { FX.flash(c, ex, ey + 6, 4 + a * 50, 'w', 1 - a / 0.22); FX.glowL(c, ex, ey + 6, 18, ['c2', 'c4', 'c5'], 1 - a / 0.22); }
    if (a < 0.5) for (let q = 0; q < 14; q++) {                                                         // the light, bouncing down the guide
      const u = U.clamp((a - 0.02) / 0.46) * (0.75 + 0.25 * U.hash(q, t0 * 10)), x = U.lerp(ex, px + 7, u);
      const half = U.lerp(10, 22, U.clamp((x - SCX - SCW) / (px - SCX - SCW))), y = SCY + 11 + (2 * Math.abs(((u * 6 + q * 0.37) % 2) - 1) - 1) * half * 0.8;
      PIX.rect(c, Math.round(x), Math.round(y), 2, 1, q % 3 ? 'c5' : 'w');
    }
    if (a > 0.46 && a < 1.06) {                                                                         // cascade
      const f0 = (a - 0.46) / 0.085, st = Math.min(6, Math.floor(f0)), f = f0 - Math.floor(f0);
      const from = st === 0 ? [px + 9, py + ph / 2] : DY[st - 1], to = st < 6 ? DY[st] : [ANX, py + ph / 2];
      const n = Math.pow(3, st);
      for (let q = 0; q < Math.min(n, 16); q++) { const jx = (U.hash(q, st * 7 + t0) - 0.5) * (4 + st * 1.5), jy = (U.hash(q + 3, st + t0) - 0.5) * (4 + st * 1.5); FX.e(c, U.lerp(from[0], to[0], f) + jx, U.lerp(from[1], to[1], f) + jy, st > 3 ? 1 : 2, 1); }
      if (st > 0 && f < 0.3) FX.flash(c, from[0], from[1], 3, 'c4', 1 - f / 0.3);
    }
    if (a > 1.05) { const u = U.clamp((a - 1.05) / 0.55), yy = U.lerp(py + ph / 2, 286, u); PIX.rect(c, CAB - 4, Math.round(yy) - 4, 7, 9, 'e2'); PIX.rect(c, CAB - 2, Math.round(yy) - 2, 3, 5, 'e3'); }
  }
  // the signal trace: one pulse per detected electron
  const gx = 22, gy = 300, gw = 228, gh = 42;
  PIX.rect(c, gx - 4, gy - 16, gw + 8, gh + 24, 'k'); PIX.rect(c, gx - 4, gy - 16, gw + 8, 1, 'g3');
  PIX.text(c, 'ELECTRICAL SIGNAL', gx, gy - 12, 'e3', { shadow: null });
  let pv = null;
  for (let i = 0; i <= gw; i++) {
    const tt = lt - (gw - i) / 90; let v = 0;
    for (const t0 of HITS) { const d = tt - (t0 + 1.6); if (d > 0 && d < 0.3) v += Math.exp(-d * 14) * (1 - Math.exp(-d * 90)); }
    const y = gy + gh - Math.min(1, v) * (gh - 4); if (pv) PIX.bline(c, pv[0], pv[1], gx + i, y, 'e2'); pv = [gx + i, y];
  }
}
SC.s14_detector = {
  xin: 0.4,
  init() {
    const r = U.rng(9191); EV = [];
    for (let i = 0; i < 120; i++) {
      const hiA = r() < 0.06, R = hiA ? RIN + 6 + r() * (ROUT - RIN - 14) : r() * RIN * 0.75;      // a few % reach the ring (as in S12–S13)
      EV.push({ t: 0.2 + i * 0.024 + r() * 0.02, R, phi: r() * U.TAU });
    }
  },
  draw(c, lt) {
    if (lt < T_CUT + 0.3) {
      const v = ringView(c, lt); inset(c, lt);
      CAP.note(c, lt, { text: 'LOW ANGLE: THROUGH THE HOLE', x: 12, y: v.by + 26, ax: 135 - 8, ay: v.by - 2, t0: 0.85, t1: T_CUT, col: 'c4', lineCol: 'c2', box: true });
      CAP.note(c, lt, { text: 'HIGH ANGLE: HITS THE RING', x: W - 10, y: v.ry - 58, ax: 135 + 76, ay: v.ry - 8, t0: 1.2, t1: T_CUT, col: 'y4', lineCol: 'y2', box: true, align: 'right' });
      CAP.note(c, lt, { text: 'BF DETECTOR', x: W - 12, y: v.by + 6, ax: 135 + 24, ay: v.by, t0: 1.6, t1: T_CUT, col: 'g8', lineCol: 'g5', box: true, align: 'right' });
      if (lt > T_CUT) {
        // zoom into the ring's face, then the cut-open chain
        const p = MO.cubicIn(U.clamp((lt - T_CUT) / 0.3)), z = Math.pow(5, p);
        ZX.setTransform(1, 0, 0, 1, 0, 0); ZX.fillStyle = PIX.P.k; ZX.fillRect(0, 0, W, H); ringView(ZX, lt);
        c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.drawImage(ZC, 207 - 207 * z, v.ry - v.ry * z, W * z, H * z); c.restore();
        window.dissolve(c, () => {}, cc => chainView(cc, lt), MO.smooth(p));
      }
    } else chainView(c, lt);
    if (lt > T_CHAIN) {
      CAP.note(c, lt, { text: 'SCINTILLATOR (THE RING)', x: 12, y: 196, ax: SCX + 24, ay: SCY + 22, t0: T_CHAIN + 0.15, col: 'c4', lineCol: 'c2', box: true });
      CAP.note(c, lt, { text: 'LIGHT GUIDE', x: 84, y: 226, ax: 116, ay: 178, t0: T_CHAIN + 0.6, col: 'g9', lineCol: 'g5', box: true });
      CAP.note(c, lt, { text: 'PHOTOMULTIPLIER', x: W - 10, y: 104, ax: 214, ay: PMT[1], t0: T_CHAIN + 1.0, col: 'w', lineCol: 'g6', box: true, align: 'right' });
      CAP.note(c, lt, { text: 'x3 PER STAGE', x: W - 14, y: 226, ax: 226, ay: 196, t0: T_CHAIN + 1.6, col: 'c4', lineCol: 'c2', box: true, align: 'right' });
      CAP.steps(c, lt, { x: 24, y: 364, gap: 12, t1: 1e9, items: [[T_CHAIN + 0.2, 'SCATTERED ELECTRONS', 'y3'], [T_CHAIN + 0.5, 'SCINTILLATOR', 'c4'], [T_CHAIN + 0.8, 'LIGHT', 'w'], [T_CHAIN + 1.2, 'PHOTODETECTOR', 'g9'], [T_CHAIN + 1.8, 'ELECTRICAL SIGNAL', 'e2']] });
      if (lt > T_CHAIN + 2.6) PIX.text(c, 'other detector types exist', W - 8, 462, 'g8', { align: 'right', shadow: null });
    }
    CAP.scene(c, lt, { title: 'HAADF DETECTOR', ctx: ['HIGH-ANGLE ANNULAR DARK-FIELD'], t0: 0.25, acc: 'c2' });
  },
  cues: () => {
    const out = [[0.0, 'glide', 0.8, 0, 2.2], [0.25, 'title_hit', 0.7]];
    EV.forEach(e => { if (e.R > RIN && e.R < ROUT) out.push([e.t + 0.55, 'det_tick', 0.8, Math.cos(e.phi) * 0.6]); });
    out.push([T_CUT, 'zoom_punch', 0.8, 0, 0.3]);
    HITS.forEach((t, i) => out.push([t, 'scint_flash', 1, -0.4], [t + 0.5, 'pmt_cascade', 1, 0.2, 0.55], [t + 1.5, 'signal_pulse', 1, 0.3]));
    return out;
  },
};
const ZC = document.createElement('canvas'); ZC.width = W; ZC.height = H; const ZX = ZC.getContext('2d', { willReadFrequently: true });
})();
