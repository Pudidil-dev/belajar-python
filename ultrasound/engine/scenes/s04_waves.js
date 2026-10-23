// S04 (14–22 s) — why the gel, and what the sound is. Without gel the face meets the skin with air in between: the
// pulse bounces back almost entirely (air's acoustic impedance is ~4000× lower). Gel flows in and fills the gaps; the
// next pulse goes straight into the skin. Then the camera follows it down through the tissue: rows of tissue particles
// bunch up and spread out as the pressure wave passes; each particle only shuffles back and forth.
(() => {
const S = SC.s04_waves = {}, M = PROBE.M;
const F1 = 14.5, F2 = 15.5, F3 = 18.0, BX0 = M.ex(-2) - 18, BX1 = M.ex(2) + 18;
S.F3 = F3;
// the pan follows the pulse at the speed of the drawn sound (160 px/s), easing in over 0.6 s — slow enough that the rows
// of particles (9 px apart) never look as if they jump backwards
S.cam = lt => { const tau = Math.max(0, lt - 5), y = tau < 0.6 ? M.V * tau * tau / 1.2 : M.V * (tau - 0.3); return { x: M.CX, y: 300 + y, z: 1 }; };
const tFace = (M.LENS - M.GND) / M.V;
S.state = (t, lt) => {
  const st = { fires: [], waves: [], gel: U.clamp((lt - 3.0) / 0.6), particles: true };
  for (const f of [F1, F2]) {
    st.fires.push({ t0: f, e0: -2, e1: 2 });
    st.waves.push({ y0: M.GND, t0: f, dir: 1, amp: 1, x0: BX0, x1: BX1, col: 'tx', yEnd: M.LENS });
    st.waves.push({ y0: M.LENS, t0: f + tFace, dir: -1, amp: -0.95, x0: BX0, x1: BX1, col: 'echo', yEnd: M.GND });   // R ≈ −1 at air
  }
  st.fires.push({ t0: F3, e0: -2, e1: 2 });
  st.waves.push({ y0: M.GND, t0: F3, dir: 1, amp: 1, x0: BX0, x1: BX1, col: 'tx' });
  return st;
};
// pressure against depth, drawn as a curve down the right edge
S.graph = (c, cam, t, st, a) => {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  const x0 = 250, top = Math.max(96, Math.round(K.S(cam, 0, M.DERM)[1]));
  if (top > 440) { c.restore(); return; }
  PIX.rect(c, x0, top, 1, 468 - top, 'g4');
  let prev = null;
  for (let sy = top; sy < 468; sy++) {
    const y = K.Sinv(cam, 0, sy)[1], p = y > M.SKIN ? PROBE.pressure(st, y, t, 'tx') : 0, x = Math.round(x0 + 9 * p);
    if (prev != null) PIX.rect(c, Math.min(prev, x), sy, Math.abs(prev - x) + 1, 1, 'y4');
    prev = x;
  }
  PIX.text(c, 'PRESSURE', 262, top - 12, 'g8', { align: 'right' });
  c.restore();
};
S.draw = (c, lt, info) => {
  const t = info ? info.t : 14 + lt, cam = S.cam(lt), st = S.state(t, lt);
  PROBE.drawMicro(c, cam, t, st);
  S.graph(c, cam, t, st, U.clamp((lt - 5.2) / 0.3));
  // captions: the gel first, then the waves
  CAP.scene(c, lt, { title: 'COUPLING GEL', ctx: 'WITHOUT IT: AIR GAPS', t0: 0.15, t1: 4.5 });
  CAP.note(c, lt, { x: CAP.X0 + 5, y: CAP.Y0 + 2 * CAP.LH + 2, text: 'GEL FILLS THE GAPS', t0: 3.0, t1: 4.5, col: 'l2', box: true });
  CAP.scene(c, lt, { title: 'ULTRASOUND WAVES', ctx: ['SOUND TRAVELS INTO THE BODY', 'AS PRESSURE WAVES.'], t0: 4.75, t1: 7.72 });
  // without gel
  const air = K.S(cam, 120, M.SKIN - 6), rf = K.S(cam, BX1 - 10, M.LENS - 20);
  CAP.note(c, lt, { ax: air[0], ay: air[1], x: 14, y: air[1] + 52, text: 'AIR', t0: 0.4, t1: 2.75, col: 'w', lineCol: 'g6', box: true });
  CAP.note(c, lt, { ax: rf[0], ay: rf[1], x: 150, y: 104, text: '99.9% BOUNCES', t0: 0.95, t1: 2.75, col: 'y4', lineCol: 'y2', box: true });
  CAP.note(c, lt, { x: 150, y: 115, text: 'BACK', t0: 1.1, t1: 2.75, col: 'y4', box: true });
  CAP.note(c, lt, { x: 14, y: 420, text: 'ALMOST NOTHING GETS IN', t0: 1.1, t1: 2.9, col: 'g9', box: true });
  // with gel
  CAP.note(c, lt, { x: 14, y: 420, text: 'SOUND GETS IN', t0: 4.3, t1: 5.5, col: 'y4', box: true });
  // in the tissue
  const yb = M.GND + M.V * (t - F3) + M.LAM * 0.3, cp = K.S(cam, 120, yb);
  CAP.note(c, lt, { ax: cp[0], ay: cp[1], x: 14, y: U.clamp(cp[1] - 52, 100, 380), text: 'COMPRESSION', t0: 5.7, t1: 7.72, col: 'y4', lineCol: 'y2', box: true });
  CAP.note(c, lt, { x: 14, y: 444, text: '1540 m/s IN TISSUE', t0: 6.1, t1: 7.72, col: 'g9', box: true });
  CAP.note(c, lt, { x: 14, y: 455, text: 'SOUND, NOT RADIATION', t0: 6.12, t1: 7.75, col: 'g9', box: true });
};
S.xin = 0.3;
S.cues = [[0.5, 'crystal', 0.8], [0.85, 'bounce', 1], [1.5, 'crystal', 0.6], [1.85, 'bounce', 0.8], [3.0, 'gel', 1], [4.0, 'crystal', 0.9], [4.35, 'pass', 0.9], [5.0, 'wave', 0.8], [5.5, 'wave', 0.6], [6.0, 'wave', 0.6], [6.5, 'wave', 0.5], [7.0, 'wave', 0.5], [7.5, 'wave', 0.4]];
})();
