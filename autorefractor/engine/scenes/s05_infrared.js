// S05 SEND INVISIBLE LIGHT (12–15 s): the infrared source at the back of the instrument switches on. A thin cyan trace
// (cyan = the outgoing measurement light, drawn so we can follow it; the light itself is invisible) leaves through the
// pinhole and the projection lens, passes the beam splitter and the mirror that turned the balloon's light, and runs
// out of the window toward the eye — the camera follows it. The patient's view stays as it was: only the balloon.
(() => {
const clamp = U.clamp, lerp = U.lerp;
SC['s05_infrared'] = {
  draw(c, t, S) {
    const T = S.t, cam = DIAG.track(T), F = DIAG.fronts(T);
    const src = MO.smooth(clamp((t - 0.5) / 0.25));
    const R = DIAG.draw(c, cam, { t: T, lamp: 1, fog: window.fogAt(T), fix: 6, fixA: 0.55, src, out: F.out, w: 2 });
    // the source's first flash: one expanding ring
    if (t > 0.5 && t < 1.0) { const [sx, sy] = K.S(cam, OPT.L.SRC + 0.4, 0); FX.ring(c, sx, sy, (t - 0.5) * 60, 'c3', 1 - (t - 0.5) / 0.5); }
    window.viewInset(c, cam, { blur: window.blurAt(T), a: 1 - MO.k75(clamp((t - 1.5) / 0.5)), leader: false });
    CAP.ctx(c, t, { text: 'Invisible infrared', t0: 0.3, t1: 2.7, acc: 'c3' });
  },
  cues: [[0.3, 'type', 0.4], [0.5, 'ir_on', 1.0, 0.5], [0.75, 'beam_run', 0.9, 0.3, 2.25], [1.5, 'inset_out', 0.4, -0.6]],
};
})();
