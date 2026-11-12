// S12 THE OXYGENATOR (38–41 s): the camera moves down the gas line to the oxygenator. Blood enters at the bottom, passes the
// heat exchanger, rises through the dense bundle of hollow fibres, and leaves at the top through the filter. The bundle
// appears in close-up: one fibre is picked out (the others dim a little) and the camera pushes toward it until it crosses
// the whole frame (the next scene looks at it end-on).
(() => {
const clamp = U.clamp;
SC['s12_oxygenator'] = {
  draw(c, t, S) {
    const T = S.t, cam = SIDE.track(T), fib = MO.smooth(clamp((t - 0.5) / 0.6)), sel = MO.smooth(clamp((t - 1.3) / 0.4));
    SIDE.scene(c, cam, T, { machine: { fibers: fib, sel } });
    const L = (text, at, dx, dy, t0, col, align) => SIDE.label(c, cam, t, { text, at, dx, dy, t0, t1: 1.65, col, align });
    L('BLOOD IN', [52, 101], -18, 10, 0.2, 'vb5', 'right');
    L('BLOOD OUT', [52, -3], -16, -14, 0.4, 'ab5', 'right');
    L('GAS IN', [66, 16], 16, -6, 0.6, 'ox4');
    L('HOLLOW FIBRES', [46, 40], -22, 4, 0.9, 'iv5', 'right');
    CAP.scene(c, t, { title: 'OXYGENATOR', ctx: 'Gas inside hollow fibres.', t0: 0.1, t1: 2.92, acc: 'ox4' });
  },
  cues: [[0.0, 'glide', 0.4, 0.2, 0.8], [0.2, 'label', 0.3, -0.2], [0.4, 'label', 0.3, -0.2], [0.5, 'shimmer', 0.6, 0.3], [0.6, 'label', 0.3, 0.3], [0.9, 'label', 0.3, -0.3], [1.3, 'select', 0.5, 0], [1.5, 'push', 0.5, 0, 1.4]],
};
})();
