// S07 THE NEXT QUESTION (18–21 s): back inside the bladder: urine all round the catheter tip and the expanded balloon. The
// camera moves toward the drainage eye facing us — how does urine get out?
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const camAt = t => { const q = MO.k75(clamp((t - 0.3) / 2.2)), A = window.S03.CAM, [ex, ey] = FOLEY.route(FOLEY.R_FINAL - 9.25); return { ...A, s: K.zl(A.s, 11, q), x: lerp(A.x, ex - 1.5, q), y: lerp(A.y, ey - 1, q), cy: lerp(A.cy, 330, q) }; };
window.S07 = { camAt };
SC['s07_question'] = {
  draw(c, t, S) {
    const cam = camAt(t);
    window.drawCutaway(c, cam, { rTip: FOLEY.R_FINAL, inflated: 1, t: S.t });
    const [ex, ey] = FOLEY.route(FOLEY.R_FINAL - 9.25), [sx, sy] = PELVIS.S(cam, ex, ey), lift = PELVIS.lift(cam, 4.5);
    FOLEY.ring(c, sx + lift[0], sy + lift[1], 2.6 * cam.s + 4, MO.cubicOut(clamp((t - 1.6) / 0.5)), S.t, 'a2');
    CAP.ctx(c, t, { text: 'How does urine get out?', t0: 0.3, t1: 2.75 });
  },
  cues: [[0.3, 'type', 0.4], [0.3, 'push_soft', 0.6, 0, 2.2], [0.5, 'curious2', 0.8, 0.1], [1.6, 'ring', 0.5, -0.2]],
};
})();
