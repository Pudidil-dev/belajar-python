// S17 FOLLOW THE WHOLE ROUTE (48–51 s): the bedside overview, stable: one amber route traces bladder → drainage eye →
// drainage lumen → catheter → tubing → bag.
(() => {
const { W, H } = PIX;
const clamp = U.clamp;
SC['s17_route'] = {
  draw(c, t, S) {
    const p = MO.cubicInOut(clamp((t - 0.3) / 2.2));
    BED.draw(c, window.BEDWIDE, { t: S.t, drainIn: p > 0 ? 1 : 0, drain: clamp((p - 0.15) / 0.85), bag: 0.33 });
    CAP.ctx(c, t, { text: 'From bladder to bag', t0: 0.3, t1: 2.75 });
  },
  cues: [[0, 'cut_soft', 0.5, 0], [0.3, 'type', 0.4], [0.3, 'trace_amber', 0.7, 0, 2.2], [2.5, 'complete_soft', 0.6, 0.3]],
  xin: 0.3,
};
})();
