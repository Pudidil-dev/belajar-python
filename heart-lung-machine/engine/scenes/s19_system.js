// S19 THE COMPLETE SYSTEM (59–63 s): the whole circuit, patient to machine, in one frame. Three functions light in turn —
// the pump, the oxygenator, the return line to the aorta — while the rest stays visible but subdued. The heart stays still;
// the blood keeps moving. Then the camera starts toward the tubing that returns to the chest.
(() => {
const clamp = U.clamp, lerp = U.lerp;
const TH = [0.75, 1.5, 2.25];                                       // the three highlights (local time; on the eighth-note grid)
SC['s19_system'] = {
  draw(c, t, S) {
    const cam = WORLD.track(S.t), T = S.t;
    WORLD.scene(c, cam, T);
    const hk = TH.map(x => MO.smooth(clamp((t - x) / 0.25)) * (1 - MO.smooth(clamp((t - x - 0.85) / 0.3))));
    const any = Math.max(...hk);
    if (any > 0.01 && t < 3.4) {
      PIX.dim(c, any > 0.5 ? 2 : 1);                                                       // subdue the rest (down its own ramps)
      const P = WORLD.LY.pump, O = WORLD.LY.oxy;
      if (hk[0] > 0) { MACHINE.pump(c, cam, T, { cut: 0 }); const [x, y] = K.S(cam, P.x, P.y - 8); FX.ring(c, x, y, 16 * cam.z / 0.4 * 0.4 + 6, 'mt4', hk[0]); FX.glowL(c, x, y, 26, ['vb3', 'vb4', 'vb5'], 0.6 * hk[0], 1.6); }
      if (hk[1] > 0) { MACHINE.oxy(c, cam, T, {}); const [x, y] = K.S(cam, O.x, O.y + 50); FX.ring(c, x, y, 26, 'mt4', hk[1]); FX.glowL(c, x, y, 30, ['ab2', 'ab3', 'ab4'], 0.5 * hk[1], 1.6); }
      if (hk[2] > 0) { WORLD.tube(c, cam, 'arterial', T, {}); WORLD.comet(c, cam, ['arterial'], lerp(0, WORLD.R.arterial.S.at(-1) + 60, MO.sineInOut(clamp((t - TH[2]) / 0.9))), 120, { a: hk[2] }); }
    }
    CAP.ctx(c, t, { text: 'Pump', t0: TH[0], t1: 3.4, acc: 'mt3', y: 64 });
    CAP.ctx(c, t, { text: '→ Oxygenate', t0: TH[1], t1: 3.4, acc: 'mt3', y: 90 });
    CAP.ctx(c, t, { text: '→ Return', t0: TH[2], t1: 3.4, acc: 'mt3', y: 116 });
  },
  cues: [[0.0, 'pull', 0.5, 0, 0.9], [TH[0], 'func', 1.0, -0.2, 0], [TH[1], 'func', 1.0, 0.3, 1], [TH[2], 'func', 1.0, 0.4, 2], [3.3, 'glide', 0.4, 0.2, 0.7]],
};
})();
