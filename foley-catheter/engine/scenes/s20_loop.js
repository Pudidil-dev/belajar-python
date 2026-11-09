// S20 LOOP BRIDGE (57–60 s): hold on the complete route (the answer fading), then a fast push into a foreground segment of
// the catheter in the penile urethra until it fills the frame — the exact frame S01 pulls back out of, so the replay
// continues without reversing any process.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const camAt = t => { const A = window.S01.CAM0, q = MO.expoIn(clamp((t - 2.2) / 0.75)), a = FOLEY.route(30); return { ...A, s: K.zl(A.s, 16, q), x: lerp(A.x, a[0], Math.min(1, q * 1.15)), y: lerp(A.y, a[1], Math.min(1, q * 1.15)) }; };
SC['s20_loop'] = {
  draw(c, t, S) {
    // the configuration switches to S01's (tip in the penile urethra) only once the segment fills the frame (s ≥ 14): the
    // tip, the eyes and the balloon are then far outside the view, so the cut to S01's first frame is seamless
    const cam = camAt(t), wipe = cam.s >= 14;
    window.drawCutaway(c, cam, { rTip: wipe ? window.S01.R0 : FOLEY.R_FINAL, inflated: wipe ? 0 : 1, t: S.t });
    // the answer's amber trace fades out
    const fa = 1 - MO.smooth(clamp(t / 1.2));
    if (fa > 0 && !wipe) {
      const lift = PELVIS.lift(cam, 4.5); let prev = null;
      for (let r = 0; r <= FOLEY.R_FINAL; r += 1.2) { const [x, y] = FOLEY.route(r), [sx, sy] = PELVIS.S(cam, x, y), q = [sx + lift[0] - 4, sy + lift[1] - 4]; if (prev && K.BAY(Math.round(q[0]), Math.round(q[1])) < fa) { PIX.bline(c, prev[0], prev[1], q[0], q[1], 'a1'); } prev = q; }
    }
  },
  cues: [[0, 'hold_pad', 0.5, 0, 2.2], [2.25, 'push_fast', 0.9, 0, 0.75], [2.95, 'loop_tick', 0.6, 0]],
  xin: 0.2,
};
})();
