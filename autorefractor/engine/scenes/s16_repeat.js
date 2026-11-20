// S16 REPEAT AND CHECK (45–48 s): one reading is not trusted on its own. The analysed ring shrinks into the first of
// three small tiles; a second and a third reading are taken the same way, each a fresh ring from fresh light. Each gets
// a check when it agrees with the others, and the three settle into the header of the instrument's result panel, whose
// three fields are still empty.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const MID = k => ({ x: 24 + k * 110, y: 284, n: 92 });               // where the three readings line up first
const tileAt = (k, q) => { const a = MID(k), b = RES.TILE(k); return { x: lerp(a.x, b.x, q), y: lerp(a.y, b.y, q), n: Math.round(lerp(a.n, b.n, q)) }; };
const TCHK = [1.0, 1.5, 2.0];
SC['s16_repeat'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0'); window.beatGlow(c, S.t);
    const dock = MO.k75(clamp((t - 2.25) / 0.55)), pa = MO.smooth(clamp((t - 2.05) / 0.4));
    RES.panel(c, { a: pa, tiles: false, rows: pa >= 1 ? clamp((t - 2.45) / 0.4) : 0, lit: [-1, -1, -1] });
    // the first reading: the analysed image of S15 shrinking into its tile
    const q0 = MO.k75(clamp((t - 0.15) / 0.7));
    for (let k = 0; k < 3; k++) {
      const T = tileAt(k, dock), born = k === 0 ? 0 : TCHK[k - 1] + 0.02, ck = clamp((t - TCHK[k]) / 0.18);
      if (t < born) continue;
      if (k === 0 && q0 < 1) {
        const m = { cx: lerp(180, T.x + T.n / 2, q0), cy: lerp(330, T.y + T.n / 2, q0), s: lerp(4, T.n / 64, q0) };
        window.S15.frame(c, m); SEN.grid(c, { ...m, mode: 'digital' });
        SEN.overlay(c, { ...m, cal: 1, fit: 1, axes: 0, samp: 0 });
        continue;
      }
      const e = k === 0 ? 1 : 0.15 + 0.85 * MO.smooth(clamp((t - born) / 0.3));
      PIX.rect(c, T.x - 3, T.y - 3, T.n + 6, T.n + 6, ck >= 1 ? 'e1' : 'g3'); PIX.rect(c, T.x - 1, T.y - 1, T.n + 2, T.n + 2, 'k');
      SEN.thumb(c, T.x, T.y, T.n, k, { e });
      if (e >= 1 && dock < 0.5) SEN.overlay(c, { cx: T.x + T.n / 2, cy: T.y + T.n / 2, s: T.n / 64, cal: 1, fit: clamp((t - born - 0.3) / 0.15), samp: 0, axes: 0 });
      SEN.check(c, T.x + T.n - 12, T.y + T.n - 10, ck, 'e3');
      if (ck > 0 && ck < 1) FX.ring(c, T.x + T.n / 2, T.y + T.n / 2, T.n * (0.55 + 0.3 * ck), 'e3', 1 - ck);
    }
    CAP.ctx(c, t, { text: 'Repeat and check', t0: 0.3, t1: 2.7, acc: 'e2' });
  },
  cues: [[0.15, 'shrink', 0.5, -0.4, 0.7], [0.3, 'type', 0.4], [1.0, 'confirm', 0.9, -0.5, 0], [1.02, 'capture', 0.5, 0, 0.3], [1.5, 'confirm', 0.9, 0, 1], [1.52, 'capture', 0.5, 0.4, 0.3], [2.0, 'confirm', 1.0, 0.5, 2], [2.25, 'dock', 0.7, 0, 0.55]],
};
})();
