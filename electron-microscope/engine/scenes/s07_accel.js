// S07 · 0:38–0:45 — ACCELERATING ELECTRONS. The beam enters the accelerator: eight ring electrodes stepping from
// −200 kV at the top to ground, held apart by ceramic insulators. The electric field between them points up, so it
// pushes the (negative) electrons down. The camera locks onto one electron: at every gap it gains 25 keV, its trail
// stretches and the rings stream past faster — 200 keV and about 70% of the speed of light at the bottom.
(() => {
const { W, H } = PIX;
const X = LAB.AX, Y = COL.Y;
const T_LOCK = 0.9, T_RIDE = 1.15, T_END = 5.4;
// the representative electron: velocity rises roughly sixfold through the tube (relativistic v grows less than √E)
const Z0 = -250.6, Z1 = -221;                                                 // its path (cm)
const yAt = lt => {
  if (lt < T_RIDE) return Z0 + (lt - 0) * 0.4;
  const u = U.clamp((lt - T_RIDE) / (T_END - T_RIDE)), D = Z1 - (Z0 + T_RIDE * 0.4);
  return Z0 + T_RIDE * 0.4 + D * (u + 2.2 * u * u) / 3.2;                    // v ∝ 1 + 4.4u: about ×5 by the end
};
const gapY = k => COL.accY(k) + 1.55;                                         // mid-gap below electrode k
const CROSS = (() => { const out = []; for (let k = 0; k < 8; k++) { let a = 0, b = 7; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (yAt(m) < gapY(k)) a = m; else b = m; } out.push(+((a + b) / 2).toFixed(3)); } return out; })();
const keV = lt => { let e = 4; for (let k = 0; k < 8; k++) e += 25 * MO.smooth(U.clamp((lt - CROSS[k] + 0.06) / 0.12)); return Math.min(200, e - 4 + 4 * (1 - U.clamp((lt - CROSS[7]) / 0.2))); };
const beta = E => { const g = 1 + E / 511; return Math.sqrt(1 - 1 / (g * g)); };
const camAt = lt => {
  const a = SC.s06_emission.camAt(8);
  const yE = yAt(lt), lock = MO.smooth(U.clamp((lt - 0.2) / (T_LOCK - 0.2)));
  const z = CAM.zlerp(a.z, 8.5, lock) * (lt > T_END ? 1 - 0.2 * MO.smooth(U.clamp((lt - T_END) / 1.2)) : 1);
  return { x: X - 6 * lock, y: U.lerp(a.y, yE + 4, lock), z };
};
SC.s07_accel = {
  camAt,
  draw(c, lt) {
    const T = 38 + lt, cam = camAt(lt);
    LAB.back(c, cam, T);
    COL.draw(c, cam, T, { airlock: 1, volts: true, glow: 0.6, hot: { c1: 0.3, c2: 0.3, obj: 0.3 } });
    // field arrows in each gap (pointing up: from ground toward −200 kV); the force on electrons points down
    for (let k = 0; k < 8; k++) {
      const [gx, gy] = K.S(cam, X - 8, gapY(k)), [gx2] = K.S(cam, X + 8, 0);
      const pulse = U.clamp(1 - Math.abs(lt - CROSS[k]) / 0.25);
      for (const xx of [gx, gx2]) { PIX.bline(c, xx, gy + 4, xx, gy - 4, pulse > 0.2 ? 'y3' : 'u1'); PIX.bline(c, xx, gy - 4, xx - 2, gy - 2, pulse > 0.2 ? 'y3' : 'u1'); PIX.bline(c, xx, gy - 4, xx + 2, gy - 2, pulse > 0.2 ? 'y3' : 'u1'); }
    }
    // the stream of electrons, and the one the camera rides
    const [sx] = K.S(cam, X, 0);
    for (let i = 0; i < 40; i++) {
      const ph = K.wrap(lt * 0.22 + i / 40, 1), y = U.lerp(-251, -219, ph * ph);
      const [, yy] = K.S(cam, X, y); if (yy < -4 || yy > H + 4) continue;
      FX.e(c, sx + (U.hash(i, 2) - 0.5) * 3, yy, 1, 0.8);
    }
    const yE = yAt(lt), [ex, ey] = K.S(cam, X, yE), E = keV(lt), b = beta(E);
    const tl = 6 + b * 60, tail = []; for (let q = 0; q <= 6; q++) tail.push([ex, ey - tl * q / 6]);
    FX.trail(c, tail, 1, ['c3', 'c2', 'c2', 'c1', 'c1', 'c0']); FX.e(c, ex, ey, 3, 1, true);
    for (let k = 0; k < 8; k++) { const a = lt - CROSS[k]; if (a > 0 && a < 0.25) { FX.ring(c, ex, ey, 4 + a * 70, 'y3', 1 - a / 0.25); FX.flash(c, ex, ey, 5, 'y4', 1 - a / 0.25); } }
    if (lt > T_LOCK - 0.3) SC.cursor(c, ex, ey, 9, U.clamp((lt - T_LOCK + 0.3) / 0.2), lt, 'c3');
    // meters (right): energy and speed
    const kM = U.clamp((lt - 0.6) / 0.3);
    if (kM > 0) {
      const x0 = W - 104, y0 = 104;
      PIX.rect(c, x0 - 4, y0 - 6, 100, 66, 'k', kM); PIX.rect(c, x0 - 4, y0 - 6, 100, 1, 'g4', kM);
      FX.meter(c, x0, y0, 90, E / 200, 'ENERGY', `${Math.round(E)} keV`, 'y3', kM);
      FX.meter(c, x0, y0 + 26, 90, b, 'SPEED', `${b.toFixed(2)} c`, 'c3', kM);
      PIX.text(c, 'c = SPEED OF LIGHT', x0, y0 + 48, 'g6', { shadow: null });
    }
    // labels
    const [tx, ty] = K.S(cam, X - 13, COL.accY(0)), [bx, by] = K.S(cam, X - 13, -221);
    CAP.note(c, lt, { text: '-200 kV', x: 14, y: ty + 18, ax: tx, ay: ty, t0: 0.4, t1: 2.6, col: 'w', lineCol: 'g6', box: true });
    CAP.note(c, lt, { text: 'E-FIELD PUSHES ELECTRONS DOWN', x: 12, y: 404, t0: 1.6, t1: 4.6, col: 'y4', box: true });
    if (lt > 3.4) CAP.note(c, lt, { text: 'GROUND (0 V)', x: 14, y: by + 16, ax: bx, ay: by, t0: 3.6, t1: 6.6, col: 'w', lineCol: 'g6', box: true });
    CAP.scene(c, lt, { title: 'ELECTRON ACCELERATION', ctx: ['ACCELERATING VOLTAGE: 200 kV'], t0: 0.25, acc: 'y3' });
    CAP.note(c, lt, { text: '200 keV = 70% OF LIGHT SPEED', x: W / 2, y: 418, t0: T_END + 0.15, col: 'c4', box: true, align: 'center' });
  },
  cues: () => [[0.0, 'glide', 0.8, 0, 0.9], [0.25, 'title_hit', 0.7], [T_LOCK - 0.3, 'lock_click', 0.8], [T_RIDE, 'accel_sweep', 1, 0, T_END - T_RIDE + 0.3],
    ...CROSS.map((t, k) => [t, 'kick', 1, (k % 2 ? 0.25 : -0.25), k]), [T_END + 0.15, 'confirm', 0.8]],
};
})();
