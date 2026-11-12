// S06 THE RESERVOIR (12–15 s): the camera pushes from the diagram into the hard-shell venous reservoir, seen through its
// clear shell. Blood comes in at the top, runs down the inlet tube into the filter sock, settles into a pool with a steady
// working level, and leaves through the outlet at the bottom, always under the surface. No foam, no splashing. The level
// sensor on the outside wall lights once as the camera arrives (a quiet tick, no alarm). Then the view follows the flow
// down toward the outlet and the pump.
(() => {
const clamp = U.clamp, lerp = U.lerp;
const RS = WORLD.LY.res;
// one particle path through the reservoir (world): down the inlet tube, through the sock, down through the pool, out
const PATHS = [0, 1, 2, 3].map(k => WORLD.smooth([[RS.x + 10, RS.y - 8], [RS.x + 11, RS.y + 8], [RS.x + 13, RS.y + 30], [RS.x + 14 + k * 4, RS.y + 46], [RS.x + 16 + k * 3, MACHINE.LEVEL + 10], [RS.x + 18 + k * 2, RS.y + 74], [RS.x + RS.w / 2 - 1, RS.y + 88], [RS.x + RS.w / 2 - 1, RS.y + 98]], 1.5));
PATHS.forEach(p => p.S = WORLD.lens(p));
window.resParticles = (c, cam, T) => {
  PATHS.forEach((p, k) => {
    const L = p.S.at(-1);
    for (let j = 0; j < 4; j++) {
      const d = ((T * 22 + k * 11 + j * L / 4) % L), [x, y] = WORLD.at(p, p.S, d), [sx, sy] = K.S(cam, x, y);
      const inPool = y > MACHINE.LEVEL + 1, r = Math.max(1, 1.1 * cam.z);
      LIT.sphere(c, sx, sy, r, inPool ? ['vb2', 'vb3', 'vb4', 'vb5'] : ['vb3', 'vb4', 'vb5', 'rc4'], { amb: 0.4, edge: false });
    }
  });
};
SC['s06_reservoir'] = {
  draw(c, t, S) {
    const cam = WORLD.track(S.t), led = Math.max(0, 1 - Math.abs(t - 1.75) / 0.35);
    WORLD.scene(c, cam, S.t, { machine: { cut: { res: MO.smooth(clamp((t - 0.6) / 0.8)) }, led } });
    if (cam.z > 1.4) window.resParticles(c, cam, S.t);
    CAP.ctx(c, t, { text: 'Reservoir', t0: 1.3, t1: 2.7, acc: 'vb5' });
  },
  cues: [[0.0, 'push', 0.6, -0.3, 1.3], [1.375, 'res_fluid', 0.6, -0.4, 1.6], [1.75, 'level_tick', 0.5, -0.2]],
};
})();
