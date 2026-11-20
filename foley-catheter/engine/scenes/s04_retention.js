// S04 RETENTION (9–12 s): a locked close-up of the bladder outlet: the expanded balloon sits above the narrow bladder neck.
// Two width guides compare them — the balloon is wider than the outlet, so it helps resist slipping out. No pulling
// demonstration; it is not a suction cup or a seal, and it is no guarantee against displacement.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const CAM = { x: 0, y: 6, s: 8.2, cx: W / 2, cy: 360, rot: 0 };
const guide = (c, x0, x1, y, col, p) => {
  if (p <= 0) return; const xm = (x0 + x1) / 2, hw = (x1 - x0) / 2 * p, a = Math.round(xm - hw), b = Math.round(xm + hw), Y = Math.round(y);
  PIX.rect(c, a, Y - 2, b - a, 5, 'k');
  PIX.rect(c, a, Y - 1, b - a, 2, col);
  if (p >= 1) for (const xx of [a, b - 2]) { PIX.rect(c, xx - 1, Y - 7, 4, 15, 'k'); PIX.rect(c, xx, Y - 6, 2, 13, col); }
};
SC['s04_retention'] = {
  draw(c, t, S) {
    const res = window.drawCutaway(c, CAM, { rTip: FOLEY.R_FINAL, inflated: 1, t: S.t });
    const lift = PELVIS.lift(CAM, 4.5);
    // the balloon's width (at its centre) and the outlet's width (at the neck)
    const [bx, by] = PELVIS.S(CAM, 0, FOLEY.BAL_RY), [nx, ny] = PELVIS.S(CAM, 0, 0);
    guide(c, bx + lift[0] - FOLEY.BAL_RY * CAM.s, bx + lift[0] + FOLEY.BAL_RY * CAM.s, by + lift[1], 'l4', MO.cubicOut(clamp((t - 0.6) / 0.5)));
    guide(c, nx + lift[0] - 4.2 * CAM.s, nx + lift[0] + 4.2 * CAM.s, ny + lift[1] + 26, 'a2', MO.cubicOut(clamp((t - 1.3) / 0.4)));
    CAP.ctx(c, t, { text: 'Retention balloon', t0: 0.3, t1: 2.75 });
  },
  cues: [[0.3, 'type', 0.4], [0.6, 'measure', 0.7, -0.2, 0], [1.3, 'measure', 0.6, 0.2, 1]],
  xin: 0.25,
};
})();
