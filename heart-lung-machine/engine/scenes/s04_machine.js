// S04 REVEAL THE HEART–LUNG MACHINE (6–9 s): the camera eases back into a stable three-quarter view of the console and the
// perfusionist beside it: reservoir, pump head, oxygenator assembly, the lines. The machine was running all along (no
// power-on). The outgoing path lights first (venous line → reservoir → pump → oxygenator), then the returning one (up the
// arterial line), never everything at once.
(() => {
const clamp = U.clamp;
const OUT = ['venous', 'resPump', 'pumpOxy'], RET = ['arterial'];
SC['s04_machine'] = {
  draw(c, t, S) {
    const cam = WORLD.track(S.t);
    WORLD.scene(c, cam, S.t);
    const LO = WORLD.routeLen(OUT), LR = WORLD.routeLen(RET);
    const qo = MO.sineInOut(clamp((t - 0.7) / 1.1)), qr = MO.sineInOut(clamp((t - 1.85) / 1.0));
    const a1 = 1 - MO.smooth(clamp((t - 1.9) / 0.3)), a2 = 1 - MO.smooth(clamp((t - 2.85) / 0.15));
    const d0 = WORLD.R.venous.S.at(-1) - 260;                         // start the light where the line enters the frame
    if (t > 0.7) WORLD.comet(c, cam, OUT, d0 + qo * (LO - d0) + 30, 70, { a: a1 });
    if (t > 1.85) WORLD.comet(c, cam, RET, qr * 420, 80, { a: a2 });
    CAP.ctx(c, t, { text: 'Heart–lung machine', t0: 0.3, t1: 2.7, acc: 'ab3' });
  },
  cues: [[0.0, 'reveal', 1.0, 0], [0.7, 'path_out', 0.6, -0.3, 1.1], [1.85, 'path_back', 0.6, 0.3, 1.0]],
};
})();
