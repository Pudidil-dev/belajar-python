// SEQUENCE C — THE GAS BLENDER (8–16 s): air (about 21 % oxygen, mostly nitrogen) and oxygen each pass a filter and a
// pressure regulator; two proportional valves set their flows so that the blend reaches the selected FiO2 (40 %: the air
// valve opens wider than the oxygen valve); the streams meet and mix — no reaction, just a mixture — and an oxygen sensor
// measures the blend and reports to the controller.
(() => {
const clamp = U.clamp, lerp = U.lerp;
// S10 — the medical-air inlet: a mixed stream through filter and regulator (8.0–9.375 s)
SC['s10_air'] = {
  draw(c, t, S) { const q = MO.sineInOut(clamp(t / 1.375)); INSIDE.scene(c, { x: lerp(474, 372, q), y: 72, z: 3.6 }, S.t, { ...SHOT.vent(S.t), hi: { airV: MO.smooth(clamp((t - 0.9) / 0.2)) } }); },
  cues: [[0.0, 'pressure_hiss', 0.9, 0.5, 0.5], [0.5, 'regulate', 0.5, 0.2, 0]],
};
// S11 — the oxygen inlet: a dense stream of O2 through its own regulated channel (9.375–10.75 s)
SC['s11_oxygen'] = {
  draw(c, t, S) {
    const q1 = MO.sineInOut(clamp(t / 0.5)), q2 = MO.sineInOut(clamp((t - 0.5) / 0.875));
    const cam = t < 0.5 ? { x: lerp(372, 456, q1), y: lerp(72, 150, q1), z: 3.6 } : { x: lerp(456, 372, q2), y: 150, z: 3.6 };
    INSIDE.scene(c, cam, S.t, SHOT.vent(S.t));
  },
  cues: [[0.0, 'pneu_click', 0.8, 0.3], [0.0, 'whip', 0.35, 0.2, 0.5], [0.5, 'o2_stream', 0.6, 0.4, 0.875]],
};
// S12 — both proportional valves adjust their openings for the selected FiO2 (10.75–12.25 s)
SC['s12_valves'] = {
  draw(c, t, S) { const q = MO.sineInOut(clamp(t / 1.5)); INSIDE.scene(c, { x: 342, y: 112, z: K.zl(2.3, 3.2, q) }, S.t, { ...SHOT.vent(S.t), hi: { airV: 1, o2V: 1 } }); },
  cues: [[0.125, 'servo_click', 1.0, -0.4], [0.125, 'servo_click', 1.0, 0.4], [0.125, 'servo', 0.7, 0, 0.375]],
};
// S13 — the streams converge and mix: one blended gas, about 40 % oxygen (12.25–13.75 s)
SC['s13_mix'] = {
  draw(c, t, S) { const q = MO.sineInOut(clamp(t / 1.5)); INSIDE.scene(c, { x: lerp(300, 176, q), y: 112, z: 3.0 }, S.t, { ...SHOT.vent(S.t), flowBlend: 0.7 }); },
  cues: [[0.0, 'swirl', 0.8, 0.3, 1.5]],
};
// S14 — the oxygen sensor measures the blend; its signal runs into the circuit board (13.75–16.0 s)
const sig14 = SHOT.sig14 = t => clamp((t - 0.5) / 1.3);
SC['s14_o2sensor'] = {
  draw(c, t, S) {
    const q = sig14(t), R = INSIDE.R.tO2, [hx, hy] = BREATH.at(R, R.S, q * BREATH.len(R));
    const k = MO.smooth(clamp((t - 0.45) / 0.4)), cam = { x: lerp(160, hx, k), y: lerp(116, hy, k), z: K.zl(5.2, 3.2, MO.smooth(clamp((t - 0.5) / 1.4))) };
    INSIDE.scene(c, cam, S.t, { ...SHOT.vent(S.t), flowBlend: 0.6, hi: { o2s: MO.smooth(clamp(t / 0.2)) * (1 - MO.smooth(clamp((t - 0.6) / 0.2))) }, signals: [['tO2', q, { len: 22 }]], trace: { tO2: q > 0 && q < 1 } });
  },
  cues: [[0.125, 'detect', 0.9, -0.2], [0.5, 'signal_zip', 0.7, 0.1, 1.3], [1.8, 'chip_tick', 0.6, 0.2]],
};
})();
