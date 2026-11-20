// S08 THERMIONIC EMISSION (28–32 s): one of the electrons leaving the hot coil is selected: a cyan tracking ring locks
// onto it and the camera follows it a short way out of the electron cloud that hovers in front of the cup, toward the
// anode (off screen right). The heat frees electrons already in the metal; it does not create them.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, h = U.hash;
const COIL = { x: -21.4, y: 0 };
// the emitted electrons: born on the coil surface at staggered times, drifting out and gathering in a cloud
const ELS = [];
for (let k = 0; k < 36; k++) ELS.push({ t0: -1 + k * 0.11, i: Math.floor(h(k, 1) * 0.999 * 200), dy: (h(k, 2) - 0.5) * 2.4, sel: k === 15 });
const coilP = i => TUBE.COIL[Math.floor(i / 200 * (TUBE.COIL.length - 1))];
const elPos = (e, t) => {
  const p = coilP(e.i), age = Math.max(0, t - e.t0);
  const out = 1 - Math.exp(-age / 0.9), x = p[0] + 0.3 + 2.6 * out + (e.sel ? 2.2 * MO.smooth(clamp((t - 1.6) / 2.2)) : 0), y = p[1] + e.dy * out + (K.vn3(e.i, 1.3, t * 1.4, 7) - 0.5) * 0.4;
  return [x, y];
};
const SEL = ELS.find(e => e.sel);
const camAt = t => {
  const base = window.S07.camAt(4), [sx, sy] = elPos(SEL, t), f = MO.smooth(clamp((t - 1.0) / 2.6));
  return { x: lerp(base.x, sx - 0.6, f), y: lerp(base.y, sy, f), z: lerp(base.z, 22, MO.smooth(clamp(t / 1.2))) };
};
window.S08 = { camAt, elPos, SEL };
SC['s08_emission'] = {
  draw(c, t, S) {
    const cam = camAt(t);
    K.cam(c, cam);
    TUBE.draw(c, { z: cam.z, t: S.t, cut: 1, spin: 1.2, fil: 1, hv: 0 });
    c.setTransform(1, 0, 0, 1, 0, 0);
    for (const e of ELS) {
      if (t < e.t0) continue;
      const [x, y] = elPos(e, t), [sx, sy] = K.S(cam, x, y), age = t - e.t0;
      if (age < 0.2) FX.flash(c, sx, sy, 4 * (1 - age / 0.2), 'c4', 1 - age / 0.2);
      if (e.sel) { const tr = []; for (let j = 0; j < 10; j++) { const [qx, qy] = elPos(e, Math.max(e.t0, t - j * 0.05)); tr.push(K.S(cam, qx, qy)); } FX.trail(c, tr, 0.9); }
      FX.e(c, sx, sy, e.sel ? 3 : 2, 1, e.sel);
    }
    // the tracking ring locks on at 0.7 s and follows
    const [rx, ry] = K.S(cam, ...elPos(SEL, t)), lk = MO.backOut(clamp((t - 0.7) / 0.35), 2);
    if (t > 0.7) { const r = lerp(22, 10, lk); FX.ring(c, rx, ry, r, 'c4', 1); FX.ring(c, rx, ry, r + 1, 'c2', 0.6); }
    CAP.ctx(c, t, { text: 'TERMOELEKTRON EMİSSİYASI', t0: 0.4, t1: 3.6 });
  },
  cues: () => { const q = [[0.4, 'type', 0.4], [0.7, 'lock', 0.9, -0.1], [1.0, 'track', 0.6, 0, 2.8], [0, 'heat_hum', 0.5, -0.2, 4]]; for (let k = 0; k < 8; k++) q.push([0.25 + k * 0.5, 'e_release', 0.35, -0.3 + 0.08 * k, k]); return q; },
  xin: 0.25,
};
})();
