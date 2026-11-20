// S30 DIGITIZE THE SIGNAL (116–120 s): the collected charge flows down the trace into the readout: an integrator sums it
// over the view (one total per view — this detector does not count single photons), a converter turns the total into a
// number (ten bits light up). Then the camera pulls out along the signal path to the whole row of elements, each sending
// its own pale-blue signal to the electronics.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, h = U.hash;
const zAt = t => K.zl(1, 0.2, MO.cubicInOut(clamp((t - 2.2) / 1.6)));
const BITS = '1011001110';
SC['s30_adc'] = {
  draw(c, t, S) {
    const z = zAt(t), L = DET.L;
    // the many elements appear around the central one as the camera pulls out (each a scaled copy of the cross-section)
    c.save(); c.translate(W / 2, 360); c.scale(z, z); c.translate(-W / 2, -360);
    const n = z < 0.9 ? 17 : 1;
    for (let k = -(n - 1) / 2; k <= (n - 1) / 2; k++) {
      c.save(); c.translate(k * 176, 0);
      DET.cross(c, { sig: true });
      // signal pulses down the trace and on to the bus
      const ph = K.wrap(S.t * 1.6 + h(k + 20, 3), 1);
      PIX.rect(c, L.cx - 2, L.dy1 + 2 + (L.ry0 - L.dy1 - 8) * ph, 4, 4, 'b4');
      PIX.rect(c, L.cx - 1, L.ry1 + 5, 2, 60, 'b2');
      c.restore();
    }
    PIX.rect(c, -1800, L.ry1 + 64, 3960, 6, 'b1');
    c.restore();
    // close-up readouts (fade as the camera pulls out)
    const ca = 1 - MO.smooth(clamp((t - 2.2) / 0.5));
    if (ca > 0) {
      c.save(); c.globalAlpha = ca;
      // integrator: a bucket filling with charge over the view
      const fill = MO.smooth(clamp((t - 0.3) / 1.2));
      PIX.rect(c, 32, 488, 40, 70, 'k'); PIX.rect(c, 36, 492, 32, 62, 'n1'); PIX.rect(c, 36, 492 + Math.round(62 * (1 - fill)), 32, Math.round(62 * fill), 'b2'); PIX.rect(c, 36, 492 + Math.round(62 * (1 - fill)), 32, 1, 'b4');
      PIX.text(c, '∫', 46, 470, 'b4', { sc: 2, shadow: null });
      // the converter: bits light up one by one, after the integration
      const nb = Math.floor(clamp((t - 1.5) / 0.6) * BITS.length);
      PIX.rect(c, 256, 496, 92, 26, 'k');
      [...BITS].forEach((b, i) => { const lit = i < nb; PIX.text(c, b, 262 + i * 8, 504, lit ? (b === '1' ? 'b4' : 'b2') : 'n3', { shadow: null }); });
      c.restore();
    }
    CAP.ctx(c, t, { text: 'SİQNAL → RƏQƏM', t0: 0.4, t1: 3.6 });
  },
  cues: () => { const q = [[0.3, 'integrate', 0.7, -0.5, 1.2], [0.4, 'type', 0.4], [2.2, 'pull_back', 0.7, 0, 1.6]]; for (let k = 0; k < 10; k++) q.push([1.5 + k * 0.06, 'bit', 0.45, 0.6, k]); for (let k = 0; k < 6; k++) q.push([2.6 + k * 0.2, 'data_tick', 0.3, (k - 3) / 4, k]); return q; },
};
})();
