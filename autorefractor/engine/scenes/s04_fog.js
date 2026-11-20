// S04 FIXATION AND FOGGING (9–12 s): the camera pushes in to the fixation arm. The lens on the rail glides a few
// millimetres toward the slide; with it the balloon in the patient-view inset goes slightly soft, and the eye's own lens
// eases a little flatter: the instrument has placed the picture just beyond the eye's focus, so the eye tends to stop
// focusing. (It reduces accommodation; it does not guarantee it is gone.) The camera then moves on toward the source.
(() => {
const clamp = U.clamp, lerp = U.lerp;
// the fogging lens's travel (mm along its rail, negative = toward the slide) and the softness of the view, in film time
window.fogAt = T => -4.6 * MO.k75(clamp((T - 10.3) / 0.95));
window.blurAt = T => 1.5 * MO.smooth(clamp((T - 10.4) / 0.95));
window.accAt = T => 0.8 * (1 - MO.smooth(clamp((T - 10.6) / 1.1)));
SC['s04_fog'] = {
  draw(c, t, S) {
    const T = S.t, cam = DIAG.track(T), fog = window.fogAt(T);
    DIAG.draw(c, cam, { t: T, lamp: 1, fog, fix: 6, fixA: 1, src: 0, eye: { acc: window.accAt(T) } });
    // the lens's travel: a short amber arrow beside the rail while it moves
    const k = clamp((T - 10.3) / 0.95);
    if (k > 0 && k < 1) { const [ax, ay] = K.S(cam, OPT.L.DM + 9.2, OPT.L.FOG), [bx, by] = K.S(cam, OPT.L.DM + 9.2, OPT.L.FOG + fog); K.arrow(c, ax, ay, bx, by, 'a2', 3); }
    window.viewInset(c, cam, { blur: window.blurAt(T) });
    CAP.ctx(c, t, { text: 'Relax focusing', t0: 0.3, t1: 2.7 });
  },
  cues: [[0.3, 'type', 0.4], [0.35, 'push', 0.5, 0, 1.1], [1.3, 'lens_glide', 0.9, 0.3, 0.95], [1.4, 'defocus', 0.6, -0.4, 0.95], [2.25, 'settle', 0.6, 0.3], [2.5, 'glide', 0.5, 0.3, 0.9]],
};
})();
