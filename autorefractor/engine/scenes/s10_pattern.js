// S10 A MEASUREMENT PATTERN (27–30 s): the image sensor, seen edge-on at the end of S09 with two bright points on it,
// turns to face us. The two points were the two sides of a ring: on the grid of pixels the returning light forms a thin
// ring, which clears out of faint noise as the exposure builds. (Magenta = the returning light, as before; the sensor is
// monochrome.) The camera then pushes in toward one arc of the ring, down to single pixels.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const CY = 336, ARC = [50.5, 31.5];
// the mosaic's mapping in film time: {cx, cy, s, fx, fy}
window.senMap = t => {
  const q = MO.sineInOut(clamp((t - 2.0) / 1.0)), z = K.zoomPath({ x: 32, y: 32, z: 4 }, { x: ARC[0], y: ARC[1], z: 11 }, q);
  return { cx: 180, cy: lerp(CY, 330, q), s: z.z, fx: z.x, fy: z.y };
};
SC['s10_pattern'] = {
  draw(c, t, S) {
    const T = S.t, k = MO.k75(clamp((t - 0.08) / 0.82)), half = SEN.dieHalf(4);
    const e = 0.1 + 0.9 * MO.smooth(clamp((t - 0.875) / 1.0));
    PIX.rect(c, 0, 0, W, H, 'n0');
    if (k < 1) {
      // the cutaway at the end of S09, sinking into the dark while the chip tilts up out of it
      const cam = DIAG.SENSOR;
      DIAG.draw(c, cam, { t: 27, lamp: 1, fix: 6, fixA: 0.25, src: 1, out: 99, outA: 0.6, w: 2, back: 99, spots: 1 - k });
      K.dith(c, 0, 0, W, H, 'n0', k);
      const [sx, sy] = K.S(cam, OPT.L.BS, OPT.L.SENS + 0.2);
      SEN.tilt(c, { cx: lerp(sx, 180, k), cy: lerp(sy, CY, k), hw: lerp(4.2 * cam.z, half, k), hh: lerp(2, half, k), e: 0.1, edge: 1 - k });
    } else {
      const M = window.senMap(t);
      window.beatGlow(c, T, 180, CY);
      SEN.die(c, M.cx + (32 - M.fx) * M.s, M.cy + (32 - M.fy) * M.s, M.s);
      SEN.grid(c, { ...M, mode: 'light', e });
    }
    CAP.ctx(c, t, { text: 'A measurement pattern', t0: 0.4, t1: 2.7, acc: 'm3' });
  },
  cues: [[0.08, 'chip_turn', 0.8, 0, 0.82], [0.4, 'type', 0.4], [0.875, 'acquire', 1.0, 0, 1.0], [2.0, 'push', 0.5, 0.2, 1.0]],
};
})();
