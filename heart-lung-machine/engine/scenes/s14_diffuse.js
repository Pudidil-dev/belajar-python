// S14 OXYGEN CROSSES THE MEMBRANE (45–49 s): a small piece of the fibre wall, magnified. Gas side on the left (many oxygen
// molecules), blood side on the right (plasma, the edge of a red cell). The molecules move at random; on balance more cross
// toward the blood, where there are fewer of them (the partial-pressure gradient), than come back. The membrane stays
// whole; no cell crosses it; no bubbles form. One oxygen molecule is followed across the boundary. Labels: gas side,
// membrane, blood side, O2.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp, hh = U.hash, R = n => window.RAMP[n];
const M0 = -14, M1 = 14;
// the followed molecule (world): jittering on the gas side, slow inside the membrane, then out into the plasma
window.trackO2 = t => {
  const [jx, jy] = MICRO.jit(99, t, 2.2);
  let x;
  if (t < 1.4) x = lerp(-96, M0 - 4, MO.smooth(clamp((t - 0.2) / 1.2)));
  else if (t < 2.5) x = lerp(M0 - 4, M1 + 4, MO.smooth((t - 1.4) / 1.1));
  else x = lerp(M1 + 4, 96, MO.sineInOut(clamp((t - 2.5) / 1.5)));
  return [x + jx * (t > 1.4 && t < 2.5 ? 3 : 10), 18 + jy * 14];
};
window.membraneView = (c, cam, T, lt, o = {}) => {
  const z = cam.z, [mx0] = K.S(cam, M0, 0), [mx1] = K.S(cam, M1, 0);
  // the two compartments
  MICRO.plasma(c, cam, T, { dir: 1 });
  MICRO.gas(c, 0, Math.max(0, Math.round(mx0)), T);
  // the edge of a red cell on the far blood side (cells stay in the blood)
  MICRO.rbc(c, cam, 150, -120, 70, 46, -0.4, { a: 1 });
  // the membrane: a solid polymer wall, lit as a slab, with a faint chain texture one step darker
  LIT.shape(c, ctx => { ctx.fillRect(mx0, 0, mx1 - mx0, H); }, [mx0 - 1, -1, mx1 + 1, H + 1], R('iv'), { amb: 0.32, dif: 0.6, cylX: true, edge: false });
  for (let k = 0; k < 40; k++) { const y = ((hh(k, 2) * 520 - 20) | 0), x = mx0 + 3 + hh(k, 3) * (mx1 - mx0 - 8); PIX.bline(c, x, y, x + 3, y + 3, 'iv2'); }
  // the gradient, shown by a few slow chevrons pointing toward the blood
  for (let k = 0; k < 3; k++) { const y = 120 + k * 120, ph = ((T * 0.6 + k * 0.33) % 1), x = lerp(mx0 - 26, mx1 + 26, ph), a = Math.sin(Math.PI * ph) * (o.guides ?? 1); if (a < 0.2) continue; c.save(); c.globalAlpha = a * 0.8; for (const s of [-1, 1]) PIX.bline(c, x, y, x - 5, y + s * 5, 'ox3'); c.restore(); }
  // the molecules: random walks with a small net drift toward the blood; they thin out on the blood side (taken up)
  if (o.o2 !== false) for (let k = 0; k < 64; k++) {
    const u = hh(k, 21), x0 = -170 + 300 * Math.pow(u, 1.5), y0 = (hh(k, 22) - 0.5) * 560, [jx, jy] = MICRO.jit(k, T, 1.4);
    let x = x0 + T * 6 + jx * 46; x = ((x + 170) % 320 + 320) % 320 - 170;
    const y = y0 + jy * 40, a = x < M1 ? 1 : clamp(1 - (x - M1) / 110);
    if (a <= 0.05) continue;
    const [px, py] = K.S(cam, x, y); if (px < -8 || px > W + 8) continue;
    MICRO.o2(c, px, py, 3.3 * z, (hh(k, 23) - 0.5) * 4 + jy * 2, { a });
  }
};
SC['s14_diffuse'] = {
  xin: 0.5,
  draw(c, t, S) {
    const [tx, ty] = window.trackO2(t), cam = { x: lerp(-30, 60, MO.sineInOut(clamp((t - 0.6) / 3.2))), y: 10, z: lerp(0.7, 1.1, MO.cubicOut(clamp(t / 0.9))) };
    window.membraneView(c, cam, S.t, t);
    const [px, py] = K.S(cam, tx, ty);
    MICRO.o2(c, px, py, 3.6 * cam.z, -0.5, { ramp: ['ox1', 'ox2', 'ox3', 'ox4', 'ox5'] });
    MICRO.tag(c, px, py, 8 * cam.z, S.t, 'ox5');
    const [mx0] = K.S(cam, -14, 0), [mx1] = K.S(cam, 14, 0);
    CAP.part(c, t, { text: 'GAS SIDE', ax: null, x: Math.max(6, mx0 - 70), y: 96, t0: 0.6, t1: 3.85, col: 'ox4' });
    CAP.part(c, t, { text: 'BLOOD SIDE', ax: null, x: Math.min(W - 64, mx1 + 14), y: 96, t0: 0.85, t1: 3.85, col: 'rc5' });
    CAP.part(c, t, { text: 'MEMBRANE', ax: (mx0 + mx1) / 2, ay: 410, x: (mx0 + mx1) / 2 + 18, y: 430, t0: 1.1, t1: 3.85, col: 'iv5', lineCol: 'iv3' });
    CAP.part(c, t, { text: 'O₂', ax: px, ay: py - 9 * cam.z, x: px, y: py - 34 * cam.z, t0: 1.4, t1: 3.85, col: 'ox5', lineCol: 'ox3', align: 'center', dot: false });
    CAP.scene(c, t, { title: 'OXYGEN DIFFUSES IN', ctx: 'More crosses in than out.', t0: 0.3, t1: 3.92, acc: 'ox4' });
  },
  cues: [[0.0, 'scale_in', 0.8, 0], [0.4, 'granular', 0.6, -0.4, 3.4], [0.6, 'label', 0.3, -0.5], [0.85, 'label', 0.3, 0.5], [1.1, 'label', 0.3, 0], [1.4, 'cross', 0.7, 0], [2.5, 'cross_out', 0.6, 0.3]],
};
})();
