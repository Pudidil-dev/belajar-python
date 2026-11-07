// S24 A DIFFERENT INTERACTION (92–96 s): a separate example in soft tissue: a water molecule. A photon meets one of its
// loosely bound outer electrons: the photon goes on, changed in direction and with a longer wave (less energy); the
// recoil electron flies off. A small inset keeps the photoelectric result for comparison: there the photon ended.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const X = 172, Y = 360, R = 118, TC = 1.3;
const EO = [X - R * 0.75, Y - R * 0.38];
SC['s24_compton'] = {
  draw(c, t, S) {
    ATOM.water(c, X, Y, R, S.t);
    const [ex, ey] = EO;
    if (t < TC) {
      FX.e(c, ex + Math.sin(S.t * 3) * 1.5, ey, 2, 1);
      const px = lerp(-30, ex, clamp(t / TC)), py = lerp(ey + 40, ey, clamp(t / TC)); FX.ph(c, px, py, Math.atan2(-40, ex + 30), 7, 20, 5, 1);
    } else {
      const age = t - TC;
      if (age < 0.4) FX.flash(c, ex, ey, 10 * (1 - age / 0.4), 'w', 1 - age / 0.4);
      const a1 = -0.95, d1 = age * 110, sx = ex + Math.cos(a1) * d1, sy = ey + Math.sin(a1) * d1;
      for (let k = 0; k < d1; k += 5) PIX.rect(c, Math.round(ex + Math.cos(a1) * k), Math.round(ey + Math.sin(a1) * k), 1, 1, 'y1');
      FX.ph(c, sx, sy, a1, 12, 26, 5, 1, ['y0', 'y1', 'y2', 'y2']);
      const a2 = 0.62, d2 = age * 80, rx = ex + Math.cos(a2) * d2, ry = ey + Math.sin(a2) * d2;
      const tr = []; for (let j = 0; j < 12; j++) { const dd = Math.max(0, age - j * 0.05) * 80; tr.push([ex + Math.cos(a2) * dd, ey + Math.sin(a2) * dd]); }
      FX.trail(c, tr, 1); FX.e(c, rx, ry, 3, 1, true);
    }
    // the comparison inset: the iodine atom with its vacancy, the absorbed photon's end marked
    const ia = MO.smooth(clamp((t - 0.2) / 0.3));
    if (ia > 0) {
      c.save(); c.globalAlpha = ia;
      const ix = 290, iy = 148, ir = 46;
      PIX.rect(c, ix - ir - 8, iy - ir - 8, 2 * ir + 16, 2 * ir + 16, 'k'); PIX.rect(c, ix - ir - 8, iy - ir - 8, 2 * ir + 16, 1, 'n3');
      inset(c, ix - ir - 7, iy - ir - 7, 2 * ir + 14, 2 * ir + 14, cc => { ATOM.iodine(cc, ix, iy, ir, S.t, { vacancy: true, skipK: true }); const [kx, ky] = ATOM.eAt(ix, iy, ir, 0, 0, 88.0); PIX.rect(cc, Math.round(kx) - 1, Math.round(ky) - 1, 3, 3, 'y3'); PIX.bline(cc, ix - ir - 6, ky, kx - 3, ky, 'y1', 1); });
      c.restore();
    }
    CAP.ctx(c, t, { text: 'KOMPTON SƏPİLMƏSİ', t0: 0.4, t1: 3.6 });
  },
  cues: [[0.2, 'inset_pop', 0.5, 0.5], [0.4, 'type', 0.4], [TC, 'scatter', 1.0, 0.2], [TC + 0.05, 'recoil', 0.6, 0.4]],
  xin: 0.3,
};
})();
