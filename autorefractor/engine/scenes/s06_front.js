// S06 ENTER THROUGH THE PUPIL (15–18 s): the camera arrives at the front of the eye. The three cyan guides meet the
// cornea, cross the clear fluid behind it and pass through the middle of the pupil, the opening in the iris, without
// touching its edge, and reach the lens. Nothing in the eye moves or changes: it is only light going in.
(() => {
const clamp = U.clamp, lerp = U.lerp;
// small bright marks where the guides cross a surface (vertices i0..i1 of the outgoing rays), once the front is past
window.bendMarks = (c, cam, u, i0, i1, col = 'c5') => {
  const rays = OPT.paths(0).out;
  for (const pts of rays) for (let i = i0; i <= i1; i++) if (u >= i) { const [x, y] = K.S(cam, pts[i][0], pts[i][1]); PIX.rect(c, Math.round(x) - 1, Math.round(y) - 1, 3, 3, col); }
};
SC['s06_front'] = {
  draw(c, t, S) {
    const T = S.t, cam = DIAG.track(T), F = DIAG.fronts(T);
    DIAG.draw(c, cam, { t: T, lamp: 1, fog: window.fogAt(T), fix: 6, fixA: 0.4, src: 1, out: F.out, w: 2 });
    window.bendMarks(c, cam, F.out, 6, 8);
    const [cx, cy] = K.S(cam, -0.42, -2.5), [px, py] = K.S(cam, -3.62, 1.96);
    CAP.part(c, t, { text: 'Cornea', ax: cx, ay: cy, x: 236, y: 206, t0: 1.0, t1: 2.6, col: 'o3' });
    CAP.part(c, t, { text: 'Pupil', ax: px, ay: py, x: 116, y: 452, t0: 1.625, t1: 2.6, col: 'w', align: 'center' });
    CAP.ctx(c, t, { text: 'Into the eye', t0: 0.3, t1: 2.7, acc: 'c3' });
  },
  cues: [[0.0, 'enter', 0.8, -0.2], [0.3, 'type', 0.4], [0.2, 'push', 0.5, 0, 1.0], [1.0, 'label', 0.5, 0.3], [1.625, 'label', 0.5, -0.3], [2.375, 'enter', 0.6, -0.3]],
};
})();
