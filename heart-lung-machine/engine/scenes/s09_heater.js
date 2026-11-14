// S09 STEP 4 · THE HEATER–COOLER (29–32 s): the camera moves from the pump to the heater–cooler, a separate unit on the floor.
// Its housing opens: a tank of water with a heater and a cooling coil in it, and a water pump. The water — warmed or cooled
// as the operation needs — runs up through its own two lines to the heat exchanger at the bottom of the oxygenator and back.
// Water and blood never share a channel. Labels name the unit, its parts and the loop.
(() => {
const clamp = U.clamp;
const HC = SIDE.LY.hcu;
SC['s09_heater'] = {
  draw(c, t, S) {
    const T = S.t, cam = SIDE.track(T), cut = MO.smooth(clamp((t - 0.6) / 0.5)), hi = MO.smooth(clamp((t - 1.6) / 0.3)) * (1 - MO.smooth(clamp((t - 2.7) / 0.2)));
    SIDE.scene(c, cam, T, { machine: { cut: { hcu: cut } }, tubes: { waterIn: { hi }, waterOut: { hi } } });
    MACHINE.mark(c, cam, 'hcu', MO.smooth(clamp((t - 0.8) / 0.2)) * (1 - MO.smooth(clamp((t - 1.5) / 0.3))));
    MACHINE.mark(c, cam, 'hx', MO.smooth(clamp((t - 2.0) / 0.2)) * (1 - MO.smooth(clamp((t - 2.8) / 0.15))));
    const L = (text, at, dx, dy, t0, col, align) => SIDE.label(c, cam, t, { text, at, dx, dy, t0, t1: 2.85, col, align });
    L('HEATER–COOLER', [HC.x0 + 2, HC.y0 + 4], -16, -26, 0.85, 'w', 'right');
    L('HEATER', [HC.x0 + 10, HC.y0 + 26], -18, -6, 0.95, 'hr5', 'right');
    L('COOLER', [HC.x0 + 10, HC.y0 + 34], -18, 6, 1.2, 'ox4', 'right');
    L('WATER OUT', [112, 96], 20, -22, 1.6, 'wa4');
    L('WATER BACK', [100, 105], -14, 14, 1.8, 'wa3', 'right');
    L('HEAT EXCHANGER', [52, 84], 18, 30, 2.05, 'wa4');
    CAP.scene(c, t, { title: '4 · HEATER–COOLER', ctx: 'Warm or cool water loop.', t0: 0.1, t1: 2.92, acc: 'wa4' });
  },
  cues: [[0.0, 'glide', 0.5, 0.4, 0.9], [0.85, 'label', 0.4, 0.5], [0.6, 'water_flow', 0.6, 0.4, 2.4], [0.6, 'tick_soft', 0.4, 0.5, 0], [0.95, 'label', 0.3, 0.4], [1.2, 'label', 0.3, 0.4], [1.6, 'heat_glide', 0.6, 0.3, 1.0], [2.05, 'label', 0.3, -0.2]],
};
})();
