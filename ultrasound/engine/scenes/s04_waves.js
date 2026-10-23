// S04 (14–22 s) — why the gel, and what the sound is. A close look at the probe face on the skin, without gel: air
// fills the hollows of the skin, and the pulse bounces back almost entirely (air's acoustic impedance is ~4000× lower).
// Gel flows in and pushes the air out; the next pulse goes straight into the skin. The camera then follows it down
// through the tissue: rows of tissue particles bunch up (compression) and spread out as the pressure wave passes, each
// particle only shuffling back and forth.
(() => {
const S = SC.s04_waves = {}, M = PROBE.M;
const F1 = 14.5, F2 = 15.25, F3 = 17.0, BX0 = M.ex(-2) - 18, BX1 = M.ex(2) + 18;
S.F3 = F3;
// close on the face for the gel demo, then follow the pulse at the drawn speed of sound (easing in)
S.cam = lt => {
  if (lt < 3) return { x: M.CX, y: 310, z: 1.5 };
  const tau = lt - 3, g = tau < 1.2 ? tau * tau / 2.4 : tau - 0.6, e = MO.smooth(U.clamp(tau));
  return { x: M.CX, y: 310 + M.V * g, z: K.zl(1.5, 1, e) };
};
const tFace = (M.LENS - M.GND) / M.V;
S.state = (t, lt) => {
  const st = { fires: [], waves: [], gel: U.clamp((lt - 2.25) / 0.65), particles: true };
  for (const f of [F1, F2]) {
    st.fires.push({ t0: f, e0: -2, e1: 2 });
    st.waves.push({ y0: M.GND, t0: f, dir: 1, amp: 1, x0: BX0, x1: BX1, col: 'tx', yEnd: M.LENS });
    st.waves.push({ y0: M.LENS, t0: f + tFace, dir: -1, amp: -0.95, x0: BX0, x1: BX1, col: 'echo', yEnd: M.GND });   // R ≈ −1 at air
  }
  st.fires.push({ t0: F3, e0: -2, e1: 2 });
  st.waves.push({ y0: M.GND, t0: F3, dir: 1, amp: 1, x0: BX0, x1: BX1, col: 'tx' });
  return st;
};
// pressure against depth, drawn as a curve down the right side (in the tissue only)
S.graph = (c, cam, t, st, a) => {
  if (a <= 0) return;
  const x0 = 226, top = Math.max(100, Math.round(K.S(cam, 0, M.DERM)[1]));
  if (top > 330) return;
  c.save(); c.globalAlpha *= a;
  PIX.rect(c, x0, top, 1, 372 - top, 'g5');
  let prev = null;
  for (let sy = top; sy < 372; sy++) {
    const y = K.Sinv(cam, 0, sy)[1], p = y > M.SKIN ? PROBE.pressure(st, y, t, 'tx') : 0, x = Math.round(x0 + 9 * p);
    if (prev != null) PIX.rect(c, Math.min(prev, x), sy, Math.abs(prev - x) + 1, 1, 'y4');
    prev = x;
  }
  PIX.text(c, 'PRESSURE', 238, top - 12, 'g9', { align: 'right' });
  c.restore();
};
S.draw = (c, lt, info) => {
  const t = info ? info.t : 14 + lt, cam = S.cam(lt), st = S.state(t, lt);
  PROBE.drawMicro(c, cam, t, st);
  S.graph(c, cam, t, st, U.clamp((lt - 4.2) / 0.3));
  // without gel
  // the 99.9% leader runs down the gap between two elements (never across a crystal or its wire) into the lens
  const air = K.S(cam, 120, M.SKIN - 9), rf = K.S(cam, M.ex(1) + M.PITCH / 2, M.GND + 30);
  CAP.note(c, lt, { x: CAP.X0 + 5, y: CAP.Y0, text: 'WITHOUT GEL', t0: 0.15, t1: 2.2, col: 'w', box: true });
  CAP.note(c, lt, { ax: air[0], ay: air[1], x: 14, y: air[1] + 30, text: 'AIR GAP', t0: 0.35, t1: 2.2, col: 'w', lineCol: 'g6', box: true });
  CAP.note(c, lt, { ax: rf[0], ay: rf[1], x: 128, y: 70, text: '99.9% BOUNCES BACK', t0: 0.75, t1: 2.25, col: 'y4', lineCol: 'y2', box: true });
  // with gel
  const gl = K.S(cam, 60, M.LENS + 10);
  CAP.note(c, lt, { ax: gl[0], ay: gl[1], x: CAP.X0 + 5, y: CAP.Y0, text: 'COUPLING GEL', t0: 2.45, t1: 4.35, col: 'l2', lineCol: 'l1', box: true });
  CAP.note(c, lt, { x: CAP.X0 + 5, y: CAP.Y0 + 11, text: 'FILLS THE AIR GAPS', t0: 2.6, t1: 4.35, col: 'g9', box: true });
  // in the tissue
  CAP.scene(c, lt, { title: 'ULTRASOUND WAVES', ctx: ['SOUND TRAVELS INTO THE BODY', 'AS PRESSURE WAVES.'], t0: 4.45, t1: 7.72 });
  const yc = M.GND + M.V * (t - F3 - 0.25 / M.F), cp = K.S(cam, 70, yc);
  CAP.note(c, lt, { ax: cp[0], ay: cp[1], x: 14, y: 104, text: 'COMPRESSION', t0: 5.4, t1: 7.72, col: 'w', lineCol: 'y3', box: true });
  CAP.note(c, lt, { x: 14, y: 362, text: '1540 m/s · NOT X-RAYS', t0: 5.9, t1: 7.72, col: 'g9', box: true });
};
S.cues = [[0.5, 'crystal', 0.8], [0.85, 'bounce', 1], [1.25, 'crystal', 0.6], [1.6, 'bounce', 0.8], [2.25, 'gel', 1], [3.0, 'crystal', 0.9], [3.35, 'pass', 0.9],
  [4.0, 'wave', 0.8], [4.5, 'wave', 0.6], [5.0, 'wave', 0.6], [5.5, 'wave', 0.5], [6.0, 'wave', 0.5], [6.5, 'wave', 0.45], [7.0, 'wave', 0.4], [7.5, 'wave', 0.4]];
})();
