// S02 · 0:04–0:09 — EXTREME ZOOM OUT. One continuous pull-back that started when the micrograph landed on the monitor
// (3 s): the monitor with its scale bar, scan settings, live detector trace and line profile → the desk and control
// panels → the dark lab, where the 3 m column stands on its isolation platform among racks, pumps and cables. The atom
// that filled the frame is now a speck on a screen.
(() => {
const { W, H } = PIX;
const T0 = 3.0, T1 = 9.0;                                                  // film time of the whole pull-back
const S02 = window.S02 = {};
S02.cam = T => {
  const p = U.clamp((T - T0) / (T1 - T0)), M = LAB.MON;
  const a = { x: M.cx + 4, y: M.cy + 16, z: 4.3 }, b = { x: -2, y: -172, z: 1.32 };
  const e = MO.sineInOut(p), ez = 1 - Math.pow(1 - p, 1.6) * (1 - p * 0.35);   // zoom leads, framing follows
  return { x: U.lerp(a.x, b.x, MO.smooth(p)), y: U.lerp(a.y, b.y, e), z: CAM.zlerp(a.z, b.z, MO.smooth(U.clamp(ez))) };
};
SC.s02_lab = {
  draw(c, lt) {
    const T = 4 + lt, cam = S02.cam(T);
    LAB.draw(c, cam, T, { screen: {} });
    // the hook atom, still ringed on the monitor
    const a = HA.AU[HA.HOOK], [px, py] = HA.px(a.x, a.y), [wx, wy] = LAB.imgW(px, py), [sx, sy] = K.S(cam, wx, wy);
    const kR = 1 - U.clamp((lt - 2.2) / 0.4);
    if (kR > 0) SC.cursor(c, sx, sy, 4, kR, T, 'y3');
    CAP.note(c, lt, { text: 'OVER 100,000x SMALLER', x: sx + 10, y: sy - 34, ax: sx + 3, ay: sy - 3, t0: 0.15, t1: 2.1, col: 'y4', lineCol: 'y2', box: true });
    CAP.note(c, lt, { text: 'THAN A HAIR', x: sx + 10, y: sy - 23, t0: 0.65, t1: 2.1, col: 'y4', box: true });
    // the microscope gets its name once it is all in view
    CAP.scene(c, lt, { title: 'ELECTRON MICROSCOPE', ctx: ['ABERRATION-CORRECTED STEM', '200 kV'], t0: 2.0, acc: 'c2' });
    const [gx, gy] = K.S(cam, LAB.AX - 22, -125);
    CAP.note(c, lt, { text: 'THE SAMPLE IS IN HERE', x: gx - 6, y: gy - 30, ax: gx, ay: gy, t0: 3.3, col: 'w', lineCol: 'g6', box: true, align: 'right' });
  },
  cues: [[0.2, 'ui_ticks', 0.6, -0.3, 0.8], [0.4, 'lab_whoosh', 1, 0, 4.4], [0.6, 'room_tone', 1, 0, 4.4], [2.0, 'title_hit'], [2.6, 'machine_hum', 1, 0, 2.4], [3.3, 'blip']],
};
})();
