// S16 RETURN THROUGH THE AORTA (49–52 s): bright red, oxygenated blood climbs the arterial line from the machine to the
// operative field; the camera follows it and settles on the ascending aorta. The cannula enters the aorta above the
// cross-clamp (the body side): the returning blood runs on round the arch and up its branches, toward the body. Nothing
// goes into the right atrium.
(() => {
const clamp = U.clamp, lerp = U.lerp;
const ARCH = [[-14, -66], [-12, -76], [0, -84], [16, -88], [30, -82], [38, -72]];
SC['s16_aorta'] = {
  draw(c, t, S) {
    const cam = WORLD.track(S.t), Lr = WORLD.R.arterial.S.at(-1);
    const dm = t < 2.2 ? WORLD.dAtY('arterial', Math.max(-60, cam.y - 20 / cam.z)) : null;
    WORLD.scene(c, cam, S.t, { tubes: { arterial: { marker: t < 2.0 ? dm : null } } });
    // arrival: the flow continues inside the aorta, round the arch and up the three branches
    const a = MO.smooth(clamp((t - 2.0) / 0.4));
    if (a > 0) {
      const z = cam.z, chev = (pts, ph) => { const P2 = WORLD.smooth(pts, 1.5), S0 = WORLD.lens(P2), L = S0.at(-1); for (let d = (ph % 12); d < L; d += 12) { const [x, y, an] = WORLD.at(P2, S0, d), [sx, sy] = K.S(cam, x, y), r = 2.6 * z; c.save(); c.globalAlpha = a; for (const s_ of [-1, 1]) PIX.bline(c, sx + Math.cos(an) * r, sy + Math.sin(an) * r, sx - Math.cos(an) * r * 0.5 - Math.sin(an) * s_ * r, sy - Math.sin(an) * r * 0.5 + Math.cos(an) * s_ * r, 'ab5'); c.restore(); } };
      chev(ARCH, S.t * 30);
      for (const br of [[[0, -86], [-2, -100], [-4, -116]], [[14, -90], [15, -104], [16, -118]], [[28, -86], [31, -100], [34, -116]]]) chev(br, S.t * 30 + 4);
    }
    CAP.ctx(c, t, { text: 'Back to the body', t0: 0.3, t1: 2.75, acc: 'ab4' });
  },
  cues: [[0.0, 'climb', 0.7, 0.3, 2.0], [2.0, 'arrive', 0.7, -0.2], [2.0, 'broad_flow', 0.6, 0, 1.0]],
};
})();
