// S01 THE STILL HEART (0–2 s): the useful composition from frame 0, no fade-in. The arrested heart, centred in the open
// chest, does not move at all; blood streams steadily along both connected tubes. The surgeons' gowned arms and gloved hands
// come in from the left and right edges. At 0.3 s the left surgeon's arm shifts a little (fabric); at 1.0 s the right hand
// lifts its forceps a few pixels and sets it down (instrument contact). A very small forward move establishes depth.
// Frame 0 is the loop frame: S20 ends on exactly this state.
(() => {
const clamp = U.clamp;
const handL = t => [MO.settle(t - 0.3, 1.2, 1.6, 3.2), 0];
const handR = t => { const k = MO.smooth(clamp((t - 1.0) / 0.25)) * (1 - MO.smooth(clamp((t - 1.45) / 0.35))); return [0, -3 * k]; };
SC['s01_still'] = {
  draw(c, t, S) {
    const cam = WORLD.track(S.t);
    WORLD.scene(c, cam, S.t, { hand: { l: handL(t), r: handR(t) } });
    CAP.ctx(c, t, { text: 'During heart surgery', t0: 0.2, t1: 1.8, acc: 'ab3' });
  },
  cues: [[0.3, 'fabric', 0.5, -0.6], [1.0, 'instrument', 0.6, 0.6]],
};
})();
