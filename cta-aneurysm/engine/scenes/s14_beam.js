// S14 PREPARE THE USEFUL BEAM (52–56 s): a flat cross-section under the tube: the photons leave the focal spot through the
// tube window as separate wave packets in a widening envelope. A metal filter plate stops part of the low-energy photons
// (long waves; each stop is a small red mark), and two collimator blades slide in and intercept the rays outside the
// selected field. The camera travels down with the beam.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, h = U.hash, TAU = U.TAU;
// world (mm): focal spot at (0, 0), y down. Window at y = 26, filter 52–58, blades at y = 92–104
const YW = 26, YF0 = 52, YF1 = 58, YB0 = 92, YB1 = 104, HALF = 0.46;
const gapAt = t => lerp(64, 22, MO.cubicInOut(clamp((t - 1.5) / 0.9)));        // the blades' half-gap at y = YB0 (mm)
const camAt = t => { const q = MO.sineInOut(clamp((t - 0.2) / 3.6)); return { x: 0, y: lerp(30, 104, q), z: lerp(3.0, 2.6, q) }; };
const PH = [];
for (let k = 0; k < 150; k++) {
  const te = -1.2 + k * 0.034, ang = (h(k, 1) * 2 - 1) * HALF, u = h(k, 2), E = 20 + 100 * (1 - Math.sqrt(1 - u * 0.98));
  // low energies are likelier to stop in the filter (≈ the real hardening, schematic)
  const stopF = h(k, 3) < Math.exp(-(E - 20) / 18) * 0.9;
  PH.push({ te, ang, E, stopF });
}
const VPH = 46;                                                           // mm/s (slowed)
const state = (p, t) => {
  const age = t - p.te; if (age < 0) return null;
  const d = age * VPH, dx = Math.sin(p.ang), dy = Math.cos(p.ang), x = dx * d, y = dy * d;
  if (p.stopF && y > YF0 + 1) return { stop: true, x: dx * (YF0 + 1) / dy, y: YF0 + 1, ts: p.te + (YF0 + 1) / dy / VPH };
  if (y > YB0) {                                                           // reached the blades: outside the gap at that moment → stopped
    const tb = p.te + YB0 / dy / VPH, xb = dx * YB0 / dy;
    if (Math.abs(xb) > gapAt(tb)) return { stop: true, x: xb, y: YB0 + 1, ts: tb, blade: true };
  }
  return { x, y, dx, dy };
};
SC['s14_beam'] = {
  draw(c, t, S) {
    const cam = camAt(t);
    K.cam(c, cam);
    // the tube housing above the window, the window, the filter plate, the blades
    PIX.rect(c, -80, -60, 160, 60 + YW - 6, 'g2'); PIX.rect(c, -80, YW - 8, 160, 2, 'g4');
    PIX.rect(c, -6, YW - 8, 12, 4, 'q5');                                     // the beryllium-thin window
    PIX.circ(c, 0, -2, 2.2, 'y3');
    PIX.rect(c, -70, YF0, 140, YF1 - YF0, 'u1'); PIX.rect(c, -70, YF0, 140, 1.2, 'u2'); PIX.rect(c, -70, YF1 - 1, 140, 1, 'u0');
    const g = gapAt(t);
    PIX.rect(c, -110, YB0, 110 - g, YB1 - YB0, 'g3'); PIX.rect(c, g, YB0, 110 - g, YB1 - YB0, 'g3');
    PIX.rect(c, -110, YB0, 110 - g, 1.2, 'g6'); PIX.rect(c, g, YB0, 110 - g, 1.2, 'g6');
    c.setTransform(1, 0, 0, 1, 0, 0);
    // the envelope edges after the blades (the selected field)
    for (const s of [-1, 1]) { const [x0, y0] = K.S(cam, s * g * 0.0, 0), [x1, y1] = K.S(cam, s * g * 1.9, YB0 * 1.9); PIX.bline(c, x0, y0, x1, y1, 'y1', 2); }
    for (const p of PH) {
      const st = state(p, S.t - 52 + 0); if (!st) continue;
      if (st.stop) { const age = S.t - 52 - st.ts; if (age < 0.6) { const [sx, sy] = K.S(cam, st.x, st.y); FX.flash(c, sx, sy, 4 * (1 - age / 0.6), 'r2', 1 - age / 0.6); PIX.rect(c, Math.round(sx) - 1, Math.round(sy) - 1, 3, 3, 'r1'); } continue; }
      const [sx, sy] = K.S(cam, st.x, st.y); if (sy > H + 20) continue;
      const lam = FX.lamFor(p.E) * 0.9;
      FX.ph(c, sx, sy, Math.atan2(st.dy, st.dx), lam, lam * 2.4, 3, 1);
    }
    const [fx, fy] = K.S(cam, 66, (YF0 + YF1) / 2), [bx, by] = K.S(cam, -90, YB1);
    CAP.part(c, t, { text: 'FİLTR', ax: fx, ay: fy, x: 338, y: Math.round(fy) + 34, t0: 0.6, t1: 2.6, col: 'u3', lineCol: 'g7', align: 'right' });
    CAP.part(c, t, { text: 'KOLLİMATOR', ax: bx, ay: by, x: 22, y: Math.round(by) + 34, t0: 1.6, t1: 3.6, col: 'g9', lineCol: 'g7' });
    CAP.ctx(c, t, { text: 'FİLTR VƏ KOLLİMATOR', t0: 0.3, t1: 3.6 });
  },
  cues: () => {
    const q = [[0.3, 'type', 0.4], [0.6, 'tag', 0.4, 0.4], [1.5, 'blades', 0.9, 0, 0.9], [1.6, 'tag', 0.4, -0.4], [0, 'beam_bed', 0.5, 0, 4]];
    for (let k = 0; k < 8; k++) q.push([0.5 + k * 0.4, 'filter_stop', 0.4, (U.hash(k, 9) - 0.5) * 0.6, k]);
    return q;
  },
  xin: 0.2,
};
})();
