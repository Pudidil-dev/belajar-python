// S24 THE WHOLE LOOP (83–87 s): the camera eases back to the whole set-up from the side, patient and machine in one frame.
// Three functions light in turn — the pump, the oxygenator, the return line to the aorta — each named, while the rest stays
// visible but subdued. The heart stays still; the blood keeps moving.
(() => {
const clamp = U.clamp, lerp = U.lerp;
const TH = [1.0, 1.75, 2.5];
SC['s24_system'] = {
  draw(c, t, S) {
    const cam = SIDE.track(S.t), T = S.t;
    SIDE.scene(c, cam, T);
    const hk = TH.map(x => MO.smooth(clamp((t - x) / 0.25)) * (1 - MO.smooth(clamp((t - 3.55) / 0.3))));
    const any = Math.max(...hk);
    if (any > 0.01) {
      PIX.dim(c, any > 0.5 ? 2 : 1);
      if (hk[0] > 0) { MACHINE.pump(c, cam, T, { cut: 0 }); SIDE.tube(c, cam, 'resPump', T, {}); SIDE.tube(c, cam, 'pumpOxy', T, {}); MACHINE.mark(c, cam, 'pump', hk[0]); }
      if (hk[1] > 0) { MACHINE.oxy(c, cam, T, {}); MACHINE.blender(c, cam, T, {}); SIDE.tube(c, cam, 'gas', T, {}); MACHINE.mark(c, cam, 'oxy', hk[1]); }
      if (hk[2] > 0) { SIDE.tube(c, cam, 'arterial', T, {}); SIDE.comet(c, cam, ['arterial'], lerp(0, SIDE.len('arterial') + 40, MO.sineInOut(clamp((t - TH[2]) / 0.95))), 70, { a: hk[2] }); }
    }
    SIDE.label(c, cam, t, { text: 'PUMP', at: [-29, 116], dx: -10, dy: -18, align: 'right', t0: TH[0], t1: 3.55, col: 'w' });
    SIDE.label(c, cam, t, { text: 'OXYGENATOR', at: [40, 50], dx: -12, dy: -6, align: 'right', t0: TH[1], t1: 3.55, col: 'w' });
    SIDE.label(c, cam, t, { text: 'RETURN', at: [55, -60], dx: 8, dy: -6, t0: TH[2], t1: 3.55, col: 'w' });
    CAP.scene(c, t, { title: 'THE WHOLE LOOP', t0: 0.15, t1: 3.9, acc: 'mt3' });
    CAP.steps(c, t, { x: CAP.X0 + 5, y: CAP.Y0 + CAP.LH + 2, gap: 11, t1: 3.9, items: [[TH[0], 'PUMP', 'vb5'], [TH[1], 'OXYGENATE', 'ox4'], [TH[2], 'RETURN', 'ab5']] });
  },
  cues: [[0.0, 'pull', 0.5, 0, 0.9], [TH[0], 'func', 1.0, -0.2, 0], [TH[1], 'func', 1.0, 0.3, 1], [TH[2], 'func', 1.0, 0.4, 2], [3.4, 'glide', 0.4, 0.2, 0.7]],
};
})();
