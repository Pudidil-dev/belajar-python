// S19 STEP 7 · BACK TO THE BODY (65–68 s): bright red, oxygenated blood climbs the arterial line from the machine over the
// drapes to the chest; the camera follows it and moves into the chest window, onto the ascending aorta. The cannula enters
// the aorta above the cross-clamp (the body side): the returning blood runs on round the arch and up its branches, toward
// the body. Nothing goes into the heart's chambers. The heart does not move.
(() => {
const clamp = U.clamp;
const ARCH = [[-14, -66], [-12, -76], [0, -84], [16, -88], [30, -82], [38, -72]];
const BR = [[[0, -86], [-2, -100], [-4, -116]], [[14, -90], [15, -104], [16, -118]], [[28, -86], [31, -100], [34, -116]]];
// chevrons along a path in heart coordinates (inside the window), drawn on the window's own canvas
window.heartChevrons = (oc, hcam, pts, ph, col, a = 1, gap = 12) => {
  const P2 = WORLD.smooth(pts, 1.5), S0 = WORLD.lens(P2), L = S0.at(-1), z = hcam.z;
  for (let d = ((ph % gap) + gap) % gap; d < L; d += gap) {
    const [x, y, an] = WORLD.at(P2, S0, d), [sx, sy] = K.S(hcam, x, y), r = Math.max(2, 2.6 * z);
    oc.save(); oc.globalAlpha = a; for (const s_ of [-1, 1]) PIX.bline(oc, sx + Math.cos(an) * r, sy + Math.sin(an) * r, sx - Math.cos(an) * r * 0.5 - Math.sin(an) * s_ * r, sy - Math.sin(an) * r * 0.5 + Math.cos(an) * s_ * r, col); oc.restore();
  }
};
SC['s19_return'] = {
  draw(c, t, S) {
    const T = S.t, cam = SIDE.track(T), La = SIDE.len('arterial'), d = t < 2.0 ? La * MO.sineInOut(clamp(t / 1.95)) : null, a = MO.smooth(clamp((t - 1.9) / 0.35));
    SIDE.scene(c, cam, T, { tubes: { arterial: { marker: d } }, inner: (oc, hcam) => { if (a > 0) { window.heartChevrons(oc, hcam, ARCH, T * 30, 'ab5', a); for (const b of BR) window.heartChevrons(oc, hcam, b, T * 30 + 4, 'ab5', a); } } });
    SIDE.label(c, cam, t, { text: 'ARTERIAL LINE', at: [52, -30], dx: 14, dy: 6, t0: 0.3, t1: 1.5, col: 'ab5' });
    SIDE.label(c, cam, t, { text: 'AORTA', at: SIDE.H2S(16, -88), dx: 30, dy: -30, t0: 2.0, t1: 2.88, col: 'ab5' });
    SIDE.label(c, cam, t, { text: 'TO THE BODY', at: SIDE.H2S(15, -110), dx: -34, dy: -34, align: 'right', t0: 2.25, t1: 2.88, col: 'w' });
    SIDE.label(c, cam, t, { text: 'CROSS-CLAMP', at: SIDE.H2S(-30, -48), dx: -26, dy: 24, align: 'right', t0: 2.35, t1: 2.88, col: 'g8' });
    CAP.scene(c, t, { title: '7 · BACK TO THE BODY', ctx: 'Into the aorta.', t0: 0.1, t1: 2.92, acc: 'ab4' });
  },
  cues: [[0.0, 'climb', 0.7, 0.3, 1.9], [0.3, 'label', 0.3, 0.3], [1.9, 'arrive', 0.7, -0.2], [1.9, 'broad_flow', 0.6, 0, 1.0], [2.0, 'label', 0.3, 0.2], [2.35, 'label', 0.3, -0.3]],
};
})();
