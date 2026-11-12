// SEQUENCE D — THE ELECTRONIC BREATH CONTROLLER (16–24 s): a programmed controller, not a brain. The breath timer reaches
// its set point (a time-triggered mandatory breath: no effort from the patient is needed); the processor sends one signal
// that closes the expiratory valve and one that opens the inspiratory flow-control valve; blended gas moves; the flow
// sensor measures it and the controller adds it up into the delivered volume, adjusting the valve while it watches flow
// and pressure (volume-targeted delivery).
(() => {
const clamp = U.clamp, lerp = U.lerp;
// S15 — the timer reaches the trigger point (16.0–17.5 s)
SC['s15_timer'] = {
  draw(c, t, S) { const q = MO.sineInOut(clamp(t / 1.5)); INSIDE.scene(c, { x: lerp(212, 222, q), y: lerp(300, 318, q), z: K.zl(4.4, 5.4, q) }, S.t, { ...SHOT.vent(S.t), signals: t > 1.25 ? [['tTimer', clamp((t - 1.25) / 0.2)]] : [] }); },
  cues: [[0.0, 'count', 0.7, -0.2, 0], [0.25, 'count', 0.7, 0, 1], [0.5, 'count', 0.75, 0.2, 2], [0.75, 'count', 0.8, -0.1, 3], [1.0, 'count', 0.85, 0.1, 4], [1.125, 'count', 0.9, 0.2, 5], [1.25, 'trigger', 1.0, 0]],
};
// S16 — the processor sends its control signals: to the inspiratory valve and to the expiratory valve (17.5–19.0 s)
const C16 = K.camTrack([[0, 236, 330, 1.7], [0.6, 210, 300, 1.8], [1.5, 160, 250, 2.3]]);
SC['s16_signals'] = {
  draw(c, t, S) {
    const a = clamp((t - 0.1) / 0.75), b = clamp((t - 0.15) / 0.6);
    INSIDE.scene(c, C16(t), S.t, { ...SHOT.vent(S.t), signals: [['tPsol', a, { len: 26 }], ['tExpV', b, { len: 26 }]], trace: { tPsol: a > 0 && a < 1, tExpV: b > 0 && b < 1 }, hi: { ev: MO.smooth(clamp((t - 0.7) / 0.15)) * (1 - MO.smooth(clamp((t - 1.2) / 0.2))) } });
  },
  cues: [[0.0, 'activate', 1.0, 0, 1.0], [0.75, 'ev_close', 0.7, 0.5]],
};
// S17 — the inspiratory flow-control valve opens; blended gas starts to move (19.0–20.625 s)
SC['s17_inspvalve'] = {
  draw(c, t, S) { const q = MO.sineInOut(clamp(t / 1.625)); INSIDE.scene(c, { x: lerp(118, 108, q), y: lerp(206, 222, q), z: K.zl(4.8, 4.2, q) }, S.t, { ...SHOT.vent(S.t), hi: { psol: MO.smooth(clamp(t / 0.1)) * (1 - MO.smooth(clamp((t - 0.5) / 0.2))) } }); },
  cues: [[0.125, 'valve_click', 1.0, -0.3], [0.125, 'gas_start', 0.8, -0.2, 0.8]],
};
// S18 — the flow sensor measures the gas; the controller integrates it into the delivered volume (20.625–22.25 s)
const C18 = K.camTrack([[0, 100, 236, 4.0], [0.55, 100, 296, 4.4], [0.8, 112, 300, 4.0], [1.45, 222, 470, 2.4], [1.625, 226, 480, 2.4]]);
SC['s18_flowsensor'] = {
  draw(c, t, S) { const q = clamp((t - 0.6) / 0.6); INSIDE.scene(c, C18(t), S.t, { ...SHOT.vent(S.t), signals: [['tFlow', q, { len: 20 }], ['tVol', clamp((t - 1.15) / 0.35), { len: 16 }]], trace: { tFlow: q > 0 && q < 1 }, hi: { fsens: MO.smooth(clamp((t - 0.4) / 0.15)) * (1 - MO.smooth(clamp((t - 0.9) / 0.2))) } }); },
  cues: [[0.5, 'measure', 0.7, -0.3, 0], [0.625, 'measure', 0.7, -0.2, 1], [0.75, 'measure', 0.7, -0.1, 2], [0.875, 'measure', 0.75, 0, 3], [0.6, 'signal_zip', 0.6, 0.2, 0.8], [1.5, 'vol_tick', 0.7, 0.1]],
};
// S19 — feedback: flow and pressure in, valve adjustment out, volume adding up (22.25–24.0 s)
const C19 = K.camTrack([[0, 238, 356, 3.0], [0.4, 116, 232, 3.0], [0.8, 236, 360, 3.0], [1.2, 124, 330, 2.4], [1.75, 176, 330, 1.25]]);
SC['s19_feedback'] = {
  draw(c, t, S) {
    const st = SHOT.vent(S.t), adj = 0.05 * Math.sin(t * 9) * (t > 0.4 && t < 1.4 ? 1 : 0);
    INSIDE.scene(c, C19(t), S.t, { ...st, psol: st.psol + adj, signals: [['tFlow', clamp(t / 0.35)], ['tPres', clamp((t - 0.05) / 0.35)], ['tPsol', clamp((t - 0.4) / 0.35)], ['tFlow', clamp((t - 0.8) / 0.35)], ['tPres', clamp((t - 0.85) / 0.35)], ['tPsol', clamp((t - 1.2) / 0.35)]] });
  },
  cues: [[0.0, 'pulse', 0.7, -0.2], [0.4, 'servo', 0.7, -0.4, 0.3], [0.8, 'pulse', 0.7, 0.2], [1.2, 'servo', 0.6, -0.4, 0.3], [1.5, 'pulse', 0.6, 0]],
};
})();
