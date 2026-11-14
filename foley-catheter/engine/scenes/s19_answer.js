// S19 ANSWER THE OPENING (54–57 s): back to the opening section, the same orientation: the catheter in place, its balloon in
// the bladder; an amber trace runs from the meatus up the urethra to the tip in the bladder. The opening motif returns.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const camAt = t => { const A = window.S01.CAM0, B = window.S03.CAM, q = MO.k75(clamp(t / 1.4)); return { ...A, s: K.zl(B.s, A.s, q), x: lerp(B.x, A.x, q), y: lerp(B.y, A.y, q), cy: lerp(B.cy, A.cy, q) }; };
window.S19 = { camAt };
SC['s19_answer'] = {
  draw(c, t, S) {
    const cam = camAt(t), p = MO.cubicInOut(clamp((t - 0.7) / 1.9));
    const res = window.drawCutaway(c, cam, { rTip: FOLEY.R_FINAL, inflated: 1, t: S.t });
    // the trace: from the meatus inward to the tip, drawn on along the catheter
    const lift = PELVIS.lift(cam, 4.5), r1 = lerp(0, FOLEY.R_FINAL, p);
    let prev = null;
    for (let r = 0; r <= r1; r += 1.2) { const [x, y] = FOLEY.route(r), [sx, sy] = PELVIS.S(cam, x, y), q = [sx + lift[0] - 4, sy + lift[1] - 4]; if (prev) { PIX.bline(c, prev[0], prev[1], q[0], q[1], 'a1'); PIX.bline(c, prev[0] + 1, prev[1], q[0] + 1, q[1], 'a2'); } prev = q; }
    if (prev && p < 1) PIX.circ(c, prev[0], prev[1], 3, 'a2');
    if (p >= 1) { const [x, y] = FOLEY.route(FOLEY.R_FINAL - 1), [sx, sy] = PELVIS.S(cam, x, y); FOLEY.ring(c, sx + lift[0], sy + lift[1], 10, MO.cubicOut(clamp((t - 2.6) / 0.3)), S.t, 'a2'); }
    CAP.ctx(c, t, { text: 'To the bladder', t0: 0.4, t1: 3.3 });
  },
  cues: [[0, 'pull_soft', 0.6, 0, 1.4], [0.4, 'type', 0.4], [0.7, 'trace_amber', 0.7, 0.2, 1.9], [2.6, 'arrive', 0.8, 0]],
  xin: 0.3,
};
})();
