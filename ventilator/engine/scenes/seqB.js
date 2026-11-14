// SEQUENCE B — ENTER THE MACHINE (3–8 s): along the two corrugated limbs (the inspiratory route lights toward the patient),
// into the ventilator's inspiratory port, the casing turning into a cross-section, and backward along the internal gas
// path to the two supplies: medical air and oxygen.
(() => {
const clamp = U.clamp, lerp = U.lerp;
// S07 — the breathing circuit: two separate limbs; a trace runs up the inspiratory route to the patient (3.0–4.5 s)
const C07 = K.camTrack([[0, MACRO.WIDE.x, MACRO.WIDE.y, MACRO.WIDE.z], [0.55, 52, -70, 1.55], [1.5, 56, 236, 1.9]]);
SC['s07_circuit'] = {
  draw(c, t, S) {
    const cam = C07(t), L = BREATH.len(MACRO.inspRoute), r = 8 + t / 0.6, HK = BREATH.HOOK, u = r - 2 * HK.P;
    const fin = u < 0 ? 0 : u < HK.TI ? MO.smooth(clamp(u / 0.12)) : 1 - MO.smooth(clamp((u - HK.TI) / 0.15));
    MACRO.scene(c, cam, S.t, { v: BREATH.v(S.t), flowIn: Math.max(0.25, fin), hiInsp: lerp(0, L + 60, MO.sineInOut(clamp((t - 0.1) / 1.3))), monitor: { sweep: ((r / HK.P) % 1 + 1) % 1 } });
  },
  cues: [[0.0, 'airflow', 0.45, -0.2, 1.5], [0.1, 'trace_up', 0.4, 0.4, 1.3]],
};
// S08 — into the inspiratory port; the casing becomes a cross-section of gas channels, valves, sensors and electronics
const C08a = t => SHOT.zoom({ x: 56, y: 236, z: 1.9 }, { x: 84, y: 292, z: 8 }, MO.cubicIn(clamp(t / 0.55)));
const C08b = K.camTrack([[0.45, 100, 600, 3.4], [0.7, 100, 586, 3.0], [1.75, 168, 410, 1.0]]);
SC['s08_cutaway'] = {
  draw(c, t, S) {
    const st = SHOT.vent(S.t), macro = cc => MACRO.scene(cc, C08a(t), S.t, { v: 1, flowIn: 1 });
    const inside = cc => INSIDE.scene(cc, C08b(Math.max(0.45, t)), S.t, { ...st, casing: 1 - MO.smooth(clamp((t - 0.62) / 0.5)), signals: [['tFlow', clamp((t - 1.0) / 0.5)], ['tPres', clamp((t - 1.15) / 0.5)]] });
    if (t < 0.45) macro(c); else if (t < 0.55) window.dissolve(c, macro, inside, (t - 0.45) / 0.1); else inside(c);
  },
  cues: [[0.0, 'push', 0.6, -0.2, 0.55], [0.5, 'metal_click', 0.8, -0.3, 0], [0.625, 'metal_click', 0.7, 0.2, 1], [0.75, 'metal_click', 0.8, 0.4, 2], [0.62, 'reveal_sweep', 0.6, 0, 0.6]],
};
// S09 — backward through the internal gas path until both supplies are in view: medical air and oxygen (6.25–8.0 s)
const C09 = K.camTrack([[0, 168, 410, 1.0], [0.45, 102, 230, 1.7], [0.8, 150, 112, 1.6], [1.25, 400, 112, 1.25], [1.75, 404, 112, 1.25]]);
SC['s09_sources'] = {
  draw(c, t, S) { INSIDE.scene(c, C09(t), S.t, SHOT.vent(S.t)); },
  cues: [[0.0, 'glide', 0.5, 0.2, 1.0], [0.9, 'hiss_air', 0.8, -0.5, 0.8], [1.0, 'hiss_o2', 0.8, 0.5, 0.75]],
};
})();
