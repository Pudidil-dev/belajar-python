// S07 THE EYE BENDS THE LIGHT (18–21 s): the camera pulls back to the whole eye in section. The guides, bent a little at
// the cornea and again at the lens, draw together and meet in one small spot on the retina; faint dotted lines show
// where they would have gone unbent. The cornea and the lens are the eye's two focusing elements; the spot is small.
(() => {
const clamp = U.clamp, lerp = U.lerp;
SC['s07_bend'] = {
  draw(c, t, S) {
    const T = S.t, cam = DIAG.track(T), F = DIAG.fronts(T), rays = OPT.paths(0).out;
    const ghost = MO.smooth(clamp((t - 0.5) / 0.4)) * (1 - MO.smooth(clamp((t - 2.5) / 0.4)));
    DIAG.draw(c, cam, { t: T, lamp: 1, fix: 6, fixA: 0.3, src: 1, out: F.out, w: 2,
      under: (c2, cam2) => {
        // the unbent continuations of the two outer guides (dotted, dim), from the cornea straight on to the back wall
        if (ghost <= 0) return;
        for (const k of [0, 2]) { const p = rays[k][6], y = p[1], xe = -EYE.G.CS - Math.sqrt(EYE.G.RR ** 2 - y * y), q = Math.min(1, (F.dOut - F.L.dC) / 24);
          const [ax, ay] = K.S(cam2, p[0], y), [bx, by] = K.S(cam2, lerp(p[0], xe, q), y); c2.save(); c2.globalAlpha = ghost; PIX.bline(c2, ax, ay, bx, by, 'c1', 1); c2.restore(); }
      } });
    window.bendMarks(c, cam, F.out, 6, 9);
    if (F.outAt) { const [sx, sy] = K.S(cam, -EYE.G.AL, 0), k = clamp((T - 20.25) / 0.3); FX.glowL(c, sx, sy, (5 + 9 * MO.backOut(k)) * cam.z / 12.5, ['c0', 'c1', 'c2', 'c3', 'c5'], 0.95, 1.4); PIX.rect(c, Math.round(sx) - 1, Math.round(sy) - 1, 3, 3, 'w'); }
    const [lx, ly] = K.S(cam, -5.9, 3.6);
    CAP.part(c, t, { text: 'Lens', ax: lx, ay: ly, x: 262, y: 446, t0: 1.0, t1: 2.6, col: 'l3', align: 'center' });
    CAP.ctx(c, t, { text: 'The eye bends light', t0: 0.3, t1: 2.7, acc: 'c3' });
  },
  cues: [[0.1, 'pull', 0.5, 0, 0.9], [0.3, 'type', 0.4], [0.375, 'bend', 0.8, 0.2], [1.0, 'label', 0.5, 0.3], [0.5, 'converge', 0.8, 0, 1.75], [2.25, 'spot', 1.0, -0.4]],
};
})();
