// S21 CARDIOPLEGIA, THE REASON THE HEART IS STILL (72–76 s): a second, small pump on the mast — a roller pump, like the
// blood pump of a dialysis machine — draws a cold cardioplegia solution from its bag and pushes it up a thin line to the
// root of the aorta, below the cross-clamp (the heart side). The clamp keeps it from the body: it can only go into the
// coronary arteries, and through them into the heart muscle, which stays relaxed and still. It is given in doses during
// the operation (none are shown). The camera follows the solution from the pump up into the chest window.
(() => {
const clamp = U.clamp, lerp = U.lerp;
const C = SIDE.LY.cpg;
const COR = [[[-6, -30], [-14, -26], [-19, -20], [-21, -2], [-20, 18], [-16, 34], [-8, 46]], [[-6, -30], [6, -26], [16, -22], [22, -18], [28, 2], [32, 24], [32, 44], [30, 58]], [[28, 2], [36, 12], [42, 24]]];
SC['s21_cardioplegia'] = {
  xin: 0.5,
  draw(c, t, S) {
    const T = S.t, cam = SIDE.track(T), Lc = SIDE.len('cardio'), q = MO.sineInOut(clamp((t - 0.6) / 1.8)), k = MO.smooth(clamp((t - 2.4) / 0.4));
    SIDE.scene(c, cam, T, { tubes: { cardio: { hi: MO.smooth(clamp((t - 0.6) / 0.3)) } },
      inner: (oc, hcam) => { if (k > 0) for (const p of COR) window.heartChevrons(oc, hcam, p, T * 18, 'w', k, 10); } });
    if (t > 0.6 && t < 2.6) SIDE.comet(c, cam, ['cardio'], q * (Lc + 10), 34, { ramp: 'hr', a: 1 - MO.smooth(clamp((t - 2.3) / 0.3)) });
    MACHINE.mark(c, cam, 'cpg', MO.smooth(clamp((t - 0.2) / 0.2)) * (1 - MO.smooth(clamp((t - 1.2) / 0.3))));
    const L = (text, at, dx, dy, t0, t1, col, align) => SIDE.label(c, cam, t, { text, at, dx, dy, t0, t1, col, align });
    L('ROLLER PUMP', [C.head[0] + 4, C.head[1] + 4], 24, 24, 0.25, 1.4, 'w');
    L('COLD SOLUTION', [SIDE.LY.bag.x0, SIDE.LY.bag.y0 + 10], -18, -10, 0.5, 1.4, 'hr5', 'right');
    L('CROSS-CLAMP', SIDE.H2S(-30, -48), -24, -26, 2.55, 3.85, 'g8', 'right');
    L('AORTIC ROOT', SIDE.H2S(-6, -30), 34, -30, 2.75, 3.85, 'hr5');
    L('CORONARY ARTERIES', SIDE.H2S(30, 30), 18, 40, 3.0, 3.85, 'w');
    CAP.scene(c, t, { title: 'CARDIOPLEGIA', ctx: 'Cold solution keeps it still.', t0: 0.5, t1: 3.92, acc: 'hr4' });
  },
  cues: [[0.0, 'glide', 0.4, 0.3, 0.6], [0.25, 'label', 0.3, 0.3], [0.5, 'label', 0.3, 0.2], [0.6, 'climb', 0.5, 0.2, 1.8], [2.4, 'shimmer', 0.6, -0.2], [2.55, 'label', 0.3, -0.3], [2.75, 'label', 0.3, 0.2], [3.0, 'label', 0.3, 0.3]],
};
})();
