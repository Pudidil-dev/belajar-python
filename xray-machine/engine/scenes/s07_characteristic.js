// S07 CHARACTERISTIC X-RAY (29–34 s): the camera pans to atom B, drawn with its inner shells (K, L, M). An incoming
// 80 keV electron knocks a K-shell electron out (needs more than tungsten's K binding energy, 69.5 keV); the vacancy
// sits there; an L electron drops into it and the energy difference, 69.5 − 10.2 ≈ 59 keV, leaves as one photon of
// fixed energy (Kα). The spectrum readout grows two sharp lines on top of the bremsstrahlung continuum.
(() => {
const { W, H } = PIX;
const h = U.hash, lerp = U.lerp, clamp = U.clamp;
const SH = [[0.2, 0.04, 1.25], [0.39, 0.06, 1.0], [0.6, 0.08, 0.8], [0.83, 0.11, 0.42]];      // K, L, M, outer
const T_HIT = 1.0, T_DROP = 2.5, T_EMIT = 2.65;
const camAt = t => {
  const S6 = window.S06.camAt(7), B = TW.B;
  if (t < 0.65) { const p = MO.sineInOut(t / 0.65); return { x: lerp(S6.x, B.x - 4, p), y: lerp(S6.y, B.y + 6, p), z: K.zl(S6.z, 4.4, p) }; }
  const p = MO.sineInOut(clamp((t - 0.65) / 4.35));
  return { x: lerp(B.x - 4, B.x + 2, p), y: lerp(B.y + 6, B.y + 4, p), z: K.zl(4.4, 4.8, p) };
};
window.S07 = { camAt };
// shell electrons wander inside their band (probability, not orbits)
const shellE = (shell, k, t, R) => {
  const r0 = SH[shell][0] * R, w = SH[shell][1] * R * 0.8;
  const an = (k / (shell === 0 ? 2 : 8)) * U.TAU + (K.vn3(k * 1.7 + shell * 9, 0.5, t * 0.8, 81) - 0.5) * 1.6 + t * 0.15 * (shell + 1);
  const rr = r0 + (K.vn3(k * 1.7 + shell * 9, 3.5, t * 1.4, 83) - 0.5) * 2 * w;
  return [Math.cos(an) * rr, Math.sin(an) * rr];
};
SC['s07_characteristic'] = {
  draw(c, t, S) {
    const cam = camAt(t), B = TW.B, R = TW.R;           // world radius of the cloud
    const [bx, by] = K.S(cam, B.x, B.y), Rs = R * cam.z;
    // K electron that gets knocked out (index 0); its position at the hit fixes the incoming path
    const k0hit = shellE(0, 0, T_HIT, R), vac = [B.x + k0hit[0], B.y + k0hit[1]];
    const holeOn = t > T_HIT && t < T_DROP + 0.15;
    TW.draw(c, cam, S.t, { vib: 0.4, gain: 0.7, shells: a => a === B ? SH : undefined, nucScale: a => a === B ? 0.45 : 1,
      hole: (a, sx, sy, Rr) => a === B && holeOn ? [K.S(cam, vac[0], vac[1])[0], K.S(cam, vac[0], vac[1])[1], 0.07 * Rr] : undefined });
    c.setTransform(1, 0, 0, 1, 0, 0);
    // shell electrons of atom B: 2 in K, 8 in L (cyan, small)
    const showK = (k) => !(k === 0 && t > T_HIT);
    for (let k = 0; k < 2; k++) if (showK(k)) { const p = shellE(0, k, t, R), [sx, sy] = K.S(cam, B.x + p[0], B.y + p[1]); FX.e(c, sx, sy, 2, 0.95); }
    const fillK = 3;                                   // the L electron that drops into the K vacancy
    for (let k = 0; k < 8; k++) {
      let p = shellE(1, k, t, R);
      if (k === fillK && t > T_DROP) { const q = clamp((t - T_DROP) / 0.15), from = shellE(1, k, T_DROP, R); p = q < 1 ? [lerp(from[0], k0hit[0], MO.cubicIn(q)), lerp(from[1], k0hit[1], MO.cubicIn(q))] : shellE(0, 0, t, R); }
      const [sx, sy] = K.S(cam, B.x + p[0], B.y + p[1]); FX.e(c, sx, sy, 1, 0.9);
      if (k === fillK && t > T_DROP && t < T_DROP + 0.35) { const from = shellE(1, k, T_DROP, R), [fx, fy] = K.S(cam, B.x + from[0], B.y + from[1]); PIX.bline(c, fx, fy, sx, sy, 'c1', 1); }
    }
    // vacancy marker
    if (holeOn) {
      const [vx, vy] = K.S(cam, vac[0], vac[1]), on = Math.floor((t - T_HIT) * 6) % 2 === 0;
      FX.ring(c, vx, vy, 4, on ? 'w' : 'd6', 1);
    }
    // incoming electron (straight in, from the upper left), then scattered off slower
    const vin = [0.88, 0.47], spd = 30;
    if (t > 0.35) {
      const pre = t < T_HIT, dt = t - T_HIT;
      const pos = pre ? [vac[0] + vin[0] * spd * dt, vac[1] + vin[1] * spd * dt] : [vac[0] + 0.2 * spd * dt, vac[1] + 0.92 * spd * dt * 0.55];
      const pts = []; for (let j = 0; j < 12; j++) { const tt = t - j * 0.05; if (tt < 0.35) break; const d2 = tt - T_HIT; pts.push(K.S(cam, ...(tt < T_HIT ? [vac[0] + vin[0] * spd * d2, vac[1] + vin[1] * spd * d2] : [vac[0] + 0.2 * spd * d2, vac[1] + 0.92 * spd * d2 * 0.55]))); }
      FX.trail(c, pts, 1); const [sx, sy] = K.S(cam, ...pos); FX.e(c, sx, sy, 3, 1, true);
    }
    // the ejected K electron
    if (t > T_HIT) {
      const dt = t - T_HIT, pos = [vac[0] + 26 * dt, vac[1] - 20 * dt];
      const pts = []; for (let j = 0; j < 10; j++) { const d2 = Math.max(0, dt - j * 0.05); pts.push(K.S(cam, vac[0] + 26 * d2, vac[1] - 20 * d2)); }
      FX.trail(c, pts, 1); const [sx, sy] = K.S(cam, ...pos); FX.e(c, sx, sy, 3, 1, true);
      if (dt < 0.3) { const [fx, fy] = K.S(cam, ...vac); FX.flash(c, fx, fy, 11 * (1 - dt / 0.3), 'c3', 1 - dt / 0.3); FX.ring(c, fx, fy, 5 + dt * 120, 'c2', 1 - dt / 0.3); }
    }
    // the characteristic photon (Kα, 59 keV)
    let phS = null;
    if (t > T_EMIT) {
      const dt = t - T_EMIT, ang = 0.62, d = 22 + 48 * dt, [sx, sy] = K.S(cam, vac[0] + Math.cos(ang) * d * 0.3, vac[1] + Math.sin(ang) * d * 0.3);
      const lam = FX.lamFor(59) * 1.3; FX.ph(c, sx, sy, ang, lam, lam * 3.2, 5, clamp(dt / 0.08)); phS = [sx, sy];
      if (dt < 0.25) { const [fx, fy] = K.S(cam, ...vac); FX.flash(c, fx, fy, 10 * (1 - dt / 0.25), 'p3', 1 - dt / 0.25); FX.ring(c, fx, fy, 6 + dt * 160, 'p2', 1 - dt / 0.25); }
    }
    // shell labels
    const sl = clamp((t - 0.5) / 0.3);
    if (sl > 0) [['K', 0], ['L', 1], ['M', 2]].forEach(([s, i]) => { const r = SH[i][0] * Rs; PIX.text(c, s, Math.round(bx - r * 0.72) - 3, Math.round(by + r * 0.72) - 3, i === 0 ? 'w' : 'y3', { n: sl >= 1 ? 1 : 0 }); });
    // energy ladder (right): L at −10.2 keV, K at −69.5 keV; the drop releases 59 keV
    const la = clamp((t - 1.9) / 0.3) * (1 - clamp((t - 4.75) / 0.2));
    if (la > 0) {
      const x0 = 184, x1 = 256, yL = 156, yK = 226;
      c.save(); c.globalAlpha = la;
      PIX.rect(c, x0 - 4, yL - 20, x1 - x0 + 10, yK - yL + 34, 'k');
      PIX.text(c, 'ENERGY LEVELS', x0, yL - 17, 'd8', { shadow: null });
      PIX.rect(c, x0, yL, x1 - x0, 1, 'y3'); PIX.text(c, 'L  −10.2 keV', x0, yL + 3, 'y3', { shadow: null });
      PIX.rect(c, x0, yK, x1 - x0, 1, 'w'); PIX.text(c, 'K  −69.5 keV', x0, yK + 3, 'w', { shadow: null });
      if (t > T_DROP) { const q = clamp((t - T_DROP) / 0.15); K.arrow(c, x0 + 14, yL + 1, x0 + 14, yL + 1 + (yK - yL - 2) * q, 'c2', 3); }
      if (t > T_EMIT) { PIX.text(c, '59 keV', x0 + 22, (yL + yK) / 2 - 3, 'p3', { n: Math.floor((t - T_EMIT) * 40) }); K.arrow(c, x0 + 58, (yL + yK) / 2 + 1, x0 + 68, (yL + yK) / 2 + 1, 'p2', 3); }
      c.restore();
    }
    // steps, notes, the spectrum
    CAP.steps(c, t, { x: 14, y: 80, t1: 4.85, items: [[T_HIT, 'K electron knocked out', 'c2'], [T_HIT + 0.4, 'a vacancy is left', 'w'], [T_DROP, 'an L electron drops in', 'c3'], [T_EMIT, 'energy step → X-ray photon', 'p2']] });
    CAP.note(c, t, { x: 14, y: 300 - 14, text: 'needs an electron above 69.5 keV', t0: 0.55, t1: 2.2, col: 'c3', box: true });
    if (phS && t < 3.6) CAP.note(c, t, { ax: phS[0], ay: phS[1], x: 256, y: 268, text: 'Kα photon: 59 keV', t0: T_EMIT + 0.1, t1: 3.6, col: 'p3', align: 'right', box: true });
    CAP.note(c, t, { x: 135, y: 280, text: "fixed energies: tungsten's fingerprint", t0: 3.45, t1: 4.75, col: 'w', align: 'center', box: true });
    HUD.spec(c, 14, 300, { f: 0.95, events: [], t: S.t, kpk: MO.backOut(clamp((t - 3.0) / 0.45), 1.4), a: 1 - clamp((t - 4.72) / 0.2) });
    CAP.scene(c, t, { title: 'CHARACTERISTIC X-RAY', ctx: 'A second way, with fixed energies.', t0: 0.1, t1: 4.92 });
  },
  cues: [[0, 'pan', 0.6, 0.3, 0.65], [0.1, 'type', 0.5], [0.5, 'blip', 0.4, -0.3], [0.55, 'whoosh_e', 0.7, -0.5, 0.45], [T_HIT, 'atom_hit', 1], [T_HIT + 0.4, 'vacancy', 0.6],
    [T_DROP, 'transition', 0.9], [T_EMIT, 'photon_k', 1, 0.3], [3.0, 'peak_rise', 0.8, -0.4], [3.45, 'blip', 0.4]],
};
})();
