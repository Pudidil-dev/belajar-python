// SEQUENCE A — THE IMPOSSIBLE BREATH (0–3 s): the result first. A breath is already entering the lungs at frame 0; the
// camera dives with it down the trachea, through the branching airways, into the alveoli and across the alveolar-capillary
// barrier, then pulls all the way back out — barrier, alveolus, bronchial tree, lung, chest, patient, circuit — until the
// ICU ventilator that delivered it stands in frame, its screen drawing the inspiratory waveform.
(() => {
const clamp = U.clamp, lerp = U.lerp;
const M = MACRO.R;
// gas in the trachea and both main bronchi, and in the first lobar branches (dense: the breath arriving)
const AIRWAY = [M.trachea, M.bronR, M.bronL];
const LOBAR = MACRO.TREE.filter(s => s[4] > 2.4).map(([x0, y0, x1, y1]) => BREATH.path([[x0, y0], [x1, y1]], 2));
const airwayGas = (c, cam, T, v, a = 1, dir = 1) => {
  const E = p => MACRO.ex(p[0], p[1], v), ramp = dir > 0 ? ['cy3', 'cy4', 'cy5'] : ['am3', 'am4', 'am5'];
  AIRWAY.forEach((p, k) => BREATH.stream(c, cam, BREATH.path(p.map(E), 1), T, { n: 70, speed: 120, dir, seed: 11 + k, spread: k ? 2.2 : 3.4, len: 2, a, ramp }));
  LOBAR.forEach((p, k) => BREATH.stream(c, cam, BREATH.path(p.map(E), 1), T, { n: 14, speed: 90, dir, seed: 31 + k, spread: 1, len: 1.5, a, ramp }));
};
window.airwayGas = airwayGas;
// S01 — the breath arrives: a cyan pulse runs through the tube into the trachea; the lungs begin to expand (0–0.375 s)
SC['s01_breath'] = {
  draw(c, t, S) {
    const tau = t, cam = SHOT.hookCam(tau), v = BREATH.v(tau);
    MACRO.scene(c, cam, tau, { v, flowIn: 1, pulse: SHOT.pulseD(tau), monitor: { sweep: 0.03 } });
    airwayGas(c, cam, tau, v, MO.smooth(clamp(tau / 0.3)));
  },
  cues: [[0.0, 'thump', 1.0, 0], [0.0, 'fwoosh', 1.0, 0.15, 0.45]],
};
// S02 — down the trachea: the gas divides at the carina into the two main bronchi (0.375–0.875 s)
SC['s02_trachea'] = {
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 0.5)), cam = SHOT.zoom(SHOT.hookCam(0.375), { x: -12, y: -36, z: 8 }, q), v = BREATH.v(S.t);
    MACRO.scene(c, cam, S.t, { v, flowIn: 1, pulse: Math.min(SHOT.D_CARINA, SHOT.pulseD(S.t)) });
    airwayGas(c, cam, S.t, v, 1);
  },
  cues: [[0.0, 'whoosh_dir', 0.9, -0.6, 0.5]],
};
// S03 — the airways branch again and again: three rapid zooms through the generations (0.875–1.375 s)
const SPURT = t => { const k = Math.min(3, Math.floor(t / 0.125)), q = MO.cubicInOut(clamp((t - k * 0.125) / 0.125)); return k < 3 ? 0.4 + k * 2 + 2 * q : 6.4 + 0.5 * MO.smooth(clamp((t - 0.375) / 0.125)); };
SC['s03_branches'] = {
  xin: 0.0625,
  draw(c, t, S) { AIR.tree(c, AIR.treeCam(SPURT(t)), S.t, { flow: 1, v: BREATH.v(S.t) }); },
  cues: [[0.0, 'swish', 0.9, -0.5, 0], [0.125, 'swish', 0.9, 0.0, 1], [0.25, 'swish', 0.95, 0.5, 2]],
};
// S04 — into the alveoli: they fill and stretch smoothly as the gas arrives (1.375–1.875 s)
SC['s04_alveoli'] = {
  xin: 0.0625,
  draw(c, t, S) {
    const q = MO.cubicOut(clamp(t / 0.5)), cam = { x: lerp(0, -40, q), y: lerp(-40, 22, q), z: K.zl(0.85, 2.7, q) };
    AIR.acinus(c, cam, S.t, { v: BREATH.v(S.t), flow: 1, mol: q });
  },
  cues: [[0.0, 'elastic', 0.9, -0.2]],
};
// S05 — the alveolar-capillary barrier: oxygen crosses into the blood and a red cell takes it up (1.875–2.375 s)
const rbcX = T => -90 + (T - 1.875) * 150;
const tagged = t => { const T = 1.875 + t; if (t < 0.125) return [rbcX(T) + 18, lerp(-36, 2, t / 0.125)]; if (t < 0.375) return [rbcX(T) + 18 - (t - 0.125) * 20, lerp(2, AIR.LAY.lumen + 20, MO.smooth((t - 0.125) / 0.25))]; return [rbcX(T) + 13, AIR.LAY.lumen + 24]; };
SC['s05_barrier'] = {
  xin: 0.0625,
  draw(c, t, S) {
    const cam = { x: rbcX(S.t) - 4, y: 22, z: 3.1 };
    AIR.barrier(c, cam, S.t, { o2: 1, co2: 0.8, rbcX: rbcX(S.t) });
    const [x, y] = tagged(t), [px, py] = K.S(cam, x, y);
    if (t < 0.375) { MICRO.o2(c, px, py, 7, 0.6 + t * 3, { ramp: ['o22', 'o23', 'o24', 'o25', 'w'] }); MICRO.tag(c, px, py, 9, S.t, 'w'); }
    else { const k = (t - 0.375) / 0.125; FX.ring(c, px, py, 6 + 30 * k, 'w', 1 - k); FX.ring(c, px, py, 3 + 18 * k, 'hm4', 1 - k); }
  },
  cues: [[0.0, 'pop', 0.9, -0.3], [0.125, 'tick', 0.9, 0.2], [0.375, 'shimmer', 1.0, 0.3]],
};
// S06 — the explosive scale reveal: barrier → alveolus → bronchial tree → lung → chest → patient → circuit → ventilator
const STAGE = [0.1, 0.2, 0.32];
SC['s06_reveal'] = {
  draw(c, t, S) {
    const T = S.t, v = BREATH.v(T);
    const barrier = cc => { const q = clamp(t / STAGE[0]); AIR.barrier(cc, { x: rbcX(2.375) - 4, y: 22, z: K.zl(3.1, 0.7, q) }, T, { o2: 1, co2: 0.8, rbcX: rbcX(T) }); };
    const acinus = cc => { const q = clamp((t - STAGE[0] + 0.03) / (STAGE[1] - STAGE[0])); AIR.acinus(cc, { x: lerp(-40, 0, q), y: lerp(22, -40, q), z: K.zl(3.2, 0.55, q) }, T, { v, flow: 1, mol: 1 }); };
    const tree = cc => { const q = clamp((t - STAGE[1] + 0.03) / (STAGE[2] - STAGE[1])); AIR.tree(cc, AIR.treeCam(lerp(6.6, 0, MO.sineInOut(q))), T, { flow: 1, v }); };
    const macro = cc => { const q = MO.cubicOut(clamp((t - STAGE[2] + 0.03) / (0.625 - STAGE[2] + 0.03))); MACRO.scene(cc, SHOT.zoom({ x: -28, y: -12, z: 9 }, MACRO.WIDE, q), T, { v, flowIn: 1, monitor: { sweep: lerp(0.12, 0.22, q) } }); };
    const dz = 0.03;
    if (t < STAGE[0] - dz) barrier(c);
    else if (t < STAGE[0]) window.dissolve(c, barrier, acinus, (t - STAGE[0] + dz) / dz);
    else if (t < STAGE[1] - dz) acinus(c);
    else if (t < STAGE[1]) window.dissolve(c, acinus, tree, (t - STAGE[1] + dz) / dz);
    else if (t < STAGE[2] - dz) tree(c);
    else if (t < STAGE[2]) window.dissolve(c, tree, macro, (t - STAGE[2] + dz) / dz);
    else macro(c);
  },
  cues: [[0.0, 'zoomout', 1.0, 0, 0.625], [0.625, 'bass_hit', 1.0, 0]],
};
})();
