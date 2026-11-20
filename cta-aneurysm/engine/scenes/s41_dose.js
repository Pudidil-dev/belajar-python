// S41 RADIATION EXPOSURE (160–164 s): a brief inset in tissue: an X-ray photon passing a water molecule knocks out an
// electron (ionization: why X-rays are used only when justified). The inset closes into the corner and the view returns to
// the scanner: as the tube turns, its output adapts to how much head the beam has to cross (more from the side, less from
// the front), so the dose is as low as the image needs. No harm dramatized, no zero risk claimed.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const insetA = t => 1 - MO.cubicInOut(clamp((t - 1.5) / 0.6));
const betaAt = t => TAU * 0.8 * MO.sineInOut(clamp((t - 1.6) / 2.3)) + 0.2;
// relative tube current for an angle: follows the head's thickness along the beam (model projection, central ray)
const mA = b => { const p = AXI.profile(b); let s = 0; for (let j = AXI.NCH * 0.4; j < AXI.NCH * 0.6; j++) s += p[Math.floor(j)]; return s / (AXI.NCH * 0.2); };
let MMAX = null;
SC['s41_dose'] = {
  draw(c, t, S) {
    if (!MMAX) { MMAX = 0; for (let k = 0; k < 64; k++) MMAX = Math.max(MMAX, mA(k / 64 * TAU)); }
    const ia = insetA(t);
    if (ia < 1) {
      const o = AXI.O, b = betaAt(t), m = mA(b) / MMAX;
      AXI.ring(c, o, 1); AXI.head(c, o, { c8: PIX.hex(P.v2) }); AXI.parts(c, b, o, { fan: 0.35 + 0.65 * m });
      // the tube-current trace by angle (bottom): it rises where the head is wider
      const X0 = 40, Y0 = 560, GW = 280, GH = 40;
      PIX.rect(c, X0 - 4, Y0 - GH - 6, GW + 8, GH + 12, 'k'); PIX.rect(c, X0, Y0, GW, 1, 'g5');
      let prev = null; for (let k = 0; k <= 60; k++) { const bb = 0.2 + k / 60 * TAU * 0.8; if (bb > b) break; const x = X0 + k / 60 * GW, y = Y0 - mA(bb) / MMAX * GH; if (prev) { PIX.bline(c, prev[0], prev[1], x, y, 'y3'); } prev = [x, y]; }
      if (prev) PIX.circ(c, prev[0], prev[1], 2, 'y4');
    }
    // the tissue inset: full frame first, then closing into the top-left corner
    if (ia > 0) {
      const x = lerp(16, 16, 1 - ia), y = lerp(112, 112, 1 - ia), w = lerp(328, 0, 1 - ia), hh = lerp(440, 0, 1 - ia);
      PIX.rect(c, x - 2, y - 2, w + 4, hh + 4, 'n3');
      inset(c, x, y, w, hh, cc => {
        PIX.rect(cc, x, y, w, hh, 'n1');
        const cp = new Path2D(); cp.ellipse(x + w * 0.5, y + hh * 0.5, w * 0.62, hh * 0.44, 0.2, 0, U.TAU); PIX.fill(cc, cp, 'p0'); FX.ring(cc, x + w * 0.5, y + hh * 0.5, 0, 'p1', 0);
        const np = new Path2D(); np.ellipse(x + w * 0.74, y + hh * 0.7, 34, 26, 0.3, 0, U.TAU); PIX.fill(cc, np, 'p1');
        const mx = x + w * 0.5, my = y + hh * 0.5, R = 70 * ia;
        ATOM.water(cc, mx, my, R, S.t);
        const TI = 0.7, age = t - TI;
        if (age < 0) FX.ph(cc, lerp(x - 20, mx - R * 0.6, clamp(t / TI)), my - R * 0.4, 0, 7, 18, 4, 1);
        else {
          const px = mx - R * 0.6 + age * 140; if (px < x + w + 20) FX.ph(cc, px, my - R * 0.4 + age * 30, 0.2, 8, 18, 4, 1, ['y0', 'y1', 'y2', 'y2']);
          if (age < 0.35) FX.flash(cc, mx - R * 0.6, my - R * 0.4, 8 * (1 - age / 0.35), 'w', 1 - age / 0.35);
          const ex = mx - R * 0.6 + age * 50, ey = my - R * 0.4 - age * 80; FX.e(cc, ex, ey, 2, 1, true);
        }
      });
    }
    CAP.ctx(c, t, { text: 'ƏSASLI, OPTİMAL DOZA', t0: 0.4, t1: 3.6 });
  },
  cues: [[0, 'calm_pad', 0.6, 0, 4], [0.4, 'type', 0.4], [0.7, 'ionize', 0.5, 0], [1.5, 'pull_back', 0.6, 0, 0.6], [1.6, 'spin_motor', 0.5, 0, 2.3]],
  xin: 0.3,
};
})();
