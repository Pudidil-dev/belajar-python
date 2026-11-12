// S20 RETURN TO THE OPENING (63–68 s): the camera follows the returning tubing back up to the operative field and eases
// into the exact opening viewpoint: heart centred, surgeons at the edges, the same tubes, the same light. The heart is
// still; the blood keeps moving (forward, never reversed). No text: the opening caption returns 0.2 s after the restart.
// The last frame is the first frame.
(() => {
const clamp = U.clamp;
SC['s20_return'] = {
  draw(c, t, S) {
    const cam = WORLD.track(S.t), d = t < 3.2 ? WORLD.dAtY('arterial', cam.y + 10 / cam.z) : null;
    WORLD.scene(c, cam, S.t, { tubes: { arterial: { marker: d } } });
  },
  cues: [[0.0, 'glide', 0.5, 0.3, 4.4], [3.4, 'settle_or', 0.6, 0, 1.6]],
};
})();
