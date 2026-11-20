// S07 HEATING THE FILAMENT (24–28 s): the camera pushes to the cathode: the tungsten filament coil in its focusing cup.
// A current heats it from dull orange to a bright warm glow (no flame, nothing burns: it is in a vacuum); at the end the
// first cyan electrons leave its surface.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const COIL = { x: -21.4, y: 0 };
const camAt = t => { const q = MO.smooth(clamp((t - 0.05) / 2.4)); return K.zoomPath(window.S06.CAM, { x: COIL.x + 1.2, y: COIL.y + 0.4, z: 17 }, q); };
const heatAt = t => lerp(0.3, 1, MO.smooth(clamp((t - 1.2) / 1.8)));
window.S07 = { camAt, heatAt, COIL };
SC['s07_filament'] = {
  draw(c, t, S) {
    const cam = camAt(t), g = heatAt(t);
    K.cam(c, cam);
    TUBE.draw(c, { z: cam.z, t: S.t, cut: 1, spin: 1.2, fil: g, hv: 0 });
    c.setTransform(1, 0, 0, 1, 0, 0);
    // the heating current flowing through the coil (cyan dots along the wire)
    if (cam.z > 5) {
      const n = TUBE.COIL.length;
      for (let k = 0; k < 18; k++) { const idx = Math.floor(K.wrap(S.t * 0.13 + k / 18, 1) * (n - 1)), p = TUBE.COIL[idx]; if (p[2] < 0) continue; const [sx, sy] = K.S(cam, p[0], p[1]); FX.e(c, sx, sy, 1, 0.8); }
    }
    // the first electrons leave the hot surface (3.0 s on)
    for (let k = 0; k < 7; k++) {
      const t0 = 2.9 + k * 0.14, age = t - t0; if (age < 0) continue;
      const p = TUBE.COIL[Math.floor((0.15 + 0.1 * k) * (TUBE.COIL.length - 1))], dx = 0.35 + 0.9 * age, dy = (U.hash(k, 3) - 0.5) * 1.2 * age;
      const [sx, sy] = K.S(cam, p[0] + dx, p[1] + dy);
      if (age < 0.2) FX.flash(c, sx, sy, 4 * (1 - age / 0.2), 'c4', 1 - age / 0.2);
      FX.e(c, sx, sy, 2, 1, true);
    }
    CAP.ctx(c, t, { text: 'İSTİLİK → ELEKTRONLAR', t0: 0.5, t1: 3.6 });
  },
  cues: () => { const q = [[0.05, 'push_in', 0.6, 0, 2.4], [0.5, 'type', 0.4], [1.2, 'heat_hum', 0.8, -0.2, 2.6]]; for (let k = 0; k < 7; k++) q.push([2.9 + k * 0.14, 'e_release', 0.5, -0.2 + 0.06 * k, k]); return q; },
};
})();
