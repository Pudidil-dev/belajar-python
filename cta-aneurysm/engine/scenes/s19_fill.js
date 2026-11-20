// S19 FILL THE ANEURYSM LUMEN (72–76 s): back to the cutaway of scene 2 — the same parent artery, neck and dome. Blood
// carrying contrast flows in: the plasma turns violet behind the front, along the parent artery, into both branches and,
// a little later, through the neck into the sac, until the whole blood-filled space is outlined. The walls do not move;
// the contrast does not seek the aneurysm: it fills whatever the blood fills.
(() => {
const { W, H } = PIX;
const clamp = U.clamp;
const B = FLOW.B, V = 210;
const arrive = (x, y, sac) => {
  const tB = (430 - B[0]) / V;
  if (sac) return tB + 0.55 + Math.hypot(x - 150, y - 336) / 80;
  if (x > B[0] + 4) return (430 - x) / V;
  return tB + Math.hypot(x - B[0], y - B[1]) / V;
};
const frontFn = t => (x, y, sac) => clamp((t - 0.25 - arrive(x, y, sac)) / 0.35);
SC['s19_fill'] = {
  draw(c, t, S) {
    const f = frontFn(t);
    FLOW.draw(c, { t: S.t, front: f, contrast: (tt, x, y) => f(x, y, FLOW.lumenAt(x, y) < 0 && Math.hypot(x - FLOW.DOME.x, y - FLOW.DOME.y) < FLOW.DOME.r + 8 ? 1 : 0), outline: MO.smooth(clamp((t - 3.0) / 0.5)) });
    CAP.ctx(c, t, { text: 'KONTRAST LÜMENİ DOLDURUR', t0: 0.35, t1: 3.6 });
  },
  cues: [[0, 'flow_bed', 0.6, 0, 4], [0.05, 'beat', 0.5], [1.05, 'beat', 0.5], [2.05, 'beat', 0.5], [3.05, 'beat', 0.5], [0.35, 'type', 0.4], [0.3, 'fill_motif', 0.8, 0.3, 1.2], [1.9, 'sac_fill', 0.9, -0.4, 1.0], [3.0, 'outline', 0.7, -0.2, 0.5]],
  xin: 0.3,
};
})();
