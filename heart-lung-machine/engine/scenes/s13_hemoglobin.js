// S13 HEMOGLOBIN LOADS OXYGEN (37–42 s): the main molecular payoff. One hemoglobin molecule: four subunits (two alpha,
// two beta), each holding a heme. The camera dives to one heme; at 38.0 s (the downbeat of bar 19) the oxygen molecule
// settles, end-on, on the iron at its centre, and stays as an O2 pair. A small two-way arrow marks the binding as
// reversible. The protein shifts slightly. The camera pulls back: the four heme sites glint in turn; a second site takes
// up oxygen, the others stay free. The iron is unchanged (no rust, nothing used up).
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, hh = U.hash;
const SZ = 40, TB = 1.0;                                            // subunit offset; binding time (local)
const HM0 = MICRO.hbHeme(0, 0, 0, SZ, 0);
const camAt = t => {
  if (t < TB) { const q = MO.cubicInOut(clamp((t - 0.05) / 0.9)); return { x: lerp(0, HM0[0], q), y: lerp(0, HM0[1] - 2, q), z: K.zl(0.5, 6.4, q) }; }
  if (t < 2.2) return { x: HM0[0], y: HM0[1] - 2, z: 6.4 };
  const q = MO.k75(clamp((t - 2.2) / 1.0)); return { x: lerp(HM0[0], 0, q), y: lerp(HM0[1] - 2, 4, q), z: K.zl(6.4, 1.7, q) };
};
SC['s13_hemoglobin'] = {
  xin: 0.25,
  draw(c, t, S) {
    const cam = camAt(t), shift = MO.smooth(clamp((t - TB) / 0.8));
    // inside the red cell: a dark field, other hemoglobin molecules far behind
    PIX.rect(c, 0, 0, W, H, 'pl0'); PIX.glow(c, 135, 250, 260, 'pl2', 0.6);
    for (let k = 0; k < 7; k++) { const x = (hh(k, 4) - 0.5) * 420, y = (hh(k, 5) - 0.5) * 700; if (Math.hypot(x, y) < 110) continue; MICRO.hb(c, cam, x, y, SZ * 0.8, { a: 0.5, dim: true }); }
    const glint = [0, 1, 2, 3].map(k => { const tk = 3.25 + k * 0.18; return Math.max(0, 1 - Math.abs(t - tk) / 0.18); });
    const bound = [clamp((t - (TB - 0.05)) / 0.05), 0, 0, MO.smooth(clamp((t - 3.95) / 0.35))];
    MICRO.hb(c, cam, 0, 0, SZ, { shift, glint, bound, t: S.t });
    // the oxygen on its way in (before it binds)
    if (t < TB) { const q = MO.cubicIn(clamp(t / TB)), x = lerp(HM0[0] - 34, HM0[0] + 0.9 * SZ * 0.06, q), y = lerp(HM0[1] - 30, HM0[1] - SZ * 0.17 * 0.7, q), [px, py] = K.S(cam, x, y); MICRO.o2(c, px, py, Math.max(2, SZ * 0.17 * 0.36 * cam.z), -1.1, { ramp: ['ox1', 'ox2', 'ox3', 'ox4', 'ox5'] }); }
    // the moment of binding: a small contact ring at the iron
    if (t >= TB && t < TB + 0.4) { const [hx, hy] = K.S(cam, HM0[0], HM0[1]), k = (t - TB) / 0.4; FX.ring(c, hx, hy, 6 + 40 * MO.cubicOut(k), 'ox5', 1 - k); FX.ring(c, hx, hy, 3 + 26 * MO.cubicOut(k), 'hm4', 1 - k); }
    // reversible: two small half-arrows beside the bound oxygen, for a moment
    const ra = Math.sin(Math.PI * clamp((t - 1.2) / 1.3));
    if (ra > 0.05) { const [hx, hy] = K.S(cam, HM0[0], HM0[1]), x = hx + 30, y = hy - 30; c.save(); c.globalAlpha = ra; PIX.bline(c, x, y, x + 14, y, 'ox5'); PIX.bline(c, x + 14, y, x + 10, y - 3, 'ox5'); PIX.bline(c, x, y + 5, x + 14, y + 5, 'ox4'); PIX.bline(c, x, y + 5, x + 4, y + 8, 'ox4'); c.restore(); }
    CAP.ctx(c, t, { text: 'Hemoglobin\ncarries oxygen', t0: 0.4, t1: 4.7, acc: 'hb5' });
  },
  cues: [[0.05, 'dive', 0.7, 0, 0.9], [TB, 'bind', 1.0, 0], [TB, 'resolve', 0.9, 0, 2.0], [2.2, 'pull', 0.4, 0, 1.0], [3.25, 'site', 0.4, -0.4, 0], [3.43, 'site', 0.4, 0.4, 1], [3.61, 'site', 0.4, -0.3, 2], [3.79, 'site', 0.4, 0.3, 3], [3.95, 'bind_soft', 0.6, 0.3]],
};
})();
