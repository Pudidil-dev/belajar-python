// S09 ENTER THE OXYGENATOR (22–25 s): back from the schematic to the assembly. Its housing turns see-through and the dense,
// orderly bundle of hollow fibres appears, blood moving among them. One fibre is picked out (the others dim a little) and
// the camera pushes toward it until it crosses the whole frame.
(() => {
const clamp = U.clamp;
SC['s09_oxygenator'] = {
  xin: 0.4,
  draw(c, t, S) {
    const cam = WORLD.track(S.t), cut = MO.smooth(clamp((t - 0.3) / 0.7)), fib = MO.smooth(clamp((t - 0.6) / 0.6)), sel = MO.smooth(clamp((t - 1.4) / 0.5));
    WORLD.scene(c, cam, S.t, { machine: { cut: { oxy: cut, res: 1, pump: 1 }, fibers: fib, sel } });
    CAP.ctx(c, t, { text: 'Oxygenator', t0: 0.5, t1: 2.5, acc: 'ox4' });
  },
  cues: [[0.3, 'shimmer', 0.6, 0.3], [0.6, 'gas_in', 0.4, 0.4, 2.4], [1.4, 'select', 0.5, 0], [1.6, 'push', 0.5, 0, 1.4]],
};
})();
