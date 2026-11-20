// S34 GRAYSCALE IMAGE (132–136 s): the reconstructed axial slice in a CT-angiography window: white skull, grey brain, the
// contrast-filled arteries bright — the right middle cerebral artery and, at its bifurcation, the sac. The camera eases in;
// a probe touches the enhanced lumen and its attenuation value slides onto a grey ramp: high attenuation shows light.
// Grayscale is the display's convention: nothing is white inside the patient.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const A = () => VES.AN.c;
const imgPos = (x, y) => [(x + CT.OX) / CT.PX + CT.N / 2 - 0.5, CT.N / 2 - 0.5 - (y + CT.OY) / CT.PX];
SC['s34_gray'] = {
  draw(c, t, S) {
    const q = MO.sineInOut(clamp((t - 0.3) / 2.6)), s = lerp(window.S33.S0, 2.6, q), [u, v] = imgPos(A()[0], A()[1]);
    const cx = lerp(window.S33.GX, W / 2 + (CT.N / 2 - u) * s * CT.PX * 0.6, q), cy = lerp(window.S33.GY, 330 + (CT.N / 2 - v) * s * CT.PX * 0.6, q);
    CT.drawSlice(c, CT.full(), cx, cy, s, { L: WS.L, W: WS.W, clip: [0, 0, W, 520] });
    // the probe on the lumen
    const px = cx + (u + 0.5 - CT.N / 2) * s * CT.PX, py = cy + (v + 0.5 - CT.N / 2) * s * CT.PX, pa = MO.smooth(clamp((t - 1.4) / 0.3));
    if (pa > 0) { FX.ring(c, px, py, 7 + 3 * (1 - pa), 'c3', pa); PIX.rect(c, Math.round(px), Math.round(py), 1, 1, 'c4'); }
    // the grey ramp: black (low attenuation) → white (high); a marker slides from the probe to its place
    const ra = MO.smooth(clamp((t - 1.6) / 0.3)), X0 = 40, Y0 = 560, RW = 280;
    if (ra > 0) {
      c.save(); c.globalAlpha = ra;
      PIX.rect(c, X0 - 4, Y0 - 4, RW + 8, 22, 'k');
      for (let x = 0; x < RW; x++) { const g = x / RW, col = ['k', 'g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'ga', 'gb', 'w'][Math.min(13, Math.floor(g * 14))]; PIX.rect(c, X0 + x, Y0, 1, 14, col); }
      const hu = (() => { const [uu, vv] = [Math.round(u), Math.round(v)]; return CT.toHU(CT.full()[vv * CT.N + uu]); })();
      const g = clamp((hu - (WS.L - WS.W / 2)) / WS.W), mx = X0 + RW * g, k = MO.cubicInOut(clamp((t - 1.9) / 0.7));
      const fx = lerp(px, mx, k), fy = lerp(py, Y0 - 8, k);
      PIX.rect(c, Math.round(fx) - 2, Math.round(fy) - 2, 5, 5, 'c3'); PIX.rect(c, Math.round(fx) - 1, Math.round(fy) - 1, 3, 3, 'w');
      if (k >= 1) { PIX.rect(c, Math.round(mx), Y0 - 3, 1, 20, 'c3'); }
      c.restore();
    }
    CAP.ctx(c, t, { text: 'ZƏİFLƏMƏ → BOZ TON', t0: 0.35, t1: 3.6 });
  },
  cues: [[0, 'reveal', 0.9, 0], [0.3, 'push_in', 0.5, 0, 2.6], [0.35, 'type', 0.4], [1.4, 'probe', 0.8, -0.3], [1.9, 'slide', 0.6, 0, 0.7], [2.6, 'land', 0.6, 0.2]],
};
})();
