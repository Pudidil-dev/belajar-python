// S13 THOUSANDS OF MEASUREMENTS FROM MANY DIRECTIONS (88–96 s): the projection streams out through the slip ring to the
// reconstruction computer, where it becomes one row of pixels (brighter = more attenuation). The frame keeps turning; row
// after row stacks downward — detector position across, gantry angle down — until 360°: the sinogram. Every point of the
// head draws a sine-shaped trace (it swings across the detector as the frame turns round it). One slice, simplified.
(() => {
const { W, H, P } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp, TAU = U.TAU;
const SX = 40, SY = 132, SW = 200, SH = 250;                        // sinogram panel (screen)
const rowsAt = t => Math.floor(CT.NA * MO.smooth(clamp((t - 1.2) / 6.0)) * 0.1 + CT.NA * clamp((t - 1.2) / 6.0) * 0.9);
const inset = { x: 0, y: 30, s: 0.05, cx: 214, cy: 104 };
SC['s13_sinogram'] = {
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'k');
    const n = rowsAt(t), beta = n / CT.NA * TAU;
    // the little gantry turning (top left), feeding the panel
    const ia = MO.smooth(clamp(t / 0.4));
    if (ia > 0) { G2.head(c, inset, { alpha: ia }); G2.fan(c, inset, beta, 0.8 * ia); G2.frame(c, inset, beta, { alpha: ia }); }
    // panel frame: the reconstruction computer's buffer
    PIX.rect(c, SX - 3, SY - 3, SW + 6, SH + 6, 'g3'); PIX.rect(c, SX - 2, SY - 2, SW + 4, SH + 4, 'k');
    // the sinogram so far (rows 0..n−1), stretched to the panel
    if (n > 0) {
      const R = CT.ramps().blue, rowsH = SH * n / CT.NA;
      CT.blit(c, CT.ND, CT.NA, { M: [SW / CT.ND, 0, 0, SH / CT.NA, SX, SY], val: i => Math.floor(i / CT.ND) < n ? Math.pow(Math.max(0, CT.SINO[i] / CT.PMAX), 0.85) : null, ramp: R, clip: [SX, SY, SX + SW, SY + Math.ceil(rowsH)] });
      // the newest row glows
      PIX.rect(c, SX, Math.round(SY + rowsH) - 1, SW, 1, 'b4');
    }
    // data streaming from the gantry into the panel
    for (let k = 0; k < 10; k++) { const q = K.wrap(S.t * 1.6 + k / 10, 1), x = lerp(200, SX + SW * (0.2 + 0.6 * h(k, 3)), q), y = lerp(132, SY + SH * n / CT.NA, MO.cubicIn(q)); if (t > 1.0 && n < CT.NA) PIX.rect(c, Math.round(x), Math.round(y), 2, 1, k % 2 ? 'b3' : 'w'); }
    // axes
    const aa = MO.smooth(clamp((t - 0.6) / 0.3));
    if (aa > 0) {
      c.save(); c.globalAlpha = aa;
      PIX.text(c, 'DETECTOR POSITION →', SX, SY - 13, 'g8');
      for (let k = 0; k <= 4; k++) { const y = SY + SH * k / 4; PIX.rect(c, SX - 6, Math.round(y), 3, 1, 'g6'); if (k % 2 === 0) PIX.text(c, `${k * 90}°`, SX - 8, Math.round(y) - 3, 'g7', { align: 'right', shadow: null }); }
      PIX.text(c, 'ANGLE', SX - 30, SY + SH + 8, 'g8'); PIX.text(c, '↓', SX - 30 + 32, SY + SH + 8, 'g8');
      c.restore();
    }
    const done = n >= CT.NA;
    if (done) { const age = t - 7.2; if (age < 0.4) PIX.rect(c, SX - 3, SY - 3, SW + 6, SH + 6, 'b4', 0.25 * (1 - age / 0.4)); }
    CAP.note(c, t, { x: SX + SW / 2, y: SY + SH + 8, text: 'SINOGRAM', t0: 7.25, t1: 7.85, col: 'b4', align: 'center', box: true });
    CAP.note(c, t, { x: SX + SW, y: SY + SH + 20, text: `${(n * CT.ND).toLocaleString('en-US')} MEASUREMENTS`, t0: 1.4, t1: 7.85, col: 'g9', align: 'right', box: true, rate: 400 });
    CAP.note(c, t, { x: SX + SW, y: SY + SH + 31, text: 'ONE SLICE, SIMPLIFIED', t0: 3.0, t1: 7.85, col: 'g7', align: 'right', box: true });
    CAP.cap(c, t, { l1: 'SINOGRAM', l2: ['THOUSANDS OF MEASUREMENTS', 'FROM MANY DIRECTIONS'], t0: 0.12, tSwap: 1.8, t1: 7.85, acc: 'b3' });
  },
  cues: () => {
    const q = [[0, 'data_stream', 0.6, -0.3, 1.2], [1.2, 'rows_tick', 0.4, 0, 6.0], [7.2, 'chime_complete', 1, 0]];
    for (let k = 0; k < 24; k++) q.push([1.25 + k * 0.25, 'pixel_place', 0.3, -0.4 + (k % 5) * 0.2, k]);
    return q;
  },
  xin: 0.3,
};
})();
