// S03 THE HIDDEN BALLOON (6–9 s): a cut to the completed placement — the same catheter, now positioned with its retention
// balloon already expanded entirely inside the bladder, resting above the bladder neck; tip and eyes beyond it, urine all
// round. (The film never shows inflation, and never a balloon in the urethra.) A pale-blue outline draws round the balloon.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const CAM = { x: 3, y: 4, s: 4.6, cx: W / 2, cy: 366, rot: 0 };
window.S03 = { CAM };
SC['s03_balloon'] = {
  draw(c, t, S) {
    const cam = { ...CAM, s: lerp(4.4, 4.6, MO.cubicOut(clamp(t / 0.6))) };
    window.drawCutaway(c, cam, { rTip: FOLEY.R_FINAL, inflated: 1, t: S.t, balOutline: MO.cubicOut(clamp((t - 0.4) / 0.6)) });
    CAP.ctx(c, t, { text: 'What keeps it there?', t0: 0.6, t1: 2.75 });
  },
  cues: [[0, 'cut_soft', 0.6, 0], [0.4, 'reveal_chime', 1.0, 0], [0.6, 'type', 0.4]],
};
})();
