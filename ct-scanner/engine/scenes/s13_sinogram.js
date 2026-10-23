// S13 THOUSANDS OF MEASUREMENTS FROM MANY DIRECTIONS (88–96 s): the gantry of S12 shrinks into the corner while its
// projection flies up and becomes the first row of pixels in the reconstruction computer (brighter = more attenuation).
// The camera pushes in on the row being written and rides down with it as the frame keeps turning: row after row stacks
// downward — detector position across, gantry angle down — until 360°; then it pulls back to the whole sinogram. Every
// point of the head draws a sine-shaped trace (it swings across the detector as the frame turns round it). One slice,
// simplified.
(() => {
const { W, H, P } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp, TAU = U.TAU;
const SX = 40, SY = 132, SW = 200, SH = 250;                        // sinogram panel (layout)
const rowsAt = t => Math.floor(CT.NA * MO.smooth(clamp((t - 1.2) / 5.7)) * 0.1 + CT.NA * clamp((t - 1.2) / 5.7) * 0.9);
const inset = { x: 0, y: 30, s: 0.05, cx: 214, cy: 104 };
const big = { x: 0, y: 60, s: 0.42, cx: 135, cy: 240 };              // S12's framing
// the gantry shrinks from S12's framing into the corner (log scale)
const gq = t => MO.cubicInOut(clamp((t - 0.1) / 0.85));
const gcamAt = t => { const q = gq(t); return { x: 0, y: lerp(big.y, inset.y, q), s: Math.exp(lerp(Math.log(big.s), Math.log(inset.s), q)), cx: lerp(big.cx, inset.cx, q), cy: lerp(big.cy, inset.cy, q) }; };
// the panel camera: push in on the row being written and ride down with it, then pull back for the whole sinogram
const kAt = t => MO.smooth(clamp((t - 1.3) / 0.7)) * (1 - MO.smooth(clamp((t - 6.1) / 0.8)));
const PCX = 135, PCY = 256;
const panelCam = t => { const k = kAt(t), head = SY + SH * rowsAt(t) / CT.NA; return { z: 1 + 0.5 * k, ax: lerp(PCX, SX + SW / 2, k), ay: lerp(PCY, head, k) }; };
let PRO = null;                                                       // S12's projection (view 0), 96 channels
SC['s13_sinogram'] = {
  init() { PRO = new Float32Array(96); for (let j = 0; j < 96; j++) PRO[j] = CT.lineInt(0, (j + 0.5 - 48) * (2 * CT.FAN / 96), 0.8); },
  draw(c, t, S) {
    PIX.rect(c, 0, 0, W, H, 'k');
    const n = rowsAt(t), beta = n / CT.NA * TAU, pc = panelCam(t);
    const TX = x => PCX + (x - pc.ax) * pc.z, TY = y => PCY + (y - pc.ay) * pc.z;
    const rectL = (x, y, w, hh, col, a) => { const x0 = Math.round(TX(x)), y0 = Math.round(TY(y)); PIX.rect(c, x0, y0, Math.round(TX(x + w)) - x0, Math.round(TY(y + hh)) - y0, col, a); };
    // panel frame: the reconstruction computer's buffer
    const fa = MO.smooth(clamp((t - 0.4) / 0.5));
    if (fa > 0) { c.save(); c.globalAlpha = fa; rectL(SX - 3, SY - 3, SW + 6, SH + 6, 'g3'); rectL(SX - 2, SY - 2, SW + 4, SH + 4, 'k'); c.restore(); }
    // the sinogram so far (rows 0..n−1), stretched to the panel
    if (n > 0) {
      const R = CT.ramps().blue, rowsH = SH * n / CT.NA;
      CT.blit(c, CT.ND, CT.NA, { M: [SW / CT.ND * pc.z, 0, 0, SH / CT.NA * pc.z, TX(SX), TY(SY)], val: i => Math.floor(i / CT.ND) < n ? Math.pow(Math.max(0, CT.SINO[i] / CT.PMAX), 0.85) : null, ramp: R, clip: [Math.max(0, TX(SX)), Math.max(0, TY(SY)), Math.min(W, TX(SX + SW)), Math.min(H, TY(SY) + Math.ceil(rowsH * pc.z))] });
      // the newest row glows
      if (n < CT.NA) PIX.rect(c, Math.round(TX(SX)), Math.round(TY(SY + rowsH)) - 1, Math.round(SW * pc.z), 1, 'b4');
    }
    // axes
    const aa = MO.smooth(clamp((t - 0.6) / 0.3)) * clamp(1 - 7 * kAt(t));   // the axes step aside before the push-in carries them off the frame
    if (aa > 0) {
      c.save(); c.globalAlpha = aa;
      PIX.text(c, 'DETECTOR POSITION →', Math.round(TX(SX)), Math.round(TY(SY - 13)), 'g8');
      for (let k = 0; k <= 4; k++) { const y = Math.round(TY(SY + SH * k / 4)); PIX.rect(c, Math.round(TX(SX - 6)), y, 3, 1, 'g6'); if (k % 2 === 0) PIX.text(c, `${k * 90}°`, Math.round(TX(SX - 8)), y - 3, 'g7', { align: 'right', shadow: null }); }
      PIX.text(c, 'ANGLE', Math.round(TX(SX - 30)), Math.round(TY(SY + SH + 8)), 'g8'); PIX.text(c, '↓', Math.round(TX(SX - 30)) + 32, Math.round(TY(SY + SH + 8)), 'g8');
      c.restore();
    }
    const done = n >= CT.NA;
    if (done) { const age = t - 6.9; if (age < 0.4) rectL(SX - 3, SY - 3, SW + 6, SH + 6, 'b4', 0.25 * (1 - age / 0.4)); }
    // the gantry: from S12's framing into the corner, turning; ring and table fade as it shrinks
    const g = gcamAt(t), q = gq(t);
    const da = kAt(t);                                                  // while the panel is pushed in, a dark disc keeps the inset clear
    if (da > 0) { c.save(); c.globalAlpha = da; c.fillStyle = P.k; c.beginPath(); c.arc(inset.cx, inset.cy - 2, 33, 0, U.TAU); c.fill(); c.restore(); }
    G2.ring(c, g, 0.8 * (1 - q)); G2.table(c, g, 1 - q); G2.head(c, g, {}); G2.fan(c, g, beta, 0.5 + 0.3 * q); G2.frame(c, g, beta, {});
    c.setTransform(1, 0, 0, 1, 0, 0);
    // S12's projection flies up and becomes row 0
    const fq = MO.cubicInOut(clamp((t - 0.3) / 0.85)), fpa = 1 - MO.smooth(clamp((t - 1.15) / 0.2));
    if (fpa > 0) {
      const x0 = lerp(30, TX(SX), fq), w = lerp(210, SW * pc.z, fq), base = lerp(418, TY(SY) + 1, fq), hh = lerp(40, 1, fq);
      c.save(); c.globalAlpha = fpa; let prev = null;
      for (let j = 0; j < 96; j++) { const x = x0 + (j + 0.5) / 96 * w, y = base - PRO[j] / 4.8 * hh; if (prev) PIX.bline(c, prev[0], prev[1], x, y, 'b4'); prev = [x, y]; }
      c.restore();
    }
    // data streaming from the gantry into the panel
    for (let k = 0; k < 10; k++) { const qq = K.wrap(S.t * 1.6 + k / 10, 1), x = lerp(200, TX(SX + SW * (0.2 + 0.6 * h(k, 3))), qq), y = lerp(132, TY(SY + SH * n / CT.NA), MO.cubicIn(qq)); if (t > 1.0 && n < CT.NA) PIX.rect(c, Math.round(x), Math.round(y), 2, 1, k % 2 ? 'b3' : 'w'); }
    CAP.note(c, t, { x: SX + SW / 2, y: SY + SH + 8, text: 'SINOGRAM', t0: 6.9, t1: 8.0, col: 'b4', align: 'center', box: true });
    CAP.note(c, t, { x: SX + SW, y: SY + SH + 20, text: `${(n * CT.ND).toLocaleString('en-US')} MEASUREMENTS`, t0: 1.4, t1: 7.85, col: 'g9', align: 'right', box: true, rate: 400 });
    CAP.note(c, t, { x: SX + SW, y: SY + SH + 31, text: 'ONE SLICE, SIMPLIFIED', t0: 3.0, t1: 7.85, col: 'g7', align: 'right', box: true });
    CAP.cap(c, t, { l1: 'SINOGRAM', l2: ['THOUSANDS OF MEASUREMENTS', 'FROM MANY DIRECTIONS'], t0: 0.12, tSwap: 1.8, t1: 7.85, acc: 'b3' });
  },
  cues: () => {
    const q = [[0, 'data_stream', 0.6, -0.3, 1.2], [0.1, 'pull_back', 0.6, 0, 0.85], [1.2, 'rows_tick', 0.4, 0, 5.7], [1.3, 'push_in', 0.45, 0, 0.7],
      [6.1, 'pull_back', 0.5, 0, 0.8], [6.9, 'chime_complete', 1, 0]];
    for (let k = 0; k < 24; k++) q.push([1.25 + k * 0.235, 'pixel_place', 0.3, -0.4 + (k % 5) * 0.2, k]);
    return q;
  },
  xin: 0.3,
};
})();
