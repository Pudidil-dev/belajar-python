// S09 BACK TO THE SENSOR (24–27 s): the camera follows the returning magenta guides out of the eye. They leave through a
// ring-shaped zone of the pupil (seen from the side: two pairs of guides, above and below the incoming beam), re-enter
// the instrument through the window, go through the mirror that turned the balloon's light, are turned down by the beam
// splitter, pass the relay lens and the ring lens, and land on the image sensor as two bright points — the two sides of a ring.
(() => {
const clamp = U.clamp, lerp = U.lerp;
SC['s09_sensor'] = {
  draw(c, t, S) {
    const T = S.t, cam = DIAG.track(T), F = DIAG.fronts(T);
    const spots = MO.smooth(clamp((T - 26.75) / 0.2));
    DIAG.draw(c, cam, { t: T, lamp: 1, fix: 6, fixA: 0.25, src: 1, out: 99, outA: 0.6, w: cam.z > 9 ? 2 : 1, back: F.back, spots,
      under: (c2, cam2) => window.scatterFan(c2, cam2, T, 21.875, 1 - MO.smooth(clamp(t / 0.6))) });
    if (t < 1.2) window.retSpot(c, cam, T, 21.875);
    if (T >= 26.75 && T < 27) { const [sx, sy] = K.S(cam, OPT.L.BS, OPT.L.SENS); for (const s of [-1, 1]) FX.ring(c, sx + s * OPT.L.RSPOT * cam.z, sy, (T - 26.75) * 70, 'm3', 1 - (T - 26.75) / 0.25); }
    CAP.ctx(c, t, { text: 'Back to the sensor', t0: 0.3, t1: 2.7, acc: 'm3' });
  },
  cues: [[0.0, 'pull', 0.6, 0, 0.9], [0.3, 'type', 0.4], [0.2, 'return_run', 0.9, -0.3, 2.5], [0.875, 'tick', 0.5, -0.2], [1.75, 'turn', 0.7, 0.3], [2.75, 'sensor_hit', 1.0, 0.2]],
};
})();
