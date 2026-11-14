// SEQUENCE I — THE LOOP (81.5–90 s): the full system in one picture (sources, collimators, the target in the transparent
// head); back to the brain target; the dose field of the next cycle; the opening composition — the last frame is frame 0.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
// S46 — the full system revealed (81.5–84.0 s)
SC['s46_system'] = {
  xin: 0.18,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 2.5)), cam = { x: 0, y: lerp(-20, -40, q), z: K.zl(1.1, 0.86, q) };
    HEAD.draw(c, cam, S.t, { beams: 0, glow: 0.6 });
    HEAD.ring(c, cam, S.t, { R: 190, span: Math.PI * 1.25 });
    HEAD.beams(c, cam, S.t, { a: 1, R: 180 });
  },
  cues: [[0.0, 'asc_pulse', 0.8, 0, 2.2]],
};
// S47 — back to the brain target (84.0–86.0 s)
SC['s47_return'] = {
  xin: 0.18,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 2.0)), cam = { x: lerp(0, 2, q), y: lerp(-30, -4, q), z: K.zl(1.2, 2.3, q) };
    HEAD.draw(c, cam, S.t, { beams: 1, pulse: S.t, glow: 0.6 });
  },
  cues: [[0.0, 'rise_pulse', 0.6, 0, 1.8]],
};
// S48 — the next cycle is ready: the dose field builds again (86.0–88.0 s)
SC['s48_cycle'] = {
  xin: 0.18,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 2.0)), cam = { x: 0, y: 0, z: K.zl(1.5, 1.05, q) };
    TISSUE.draw(c, cam, S.t, { shots: [{ x: 0, y: 0, s: 34, w: 1.0 }], dose: 0.4 + 0.6 * MO.smooth(clamp(t / 1.2)), floor: 0.07 });
    CAP.legend(c, t, { x: 296, y: 120, t0: 0.15, t1: 1.5 });
  },
  cues: [[0.0, 'bloom', 0.6, 0, 1.4]],
};
// S49 — the opening composition returns: the last frame is frame 0 (88.0–90.0 s)
SC['s49_loop'] = {
  xin: 0.3,
  draw(c, t, S) { const tau = S.t - 90; HEAD.draw(c, HEAD.CAM, tau, { beams: 1, pulse: tau, glow: 0.4 }); },
  cues: [[0.0, 'buildup', 0.7, 0, 1.75], [1.6, 'loop_ticks', 0.7, 0, 0.4]],
};
})();
