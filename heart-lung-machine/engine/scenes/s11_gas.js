// S11 STEP 5 · THE GAS SUPPLY (35–38 s): from the heat exchanger back to the machine, at the gas blender on the mast.
// Oxygen and air come in from the wall through two hoses, meet inside the blender, and pass two flowmeters (each a float
// in a glass tube, holding steady: no numbers). The mixed sweep gas runs down a thin pale-cyan line into the top of the
// oxygenator; at its bottom the used gas leaves through the exhaust port. Gas and blood never share a channel.
(() => {
const clamp = U.clamp, lerp = U.lerp, hh = U.hash;
const B = SIDE.LY.blend;
SC['s11_gas'] = {
  xin: 0.4,
  draw(c, t, S) {
    const T = S.t, cam = SIDE.track(T), cut = MO.smooth(clamp((t - 0.5) / 0.4));
    const hiIn = MO.smooth(clamp((t - 0.35) / 0.3)) * (1 - MO.smooth(clamp((t - 1.3) / 0.3))), hiOut = MO.smooth(clamp((t - 1.7) / 0.3)) * (1 - MO.smooth(clamp((t - 2.7) / 0.2)));
    SIDE.scene(c, cam, T, { machine: { cut: { blend: cut } }, tubes: { o2: { hi: hiIn }, air: { hi: hiIn }, gas: { hi: hiOut }, exhaust: { hi: hiOut } } });
    // the used gas leaving the exhaust: small pale puffs that drift away and fade
    for (let k = 0; k < 6; k++) {
      const q = ((T * 0.7 + k / 6) % 1), [sx, sy] = K.S(cam, 75 + q * 10 + hh(k, 1) * 3, 74 + q * 8), a = (1 - q) * 0.9;
      if (a < 0.1) continue;
      c.save(); c.globalAlpha = a; PIX.rect(c, Math.round(sx), Math.round(sy), Math.max(1, Math.round(cam.z * 0.8)), Math.max(1, Math.round(cam.z * 0.8)), 'ox3'); c.restore();
    }
    MACHINE.mark(c, cam, 'blend', MO.smooth(clamp((t - 0.8) / 0.2)) * (1 - MO.smooth(clamp((t - 1.7) / 0.3))));
    const L = (text, at, dx, dy, t0, col, align) => SIDE.label(c, cam, t, { text, at, dx, dy, t0, t1: 2.85, col, align });
    L('O₂', [104, -14], 10, -18, 0.35, 'ox4');
    L('AIR', [104, -6], 10, 14, 0.55, 'g8');
    L('GAS BLENDER', [(B.x0 + B.x1) / 2, B.y0], 0, -26, 0.85, 'w', 'center');
    L('FLOWMETERS', [B.x0 + 8, B.y1 - 6], -18, 20, 1.2, 'ox4', 'right');
    L('SWEEP GAS IN', [66, 14], 16, 12, 1.75, 'ox4');
    L('EXHAUST', [75, 73], 14, 10, 2.15, 'ox3');
    CAP.scene(c, t, { title: '5 · GAS SUPPLY', ctx: 'Oxygen and air, mixed.', t0: 0.4, t1: 2.92, acc: 'ox4' });
  },
  cues: [[0.0, 'gas_in', 0.5, 0.4, 3.0], [0.35, 'label', 0.4, 0.5], [0.5, 'shimmer', 0.5, 0.4], [0.55, 'label', 0.3, 0.5], [0.85, 'label', 0.3, 0.2], [1.2, 'label', 0.3, 0.1], [1.7, 'glide', 0.4, 0.2, 1.0], [1.75, 'label', 0.3, 0.3], [2.15, 'puff', 0.6, 0.4], [2.15, 'label', 0.3, 0.4]],
};
})();
