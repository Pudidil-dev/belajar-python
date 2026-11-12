// SEQUENCE G — THE EXHALATION SYSTEM (40–51 s): the integrated flow reaches the target tidal volume; the controller ends
// inspiration (the inspiratory valve closes) and lets the expiratory valve open. Expiration is passive: the elastic recoil
// of the lungs and chest wall drives the gas out (nothing sucks it out). It returns up the airways, through the tube and
// the Y-connector, along the expiratory limb, through the expiratory valve and out of the exhaust. As the pressure falls,
// the valve closes against its set pressure: PEEP — the alveoli stay partly open at the end of expiration.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
// S30 — the target volume is reached; the controller switches to expiration (40.0–41.5 s)
SC['s30_volume'] = {
  draw(c, t, S) {
    const k = MO.cubicInOut(clamp((t - 0.22) / 0.16)), cam = SHOT.zoom({ x: 104, y: 300, z: 3.6 }, { x: 242, y: 436, z: 2.7 }, k);
    INSIDE.scene(c, cam, S.t, { ...SHOT.vent(S.t), signals: [['tFlow', clamp(t / 0.3)], ['tVol', clamp((t - 0.3) / 0.2)], ['tPsol', clamp((t - 0.95) / 0.5)], ['tExpV', clamp((t - 1.0) / 0.45)]] });
  },
  cues: [[0.0, 'pulse', 0.6, -0.4], [0.22, 'snap', 0.8, 0.2], [0.5, 'beep_ok', 1.0, 0], [0.95, 'activate', 0.6, 0, 0.5]],
};
// S31 — the inspiratory valve closes (click), the expiratory valve opens (the first exhaled gas) (41.5–43.0 s)
SC['s31_switch'] = {
  draw(c, t, S) {
    const st = SHOT.vent(S.t);
    const a = cc => INSIDE.scene(cc, { x: 112, y: 212, z: 4.6 }, S.t, { ...st, hi: { psol: MO.smooth(clamp((t - 0.1) / 0.1)) * (1 - MO.smooth(clamp((t - 0.55) / 0.15))) } });
    const b = cc => INSIDE.scene(cc, { x: 384, y: lerp(470, 440, MO.smooth(clamp((t - 0.75) / 0.75))), z: 3.6 }, S.t, { ...st, hi: { ev: MO.smooth(clamp((t - 0.85) / 0.1)) * (1 - MO.smooth(clamp((t - 1.3) / 0.15))) } });
    if (t < 0.7) a(c); else if (t < 0.76) window.dissolve(c, a, b, (t - 0.7) / 0.06); else b(c);
  },
  cues: [[0.125, 'click', 1.0, -0.4], [0.7, 'whip', 0.5, 0.3, 0.1], [0.875, 'tssh', 1.0, 0.4, 0.6]],
};
// S32 — elastic recoil: the lungs get smaller and the gas flows back out (43.0–45.0 s)
SC['s32_recoil'] = {
  xin: 0.0625,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 2)), cam = { x: 0, y: lerp(-14, -72, q), z: K.zl(2.2, 3.4, q) }, v = BREATH.v(S.t);
    MACRO.scene(c, cam, S.t, { v, flowOut: 1 });
    window.airwayGas(c, cam, S.t, v, 1, -1);
  },
  cues: [[0.0, 'exhale', 1.0, 0, 2.0]],
};
// S33 — the exhaled gas through the tube and the Y-connector into the expiratory limb, fast (45.0–47.0 s)
const C33 = K.camTrack([[0, -112, 0, 1.8], [0.45, 30, 0, 1.4], [0.9, 120, 80, 1.8]]);
SC['s33_expflow'] = {
  xin: 0.0625,
  draw(c, t, S) {
    const y = cc => AIR.ypiece(cc, C33(Math.min(0.9, t)), S.t, { exp: 1 });
    const tb = cc => AIR.tube(cc, { x: 460 * (t - 0.85), y: 0, z: 2.1 }, S.t, { ramp: ['am2', 'am3', 'am4'], ramp2: ['am4', 'am5', 'w'] });
    if (t < 0.85) y(c); else if (t < 0.92) window.dissolve(c, y, tb, (t - 0.85) / 0.07); else tb(c);
  },
  cues: [[0.0, 'reverse_air', 0.9, -0.5, 0.9], [0.875, 'rush', 0.7, 0.4, 1.1]],
};
// S34 — the expiratory valve: the gas lifts the diaphragm off its seat and leaves through the exhaust (47.0–49.0 s)
SC['s34_expvalve'] = {
  xin: 0.0625,
  draw(c, t, S) { const q = MO.sineInOut(clamp(t / 2)); const st = SHOT.vent(S.t); INSIDE.scene(c, { x: lerp(380, 404, q), y: lerp(560, 440, q), z: K.zl(2.4, 3.4, q) }, S.t, { ...st, expV: st.expV + 0.05 * Math.sin(t * 11) }); },
  cues: [[0.0, 'release_hiss', 0.9, 0.4, 2.0]],
};
// S35 — split view: the valve settles to hold PEEP | the alveoli stay partly open at end-expiration (49.0–51.0 s)
const gauge = (c, x, y, r, val) => {
  for (let k = 0; k <= 16; k++) { const a = Math.PI * 0.75 + k / 16 * Math.PI * 1.5; PIX.rect(c, Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1, k % 4 ? 'g4' : 'g7'); }
  const a = Math.PI * 0.75 + clamp(val / 40) * Math.PI * 1.5; PIX.bline(c, x, y, x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2), 'ys4'); PIX.rect(c, x - 1, y - 1, 2, 2, 'w');
};
SC['s35_peep'] = {
  xin: 0.0625,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 2)), st = SHOT.vent(S.t);
    PIX.rect(c, 0, 0, W, H, 'k');
    window.inset(c, 0, 0, 134, H, cc => { const cam = { x: 380 - (67 - W / 2) / 3.4, y: lerp(440, 426, q), z: K.zl(3.2, 3.6, q) }; INSIDE.scene(cc, cam, S.t, st); });
    window.inset(c, 136, 0, 134, H, cc => { const cam = { x: -20 - (203 - W / 2) / 2.0, y: lerp(22, 14, q), z: K.zl(1.9, 2.2, q) }; AIR.acinus(cc, cam, S.t, { v: BREATH.v(S.t) + 0.18, flow: 0, mol: 1 }); });
    PIX.rect(c, 134, 0, 2, H, 'g3');
    // the pressure gauge on the valve side settles at PEEP (5 cmH2O): it never falls to zero
    const p = lerp(14, 5, MO.cubicOut(clamp(t / 1.1)));
    PIX.rect(c, 40, 360, 56, 56, 'k'); gauge(c, 68, 390, 22, p);
  },
  cues: [[0.25, 'stabilize', 0.9, 0, 1.6]],
};
})();
