// S07 STEP 2 · THE RESERVOIR (21–24 s): the camera pushes into the hard-shell venous reservoir, seen through its clear
// shell. Blood comes in at the top (the venous inlet; beside it, the inlet for blood saved by suction), runs down the inlet
// tube into the filter sock, settles into a pool with a steady working level, and leaves through the outlet at the bottom,
// always under the surface. No foam, no splashing. The level sensor on the wall lights once (a quiet tick, no alarm).
(() => {
const clamp = U.clamp, lerp = U.lerp;
const RS = SIDE.LY.res, LV = RS.level;
const PATHS = [0, 1, 2, 3].map(k => { const p = WORLD.smooth([[-58, -6], [-58, 8], [-58, 18], [-57 - k * 1.5, 24], [-58 - k * 2, 32], [-60 + (k - 1.5) * 3, 46], [-62 + (k - 1.5), 58], [-62, 64], [-62, 70]], 1); p.S = WORLD.lens(p); return p; });
window.resParticles = (c, cam, T) => {
  PATHS.forEach((p, k) => {
    const L = p.S.at(-1);
    for (let j = 0; j < 4; j++) {
      const d = (T * 16 + k * 9 + j * L / 4) % L, [x, y] = WORLD.at(p, p.S, d), [sx, sy] = K.S(cam, x, y), r = Math.max(1, 1.0 * cam.z);
      LIT.sphere(c, sx, sy, r, y > LV + 1 ? ['vb2', 'vb3', 'vb4', 'vb5'] : ['vb3', 'vb4', 'vb5', 'rc4'], {});
    }
  });
};
SC['s07_reservoir'] = {
  draw(c, t, S) {
    const T = S.t, cam = SIDE.track(T), led = Math.max(0, 1 - Math.abs(t - 1.75) / 0.35);
    SIDE.scene(c, cam, T, { machine: { led } });
    if (cam.z > 1.8) window.resParticles(c, cam, T);
    MACHINE.mark(c, cam, [-50, LV + 13, -43, LV + 23], led);
    const L = (text, at, dx, dy, t0, col, align) => SIDE.label(c, cam, t, { text, at, dx, dy, t0, t1: 2.85, col, align });
    L('VENOUS INLET', [-58, -6], 26, -12, 0.45, 'vb5');
    L('FROM SUCTION', [-70, -6], -18, -12, 0.7, 'g8', 'right');
    L('FILTER', [-52, 14], 34, -2, 0.95, 'iv5');
    L('BLOOD LEVEL', [-50, LV], 30, 4, 1.25, 'vb5');
    L('LEVEL SENSOR', [-45, LV + 18], 22, 8, 1.65, 'mt4');
    L('OUTLET', [-62, 68], 22, 6, 2.0, 'vb5');
    CAP.scene(c, t, { title: '2 · RESERVOIR', ctx: 'A steady buffer of blood.', t0: 0.1, t1: 2.92, acc: 'vb5' });
  },
  cues: [[0.0, 'push', 0.6, -0.3, 0.8], [0.45, 'label', 0.4, 0.2], [0.6, 'res_fluid', 0.6, -0.4, 1.6], [0.7, 'label', 0.3, -0.4], [0.95, 'label', 0.3, 0.3], [1.25, 'label', 0.3, 0.3], [1.75, 'level_tick', 0.5, 0.3], [2.0, 'label', 0.3, 0]],
};
})();
