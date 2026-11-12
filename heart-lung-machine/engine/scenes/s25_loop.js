// S25 BACK TO THE OPENING (87–92 s): from the whole loop the camera follows the returning arterial line up to the chest and
// into the window; there the view turns back — the side view folds flat and the operating field seen from above unfolds —
// and the camera eases out into the exact opening viewpoint: heart centred, surgeons at the edges, the same tubes, the
// same light. The heart is still; the blood keeps moving (forward, never reversed). No text: the opening caption returns
// 0.15 s after the restart. The last frame is the first frame.
(() => {
const clamp = U.clamp;
const F0 = 1.7, F1 = 2.3, E1 = 4.6;
SC['s25_loop'] = {
  draw(c, t, S) {
    const T = S.t;
    const side = cc => { const cam = SIDE.track(T), La = SIDE.len('arterial'); SIDE.scene(cc, cam, T, { tubes: { arterial: { marker: La * MO.sineInOut(clamp((t - 0.1) / 1.6)) } } }); };
    const top = cc => WORLD.scene(cc, WORLD.closing(MO.cubicInOut(clamp((t - F1) / (E1 - F1)))), T);
    if (t < F0) side(c); else if (t < F1) window.flip(c, side, top, (t - F0) / (F1 - F0)); else top(c);
  },
  cues: [[0.0, 'glide', 0.5, 0.3, 1.6], [F0, 'turn', 0.6, 0, 0.6], [F1 + 0.6, 'settle_or', 0.6, 0, 1.6]],
};
})();
