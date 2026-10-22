// S08 MR SIGNAL (42–49 s): the excited slice's transverse magnetization keeps precessing. Its magnetic flux sweeps
// through a loop of the head receiver coil, and the changing flux induces a tiny voltage (Faraday): an oscillation at
// the Larmor frequency that decays as the spins dephase. No light is involved — it is an electrical signal. It travels
// down the chain: receiver coil → low-noise amplifier (bigger) → signal processor (shifted down from 64 MHz and
// filtered) → analog-to-digital converter (measured at regular instants: numbers) → the image computer.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut, sm = MO.smooth, TAU = U.TAU;
const W_L = TAU * 2;                                                          // one turn per beat
// world layout (px): the slice and the coil at the top, the chain going down
const SL = { x: 106, y: 150 }, COIL = { x: 226, y: 150, rx: 13, ry: 38 };
const WIRE_X = 226, Y_AMP = 330, Y_PROC = 470, Y_ADC = 610, Y_OUT = 760;
const V_SIG = 118, T_SIG = 0.6;                                               // the signal's front: px/s along the chain, start
const frontY = t => COIL.y + 10 + Math.max(0, t - T_SIG) * V_SIG;
const camY = t => 240 + Math.max(0, frontY(t) - 290) * sm(clamp((t - 1.6) / 1.2));
const tAt = y => T_SIG + (y - COIL.y - 10) / V_SIG;                          // when the front reaches y
const decay = tt => Math.exp(-Math.max(0, tt) / 1.6);
let SLICE = null;
const slice = () => SLICE || (SLICE = ROOM.toCanvas(VOL.axial(15, 150, 176, 182, 214), 150, 176, true));
// the signal as a function of "time since it was induced" (s): a decaying oscillation; stage changes its look
const sig = (tt, stage) => {
  if (tt < 0) return 0;
  const f = stage >= 2 ? 1.4 : 4.0;                                          // after the processor: shifted down
  return decay(tt) * Math.sin(TAU * f * tt);
};
function wire(c, x0, y0, x1, y1, col = 'g6') { PIX.bline(c, x0, y0, x1, y1, col); PIX.bline(c, x0 + 1, y0, x1 + 1, y1, 'g3'); }
SC['s08_signal'] = {
  init() { slice(); },
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'n0');
    const cy = camY(t);
    c.save(); PIX.cam(c, { x: 135, y: cy, z: 1 });
    // --- detection: the slice, its transverse magnetization, the coil loop ---
    c.save(); c.globalAlpha = 0.55; c.imageSmoothingEnabled = false; c.drawImage(slice(), SL.x - 75, SL.y - 88); c.restore();
    const ang = -W_L * t, m = decay(t - 0.0) * 0.6 + 0.4, mx = Math.cos(ang), my = Math.sin(ang);
    // dipole field lines of the rotating magnetization, sweeping through the coil
    for (const sc of [40, 70, 105]) for (const sd of [-1, 1]) {
      let px = null, py = null;
      for (let k = 0; k <= 40; k++) { const th = k / 40 * Math.PI, rr = sc * Math.sin(th) ** 2, lx = rr * Math.cos(th), ly = sd * rr * Math.sin(th);
        const X = SL.x + lx * mx - ly * my, Y = SL.y + (lx * my + ly * mx) * 0.55;
        if (px != null && k % 2 === 0) PIX.bline(c, px, py, X, Y, 'c1'); px = X; py = Y; }
    }
    // the loop (back half, then the magnetization, then the front half)
    const emf = Math.cos(ang) * m, glow = Math.abs(emf);
    const loopPt = a => [COIL.x + Math.cos(a) * COIL.rx, COIL.y + Math.sin(a) * COIL.ry];
    for (let k = 0; k < 48; k++) { const a0 = k / 48 * TAU, a1 = (k + 1) / 48 * TAU; if (Math.cos(a0) > 0) continue; const [x0, y0] = loopPt(a0), [x1, y1] = loopPt(a1); PIX.bline(c, x0, y0, x1, y1, 'u1'); }
    MICRO.arrow(c, SL.x, SL.y, SL.x + mx * 52 * m, SL.y + my * 52 * m * 0.55, 'w', 'w', 8, 3);
    PIX.text(c, 'Mxy', SL.x + mx * 52 * m + (mx > 0 ? 4 : -22), SL.y + my * 29 * m - 4, 'w');
    for (let k = 0; k < 48; k++) { const a0 = k / 48 * TAU, a1 = (k + 1) / 48 * TAU; if (Math.cos(a0) <= 0) continue; const [x0, y0] = loopPt(a0), [x1, y1] = loopPt(a1); PIX.bline(c, x0, y0, x1, y1, glow > 0.55 ? 'e2' : 'u2'); PIX.bline(c, x0 + 1, y0, x1 + 1, y1, 'u1'); }
    // --- the chain ---
    wire(c, WIRE_X, COIL.y + COIL.ry, WIRE_X, Y_AMP - 14); wire(c, WIRE_X, Y_AMP + 14, WIRE_X, Y_PROC - 22); wire(c, WIRE_X, Y_PROC + 22, WIRE_X, Y_ADC - 22); wire(c, WIRE_X, Y_ADC + 22, WIRE_X, Y_OUT);
    // amplifier: a triangle
    PIX.fill(c, PIX.polyPath([[WIRE_X - 16, Y_AMP - 14], [WIRE_X + 16, Y_AMP - 14], [WIRE_X, Y_AMP + 14]]), 'g4');
    PIX.fill(c, PIX.polyPath([[WIRE_X - 13, Y_AMP - 12], [WIRE_X + 13, Y_AMP - 12], [WIRE_X, Y_AMP + 9]]), 'g2');
    // signal processor: a box with a mixer and a filter
    PIX.flat(c, PIX.rectPath(WIRE_X - 24, Y_PROC - 22, 48, 44, 3), 'g3', 'g1', 'g5', [2, 2], [1, 1]);
    PIX.circ(c, WIRE_X - 8, Y_PROC, 7, 'g5'); PIX.text(c, '×', WIRE_X - 10, Y_PROC - 3, 'w', { shadow: null });
    for (let k = 0; k < 12; k++) PIX.rect(c, WIRE_X + 4 + k, Y_PROC + 4 - Math.round(8 * Math.exp(-(((k - 2) / 4) ** 2))), 1, 1, 'e2');
    // ADC: a box with a staircase
    PIX.flat(c, PIX.rectPath(WIRE_X - 24, Y_ADC - 22, 48, 44, 3), 'g3', 'g1', 'g5', [2, 2], [1, 1]);
    for (let k = 0; k < 6; k++) { PIX.rect(c, WIRE_X - 14 + k * 5, Y_ADC + 8 - k * 3, 5, 1, 'e2'); PIX.rect(c, WIRE_X - 9 + k * 5, Y_ADC + 5 - k * 3, 1, 3, 'e2'); }
    // --- the travelling signal: it rides the wire itself, small out of the coil, big after the amplifier ---
    const front = Math.max(0, t - T_SIG) * V_SIG;                                // px of chain the signal has covered
    const stageAt = y => y < Y_AMP ? 0 : y < Y_PROC ? 1 : y < Y_ADC ? 2 : 3;
    const inBlock = y => Math.abs(y - Y_AMP) < 15 || Math.abs(y - Y_PROC) < 23 || Math.abs(y - Y_ADC) < 23;
    if (front > 0) {
      let px = null, py = null;
      for (let y = COIL.y + COIL.ry; y < Math.min(Y_OUT, COIL.y + 10 + front); y += 1) {
        if (inBlock(y)) { px = null; continue; }
        const tt = (COIL.y + 10 + front - y) / V_SIG, st = stageAt(y), amp = st === 0 ? 6 : 20;
        const v = sig(tt, st) * amp, x = WIRE_X + v;
        if (st === 3) { if (Math.round(y) % 8 === 0) { PIX.rect(c, Math.min(WIRE_X, Math.round(x)), Math.round(y), Math.abs(Math.round(v)) + 1, 1, 'e1'); PIX.rect(c, Math.round(x) - 1, Math.round(y) - 1, 3, 3, 'e3'); } px = null; continue; }
        if (px != null) { PIX.bline(c, px, py, x, y, st === 0 ? 'e1' : 'e2'); if (st > 0) PIX.bline(c, px + 1, py, x + 1, y, 'e1'); }
        px = x; py = y;
      }
      // the leading edge glows
      const fy = COIL.y + 10 + front; if (fy < Y_OUT && !inBlock(fy)) FX.glowL(c, WIRE_X, fy - cy + H / 2, 10, ['e0', 'e1'], 0.8);
    }
    // the samples become numbers at the output
    if (COIL.y + front > Y_OUT - 20) {
      for (let k = 0; k < 7; k++) { const yy = Y_OUT - 10 + k * 11 - K.wrap(t * 40, 11), v = Math.round(1000 * sig(k * 0.11 + 0.2, 3)); PIX.text(c, (v >= 0 ? '+' : '') + v, WIRE_X, yy, 'e2', { align: 'center' }); }
    }
    c.restore(); c.setTransform(1, 0, 0, 1, 0, 0);
    // labels in screen space (anchors moved with the camera)
    const S_ = (x, y) => [x, y - cy + H / 2];
    const lab = (txt, x, y, t0, t1, col = 'w', ax, ay) => { const [sx, sy] = S_(x, y); if (sy < 66 || sy > 452) return; const [axs, ays] = ax != null ? S_(ax, ay) : [null, null]; CAP.note(c, t, { x: sx, y: sy, text: txt, t0, t1, col, box: true, ax: axs, ay: ays, lineCol: 'g7', rate: 70 }); };
    lab('RECEIVER COIL', 150, 90, 0.35, 6.9, 'u3', COIL.x - 6, COIL.y - COIL.ry + 4);
    lab('INDUCED VOLTAGE', 14, COIL.y + 120, 1.0, 6.9, 'e2', WIRE_X - 8, COIL.y + 120);
    lab('AMPLIFIER', 14, Y_AMP - 4, tAt(Y_AMP), 6.9, 'w', WIRE_X - 18, Y_AMP);
    lab('SIGNAL PROCESSOR', 14, Y_PROC - 4, tAt(Y_PROC), 6.9, 'w', WIRE_X - 26, Y_PROC);
    lab('ANALOG-TO-DIGITAL', 14, Y_ADC - 10, tAt(Y_ADC), 6.9, 'w', WIRE_X - 26, Y_ADC);
    lab('CONVERTER', 14, Y_ADC + 2, tAt(Y_ADC) + 0.1, 6.9, 'w');
    CAP.scene(c, t, { title: 'MR SIGNAL', t0: 0.15, acc: 'e2' });
  },
  cues: () => {
    const q = [[0, 'induction', 0.8, 0.3, 2.4], [T_SIG, 'signal_start', 0.7, 0.3], [tAt(Y_AMP), 'amp', 0.8, 0.2], [tAt(Y_PROC), 'process', 0.8, 0.0], [tAt(Y_ADC), 'adc', 0.8, -0.2], [tAt(Y_ADC) + 0.3, 'samples', 0.7, -0.2, 6.9 - tAt(Y_ADC) - 0.3], [1.6, 'track', 0.6, 0, 4.0]];
    for (let b = 0; b < 5; b++) q.push([0.5 + b * 0.5, 'precess', 0.4, 0.3]);
    return q;
  },
};
})();
