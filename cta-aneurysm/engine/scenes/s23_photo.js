// S23 PHOTOELECTRIC ABSORPTION (88–92 s): the photon reaches a K-shell electron and is absorbed — its path ends there,
// with a flash. The electron is ejected and flies out (cyan, with a trail); a vacancy blinks in the K shell. The nucleus is
// untouched. Camera static.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const TA = 0.0;                                                // absorption time (local): on the bar line, the cut from S22
SC['s23_photo'] = {
  draw(c, t, S) {
    const { X, Y, R } = window.IOD, [kx, ky] = ATOM.eAt(X, Y, R, 0, 0, 88 + TA);
    ATOM.iodine(c, X, Y, R, S.t, { vacancy: t > TA, skipK: t > TA, kHi: true });
    {
      const age = t - TA;
      if (age < 0.5) { FX.flash(c, kx, ky, 16 * (1 - age / 0.5), 'y4', 1 - age / 0.5); FX.ring(c, kx, ky, 6 + age * 120, 'y2', 1 - age / 0.5); }
      // the photoelectron: out to the upper right, decelerating a little as it leaves the atom
      const d = 260 * (1 - Math.exp(-age / 0.9)) + age * 30, ang = -0.75, ex = kx + Math.cos(ang) * d, ey = ky + Math.sin(ang) * d;
      const tr = []; for (let j = 0; j < 14; j++) { const a2 = Math.max(0, age - j * 0.04), dd = 260 * (1 - Math.exp(-a2 / 0.9)) + a2 * 30; tr.push([kx + Math.cos(ang) * dd, ky + Math.sin(ang) * dd]); }
      FX.trail(c, tr, 1); FX.e(c, ex, ey, 3, 1, true);
    }
    CAP.ctx(c, t, { text: 'FOTOELEKTRİK UDULMA', t0: 0.6, t1: 3.6 });
  },
  cues: [[TA, 'absorb', 1.0, -0.1], [TA + 0.02, 'eject', 0.8, 0.5], [0.6, 'type', 0.4], [1.0, 'vacancy_blink', 0.5, -0.2, 2.4]],
};
})();
