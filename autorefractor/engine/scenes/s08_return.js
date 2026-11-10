// S08 A SMALL PART COMES BACK (21–24 s): the camera pushes in to the back of the eye. Where the cyan guides meet the
// retina, the light scatters in every direction — drawn in magenta, the colour of returning light (the light itself does
// not change). Most of it ends in the tissue or on the inside wall of the eye; only the narrow part that happens to
// point at the pupil is on its way out. The retina is not a mirror, and the eye is not changed by any of this.
(() => {
const clamp = U.clamp, lerp = U.lerp, h = U.hash, DEG = Math.PI / 180;
const N = 30;
// the diffuse scatter from the spot: rays in all forward directions that fade with distance, and short ones into the tissue
window.scatterFan = (c, cam, T, T0, a = 1) => {
  if (T < T0 || a <= 0) return;
  const O = [-EYE.G.AL + 0.05, 0], S = (x, y) => K.S(cam, x, y);
  c.save(); c.globalAlpha = a;
  for (let k = 0; k < N; k++) {
    const th = (-84 + 168 * (k + 0.5) / N + (h(k, 3) - 0.5) * 3) * DEG;
    if (Math.abs(th) < 7 * DEG) continue;                                  // the collected part is drawn as the returning guides
    const dly = h(k, 5) * 0.25, Lmax = 2.6 + 4.2 * h(k, 9), d = Math.min(Lmax, Math.max(0, (T - T0 - dly) * 9));
    if (d <= 0) continue;
    const dx = Math.cos(th), dy = Math.sin(th), seg = (d0, d1, col, dash) => { if (d1 <= d0) return; const [ax, ay] = S(O[0] + dx * d0, O[1] + dy * d0), [bx, by] = S(O[0] + dx * d1, O[1] + dy * d1); PIX.bline(c, ax, ay, bx, by, col, dash); };
    seg(0.15, Math.min(d, Lmax * 0.34), 'm2', 0); seg(Lmax * 0.34, Math.min(d, Lmax * 0.66), 'm1', 0); seg(Lmax * 0.66, Math.min(d, Lmax), 'm1', 1);
    // a dash running outward along it
    const ph = ((T * 5 + h(k, 11) * 3) % 1) * Lmax; if (ph < d - 0.3) seg(ph, ph + 0.3, 'm3', 0);
  }
  // into the tissue: short, absorbed at once
  for (let k = 0; k < 9; k++) {
    const th = (180 - 70 + 140 * (k + 0.5) / 9) * DEG, L = 0.28 + 0.5 * h(k, 21), ph = ((T - T0) * 1.6 + h(k, 23)) % 1;
    const [ax, ay] = S(O[0], O[1]), [bx, by] = S(O[0] + Math.cos(th) * L * Math.min(1, ph * 2.2), O[1] + Math.sin(th) * L * Math.min(1, ph * 2.2));
    if (ph < 0.8) PIX.bline(c, ax, ay, bx, by, ph < 0.45 ? 'm2' : 'm1');
  }
  c.restore();
};
window.retSpot = (c, cam, T, T0) => {
  const [sx, sy] = K.S(cam, -EYE.G.AL, 0), k = clamp((T - T0) / 0.35), R = (9 + 4 * k) * cam.z / 12.5;
  FX.glowL(c, sx, sy, R, k > 0.5 ? ['m0', 'm1', 'm2', 'm3', 'm4'] : ['c0', 'c1', 'c2', 'c3', 'c5'], 0.95, 1.4);
  PIX.rect(c, Math.round(sx) - 1, Math.round(sy) - 2, 3, 5, 'w'); PIX.rect(c, Math.round(sx) - 2, Math.round(sy) - 1, 5, 3, 'w');
};
const T0 = 21.875;
SC['s08_return'] = {
  draw(c, t, S) {
    const T = S.t, cam = DIAG.track(T), F = DIAG.fronts(T);
    DIAG.draw(c, cam, { t: T, lamp: 1, fix: 6, fixA: 0.25, src: 1, out: F.out, outA: 0.8, w: 2, back: F.back,
      under: (c2, cam2) => window.scatterFan(c2, cam2, T, T0) });
    window.retSpot(c, cam, T, T0);
    const y = -3.6, [rx, ry] = K.S(cam, -EYE.G.CS - Math.sqrt((EYE.G.RR + 0.15) ** 2 - y * y), y);
    CAP.part(c, t, { text: 'Retina', ax: rx, ay: ry, x: 150, y: 176, t0: 1.125, t1: 2.6, col: 'r2' });
    CAP.ctx(c, t, { text: 'Some light returns', t0: 0.3, t1: 2.7, acc: 'm3' });
  },
  cues: [[0.0, 'push', 0.5, 0, 0.8], [0.3, 'type', 0.4], [0.875, 'scatter', 1.0, -0.3], [1.125, 'label', 0.5, -0.2], [1.625, 'answer', 0.9, 0.2]],
};
})();
