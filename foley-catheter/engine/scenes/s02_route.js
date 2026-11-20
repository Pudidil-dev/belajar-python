// S02 FOLLOW THE URETHRA (3–6 s): compressed, schematic motion: the catheter tip follows the urethra's own course — up the
// penile urethra, round the bulbar curve under the pubic bone, through the pelvic floor and the prostate — and ends with
// the tip and its drainage eyes inside the bladder. The balloon stays flat; nothing is pushed through tissue. The camera
// tracks the tip while keeping the whole route in view.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const R0 = () => window.S01.R0 + 14, R1 = () => FOLEY.L_URETHRA + 24;
const tipAt = t => lerp(R0(), R1(), MO.k75(clamp((t - 0.1) / 2.4)));
const camAt = t => { const A = window.S01.CAM0, [x, y] = FOLEY.route(tipAt(t)), q = MO.sineInOut(clamp(t / 2.8)); return { ...A, s: lerp(A.s, 2.9, q), x: lerp(A.x, lerp(A.x, x, 0.55), q), y: lerp(A.y, lerp(A.y, y, 0.6), q) }; };
window.S02 = { tipAt, camAt };
SC['s02_route'] = {
  draw(c, t, S) {
    window.drawCutaway(c, camAt(t), { rTip: tipAt(t), t: S.t, ring: 1 - MO.smooth(clamp((t - 2.4) / 0.4)) });
    CAP.ctx(c, t, { text: 'Through the urethra', t0: 0.3, t1: 2.75 });
  },
  cues: [[0.1, 'glide', 0.8, 0.2, 2.4], [0.3, 'type', 0.4], [1.2, 'curve_tick', 0.5, 0.1], [2.2, 'arrive', 0.7, 0]],
};
})();
