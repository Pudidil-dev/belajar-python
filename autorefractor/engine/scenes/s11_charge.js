// S11 LIGHT BECOMES CHARGE (30–33 s): one pixel of the sensor in cross-section (schematic, not to scale): a microlens,
// the wiring layers with an opening between them, and the silicon with its light-sensitive region. Returning light
// (magenta packets) is focused by the microlens into the silicon. Each packet that is absorbed frees an electron — a
// pale-gold dot — which drifts into the pixel's collection well; the hole it leaves drifts away into the substrate.
// More light, more electrons: the well's gold packet is the pixel's signal.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, h = U.hash;
const CX = 180, YS = 300;                                   // the featured pixel's centre line, the silicon surface
const SLOTS = [4, 6, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20];   // absorptions on the 16th-note grid (0.125 s)
const EV = SLOTS.map((s, k) => {
  const ox = (h(k, 31) - 0.5) * 150, ax = CX + ox * 0.22 + (h(k, 33) - 0.5) * 34, ay = YS + 26 + h(k, 35) * 78;
  return { t: s * 0.125, ox, ax, ay, k };
});
window.S11EV = EV;
const WELL = { x: CX - 26, y: YS + 62, w: 52, h: 52 };
const slot = k => [WELL.x + 6 + (k % 5) * 9, WELL.y + WELL.h - 10 - Math.floor(k / 5) * 9];
const R = (c, x, y, w, hh, col) => PIX.rect(c, Math.round(x), Math.round(y), Math.round(w), Math.round(hh), col);
function pixel(c, dx, main) {
  const x = CX + dx;
  // microlens: a dome with a flat two-tone shade
  const dome = new Path2D(); dome.ellipse(x, YS - 104, 104, 36, 0, Math.PI, 0); dome.closePath();
  PIX.fill(c, dome, 'b1'); c.save(); c.clip(dome); c.fillStyle = P.b0; c.fillRect(x + 40, YS - 150, 80, 60); c.fillStyle = P.b2; c.beginPath(); c.ellipse(x - 30, YS - 118, 46, 9, -0.25, 0, U.TAU); c.fill(); c.restore();
  R(c, x - 108, YS - 104, 216, 16, 'g3'); R(c, x - 108, YS - 104, 216, 2, 'g5');                 // the flat layer under the lenses
  R(c, x - 108, YS - 88, 216, 88, 'g1');                                                       // the wiring layers (clear in the middle)
  for (const sg of [-1, 1]) {
    R(c, x + sg * 84 - 24, YS - 80, 48, 14, 'g5'); R(c, x + sg * 84 - 24, YS - 80, 48, 2, 'g7');
    R(c, x + sg * 80 - 28, YS - 54, 56, 14, 'g5'); R(c, x + sg * 80 - 28, YS - 54, 56, 2, 'g7');
    R(c, x + sg * 88 - 4, YS - 66, 8, 12, 'g4'); R(c, x + sg * 88 - 4, YS - 40, 8, 40, 'g4');
  }
  R(c, x + 44, YS - 12, 34, 12, 'g6'); R(c, x + 44, YS - 12, 34, 2, 'g8');                       // the gate that will let the charge out
  // silicon: body, the light-sensitive region, the trenches between pixels, the substrate
  R(c, x - 108, YS, 216, 200, 'si0'); R(c, x - 108, YS, 216, 2, 'si2');
  const pd = new Path2D(); pd.roundRect(x - 66, YS + 6, 132, 128, 10); PIX.fill(c, pd, 'si1'); c.save(); c.clip(pd); c.fillStyle = P.si2; c.fillRect(x - 66, YS + 6, 132, 7); c.restore();
  for (const sg of [-1, 1]) R(c, x + sg * 108 - 3, YS, 6, 150, 'g2');
  R(c, x - 108, YS + 200, 216, 40, 'k'); R(c, x - 108, YS + 200, 216, 2, 'si1');
  for (let q = 0; q < 9; q++) R(c, x - 100 + q * 24, YS + 208, 12, 2, 'si0');
  if (!main) return;
  // the collection well: a bracket open at the top
  R(c, WELL.x, WELL.y, 2, WELL.h, 't2'); R(c, WELL.x + WELL.w - 2, WELL.y, 2, WELL.h, 't2'); R(c, WELL.x, WELL.y + WELL.h - 2, WELL.w, 2, 't2');
}
SC['s11_charge'] = {
  xin: 0.45,
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0');
    window.beatGlow(c, S.t, CX, YS - 20);
    for (const dx of [-222, 222, 0]) pixel(c, dx, dx === 0);
    K.dith(c, 0, YS - 150, CX - 111, 400, 'n0', 0.5); K.dith(c, CX + 111, YS - 150, 200, 400, 'n0', 0.5);     // the neighbours stay in the half-dark
    // the cone of light the microlens gathers (faint guides)
    for (const q of [-0.8, -0.4, 0, 0.4, 0.8]) { PIX.bline(c, CX + q * 96, 132, CX + q * 96, YS - 104 - 34 * Math.sqrt(1 - q * q), 'm1', 1); PIX.bline(c, CX + q * 96, YS - 104 - 34 * Math.sqrt(1 - q * q), CX + q * 22, YS + 60, 'm0', 1); }
    let got = 0;
    for (const e of EV) {
      const dtp = t - e.t;                                                       // time since this packet was absorbed
      const lx = CX + e.ox, ly = YS - 104 - 30 * Math.sqrt(Math.max(0, 1 - (e.ox / 104) ** 2));
      if (dtp < 0 && dtp > -0.5) {                                               // the packet on its way down: to the lens, then bent inward
        const q = 1 + dtp / 0.5, L1 = ly - 136, L2 = Math.hypot(e.ax - lx, e.ay - ly), d = q * (L1 + L2);
        const [px, py, ang] = d < L1 ? [lx, 136 + d, Math.PI / 2] : [lerp(lx, e.ax, (d - L1) / L2), lerp(ly, e.ay, (d - L1) / L2), Math.atan2(e.ay - ly, e.ax - lx)];
        FX.ph(c, px, py, ang, 9, 17, 4, 1, ['m1', 'm2', 'm3', 'm4']);
      }
      if (dtp >= 0) {
        if (dtp < 0.12) FX.flash(c, e.ax, e.ay, 6 * (1 - dtp / 0.12) + 1, 'm4', 1);
        // the electron drifts to its place in the well; the hole drifts down into the substrate
        const [sx, sy] = slot(e.k), q = MO.cubicOut(clamp(dtp / 0.38)), ex = lerp(e.ax, sx, q), ey = lerp(e.ay, sy, q) - Math.sin(Math.PI * q) * 6;
        R(c, ex - 1, ey - 1, 7, 7, 'y1'); R(c, ex, ey, 5, 5, 'y3'); R(c, ex + 1, ey + 1, 2, 2, 'y4');
        if (q >= 1) got++;
        const hq = clamp(dtp / 0.7); if (hq < 1) { const hx = e.ax + 6, hy = lerp(e.ay + 4, YS + 196, hq * hq); c.save(); c.globalAlpha = 1 - hq * 0.7; R(c, hx, hy, 5, 1, 'y1'); R(c, hx, hy + 4, 5, 1, 'y1'); R(c, hx, hy, 1, 5, 'y1'); R(c, hx + 4, hy, 1, 5, 'y1'); c.restore(); }
      }
    }
    // the full packet: the well's rim brightens
    if (t > 2.625) { const k = clamp((t - 2.625) / 0.2); FX.glowL(c, CX, WELL.y + WELL.h - 16, 44 * k, ['y0', 'y1', 'y2'], 0.5, 1.6); R(c, WELL.x, WELL.y, 2, WELL.h, 'y3'); R(c, WELL.x + WELL.w - 2, WELL.y, 2, WELL.h, 'y3'); R(c, WELL.x, WELL.y + WELL.h - 2, WELL.w, 2, 'y3'); }
    CAP.ctx(c, t, { text: '*Light* → *charge*', t0: 0.3, t1: 2.7, acc: 'y3', em: ['m3', 'y3'] });
  },
  cues: () => [[0.3, 'type', 0.4]].concat(EV.map((e, k) => [e.t, 'charge_pop', 0.7 + 0.02 * k, (e.ax - CX) / 60, k])).concat([[2.625, 'packet', 0.9, 0]]),
};
})();
