// S15 ANALYZE THE PATTERN (42–45 s): the digital ring again. A dashed circle is the calibration: where the ring would lie
// for an eye that needs no correction. Sample marks step round the ring, finding its brightest point along each spoke; a
// thin ellipse is fitted through them; two arrows mark its long and its short direction. How far the ring departs from
// the circle, how unequal the two directions are, and which way they point: that is what the numbers come from.
// (No values are attached to a size or an angle: the conversion is the instrument's own calibration.)
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const M = { cx: 180, cy: 330, s: 4 };
window.S15 = { M,
  frame: (c, m = M, a = 1) => { const g = 32 * m.s, x = Math.round(m.cx - g), y = Math.round(m.cy - g), w = Math.round(2 * g), b = Math.max(2, Math.round(m.s * 1.5));
    PIX.rect(c, x - b, y - b, w + 2 * b, w + 2 * b, 'g3'); PIX.rect(c, x - b, y - b, w + 2 * b, Math.max(1, b >> 1), 'g5'); PIX.rect(c, x - 1, y - 1, w + 2, w + 2, 'k'); } };
SC['s15_analyze'] = {
  xin: 0.4,
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0'); window.beatGlow(c, S.t);
    window.S15.frame(c);
    SEN.grid(c, { ...M, mode: 'digital' });
    const samp = clamp((t - 0.875) / 1.0);
    SEN.overlay(c, { ...M, t: S.t, cal: clamp((t - 0.35) / 0.45), samp, fit: clamp((t - 1.875) / 0.4), axes: clamp((t - 2.375) / 0.3) });
    CAP.ctx(c, t, { text: 'Analyze the pattern', t0: 0.3, t1: 2.7, acc: 'e2' });
  },
  cues: () => [[0.3, 'type', 0.4], [0.35, 'cal', 0.6, 0, 0.45]].concat([...Array(8)].map((_, k) => [0.875 + k * 0.125, 'tick', 0.5 + 0.03 * k, Math.sin(k * 0.785) * 0.6, k])).concat([[1.875, 'fit', 0.8, 0, 0.4], [2.375, 'axes', 0.9, 0]]),
};
})();
