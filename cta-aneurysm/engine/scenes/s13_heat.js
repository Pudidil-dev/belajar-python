// S13 MOST ENERGY BECOMES HEAT (48–52 s): pull back out of the lattice to the target: many electrons pour into the focal
// spot of the spinning anode disc; orange heat spreads and is carried round the track by the rotation; a few photons
// leave. A teaching bar splits the energy: almost all heat, a sliver X-rays (about 99 % to 1 %, no numbers on screen).
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU, h = U.hash, AX = TUBE.AX;
const camD = t => { const p = MO.expoOut(clamp((t - 0.25) / 1.4)); return { x: lerp(0, -12, p), y: lerp(2, -26, p), z: K.zl(34, 2.15, p) }; };
const phiAt = t => 1.0 * (1 - MO.sineInOut(clamp((t - 2.6) / 1.2))) * 0 + 1.0;
function drawDisc(c, t, phi, S) {
  const sp = Math.sin(phi), xc = 0, w = S.t * 2.2;
  const E = (r, th) => [xc + r * Math.cos(th) * sp, AX + r * Math.sin(th)];
  const ell = (r, col) => { c.beginPath(); c.ellipse(xc, AX, Math.max(0.01, r * sp), r, 0, 0, TAU); c.fillStyle = P[col]; c.fill(); };
  ell(51, 'g4'); ell(50, 'g6');
  const N = 96, heat = MO.smooth(clamp((t - 0.5) / 1.2));
  for (let k = 0; k < N; k++) {
    const th0 = k / N * TAU, th1 = (k + 1) / N * TAU, mid = (th0 + th1) / 2, d = K.wrap(mid - Math.PI / 2 - w * 0.0, TAU), T = (Math.exp(-d / 1.25) + 0.12) * heat;
    const col = T > 0.9 ? 'y4' : T > 0.68 ? 'y3' : T > 0.5 ? 'o1' : T > 0.36 ? 'o0' : T > 0.25 ? 'r2' : T > 0.18 ? 'r1' : 'g8';
    const pq = [E(35, th0), E(45, th0), E(45, th1), E(35, th1)];
    c.beginPath(); pq.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = P[col]; c.fill();
  }
  for (let k = 0; k < 10; k++) { const th = k / 10 * TAU + w; const [x0, y0] = E(14, th), [x1, y1] = E(31, th); PIX.line(c, x0, y0, x1, y1, 'g5', 0.8 / Math.max(0.3, sp)); }
  ell(9, 'g4'); ell(5, 'g3');
  FX.glowW(c, xc, 0, 7, ['r2', 'o0', 'o1', 'y3', 'y4'], heat, 1.5);
}
function drawLat(c, t, S) { const cam = { ...window.BREMS.CAM(), z: K.zl(3.4, 1.2, MO.cubicIn(clamp(t / 0.35))) }; TW.draw(c, cam, S.t, { vib: 1.5, gain: 0.8, heat: 0.7 }); }
function drawView(c, t, S) {
  const cam = camD(t), phi = 1.0, cp = Math.cos(phi);
  K.cam(c, cam); c.scale(cp, 1);
  TUBE.draw(c, { z: cam.z, t: S.t, cut: 1, spin: 1.2, fil: 1, hv: 1, heat: 0, noDisc: true, coll: true });
  K.cam(c, cam);
  drawDisc(c, t, phi, S);
  c.setTransform(1, 0, 0, 1, 0, 0);
  const [x0, y0] = K.S(cam, -15 * cp, 0), [x1, y1] = K.S(cam, 0, 0);
  for (let k = 0; k < 18; k++) { const q = K.wrap(S.t * 2.6 + k / 18, 1); FX.e(c, lerp(x0, x1, q * q), lerp(y0, y1, q * q) + Math.sin(k * 7) * 1.5, 1, 1); }
  for (let k = 0; k < 9; k++) {
    const t0 = 0.9 + k * 0.32, age = t - t0; if (age < 0 || age > 1.6) continue;
    const ang = Math.PI / 2 + (h(k, 11) - 0.5) * 1.2, d = age * 40, [sx, sy] = K.S(cam, Math.cos(ang) * d, Math.sin(ang) * d);
    FX.ph(c, sx, sy, ang, 4.5, 11, 3, clamp(age / 0.08) * clamp((1.6 - age) / 0.2));
  }
}
SC['s13_heat'] = {
  draw(c, t, S) {
    const k = clamp((t - 0.15) / 0.3);
    if (k <= 0) drawLat(c, t, S); else if (k >= 1) drawView(c, t, S); else dissolve(c, cc => drawLat(cc, t, S), cc => drawView(cc, t, S), k);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const ba = MO.smooth(clamp((t - 1.5) / 0.25));
    if (ba > 0) {
      const x = 40, y = 540, w = 280, f = MO.cubicOut(clamp((t - 1.5) / 0.7));
      c.save(); c.globalAlpha = ba;
      PIX.rect(c, x - 3, y - 3, w + 6, 16, 'k');
      PIX.rect(c, x, y, Math.round((w - 3) * f), 10, 'o0'); PIX.rect(c, x, y, Math.round((w - 3) * f), 2, 'o1');
      PIX.rect(c, x + w - 3, y, 3, 10, 'y3');
      FX.heat(c, x + w * 0.5 * f, y - 2, 18, f * 0.6, S.t, 3);
      c.restore();
    }
    CAP.ctx(c, t, { text: 'ENERJİNİN ÇOXU — İSTİLİK', t0: 0.6, t1: 3.6 });
  },
  cues: [[0.15, 'pull_back', 0.8, 0, 1.4], [0.5, 'heat_swell', 0.9, 0, 2.2], [0.6, 'type', 0.4], [1.5, 'bar_fill', 0.6, 0], [0.9, 'photon', 0.35, 0.2], [1.54, 'photon', 0.35, -0.2], [2.18, 'photon', 0.35, 0.3], [2.82, 'photon', 0.35, -0.1]],
};
})();
