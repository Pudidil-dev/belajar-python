// S18 A STARTING ESTIMATE (51–54 s): the view slides down from the screen to the instrument's small printer. The paper
// feeds out in steps with the same three lines and the little ring they came from, and settles. This is where the
// machine's part ends: the printout is a starting estimate for the clinician's own refraction, not a prescription.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const STEPS = 12, T0 = 0.75;
// the feed: 12 steps on the 16th-note grid, each a quick pull and a short rest
const feedAt = t => { const k = (t - T0) / 0.125; if (k <= 0) return 0; if (k >= STEPS) return RES.PAPER.len; const i = Math.floor(k); return (i + MO.cubicOut(clamp((k - i) / 0.55))) * RES.PAPER.len / STEPS; };
SC['s18_print'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0'); window.beatGlow(c, S.t);
    const q = MO.k75(clamp(t / 0.7)), feed = feedAt(t);
    if (q < 1) RES.panel(c, { dy: -560 * q });
    const settle = t > T0 + STEPS * 0.125 ? MO.settle(t - T0 - STEPS * 0.125, 3, 4, 9) : 0;
    RES.printer(c, { dy: (1 - q) * 330, feed: feed + settle });
    CAP.note(c, t, { text: 'Example', x: 12, y: 250, t0: 1.0, t1: 2.7, col: 'ga' });
    CAP.ctx(c, t, { text: 'A starting estimate', t0: 0.5, t1: 2.7, acc: 'e2' });
  },
  cues: () => [[0, 'pan', 0.5, 0, 0.7], [0.5, 'type', 0.4]].concat([...Array(STEPS)].map((_, k) => [T0 + k * 0.125, 'feed', 0.6 + (k % 4 === 0 ? 0.25 : 0), 0.1, k])).concat([[T0 + STEPS * 0.125, 'tear', 0.8, 0.1], [2.5, 'resolve', 1.0, 0]]),
};
})();
