// S07 CENTRIFUGAL PUMP (15–19 s): the camera moves along the flow to the pump head and holds long enough to read it. The
// clear cone turns see-through: blood enters through the central inlet on top, the smooth rotor (a cone with low curved
// vanes, no sharp blades) spins it, and it leaves through the outlet at the rim. The rotor is turned through the wall by
// the magnetic coupling in the drive. Red cells ride the flow intact. Steady speed: the pump does not speed up because the
// camera moves in.
(() => {
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
const PU = WORLD.LY.pump;
// a cell's path: down the inlet, then spiralling out over the rotor, then out of the side port
const cellAt = (f, k) => {
  const { x, y, r, h } = PU;
  if (f < 0.18) { const q = f / 0.18; return [x, lerp(y - h - 10, y - h * 0.75, q)]; }
  if (f < 0.86) { const q = (f - 0.18) / 0.68, a = k * 2.1 + q * TAU * 1.6, rr = lerp(2, r * 0.92, q); return [x + Math.cos(a) * rr, y - h * 0.75 * (1 - q) - 1 + Math.sin(a) * rr * 0.28]; }
  const q = (f - 0.86) / 0.14; return [lerp(x + r * 0.9, x + r + 8, q), y + 2];
};
window.pumpCells = (c, cam, T, a = 1) => {
  for (let k = 0; k < 14; k++) {
    const f = ((T * 0.45 + k / 14) % 1), [x, y] = cellAt(f, k), [sx, sy] = K.S(cam, x, y), r = Math.max(1.2, 1.25 * cam.z);
    LIT.sphere(c, sx, sy, r, ['rc1', 'rc2', 'rc3', 'rc4', 'rc5'], { amb: 0.32, alpha: a });
    if (r > 2.5) PIX.rect(c, Math.round(sx) - 1, Math.round(sy), 2, 1, 'rc2');
  }
};
SC['s07_pump'] = {
  draw(c, t, S) {
    const cam = WORLD.track(S.t), cut = MO.smooth(clamp((t - 0.5) / 0.8));
    WORLD.scene(c, cam, S.t, { machine: { cut: { pump: cut, res: 1 } } });
    if (cut > 0.1) window.pumpCells(c, cam, S.t, cut);
    CAP.ctx(c, t, { text: 'Blood is pumped', t0: 1.0, t1: 3.7, acc: 'vb5' });
  },
  cues: [[0.0, 'glide', 0.5, 0.2, 0.9], [0.5, 'pump_reveal', 0.7, 0.1], [0.5, 'pump_whirr', 0.8, 0.1, 3.5]],
};
})();
