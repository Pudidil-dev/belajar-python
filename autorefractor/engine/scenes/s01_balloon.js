// S01 THE FAMILIAR BALLOON (0–3 s): inside the patient's view. The balloon landscape fills the frame inside a round
// viewing vignette that only just cuts the corners. It holds sharp for a second; the optics drift it slightly out of
// focus and bring it back (the fogging that S04 explains); then the view backs away and the dark round aperture closes
// in round it. Frame 0 is the loop frame: S21 ends on exactly this state.
(() => {
const clamp = U.clamp;
const uAt = t => MO.smooth(clamp((t - 1.875) / 1.125));
const blurAt = t => 2.3 * Math.pow(Math.sin(Math.PI * clamp((t - 1.0) / 1.1)), 1.3);
SC['s01_balloon'] = {
  draw(c, t, S) {
    BAL.frame(c, BAL.state(uAt(t)), { blur: blurAt(t) });
    CAP.ctx(c, t, { text: 'Why *THIS* balloon?', t0: 0.2, t1: 2.7, sc: 3, y: 96, em: 'bc2' });
  },
  cues: [[0, 'glass', 1.0, 0], [0.2, 'type', 0.4], [1.0, 'defocus', 0.7, 0, 1.1], [1.875, 'aperture', 0.7, 0, 1.125]],
};
})();
