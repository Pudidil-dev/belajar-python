// S15 FILTERING AND DETECTION (46–49 s): at the assembly's outlet, the integrated arterial filter lights first (a pleated
// screen the blood passes on its way out); then the camera moves up the arterial line to the separate clamp-on bubble
// detector, which lights in turn. It watches the line; it does not take anything out. Blood keeps flowing; no event.
(() => {
const clamp = U.clamp;
SC['s15_filter'] = {
  draw(c, t, S) {
    const cam = WORLD.track(S.t), fh = Math.sin(Math.PI * clamp((t - 0.25) / 1.3)), dh = Math.sin(Math.PI * clamp((t - 1.75) / 1.25));
    WORLD.scene(c, cam, S.t, { machine: { cut: { oxy: 1, res: 1, pump: 1 }, filterHi: fh > 0.3, detHi: dh } });
    if (fh > 0) { const O = WORLD.LY.oxy, [fx, fy] = K.S(cam, O.x, O.y + 8); FX.glowL(c, fx, fy, 70 * fh, ['ab2', 'ab3', 'ab4'], 0.45 * fh, 1.8); }
    CAP.ctx(c, t, { text: 'Filter + monitoring', t0: 0.3, t1: 2.75, acc: 'mt3' });
  },
  cues: [[0.25, 'tick_soft', 0.5, 0.2, 0], [1.0, 'glide', 0.4, 0.3, 0.9], [1.75, 'tick_soft', 0.5, 0.4, 1]],
};
})();
