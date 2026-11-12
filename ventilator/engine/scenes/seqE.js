// SEQUENCE E — DELIVERING THE BREATH (24–33 s): out of the inspiratory outlet, through the heated humidifier (heat and
// water vapour, not aerosol or fog), along the transparent corrugated inspiratory limb, through the Y-connector (the
// expiratory limb stays still: it is not venting the breath), down the endotracheal tube into the trachea, and through
// the branching airway tree.
(() => {
const clamp = U.clamp, lerp = U.lerp;
// S20 — the gas leaves the ventilator and heads for the humidifier (24.0–25.5 s)
const C20b = K.camTrack([[0.5, 84, 292, 5.2], [1.5, 54, 302, 4.0]]);
SC['s20_outlet'] = {
  draw(c, t, S) {
    const inside = cc => INSIDE.scene(cc, { x: 100, y: lerp(520, 624, MO.cubicIn(clamp(t / 0.55))), z: 2.6 }, S.t, SHOT.vent(S.t));
    const macro = cc => MACRO.scene(cc, C20b(Math.max(0.5, t)), S.t, { v: BREATH.v(S.t), flowIn: 1 });
    if (t < 0.5) inside(c); else if (t < 0.6) window.dissolve(c, inside, macro, (t - 0.5) / 0.1); else macro(c);
  },
  cues: [[0.0, 'whoosh_pneu', 0.9, -0.3, 0.7], [0.55, 'port_thunk', 0.6, -0.4]],
};
// S21 — the heated humidifier: the plate warms the water; the gas picks up heat and water vapour as it passes (25.5–27.0 s)
SC['s21_humidifier'] = {
  xin: 0.0625,
  draw(c, t, S) { const q = MO.sineInOut(clamp(t / 1.5)); AIR.humid(c, { x: lerp(-70, 24, q), y: lerp(-24, 4, q), z: K.zl(1.15, 2.0, q) }, S.t, {}); },
  cues: [[0.0, 'warm', 0.8, -0.2, 1.5]],
};
// S22 — the transparent corrugated inspiratory limb: fast tracking with the conditioned gas (27.0–28.5 s)
SC['s22_tube'] = {
  xin: 0.0625,
  draw(c, t, S) { AIR.tube(c, { x: 420 * t, y: 0, z: 2.1 }, S.t, { vapour: 0.6 }); },
  cues: [[0.0, 'rush', 0.9, -0.3, 1.5]],
};
// S23 — the Y-connector: fresh gas turns toward the patient; the expiratory limb is still (28.5–30.0 s)
const C23 = K.camTrack([[0, 150, -98, 1.7], [0.7, 50, -8, 1.35], [1.5, -112, 0, 1.8]]);
SC['s23_ypiece'] = {
  xin: 0.0625,
  draw(c, t, S) { AIR.ypiece(c, C23(t), S.t, { insp: 1 }); },
  cues: [[0.25, 'whoosh_dir', 0.9, 0.6, 0.9]],
};
// S24 — through the endotracheal tube into the trachea; the anatomy around it comes into view; the lungs begin to fill
const C24 = K.camTrack([[0, 22, -124, 5.6], [0.6, 2, -100, 6.0], [1.5, 0, -58, 5.2]]);
SC['s24_ett'] = {
  xin: 0.0625,
  draw(c, t, S) { const cam = C24(t), v = BREATH.v(S.t); MACRO.scene(c, cam, S.t, { v, flowIn: 1 }); window.airwayGas(c, cam, S.t, v, 1); },
  cues: [[0.0, 'tunnel', 0.9, -0.2, 1.5]],
};
// S25 — the trachea divides into bronchi, the bronchi into bronchioles: three rhythmic sweeps (31.5–33.0 s)
const G25 = t => { const k = Math.min(2, Math.floor(t / 0.5)), q = MO.cubicInOut(clamp((t - k * 0.5) / 0.3)); return 0.2 + k * 2.1 + 2.1 * q; };
SC['s25_bronchi'] = {
  xin: 0.0625,
  draw(c, t, S) { AIR.tree(c, AIR.treeCam(G25(t)), S.t, { flow: 1, v: BREATH.v(S.t) }); },
  cues: [[0.0, 'sweep', 0.85, -0.4, 0], [0.5, 'sweep', 0.85, 0.0, 1], [1.0, 'sweep', 0.9, 0.4, 2]],
};
})();
