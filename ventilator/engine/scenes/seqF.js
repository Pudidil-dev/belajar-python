// SEQUENCE F — MICROSCOPIC GAS EXCHANGE (33–40 s): the alveoli fill and stretch elastically under the positive-pressure
// breath; across the thin alveolar-capillary barrier (fluid lining, type I epithelial cell, interstitium, endothelial cell)
// oxygen moves down its partial-pressure gradient into the plasma and a passing red blood cell, where it binds reversibly
// to the iron of a heme in hemoglobin; carbon dioxide diffuses the other way, into the alveolar gas. The ventilator does
// not push oxygen into the blood: diffusion does the last step. No bubbles enter the vessels.
(() => {
const clamp = U.clamp, lerp = U.lerp;
// S26 — the alveoli fill and stretch (33.0–34.625 s)
SC['s26_alveoli'] = {
  xin: 0.0625,
  draw(c, t, S) { const q = MO.sineInOut(clamp(t / 1.625)); AIR.acinus(c, { x: lerp(0, -36, q), y: lerp(-34, 24, q), z: K.zl(1.0, 2.3, q) }, S.t, { v: BREATH.v(S.t), flow: 1, mol: 1 }); },
  cues: [[0.0, 'elastic', 0.9, -0.2], [0.0, 'airflow_soft', 0.6, 0, 1.6]],
};
// S27 — the barrier, layer by layer; oxygen moves from the gas toward the blood (34.625–36.25 s)
SC['s27_membrane'] = {
  xin: 0.0625,
  draw(c, t, S) { const q = MO.sineInOut(clamp(t / 1.625)); AIR.barrier(c, { x: lerp(-30, 30, q), y: 14, z: K.zl(4.6, 5.4, q) }, S.t, { o2: 1, co2: 0.35, rbcX: 400 }); },
  cues: Array.from({ length: 12 }, (_, k) => [0.125 * (k + 1), 'crystal', 0.5 + 0.04 * (k % 4), ((k * 5) % 9) / 9 - 0.45, k]),
};
// S28 — a red blood cell passes; oxygen enters it and binds to hemoglobin (36.25–38.0 s)
const rbc28 = T => -70 + (T - 36.25) * 90;
const TB = 1.0;
SHOT.rbc28 = rbc28;
SC['s28_hemoglobin'] = {
  xin: 0.0625,
  draw(c, t, S) {
    const T = S.t;
    const track = cc => { const cam = { x: rbc28(T) - 6, y: 30, z: 3.4 }; AIR.barrier(cc, cam, T, { o2: 1, co2: 0.4, rbcX: rbc28(T) }); };
    const hb = cc => {
      const k = clamp((t - 0.75) / 0.25), cam = { x: lerp(10, -16, MO.smooth(k)), y: lerp(10, -14, MO.smooth(k)), z: K.zl(1.6, 2.6, MO.cubicOut(clamp((t - 0.7) / 0.6))) };
      PIX.rect(cc, 0, 0, 270, 480, 'rc0');
      for (let i = 0; i < 6; i++) { const x = (U.hash(i, 4) - 0.5) * 360, y = (U.hash(i, 5) - 0.5) * 600; if (Math.hypot(x, y) < 120) continue; MICRO.hb(cc, cam, x, y, 32, { a: 0.6, dim: true }); }
      const bound = clamp((t - TB) / 0.06), shift = MO.smooth(clamp((t - TB) / 0.6));
      MICRO.hb(cc, cam, 0, 0, 40, { shift, bound: [bound, 0, 0, 0], glint: [Math.max(0, 1 - Math.abs(t - TB - 0.1) / 0.2), 0, 0, 0], t: T });
      const H0 = MICRO.hbHeme(0, 0, 0, 40, 0);
      if (t < TB) { const q = MO.cubicIn(clamp((t - 0.7) / (TB - 0.7))), [px, py] = K.S(cam, lerp(H0[0] - 40, H0[0] + 2, q), lerp(H0[1] - 36, H0[1] - 5, q)); MICRO.o2(cc, px, py, 4.5, -1.1, { ramp: ['o22', 'o23', 'o24', 'o25', 'w'] }); }
      if (t >= TB && t < TB + 0.4) { const [hx, hy] = K.S(cam, H0[0], H0[1]), k2 = (t - TB) / 0.4; FX.ring(cc, hx, hy, 10 + 8 * MO.cubicOut(k2), 'hm4', 0.6 * (1 - k2)); }
    };
    if (t < 0.7) track(c); else if (t < 0.78) window.dissolve(c, track, hb, (t - 0.7) / 0.08); else hb(c);
  },
  cues: [[0.25, 'click_soft', 0.6, 0.1], [0.5, 'click_soft', 0.6, 0.3], [0.7, 'dive', 0.6, 0, 0.3], [TB, 'bind', 1.0, 0], [TB, 'shimmer', 0.8, 0.2]],
};
// S29 — the whole interface: oxygen in, carbon dioxide out, at the same time (38.0–40.0 s)
SC['s29_exchange'] = {
  xin: 0.0625,
  draw(c, t, S) { const q = MO.sineInOut(clamp(t / 2)); AIR.barrier(c, { x: lerp(-20, 30, q), y: lerp(16, 10, q), z: K.zl(2.6, 1.6, q) }, S.t, { o2: 1, co2: 1, rbcX: -100 + (S.t - 38) * 80 }); },
  cues: [[0.0, 'molecular', 0.7, 0, 2.0], [1.0, 'co2_out', 0.6, -0.3]],
};
})();
