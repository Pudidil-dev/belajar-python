// SEQUENCE H — FEEDBACK AND THE LOOP (51–60 s): the pressure and flow sensors report to the processor, which draws the
// waveforms on the screen; the whole ventilator in three-quarter view, connected to the patient, its screen completing one
// coherent volume-control breath (positive inspiratory flow, negative expiratory flow; pressure that never falls below
// PEEP). The breath timer reaches its next trigger; the camera follows the inspiratory limb back to the chest, which lands
// on the opening composition with the lungs at end-expiration — and the next breath enters: the last frame is the first.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
// S36 — sensor signals to the processor, then up to the screen (51.0–53.0 s)
const C36 = K.camTrack([[0, 176, 352, 2.0], [0.8, 236, 320, 2.2], [1.45, 246, 60, 2.4]]);
SC['s36_sensors'] = {
  draw(c, t, S) {
    const st = SHOT.vent(S.t);
    const inside = cc => INSIDE.scene(cc, C36(Math.min(1.45, t)), S.t, { ...st, signals: [['tPres', clamp(t / 0.4)], ['tFlow', clamp((t - 0.15) / 0.4)], ['tExpF', clamp((t - 0.3) / 0.45)], ['tDisp', clamp((t - 0.75) / 0.7), { len: 26 }]], trace: { tDisp: t > 0.75 && t < 1.45 } });
    const scr = cc => MACRO.scene(cc, { x: 130, y: lerp(186, 175, clamp((t - 1.5) / 0.5)), z: 3.0 }, S.t, { v: 0, monitor: { sweep: lerp(0.56, 0.66, clamp((t - 1.45) / 0.55)) } });
    if (t < 1.45) inside(c); else if (t < 1.55) window.dissolve(c, inside, scr, (t - 1.45) / 0.1); else scr(c);
  },
  cues: [[0.125, 'elec_click', 0.8, -0.3, 0], [0.375, 'elec_click', 0.8, 0.0, 1], [0.625, 'elec_click', 0.8, 0.3, 2], [0.75, 'signal_zip', 0.6, 0.2, 0.7], [1.5, 'monitor_blip', 0.6, 0.1]],
};
// S37 — the whole ventilator, three-quarter view, the patient connected; the waveforms complete one breath (53.0–55.0 s)
SC['s37_machine'] = {
  draw(c, t, S) {
    const q = MO.cubicOut(clamp(t / 1.6)), cam = SHOT.zoom({ x: 130, y: 175, z: 3.0 }, { x: 66, y: 96, z: 0.78 }, q);
    MACRO.scene(c, cam, S.t, { v: 0, monitor: { sweep: lerp(0.66, 0.99, MO.sineInOut(clamp(t / 2))) } });
  },
  cues: [[0.0, 'zoom_out', 0.6, 0, 0.8], [0.5, 'monitor_blip', 0.5, 0.2], [1.5, 'monitor_blip', 0.5, 0.2]],
};
// S38 — along the inspiratory limb toward the chest; the breath timer approaches its next trigger (55.0–57.0 s)
const C38 = K.camTrack([[0, 34, 272, 2.0], [1.0, 48, 104, 2.0], [2.0, 54, -64, 2.0]]);
SC['s38_next'] = {
  draw(c, t, S) {
    MACRO.scene(c, C38(t), S.t, { v: 0 });
    // picture-in-picture: the controller's breath timer, filling toward the trigger
    const x = 150, y = 340, w = 108, h = 108, icam = { x: 214, y: 292, z: 3.0 }, ic = { ...icam, x: icam.x - (x + w / 2 - W / 2) / icam.z, y: icam.y - (y + h / 2 - H / 2) / icam.z };
    const a = MO.smooth(clamp(t / 0.25));
    c.save(); c.globalAlpha = a; PIX.rect(c, x - 2, y - 2, w + 4, h + 4, 'g3'); window.inset(c, x, y, w, h, cc => INSIDE.scene(cc, ic, S.t, SHOT.vent(S.t))); c.restore();
  },
  cues: [[0.0, 'rise', 0.8, 0.2, 2.0], [1.875, 'trigger', 0.9, 0.3]],
};
// S39 — the camera reaches the patient: the opening composition, the lungs at end-expiration (57.0–58.5 s)
const C39 = t => SHOT.zoom({ x: 54, y: -64, z: 2.0 }, SHOT.OPEN, MO.cubicInOut(clamp(t / 1.5)));
SC['s39_return'] = {
  draw(c, t, S) { const tau = S.t - 60; MACRO.scene(c, C39(t), tau, { v: BREATH.v(tau), flowIn: 0, monitor: { sweep: 0.0 } }); },
  cues: [[0.0, 'buildup', 0.8, 0, 1.5]],
};
// S40 — the next breath enters the tube; the lungs begin to expand; the last frame is frame 0 (58.5–60.0 s)
SC['s40_loop'] = {
  draw(c, t, S) {
    const tau = S.t - 60, fi = MO.smooth(clamp((tau + 0.6) / 0.6));
    MACRO.scene(c, SHOT.OPEN, tau, { v: BREATH.v(tau), flowIn: fi, pulse: SHOT.pulseD(tau) > 0 ? SHOT.pulseD(tau) : null, monitor: { sweep: Math.max(0, 0.03 + tau * 0.02) } });
  },
  cues: [[0.0, 'loop_rise', 1.0, 0, 1.5]],
};
})();
