// SEQUENCE H — SAFETY AND MOTION MONITORING (75.5–81.5 s): the infrared camera tracks a reflective marker on the nose;
// the head drifts past the configured tolerance and the system flags it; delivery is interrupted by moving every
// sector to its shielded OFF position (the sources keep decaying: only the delivery stops).
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
// S43 — infrared motion tracking (75.5–77.5 s)
SC['s43_ir'] = {
  xin: 0.15,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 2.0)), cam = { x: lerp(-30, -40, q), y: lerp(-64, -74, q), z: K.zl(1.42, 1.58, q) };
    ROOM.close(c, cam, S.t, { marker: 2 });
    ROOM.ir(c, cam, S.t, { at: [-110, -170], a: MO.smooth(clamp((t - 0.2) / 0.3)) });
  },
  cues: Array.from({ length: 5 }, (_, k) => [0.3 + k * 0.3, 'ir_tick', 0.5, -0.4 + k * 0.1]),
};
// S44 — the motion exceeds the safe limit (77.5–79.5 s)
SC['s44_motion'] = {
  xin: 0.12,
  draw(c, t, S) { UI.motion(c, S.t, t); },
  cues: [[0.4, 'ir_tick', 0.5, 0], [1.0, 'alert', 0.8, 0.2]],
};
// S45 — every sector moves to its shielded OFF position (79.5–81.5 s)
SC['s45_off'] = {
  xin: 0.12,
  draw(c, t, S) {
    const st = SHOT.PLAN8.map((s, k) => { const off = t > 0.3 + k * 0.08; return { on: off ? 0 : 1, off, size: s, offBadge: off ? clamp((t - 0.3 - k * 0.08) / 0.12) : 0 }; });
    UNIT.front(c, { x: 0, y: 30, z: 1.0 }, S.t, { st, head: true, nums: false, beams: 1 - MO.smooth(clamp((t - 0.3) / 0.5)) });
  },
  cues: [[0.3, 'shutdown', 0.9, 0, 0.8]],
};
})();
