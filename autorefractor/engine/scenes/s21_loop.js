// S21 SEAMLESS BALLOON LOOP (60–63 s): the aperture opens again and the view eases forward into the exact opening
// composition — same balloon position, road, vignette, focus and lighting — and holds, so the last frame runs into
// frame 0. No caption here: the question returns 0.2 s after the restart.
(() => {
const clamp = U.clamp;
SC['s21_loop'] = {
  draw(c, t, S) { BAL.frame(c, BAL.state(1 - MO.smooth(clamp(t / 2.3)))); },
  cues: [[0, 'aperture_open', 0.6, 0, 2.3], [0, 'bridge', 1.0, 0, 3.0]],
};
})();
