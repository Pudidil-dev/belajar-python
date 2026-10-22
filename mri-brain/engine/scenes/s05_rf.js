// S05 RF EXCITATION (20–28 s): back to the machine. The RF body coil drives a short burst at the Larmor frequency
// (64 MHz at 1.5 T): long, non-ionizing radio waves, violet, crossing the bore into the head. Among the nuclei the
// burst is a rotating field B1 in the transverse plane; because it turns in step with the precession, it tips the net
// magnetization M away from B0 — here a 90° pulse, M spiralling down in the lab frame — leaving one coherent vector
// precessing in the transverse plane: Mxy.
(() => {
const { W, H } = PIX;
const lerp = U.lerp, clamp = U.clamp, io = MO.sineInOut, sm = MO.smooth, TAU = U.TAU;
const S2 = window.S02, S4 = window.S04, G = SCAN.GEO;
const W_L = S4.W_L;                                                           // one precession turn per beat
const T_P0 = 3.5, T_P1 = 5.5;                                                 // the 90° pulse (beats 47–51)
const flip = t => (Math.PI / 2) * sm(clamp((t - T_P0) / (T_P1 - T_P0)));
const prec = t => W_L * (t - T_P0);                                           // phase of the precession
// M in the lab frame: tipping from z while it precesses (clockwise seen from the tip of B0)
const Mvec = t => { const a = flip(t), p = -prec(t); return [Math.sin(a) * Math.cos(p), Math.sin(a) * Math.sin(p), Math.cos(a)]; };
window.S05 = { Mvec, W_L, T_P0, T_P1, prec };
// scanner camera: from inside the head outward, then pushing back in along a wave
const camAt = t => {
  const k1 = io(clamp(t / 0.6)), k2 = io(clamp((t - 1.9) / 0.75));
  const D = Math.exp(lerp(Math.log(0.42), Math.log(1.25), k1) + (Math.log(0.12) - Math.log(1.25)) * k2);
  return S2.rig([0.0, 0, -0.03 + 0.01 * k2], D, lerp(0, 0.28, k1) * (1 - k2), lerp(0, 0.12, k1) * (1 - k2), lerp(-Math.PI / 2, 0, k1) * 1 + (-Math.PI / 2) * k2);
};
// RF waves: from the coil above and below the head toward its centre (scanner coords, plane Y = 0)
function rfWaves(c, C, t, a) {
  if (a <= 0) return;
  const hc = [0.0, 0, -0.03];
  for (const sz of [1, -1]) for (let k = 0; k < 3; k++) {
    const x0 = -0.18 + k * 0.18, p0 = SCAN.proj(C, [x0, 0, sz * 0.326]), p1 = SCAN.proj(C, [hc[0] + (k - 1) * 0.03, 0, hc[2]]);
    if (!p0 || !p1) continue;
    const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    const lam = Math.max(10, L / 3.2), amp = Math.max(3, L * 0.07), ph = t * 6.5;
    c.save(); c.globalAlpha = a;
    let px = null, py = null;
    for (let s = 0; s <= L; s += 1) {
      const env = Math.min(1, s / 12) * Math.min(1, (L - s) / 8), off = amp * env * Math.sin(TAU * s / lam - ph);
      const x = p0[0] + Math.cos(ang) * s - Math.sin(ang) * off, y = p0[1] + Math.sin(ang) * s + Math.cos(ang) * off;
      if (px != null) PIX.bline(c, px, py, x, y, (Math.floor((s / lam - ph / TAU) * 2) & 1) ? 'v2' : 'v3');
      px = x; py = y;
    }
    c.restore();
  }
}
SC['s05_rf'] = {
  draw(c, t, S) {
    const C = camAt(Math.min(t, 2.65)), rf = t > 0.55 && t < T_P1 + 0.1 ? 0.6 + 0.4 * Math.sin(t * 25) : 0;
    if (t < 2.75) {
      const drawScan = cc => { const img = K.pbegin(cc); SCAN.render(img, C, { cut: 0, t: S.t, head: 1, skin: 1, env: 1, rf: rf > 0 ? 1 : 0 }); K.pend(cc, img); rfWaves(cc, C, S.t, sm(clamp((t - 0.6) / 0.3))); };
      const drawPop = cc => popView(cc, t, S);
      if (t < 2.45) drawScan(c); else window.dissolve(c, drawScan, drawPop, sm((t - 2.45) / 0.3));
      if (t > 0.6 && t < 2.4) { const p = SCAN.proj(C, [-0.08, 0, 0.326]); if (p) CAP.note(c, t, { x: 14, y: Math.max(70, p[1] - 40), text: 'RF COIL', t0: 0.65, t1: 2.2, ax: p[0], ay: p[1], col: 'v3', lineCol: 'v2', box: true }); }
      if (t > 1.0) CAP.note(c, t, { x: 135, y: 420, text: 'RADIO WAVES · NOT IONIZING', t0: 1.05, t1: 2.35, align: 'center', col: 'v4', box: true, rate: 60 });
    } else if (t < T_P0 + 0.2) {
      const drawPop = cc => popView(cc, t, S), drawM = cc => mView(cc, t, S);
      window.dissolve(c, drawPop, drawM, sm(clamp((t - (T_P0 - 0.25)) / 0.4)));
    } else mView(c, t, S);
    CAP.scene(c, t, { title: 'RF EXCITATION', t0: 0.15, acc: 'v3' });
  },
  cues: () => {
    const q = [[0, 'pull_back', 0.7, 0, 0.6], [0.55, 'rf_on', 0.9, 0], [0.6, 'rf_hum', 0.7, 0, 1.9], [1.9, 'whoosh_in', 0.7, 0, 0.75], [2.5, 'tuned', 0.7, 0], [T_P0, 'tip', 1.0, 0, T_P1 - T_P0],
      [T_P1, 'flip_land', 1.0, 0], [5.4, 'type', 0.35], [7.6, 'rf_off', 0.6, 0]];
    for (let b = 0; b < 5; b++) q.push([T_P1 + 0.5 + b * 0.5, 'precess', 0.6, Math.sin(b * 1.3) * 0.6]);
    return q;
  },
};
// the nuclei (the population of S04) with the burst passing through them
function popView(c, t, S) {
  PIX.rect(c, 0, 0, W, H, 'n0');
  const el = 0.42, ph = S4.phase(S4.T_AL + 4 + (t - 2.45));
  for (let j = 0; j < S4.ROWS; j++) for (let k = 0; k < S4.COLS; k++) {
    const i = j * S4.COLS + k, x = S4.GX(k), y = S4.GY(j), m = S4.POP[i], v = SPIN.cone(m, ph);
    SPIN.dot(c, x, y, v, 26, { el, col: m.up ? 'c3' : 'c2', hi: m.up ? 'c5' : 'c4', colB: 'c1', thick: 2 });
  }
  // the burst sweeping through
  for (let r = 0; r < 4; r++) {
    const y0 = 70 + r * 70, xs = K.wrap(S.t * 160 + r * 60, 340) - 40;
    let px = null, py = null;
    for (let x = xs - 70; x < xs + 70; x++) { const env = Math.exp(-(((x - xs) / 45) ** 2)), y = y0 + 9 * env * Math.sin(x / 7 - S.t * 12); if (px != null) PIX.bline(c, px, py, x, y, env > 0.5 ? 'v3' : 'v2'); px = x; py = y; }
  }
  CAP.note(c, t, { x: 135, y: 358, text: 'RF AT 64 MHz', t0: 2.6, align: 'center', col: 'v3', box: true, rate: 60 });
  CAP.note(c, t, { x: 135, y: 370, text: '= THE LARMOR FREQUENCY', t0: 2.75, align: 'center', col: 'w', box: true, rate: 60 });
}
// the magnetization frame: M tips down along a spiral, B1 turning with it, then precesses in the transverse plane
function mView(c, t, S) {
  PIX.rect(c, 0, 0, W, H, 'n0');
  const cx = 135, cy = 250, R = 92, el = 0.45;
  SPIN.frame(c, cx, cy, R, { el, zlabel: 'B₀' });
  // B0 arrow at the side
  MICRO.arrow(c, 22, 330, 22, 150, 'c2', 'c4', 7, 3); PIX.text(c, 'B₀', 22, 136, 'c3', { align: 'center' });
  // the spiral path of M's tip
  const t1 = Math.min(t, T_P1 + 2.8);
  for (let tt = T_P0; tt < t1; tt += 1 / 120) { const v = Mvec(tt), [dx, dy, d] = SPIN.proj(v, 0, el); if (((tt - T_P0) * 120 | 0) % 2) continue; PIX.rect(c, Math.round(cx + dx * R), Math.round(cy + dy * R), 1, 1, d < 0 ? 'c1' : tt > T_P1 ? 'c3' : 'c2'); }
  // B1: the RF field, rotating in the transverse plane a quarter turn ahead of M's transverse part
  if (t < T_P1 + 0.05) { const p = -prec(t) - Math.PI / 2, b1 = [Math.cos(p), Math.sin(p), 0]; SPIN.arrow(c, cx, cy, b1, R * 0.62, { el, col: 'v2', hi: 'v4', colB: 'v1', thick: 2 });
    const [bx, by] = SPIN.proj(b1, 0, el); PIX.text(c, 'B₁', cx + bx * R * 0.72, cy + by * R * 0.72 - 4, 'v3', { align: 'center' }); }
  // the ensemble: spins on a cone around M, carried rigidly by the same rotation (they all tip together)
  {
    const a = flip(t), p = -prec(t);
    for (let k = 0; k < 8; k++) {
      const q = k / 8 * TAU + 0.3, cz = Math.cos(SPIN.CONE), rs = Math.sin(SPIN.CONE);
      let s0 = [rs * Math.cos(q), rs * Math.sin(q), cz];
      s0 = SPIN.rotX(s0, -a); s0 = SPIN.rotZ(s0, p);                      // tip about x, then precess about z (as M)
      SPIN.arrow(c, cx, cy, s0, R * 0.55, { el, col: 'c2', hi: 'c3', colB: 'c1' });
    }
  }
  // M
  const v = Mvec(t);
  SPIN.arrow(c, cx, cy, v, R, { el, col: 'w', hi: 'w', colB: 'g8', thick: 3, head: 9 });
  { const [mx, my] = SPIN.proj(v, 0, el); PIX.text(c, 'M', cx + mx * R * 1.08 + 4, cy + my * R * 1.08 - 3, 'w'); }
  // the transverse component once tipped: its shadow in the plane
  if (t > T_P0 + 0.3) { const [dx, dy] = SPIN.proj([v[0], v[1], 0], 0, el); PIX.bline(c, cx, cy, cx + dx * R, cy + dy * R, 'c3', 1); }
  CAP.note(c, t, { x: 135, y: 392, text: '90° PULSE', t0: T_P0 + 0.1, t1: T_P1 + 0.6, align: 'center', col: 'v3', box: true });
  CAP.note(c, t, { x: 135, y: 392, text: 'TRANSVERSE MAGNETIZATION Mxy', t0: T_P1 + 0.75, align: 'center', col: 'c3', box: true, rate: 60 });
  CAP.note(c, t, { x: 135, y: 404, text: 'ONE COHERENT VECTOR', t0: T_P1 + 1.1, align: 'center', col: 'w', box: true, rate: 60 });
  CAP.note(c, t, { x: 135, y: 440, text: 'RF OFF', t0: 7.55, align: 'center', col: 'v3', box: true });
}
})();
