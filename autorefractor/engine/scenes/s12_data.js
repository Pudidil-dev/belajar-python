// S12 CHARGE BECOMES DATA (33–36 s): back to the grid of pixels, each now holding the gold charge its light has left —
// the ring again, in charge. The camera pulls out to the whole sensor. A readout line sweeps down the rows: each row's
// charges are passed along, amplified and converted to numbers, and the row reappears as digital values (white and
// grey). When the sweep is done the gold ring has become a digital image of the ring.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const CY = 318, T0 = 1.25, T1 = 2.5;
const map = t => { const q = MO.sineInOut(clamp((t - 0.1) / 1.0)), z = K.zoomPath({ x: 50.5, y: 31.5, z: 11 }, { x: 32, y: 32, z: 4 }, q); return { cx: 180, cy: lerp(330, CY, q), s: z.z, fx: z.x, fy: z.y }; };
const R = (c, x, y, w, hh, col) => PIX.rect(c, Math.round(x), Math.round(y), Math.round(w), Math.round(hh), col);
window.S12 = { CY, row: t => clamp((t - T0) / (T1 - T0)) * 64 };
SC['s12_data'] = {
  xin: 0.4,
  draw(c, t, S) {
    const M = map(t), row = window.S12.row(t), a = MO.smooth(clamp((t - 0.75) / 0.4));
    PIX.rect(c, 0, 0, W, H, 'n0'); window.beatGlow(c, S.t, 180, CY);
    SEN.die(c, M.cx + (32 - M.fx) * M.s, M.cy + (32 - M.fy) * M.s, M.s);
    SEN.grid(c, { ...M, modeAt: (i, j) => j < row ? 'digital' : 'charge', gaps: true });
    // the readout chain under the chip: bus → amplifier → converter → values
    if (a > 0) {
      const y = 498, gx = 180 + 128;
      c.save(); c.globalAlpha = a;
      R(c, 52, y, 60, 2, 'y1'); R(c, 52, 446, 2, 54, 'y1');
      const tri = new Path2D(); tri.moveTo(112, y - 15); tri.lineTo(112, y + 17); tri.lineTo(142, y + 1); tri.closePath(); PIX.fill(c, tri, 'q5'); PIX.rect(c, 112, y - 15, 2, 32, 'q6');
      R(c, 142, y, 22, 2, 'y2');
      R(c, 164, y - 17, 58, 36, 'g3'); R(c, 164, y - 17, 58, 2, 'g5'); R(c, 164, y + 17, 58, 2, 'g1');
      for (let k = 0; k < 5; k++) R(c, 172 + k * 8, y + 8 - k * 5, 8, 2, k < 2 ? 'y2' : 'e2');          // a staircase: the converter's steps
      for (let k = 0; k < 5; k++) R(c, 172 + k * 8, y + 3 - k * 5 + 5, 2, 5, k < 2 ? 'y2' : 'e2');
      R(c, 222, y, 86, 2, 'e1'); R(c, gx - 2, 446, 2, 54, 'e1');
      c.restore();
      if (row > 0 && row < 64) {
        // charge marks run down the bus and through the amplifier; values leave the converter
        for (let k = 0; k < 4; k++) { const q = ((t * 5 + k / 4) % 1); const px = q < 0.45 ? 52 : lerp(52, 110, (q - 0.45) / 0.55), py = q < 0.45 ? lerp(446, y, q / 0.45) : y; R(c, px - 1, py - 1, 4, 4, 'y3'); }
        for (let k = 0; k < 4; k++) { const q = ((t * 5 + k / 4) % 1); const px = q < 0.62 ? lerp(224, gx - 2, q / 0.62) : gx - 2, py = q < 0.62 ? y : lerp(y, 448, (q - 0.62) / 0.38); R(c, px - 1, py - 1, 4, 4, k % 2 ? 'w' : 'e3'); }
        R(c, 214, y - 13, 4, 4, 'e3');
      }
    }
    // the readout line itself
    if (row > 0 && row < 64) { const y = Math.round(M.cy + (row - M.fy) * M.s), x0 = Math.round(M.cx - M.fx * M.s), w = Math.round(64 * M.s); R(c, x0 - 6, y - 1, w + 12, 2, 'w'); R(c, x0 - 6, y + 1, w + 12, 1, 'y3'); K.dith(c, x0, y - 5, w, 4, 'e3', 0.35); }
    if (t >= T1 && t < T1 + 0.25) { const k = (t - T1) / 0.25, g = 128 + 4 + k * 10; c.save(); c.globalAlpha = 1 - k; for (const [x, y, w, hh] of [[180 - g, CY - g, 2 * g, 2], [180 - g, CY + g - 2, 2 * g, 2], [180 - g, CY - g, 2, 2 * g], [180 + g - 2, CY - g, 2, 2 * g]]) R(c, x, y, w, hh, 'e3'); c.restore(); }
    CAP.ctx(c, t, { text: '*Charge* → *data*', t0: 0.3, t1: 2.7, acc: 'e3', em: ['y3', 'e3'] });
  },
  cues: [[0.1, 'pull', 0.5, 0, 1.0], [0.3, 'type', 0.4], [T0, 'readout', 1.0, 0, T1 - T0], [T1, 'data_done', 1.0, 0]],
};
})();
