// S05 EXTERNAL SUPPORT (12–15 s): the view turns to the bedside and pulls back: the patient lying on the back (silhouette,
// head to the left), the pelvis section in a window, the catheter along the thigh under a securement strap, the drainage
// tubing with gentle slack, and the bag on its own hanger on the bed frame. Its weight hangs on the frame, not the catheter.
(() => {
const { W, H } = PIX;
const clamp = U.clamp, lerp = U.lerp;
const C1 = { x: 30, y: 100, s: 1.45, cx: W / 2, cy: 330 }, C2 = { x: 240, y: -120, s: 0.36, cx: W / 2, cy: 330 };
window.BEDWIDE = C2;
const camAt = t => { const q = MO.k75(clamp((t - 0.2) / 1.9)); return { ...C2, s: K.zl(C1.s, C2.s, q), x: lerp(C1.x, C2.x, q), y: lerp(C1.y, C2.y, q) }; };
SC['s05_support'] = {
  draw(c, t, S) {
    BED.draw(c, camAt(t), { t: S.t, sway: MO.smooth(clamp((t - 1.6) / 0.6)) });
    CAP.ctx(c, t, { text: 'Supported outside, too', t0: 0.5, t1: 2.75 });
  },
  cues: [[0, 'whoosh_out', 0.7, 0, 2.1], [0.5, 'type', 0.4], [2.2, 'settle', 0.5, 0.3]],
  xin: 0.35,
};
})();
