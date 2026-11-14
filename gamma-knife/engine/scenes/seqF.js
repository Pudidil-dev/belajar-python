// SEQUENCE F — SHAPING THE DOSE (54.0–62.5 s): several shots of different sizes overlap inside the lesion's outline;
// between shots every sector returns to its shielded OFF position; the motorized couch moves the head a few millimetres
// so a new coordinate sits at the radiation focus; a new sector configuration opens; the accumulated dose now follows
// the irregular target.
(() => {
const { W, H, P } = PIX;
const clamp = U.clamp, lerp = U.lerp, TAU = U.TAU;
// the plan's shots in the irregular lesion (tissue coordinates): x, y, sigma, weight
const SHOTS = [{ x: -34, y: 0, s: 16, w: 0.8 }, { x: 4, y: -38, s: 18, w: 0.85 }, { x: 22, y: 6, s: 22, w: 0.9 }, { x: -6, y: 28, s: 14, w: 0.75 }, { x: 46, y: 8, s: 12, w: 0.7 }, { x: 26, y: -52, s: 11, w: 0.65 }];
SHOT.SHOTS = SHOTS;
// S31 — overlapping shots fill the outline (54.0–55.75 s)
SC['s31_overlap'] = {
  xin: 0.15,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 1.75)), cam = { x: 0, y: -10, z: K.zl(1.6, 1.75, q) };
    const shots = SHOTS.slice(0, 4).map((s, i) => ({ ...s, w: s.w * MO.smooth(clamp((t - 0.15 - i * 0.22) / 0.25)) }));
    TISSUE.draw(c, cam, S.t, { lesion: SHOT.LES, lesionFill: 0.35, outline: 1, shots, dose: 1, floor: 0.04 });
    CAP.legend(c, t, { x: 296, y: 112, t0: 0.2, t1: 1.5 });
  },
  cues: Array.from({ length: 4 }, (_, i) => [0.15 + i * 0.22, 'dose_pulse', 0.6, -0.4 + i * 0.25, i]),
};
// S32 — the sectors reset: all return to OFF between shots (55.75–57.25 s)
SC['s32_reset'] = {
  xin: 0.15,
  draw(c, t, S) {
    const st = Array.from({ length: 8 }, (_, k) => { const off = t > 0.2 + k * 0.06; return { on: off ? 0 : 1, off }; });
    UNIT.front(c, { x: 0, y: 30, z: 1.0 }, S.t, { st, head: true, nums: false });
  },
  cues: [[0.2, 'servo_off', 0.8, 0, 0.6]],
};
// S33 — the couch moves the patient a few millimetres (57.25–59.0 s)
SC['s33_couch'] = {
  xin: 0.15,
  draw(c, t, S) { const k = MO.sineInOut(clamp((t - 0.25) / 1.1)); ROOM.wide(c, { x: 10, y: 0, z: 1.0 }, S.t, { couch: 14 * k, arrow: MO.smooth(clamp((t - 0.2) / 0.2)) * (1 - MO.smooth(clamp((t - 1.4) / 0.25))) }); },
  cues: [[0.25, 'motor', 0.8, -0.3, 1.1], [1.35, 'align_click', 0.6, 0.2]],
};
// S34 — the next shot: a new set of sectors opens (59.0–60.5 s)
SC['s34_nextshot'] = {
  xin: 0.12,
  draw(c, t, S) {
    const pick = [1, 3, 6], st = Array.from({ length: 8 }, (_, k) => { const on = pick.includes(k) && t > 0.3 + pick.indexOf(k) * 0.12; return { on: on ? 1 : 0, off: !on, hi: on ? 1 : 0, size: 8 }; });
    UNIT.front(c, { x: 0, y: 30, z: 1.0 }, S.t, { st, head: true, nums: false, beams: MO.smooth(clamp((t - 0.7) / 0.3)) });
  },
  cues: [[0.3, 'servo_click', 0.7, -0.3], [0.42, 'servo_click', 0.7, 0.1], [0.54, 'servo_click', 0.7, 0.4], [0.7, 'beam_on', 0.6, 0, 0.6]],
};
// S35 — the accumulated dose follows the lesion (60.5–62.5 s)
SC['s35_conform'] = {
  xin: 0.15,
  draw(c, t, S) {
    const q = MO.sineInOut(clamp(t / 2.0)), cam = { x: 0, y: -10, z: K.zl(1.75, 1.35, q) };
    TISSUE.draw(c, cam, S.t, { lesion: SHOT.LES, lesionFill: 0.2, outline: 1, shots: SHOTS.map(s => ({ ...s, w: s.w * 1.05 })), dose: 0.85 + 0.15 * MO.smooth(clamp(t / 0.8)), floor: 0.05 });
    CAP.legend(c, t, { x: 296, y: 112, t0: 0.2, t1: 1.75 });
  },
  cues: [[0.1, 'complete', 0.8, 0, 1.2]],
};
})();
