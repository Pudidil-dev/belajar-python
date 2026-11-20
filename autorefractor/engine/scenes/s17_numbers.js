// S17 TRANSLATE IT INTO NUMBERS (48–51 s): the result panel. Its three fields light one after another, on the beat:
// SPH (sphere: the overall focusing error), CYL (cylinder: how much astigmatism), AXIS (which way it points). The values
// are one fictional example — SPH −2.00 D, CYL −0.75 D, AXIS 180° — and stay the same wherever they appear in the film.
(() => {
const { W, H } = PIX;
const clamp = U.clamp;
const TL = [0.5, 1.0, 1.5];
SC['s17_numbers'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0'); window.beatGlow(c, S.t);
    const dy = TL.reduce((a, x) => a + (t >= x ? MO.settle(t - x, 4, 5, 11) : 0), 0);
    RES.panel(c, { lit: TL.map(x => t - x), dy });
    TL.forEach((x, k) => { const q = (t - x) / 0.32; if (q > 0 && q < 1) FX.ring(c, 250, RES.ROWY(k) + 14 + dy, 12 + 150 * MO.cubicOut(q), 'e2', 1 - q); });
    CAP.note(c, t, { text: 'Example', x: RES.BOX.x + 4, y: 142, t0: 0.6, t1: 2.7, col: 'ga' });
    CAP.ctx(c, t, { text: 'Estimated refraction', t0: 0.25, t1: 2.7, acc: 'e2' });
  },
  cues: [[0.25, 'type', 0.4], [0.5, 'value', 1.0, -0.3, 0], [1.0, 'value', 1.0, 0, 1], [1.5, 'value', 1.0, 0.3, 2], [2.0, 'complete', 1.0, 0]],
};
})();
