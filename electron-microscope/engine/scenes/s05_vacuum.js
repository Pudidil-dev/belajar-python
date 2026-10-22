// S05 · 0:23–0:30 — CREATING A VACUUM. A fast pull-back out of the film to the whole column; the airlock seals behind
// the holder. The pumps run (the turbo pump's rotor spins up, the ion pumps glow); the air inside the column — a crowd
// of bouncing gas molecules that bump into each other — thins out and the collisions die away while the gauge falls
// from 1 atm (10⁵ Pa) to 10⁻⁵ Pa: ten billion times fewer molecules, but not empty. Then the camera rises along the
// cleared beam path to the gun at the top, where the ion pumps hold about 10⁻⁹ Pa.
(() => {
const { W, H } = PIX;
const X = LAB.AX, Y = COL.Y;
const T_OUT = 1.0, T_SEAL = 1.05, T_PUMP0 = 1.4, T_PUMP1 = 5.6, T_RISE = 5.9;
const evac = lt => MO.smooth(U.clamp((lt - T_PUMP0) / (T_PUMP1 - T_PUMP0)));          // 0 → 1
const pLog = lt => 5 - 10 * evac(lt);                                                  // log10 Pa
// molecules: each bounces inside one interior space of the column; each is pumped away at its own time
const MOL = (() => {
  const r = U.rng(23), out = [];
  const area = COL.VOIDS.map(([x0, y0, x1, y1]) => (x1 - x0) * (y1 - y0)), tot = area.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 520; i++) {
    let q = r() * tot, k = 0; while (q > area[k]) q -= area[k++];
    const [x0, y0, x1, y1] = COL.VOIDS[k];
    out.push({ k, x0, y0, x1, y1, px: r(), py: r(), vx: (r() - 0.5) * 2, vy: (r() - 0.5) * 2, die: r(), ang: r() * Math.PI });
  }
  return out;
})();
const tri = (u) => { const f = K.wrap(u, 2); return f < 1 ? f : 2 - f; };            // reflecting walls
function molPos(m, t) {
  const sp = 22;                                                                       // cm per s (slowed for the eye)
  return [m.x0 + (m.x1 - m.x0) * tri(m.px + m.vx * sp * t / Math.max(2, m.x1 - m.x0)), m.y0 + (m.y1 - m.y0) * tri(m.py + m.vy * sp * t / Math.max(2, m.y1 - m.y0))];
}
const alive = (m, lt) => m.die < Math.pow(10, -2.4 * evac(lt)) + 0.004;
// camera
const camAt = lt => {
  const full = { x: X + 4, y: -166, z: 1.72 };
  if (lt < T_OUT) return null;                                                          // still in the reverse dive
  if (lt < 2.0) { const p = MO.cubicOut((lt - T_OUT) / 1.0); return { x: U.lerp(X, full.x, p), y: U.lerp(Y.spec, full.y, p), z: CAM.zlerp(6.2, full.z, p) }; }
  if (lt < T_RISE) return { x: full.x, y: full.y - (lt - 2) * 1.5, z: full.z * (1 + (lt - 2) * 0.012) };
  const a = { x: full.x, y: full.y - (T_RISE - 2) * 1.5, z: full.z * (1 + (T_RISE - 2) * 0.012) }, p = MO.cubicInOut(U.clamp((lt - T_RISE) / (7 - T_RISE)));
  return { x: U.lerp(a.x, X, p), y: U.lerp(a.y, -252, p), z: CAM.zlerp(a.z, 4.6, p) };
};
// the reverse dive: back out of the film to the holder tip (fov in metres)
const fovBack = lt => Math.exp(Math.log(9.6e-9) + (Math.log(W / (6.2 * COL.TIPK * 10) * 1e-3) - Math.log(9.6e-9)) * MO.cubicIn(U.clamp(lt / T_OUT)));
// the turbo pump's rotor (cut), spinning up; the ion pumps' faint glow
function pumps(c, cam, lt) {
  const run = U.clamp((lt - T_PUMP0 + 0.2) / 1.2), [x0, y0] = K.S(cam, X + 51.5, -42), [x1, y1] = K.S(cam, X + 64.5, -16);
  PIX.rect(c, Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0), 'k');
  const n = 6, hh = (y1 - y0) / n, sp = lt * (2 + 30 * run * run);
  for (let k = 0; k < n; k++) {
    const yy = Math.round(y0 + k * hh + hh * 0.3);
    PIX.rect(c, Math.round(x0), yy + Math.round(hh * 0.4), Math.round(x1 - x0), 1, 'g5');
    for (let b = 0; b < 6; b++) { const xx = x0 + K.wrap(sp * (k % 2 ? 1 : -1) * 6 + b * (x1 - x0) / 6, x1 - x0); PIX.bline(c, xx, yy, xx + hh * 0.35, yy + hh * 0.5, 'g8'); }
  }
  PIX.rect(c, Math.round((x0 + x1) / 2), Math.round(y0), 1, Math.round(y1 - y0), 'g6');
  const g = U.clamp((lt - T_PUMP0) / 1.5) * (0.6 + 0.2 * Math.sin(lt * 9));
  for (const [ix, iy] of [[X - 34, -132], [X - 29, -257]]) { const [sx, sy] = K.S(cam, ix, iy); FX.glowL(c, sx, sy, 6 + 10 * cam.z, ['m0', 'm1', 'm2'], 0.55 * g); }
}
// pressure gauge (screen space, left edge): a log scale from 10⁵ to 10⁻¹⁰ Pa
function gauge(c, lt, a = 1) {
  if (a <= 0) return;
  const x = 16, yTop = 110, yBot = 380, lg = pLog(lt), y = U.lerp(yTop, yBot, (5 - lg) / 15);
  c.save(); c.globalAlpha = a;
  PIX.rect(c, x - 6, yTop - 22, 58, yBot - yTop + 44, 'k'); PIX.rect(c, x - 6, yTop - 22, 58, 1, 'g4');
  PIX.text(c, 'PRESSURE', x - 2, yTop - 18, 'g8', { shadow: null });
  PIX.rect(c, x + 4, yTop, 3, yBot - yTop, 'g2'); PIX.rect(c, x + 4, Math.round(y), 3, Math.round(yBot - y), 'c1');
  for (let e = 5; e >= -10; e -= 5) { const yy = Math.round(U.lerp(yTop, yBot, (5 - e) / 15)); PIX.rect(c, x + 8, yy, 4, 1, 'g6'); PIX.text(c, `10${e < 0 ? '⁻' : ''}${String(Math.abs(e)).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')}`, x + 14, yy - 3, 'g7', { shadow: null }); }
  PIX.text(c, 'Pa', x + 14, yBot + 8, 'g6', { shadow: null });
  PIX.rect(c, x + 1, Math.round(y) - 1, 9, 3, 'c3');
  c.restore();
}
SC.s05_vacuum = {
  xin: 0,
  camAt,
  draw(c, lt) {
    const T = 23 + lt;
    if (lt < T_OUT) {                                                                   // reverse dive, out of the film
      const k = U.clamp(lt / 0.2);
      const back = cc => SAMPLE.dive(cc, fovBack(lt), T);
      if (k < 1) window.dissolve(c, cc => SC.s04_sample.draw(cc, 6.999), back, MO.smooth(k)); else back(c);
      if (lt > T_OUT - 0.25) { const q = (lt - (T_OUT - 0.25)) / 0.25, cam = { x: X, y: Y.spec, z: CAM.zlerp(30, 6.2, MO.cubicOut(q)) };
        window.dissolve(c, () => {}, cc => { LAB.back(cc, cam, T); COL.draw(cc, cam, T, { airlock: 0 }); }, MO.smooth(q)); }
      SAMPLE.scaleBar(c, fovBack(lt), 1 - U.clamp((lt - 0.7) / 0.2));
      return;
    }
    const cam = camAt(lt), e = evac(lt);
    LAB.screen(T, {}); LAB.back(c, cam, T);
    COL.draw(c, cam, T, { airlock: lt > T_SEAL ? 1 : 0, valve: 1, axis: 0.25 + 0.6 * e, hot: { c1: 0.3, c2: 0.3, obj: 0.3 } });
    pumps(c, cam, lt);
    // the gas, and its collisions (flashes) while there is still enough of it
    const pts = [];
    for (const m of MOL) {
      if (!alive(m, lt)) continue;
      const [wx, wy] = molPos(m, T), [sx, sy] = K.S(cam, wx, wy);
      if (sx < -2 || sy < -2 || sx > W + 2 || sy > H + 2) continue;
      pts.push([sx, sy]);
      const a = m.ang + T * 2, ddx = Math.round(Math.cos(a)), ddy = Math.round(Math.sin(a));
      PIX.rect(c, Math.round(sx), Math.round(sy), 1, 1, 'g9'); PIX.rect(c, Math.round(sx) + ddx, Math.round(sy) + ddy, 1, 1, 'g7');
    }
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
      if (dx * dx + dy * dy < 1.6) FX.flash(c, (pts[i][0] + pts[j][0]) / 2, (pts[i][1] + pts[j][1]) / 2, 1, 'gb', 0.9);
    }
    // gauge and notes
    gauge(c, lt, U.clamp((lt - 1.2) / 0.3) * (1 - U.clamp((lt - 6.3) / 0.3)));
    const lg = pLog(lt); let ex = Math.floor(lg + 1e-9), mant = Math.pow(10, lg - ex); if (mant >= 9.95) { mant = 1; ex += 1; }
    if (lt > 1.3 && lt < 6.5) {
      const s = lg > 3.5 ? '1 atm' : `${mant.toFixed(1)}×10${ex < 0 ? '⁻' : ''}${String(Math.abs(ex)).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')} Pa`;
      PIX.rect(c, 10, 416, PIX.textWidth(s) + 8, 12, 'k'); PIX.text(c, s, 14, 418, lg < -4.5 ? 'c3' : 'w');
    }
    const [tx, ty] = K.S(cam, X + 58, -30), [ix, iy] = K.S(cam, X - 40, -131);
    CAP.note(c, lt, { text: 'TURBO PUMP', x: Math.min(W - 70, tx + 6), y: ty + 28, ax: tx, ay: ty + 6, t0: 1.6, t1: 4.6, col: 'w', lineCol: 'g6', box: true });
    CAP.note(c, lt, { text: 'ION PUMPS', x: 78, y: iy + 34, ax: ix, ay: iy + 6, t0: 2.0, t1: 4.8, col: 'm4', lineCol: 'm2', box: true });
    CAP.scene(c, lt, { title: 'HIGH VACUUM', ctx: ['FEWER MOLECULES IN THE BEAM PATH'], t0: 1.3, t1: 6.6, acc: 'c2' });
    CAP.note(c, lt, { text: '10 BILLION x FEWER MOLECULES', x: W / 2 + 8, y: 384, t0: 4.6, t1: 6.5, col: 'c4', box: true, align: 'center' });
    CAP.note(c, lt, { text: 'BUT STILL NOT EMPTY', x: W / 2 + 8, y: 396, t0: 5.1, t1: 6.5, col: 'g8', box: true, align: 'center' });
    // the gun end: 10⁻⁹ Pa
    if (lt > T_RISE) {
      const [gx, gy] = K.S(cam, X - 29, -257);
      CAP.note(c, lt, { text: 'GUN: ~10⁻⁹ Pa', x: Math.max(70, gx - 4), y: gy + 30, ax: gx, ay: gy + 8, t0: T_RISE + 0.4, col: 'c4', lineCol: 'c1', box: true, align: 'right' });
    }
  },
  cues: [[0.0, 'whoosh_back', 1, 0, 1.0], [T_SEAL, 'chamber_close'], [T_PUMP0 - 0.1, 'pump_spin', 1, 0.3, T_PUMP1 - T_PUMP0 + 1.0], [T_PUMP0, 'pump_hum', 1, -0.2, 4.6],
    [1.3, 'title_hit', 0.6], [1.6, 'blip', 0.6, 0.3], [2.0, 'blip', 0.6, -0.3], [1.5, 'gas_ticks', 1, 0, 3.6], [1.4, 'pressure_fall', 1, 0, 4.2], [4.6, 'confirm'], [T_RISE, 'rise', 1, 0, 1.1], [T_RISE + 0.4, 'blip', 0.6, -0.2]],
};
})();
