// S04 THE MACHINE, FROM THE SIDE (6–10 s): the view turns — the operating field seen from above folds flat and the same
// set-up unfolds seen from the side: the patient on the table, the heart in a cutaway window, the lines running down to
// the heart–lung machine on the floor. The camera starts at the chest and eases back until the whole machine is in frame.
// The machine was running all along (no power-on). The outgoing path lights first (venous line → reservoir → pump →
// oxygenator), then the way back (the arterial line up to the aorta), never everything at once. Labels name the heart
// and the two lines as they light.
(() => {
const clamp = U.clamp;
const FL = 0.5, OUT = ['venous', 'resPump', 'pumpOxy'];
SC['s04_machine'] = {
  draw(c, t, S) {
    const T = S.t;
    const side = cc => {
      const cam = SIDE.track(T);
      SIDE.scene(cc, cam, T, {});
      const LO = SIDE.routeLen(OUT), LR = SIDE.len('arterial');
      const qo = MO.sineInOut(clamp((t - 1.1) / 1.3)), qr = MO.sineInOut(clamp((t - 2.4) / 1.1));
      const a1 = 1 - MO.smooth(clamp((t - 2.5) / 0.3)), a2 = 1 - MO.smooth(clamp((t - 3.6) / 0.3));
      if (t > 1.1 && a1 > 0) SIDE.comet(cc, cam, OUT, qo * (LO + 30), 50, { a: a1 });
      if (t > 2.4 && a2 > 0) SIDE.comet(cc, cam, ['arterial'], qr * (LR + 30), 50, { a: a2 });
      SIDE.label(cc, cam, t, { text: 'HEART', at: [-24, -86], dx: 16, dy: -26, t0: 0.75, t1: 3.85, col: 'hr5' });
      SIDE.label(cc, cam, t, { text: 'VENOUS LINE: OUT', at: [-67.5, -40], dx: -10, dy: 6, align: 'right', t0: 1.3, t1: 3.85, col: 'vb5' });
      SIDE.label(cc, cam, t, { text: 'ARTERIAL LINE: BACK', at: [47, -70], dx: 10, dy: -14, t0: 2.55, t1: 3.85, col: 'ab5' });
      SIDE.label(cc, cam, t, { text: 'MACHINE', at: [0, 146], dx: 30, dy: 14, t0: 1.9, t1: 3.85, col: 'w' });
    };
    if (t < FL) window.flip(c, cc => WORLD.scene(cc, WORLD.track(T), T), side, t / FL); else side(c);
    CAP.scene(c, t, { title: 'HEART–LUNG MACHINE', ctx: 'Seen from the side.', t0: 0.6, t1: 3.9, acc: 'ab3' });
  },
  cues: [[0.0, 'turn', 0.7, 0, 0.5], [0.5, 'reveal', 1.0, 0], [0.75, 'label', 0.4, -0.2], [1.1, 'path_out', 0.6, -0.3, 1.3], [1.3, 'label', 0.4, -0.4], [1.9, 'label', 0.3, 0], [2.4, 'path_back', 0.6, 0.3, 1.1], [2.55, 'label', 0.4, 0.4]],
};
})();
