// S08 STEP 3 · THE CENTRIFUGAL PUMP, FROM THE SIDE (24–29 s): the camera follows the line from the reservoir outlet down to
// the pump head and holds long enough to read it. The housing and the drive open as a cutaway: the motor turns a magnet
// disc, the magnets turn the smooth rotor through the closed wall (no shaft, no seal), the spinning rotor flings the blood
// outward, and it leaves through the outlet at the side. Red cells ride the flow intact. A process strip at the bottom
// reads IN → SPIN → OUT as the cells do it, the way a dialysis pump is explained. The rotor turns at one steady speed.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const PU = SIDE.LY.pump, D = SIDE.LY.drive;
// a red cell's path: down the inlet, spiralling out over the rotor, out of the side port (third value: front/back)
const cellAt = (f, k) => {
  const { x, y, r, h } = PU;
  if (f < 0.2) { const q = f / 0.2; return [x + ((k % 3) - 1) * 1.2, lerp(y - h - 14, y - h + 1, q), 1]; }
  if (f < 0.86) { const q = (f - 0.2) / 0.66, a = k * 2.1 + q * TAU * 1.5, rr = lerp(1.5, r * 0.9, q); return [x + Math.cos(a) * rr, lerp(y - h + 2, y - 3, q), Math.sin(a)]; }
  const q = (f - 0.86) / 0.14; return [lerp(x + r * 0.9, x + r + 10, q), y - 3, 1];
};
window.pumpCells = (c, cam, T, a = 1) => {
  for (let k = 0; k < 14; k++) {
    const f = (T * 0.42 + k / 14) % 1, [x, y, dep] = cellAt(f, k); if (dep < -0.2) continue;
    const [sx, sy] = K.S(cam, x, y), r = Math.max(1.2, 1.15 * cam.z);
    LIT.sphere(c, sx, sy, r, ['rc1', 'rc2', 'rc3', 'rc4', 'rc5'], { alpha: a });
  }
};
const CHIPS = [[1.0, 'IN'], [1.8, 'SPIN'], [2.6, 'OUT']];
SC['s08_pump'] = {
  draw(c, t, S) {
    const T = S.t, cam = SIDE.track(T), cut = MO.smooth(clamp((t - 0.6) / 0.6));
    SIDE.scene(c, cam, T, { machine: { cut: { pump: cut } } });
    if (cut > 0.1) window.pumpCells(c, cam, T, cut);
    const L = (text, at, dx, dy, t0, col, align) => SIDE.label(c, cam, t, { text, at, dx, dy, t0, t1: 4.85, col, align });
    L('INLET', [PU.x, PU.y - PU.h - 6], 22, -16, 1.0, 'vb5');
    L('ROTOR', [PU.x - 5, PU.y - 7], -40, -34, 1.5, 'iv5', 'right');
    L('MAGNETS', [PU.x + 7, D.y0 + 3], 28, 16, 2.05, 'wa4');
    L('MOTOR', [PU.x - 3, D.y0 + 14], -36, 18, 2.4, 'g8', 'right');
    L('OUTLET', [PU.x + PU.r + 3, PU.y - 3], 14, -30, 2.75, 'vb5');
    // the process strip: IN → SPIN → OUT, each chip lighting as the cells do it
    if (!window.NOTEXT) { const L = (window.__textLog[S.id] = window.__textLog[S.id] || []); CHIPS.forEach(([ti, s]) => { if (!L.some(e => e.text === s && e.t0 === ti)) L.push({ text: s, t0: ti, t1: 4.75, kind: 'part' }); }); }
    if (!window.NOTEXT) CHIPS.forEach(([ti, s], i) => {
      const x = 40 + i * 70, y = 432, on = t >= ti, a = MO.smooth(clamp((t - ti + 0.3) / 0.3)) * (1 - MO.smooth(clamp((t - 4.75) / 0.2)));
      if (a <= 0) return;
      c.save(); c.globalAlpha = a;
      PIX.rect(c, x - 3, y - 3, 52, 13, on ? 'mt3' : 'n1'); PIX.text(c, s, x + 23, y, on ? 'k' : 'g6', { align: 'center', shadow: null });
      if (i < 2) PIX.text(c, '→', x + 57, y, on && t >= CHIPS[i + 1][0] ? 'mt4' : 'g5', { shadow: null });
      c.restore();
    });
    CAP.scene(c, t, { title: '3 · CENTRIFUGAL PUMP', ctx: 'A spinning rotor drives flow.', t0: 0.15, t1: 4.9, acc: 'vb5' });
  },
  cues: [[0.0, 'glide', 0.5, 0.2, 0.9], [0.6, 'pump_reveal', 0.7, 0.1], [0.6, 'pump_whirr', 0.8, 0.1, 4.0], [1.0, 'chip', 0.8, -0.3, 0], [1.5, 'label', 0.3, -0.3], [1.8, 'chip', 0.8, 0, 1], [2.05, 'label', 0.3, 0.3], [2.4, 'label', 0.3, -0.3], [2.6, 'chip', 0.8, 0.3, 2], [2.75, 'label', 0.3, 0.4]],
};
})();
